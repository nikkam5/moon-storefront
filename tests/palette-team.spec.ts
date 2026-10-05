import { expect, test } from "@playwright/test";

const teammatePaths = ["/product/popia-nestum", "/product/honey-cornflakes", "/product/motul-5100"];
const storePaths = ["/", "/shop", "/cart", ...teammatePaths, "/product/kingston-dtxg2"];

for (const theme of ["light", "dark"] as const) {
  test.describe(`${theme} palette`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(value => localStorage.setItem("moonstore-theme", value), theme);
    });

    test("every route uses the approved shared store colors", async ({ page }) => {
      const background = theme === "light" ? "rgb(245, 241, 232)" : "rgb(21, 22, 26)";
      const ink = theme === "light" ? "rgb(36, 37, 43)" : "rgb(242, 240, 233)";
      for (const path of storePaths) {
        await page.goto(path);
        await expect(page.locator("body")).toHaveCSS("background-color", background);
        await expect(page.locator(".site-header")).toHaveCSS("background-color", background);
        if (!teammatePaths.includes(path)) await expect(page.locator(".site-footer")).toHaveCSS("color", ink);
        else await expect(page.locator(".site-footer")).toHaveCount(0);
        await expect(page.locator("html")).toHaveCSS("--accent", theme === "light" ? "#65518b" : "#c2b4eb");
        await expect(page.locator('head meta[name="theme-color"][media="(prefers-color-scheme: dark)"]')).toHaveAttribute("content", "#15161a");
        await page.getByRole("button", { name: /^Open cart/ }).click();
        await expect(page.locator(".cart-drawer")).toBeVisible();
        await expect(page.locator(".cart-drawer")).toHaveCSS("background-color", background);
        await page.getByRole("button", { name: "Close cart", exact: true }).click();
      }
      const add = page.getByRole("button", { name: "Add to cart", exact: true });
      await expect(add).toBeEnabled();
      await expect(add).toHaveCSS("background-color", theme === "light" ? "rgb(101, 81, 139)" : "rgb(194, 180, 235)");
      await expect(add).toHaveCSS("color", theme === "light" ? "rgb(255, 253, 248)" : "rgb(36, 37, 43)");
    });

    for (const path of teammatePaths) {
      test(`${path} retains its product's own colors`, async ({ page }) => {
        await page.goto(path);
        if (path === "/product/popia-nestum") {
          await expect(page.locator(".popia-page")).toHaveCSS("background-color", theme === "light" ? "rgb(247, 241, 230)" : "rgb(25, 30, 25)");
          await expect(page.locator(".popia-page .topbar")).toHaveCSS("background-color", "rgb(38, 53, 38)");
          await expect(page.locator(".popia-page .primary").first()).toHaveCSS("background-color", "rgb(38, 53, 38)");
        } else if (path === "/product/honey-cornflakes") {
          await expect(page.locator(".honey-page")).toHaveCSS("background-color", "rgb(17, 26, 20)");
          await expect(page.locator(".honey-page")).toHaveCSS("--honey", "#D4A017");
          await expect(page.locator(".honey-page .add-to-cart")).toHaveCSS("background-image", "linear-gradient(135deg, rgb(212, 160, 23), rgb(245, 197, 24))");
        } else {
          await expect(page.locator(".motul-page")).toHaveCSS("background-color", "rgb(13, 13, 13)");
          await expect(page.locator(".motul-primary")).toHaveCSS("background-color", "rgb(227, 6, 19)");
        }
      });
    }
  });
}

test("client navigation keeps the shared palette and saved theme consistent", async ({ page }, info) => {
  await page.goto("/product/honey-cornflakes");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(21, 22, 26)");
  await page.locator(".header-logo").click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(21, 22, 26)");
  if (info.project.name === "mobile") await page.getByRole("button", { name: "Open menu", exact: true }).click();
  await page.getByRole("link", { name: "Shop", exact: true }).click();
  await page.locator('#shop a[href="/product/honey-cornflakes"]').click();
  await expect(page).toHaveURL(/\/product\/honey-cornflakes\/?$/);
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(21, 22, 26)");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("all routes use the shared store colors without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  try {
    const page = await context.newPage();
    for (const path of storePaths) {
      await page.goto(path);
      await expect(page.locator("body")).toHaveCSS("background-color", "rgb(245, 241, 232)");
      await expect(page.locator(".site-header")).toHaveCSS("background-color", "rgb(245, 241, 232)");
    }
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
