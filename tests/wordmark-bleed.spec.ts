import { expect, test, type Page } from "@playwright/test";

const bleed = (page: Page) => page.locator(".moonstore-word .tech-text");
const countDrops = (page: Page, ms: number) => page.evaluate(ms => new Promise<number>(resolve => {
  let drops = 0;
  const count = () => drops++;
  document.addEventListener("moonstore-bleed", count);
  setTimeout(() => { document.removeEventListener("moonstore-bleed", count); resolve(drops); }, ms);
}), ms);

test("Ember MOONSTORE pours once per visit, then keeps dripping while Home is in view", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("moonstore-theme", "ember"));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await expect(bleed(page)).toHaveAttribute("data-bleed", "pouring");
  await expect(bleed(page)).toHaveAttribute("data-bleed", "dripping", { timeout: 8000 });
  await page.waitForTimeout(4000);
  // Still releasing drops well after the pour: the loop does not end.
  expect(await countDrops(page, 6000)).toBeGreaterThan(2);
  await expect(page.locator(".blood-fall")).toHaveCSS("z-index", "-1");
  // Same visit: no second pour, straight to dripping.
  await page.reload();
  await expect(bleed(page)).toHaveAttribute("data-bleed", "dripping");
});

test("scrolling away from Home stops the drips and returning resumes them", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("moonstore-theme", "ember"));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await expect(bleed(page)).toHaveAttribute("data-bleed", "dripping", { timeout: 8000 });
  await page.locator("#about").scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  expect(await countDrops(page, 5000)).toBe(0);
  await page.evaluate(() => scrollTo(0, 0));
  expect(await countDrops(page, 7000)).toBeGreaterThan(0);
});

test("reduced motion shows still blood without falling drops", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("moonstore-theme", "ember"));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(bleed(page)).toHaveAttribute("data-bleed", "still");
});

test("light and dark wordmarks do not bleed", async ({ page }) => {
  await page.goto("/");
  await expect(bleed(page)).toHaveAttribute("data-bleed", "off");
  await expect(page.locator(".blood-fall")).toHaveCount(0);
});
