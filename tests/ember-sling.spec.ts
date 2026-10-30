import { expect, test, type Page } from "@playwright/test";

type Opened = { url: string; t: number }[];

// window.open is recorded instead of opening a tab, so the page keeps focus.
async function prepare(page: Page, theme: "ember" | "dark") {
  await page.addInitScript((theme) => {
    localStorage.setItem("moonstore-theme", theme);
    const w = window as unknown as { opened: Opened };
    w.opened = [];
    window.open = ((url?: string | URL) => { w.opened.push({ url: String(url), t: performance.now() }); return null; }) as typeof window.open;
  }, theme);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/shop");
  const root = page.locator(".site-footer .footer-social .sling-button").first();
  await root.scrollIntoViewIfNeeded();
  const box = (await root.locator(".sling-button__pad").boundingBox())!;
  return { root, x: box.x + box.width / 2, y: box.y + box.height / 2 };
}
const opened = (page: Page) => page.evaluate(() => (window as unknown as { opened: Opened }).opened);

test("Ember social pads corrupt softly after a long hold, worsen past the arm point, burst, open, then get deleted", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "mouse drag");
  const { root, x, y } = await prepare(page, "ember");
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + 10, { steps: 2 });
  // A long delay before the soft glitch shows up.
  await page.waitForTimeout(300);
  await expect(root).not.toHaveAttribute("data-corrupt");
  await expect(root).toHaveAttribute("data-corrupt", "soft", { timeout: 3000 });
  await page.mouse.move(x, y + 110, { steps: 6 });
  await expect(root).toHaveAttribute("data-corrupt", "hard");
  const releasedAt = await page.evaluate(() => performance.now());
  await page.mouse.up();
  await expect(root).toHaveAttribute("data-corrupt", "burst");
  await expect.poll(() => opened(page).then((list) => list.length)).toBe(1);
  const [link] = await opened(page);
  expect(link.url).toContain("facebook");
  // The burst plays before the link opens.
  expect(link.t - releasedAt).toBeGreaterThan(250);
  await expect(root).toHaveAttribute("data-corrupt", "delete");
  await expect(root).not.toHaveAttribute("data-corrupt", { timeout: 3000 });
  expect(await root.locator(".sling-button__face").evaluate((face) => getComputedStyle(face).opacity)).toBe("1");
});

test("default theme social pads keep their original drag and open without corruption", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "mouse drag");
  const { root, x, y } = await prepare(page, "dark");
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + 110, { steps: 6 });
  await page.waitForTimeout(1200);
  await expect(root).not.toHaveAttribute("data-corrupt");
  await page.mouse.up();
  await expect.poll(() => opened(page).then((list) => list.length)).toBe(1);
  await expect(root).not.toHaveAttribute("data-corrupt");
});
