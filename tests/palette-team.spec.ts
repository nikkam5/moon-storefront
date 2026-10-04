import { expect, test } from "@playwright/test";

const teammatePaths = ["/product/popia-nestum", "/product/honey-cornflakes", "/product/motul-5100"];

for (const theme of ["light", "dark"] as const) {
  test.describe(`${theme} palette`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(value => localStorage.setItem("moonstore-theme", value), theme);
    });

    test("store and USB use the approved colors", async ({ page }) => {
      const background = theme === "light" ? "rgb(245, 241, 232)" : "rgb(21, 22, 26)";
      for (const path of ["/", "/shop", "/cart", "/product/kingston-dtxg2"]) {
        await page.goto(path);
        await expect(page.locator("body")).toHaveCSS("background-color", background);
        await expect(page.locator(".site-header")).toHaveCSS("background-color", background);
      }
      const add = page.getByRole("button", { name: "Add to cart", exact: true });
      await expect(add).toBeEnabled();
      await expect(add).toHaveCSS("background-color", theme === "light" ? "rgb(101, 81, 139)" : "rgb(194, 180, 235)");
      await expect(add).toHaveCSS("color", theme === "light" ? "rgb(255, 253, 248)" : "rgb(36, 37, 43)");
    });

    for (const path of teammatePaths) {
      test(`${path} retains its original shared palette`, async ({ page }) => {
        await page.goto(path);
        const background = theme === "light" ? "rgb(250, 247, 240)" : "rgb(12, 23, 41)";
        await expect(page.locator("body")).toHaveCSS("background-color", background);
        await expect(page.locator(".site-header")).toHaveCSS("background-color", background);
        await expect(page.locator("html")).toHaveCSS("--accent", theme === "light" ? "#2b648e" : "#99caff");
        await expect(page.locator('head meta[name="theme-color"][media="(prefers-color-scheme: dark)"]')).toHaveAttribute("content", "#0c1729");
      });
    }
  });
}

test("client navigation switches the palette without changing the saved theme", async ({ page }, info) => {
  await page.goto("/product/honey-cornflakes");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(12, 23, 41)");
  await page.locator(".header-logo").click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(21, 22, 26)");
  if (info.project.name === "mobile") await page.getByRole("button", { name: "Open menu", exact: true }).click();
  await page.getByRole("link", { name: "Shop", exact: true }).click();
  await page.locator('#shop a[href="/product/honey-cornflakes"]').click();
  await expect(page).toHaveURL(/\/product\/honey-cornflakes\/?$/);
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(12, 23, 41)");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("teammate colors are protected without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  try {
    const page = await context.newPage();
    await page.goto("/product/motul-5100");
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(250, 247, 240)");
    await page.goto("/product/kingston-dtxg2");
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(245, 241, 232)");
  } finally { await context.close(); }
});

test("all four team messages keep the same box size and their photos load", async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#about");
  const box = page.locator(".team-words");
  let reference: { width: number; height: number } | null = null;
  for (const name of ["Nik Amir", "Iman Asnawi", "Luqman", "Arish Haikal"]) {
    await page.getByRole("button", { name: `View ${name}`, exact: true }).click();
    await expect(box.locator("h3")).toHaveText(name);
    const photo = page.locator('.depth-carousel__card[aria-hidden="false"] .team-portrait img');
    await expect(photo).toBeVisible();
    await expect.poll(() => photo.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    const metrics = await box.evaluate(element => {
      const r = element.getBoundingClientRect();
      const message = element.querySelector(".team-words-message p")!;
      return { width: r.width, height: r.height, boxBottom: r.bottom, messageBottom: message.getBoundingClientRect().bottom,
        messageHeight: message.getBoundingClientRect().height, lineHeight: parseFloat(getComputedStyle(message).lineHeight) };
    });
    if (!reference) reference = metrics;
    expect(metrics.width).toBeCloseTo(reference.width, 0);
    expect(metrics.height).toBeCloseTo(reference.height, 0);
    expect(metrics.messageBottom).toBeLessThan(metrics.boxBottom - 10);
    if (info.project.name === "desktop") expect(metrics.messageHeight).toBeLessThanOrEqual(metrics.lineHeight * 2.1);
  }
});
