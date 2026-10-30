import { expect, test, type Locator, type Page } from "@playwright/test";

async function ember(page: Page, reduced = false) {
  await page.addInitScript(() => localStorage.setItem("moonstore-theme", "ember"));
  await page.emulateMedia({ reducedMotion: reduced ? "reduce" : "no-preference" });
  await page.goto("/");
  await page.evaluate(async () => { await document.fonts.ready; });
}

async function sample(canvas: Locator, frames = 20) {
  return canvas.evaluate(async (element, frames) => {
    const art = element as HTMLCanvasElement, ctx = art.getContext("2d")!;
    const clear = ctx.clearRect;
    let paints = 0;
    ctx.clearRect = function (...args) { paints++; clear.apply(this, args); };
    try { for (let i = 0; i < frames; i++) await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); }
    finally { ctx.clearRect = clear; }
    const data = ctx.getImageData(0, 0, art.width, art.height).data;
    let crimson = 0, hash = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] > 90 && data[i] > data[i + 1] * 2 && data[i + 3] > 50) crimson++;
      hash = (Math.imul(hash, 31) + data[i] + data[i + 3]) | 0;
    }
    return { paints, crimson, hash, width: art.width, height: art.height, area: art.width * art.height };
  }, frames);
}

test("scroll reveals distinct environments, with bounded rendering and no blocked content", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await ember(page);
  const scenes = [["#home", "threshold"], ["#shop", "fault"], ["#about", "suspended"], ["#feedback", "quiet"]];
  for (const [section, scene] of scenes) {
    await page.locator(section).scrollIntoViewIfNeeded();
    const environment = page.locator(`${section} > .ember-environment`);
    await expect(environment).toHaveAttribute("data-scene", scene);
    await expect(environment).toHaveAttribute("data-motion", "running");
    await expect(environment).toHaveAttribute("data-ready", "true");
    const stats = await sample(environment.locator("canvas"));
    expect(stats.crimson).toBeGreaterThan(50);
    expect(stats.area).toBeLessThan(2_005_000);
    expect(stats.paints).toBeGreaterThan(1);
    // Grid looks paint a cached lattice at display rate; plate scenes stay near 30 fps.
    if (!await environment.getAttribute("data-look")) expect(stats.paints).toBeLessThanOrEqual(15);
    if (section === "#shop") await expect(page.locator("#home > .ember-environment")).toHaveAttribute("data-motion", "paused");
    if (process.env.MOONSTORE_PREVIEW_DIR) {
      if (section === "#about") await expect(page.locator("#about .team-heading-encrypted")).toHaveCount(0);
      if (section === "#feedback") {
        await page.locator("#feedback-heading").scrollIntoViewIfNeeded();
        await expect(page.locator("#feedback-heading")).toHaveAttribute("data-typing-state", "done");
      }
      await page.screenshot({ path: `${process.env.MOONSTORE_PREVIEW_DIR}/${info.project.name}-${scene}.png` });
    }
  }
  const home = page.locator("#home > .ember-environment");
  await expect(home).toHaveAttribute("data-motion", "paused");
  expect((await sample(home.locator("canvas"))).paints).toBe(0);
  await page.getByLabel("Your name (optional)").fill("Preview");
  await page.getByLabel("Your feedback", { exact: true }).fill("Checking the Ember preview.");
  await expect(page.getByLabel("Your feedback", { exact: true })).toHaveValue("Checking the Ember preview.");
  await page.getByRole("button", { name: /^Open cart/ }).click();
  await expect(page.locator(".cart-drawer")).toBeVisible();
  await page.getByRole("button", { name: "Close cart", exact: true }).click();
  expect(errors).toEqual([]);
});

test("reduced motion is still, then live preference changes resume and stop scenery", async ({ page }) => {
  await ember(page, true);
  const environment = page.locator("#home > .ember-environment"), canvas = environment.locator("canvas");
  await expect(environment).toHaveAttribute("data-motion", "static");
  await expect(environment).toHaveAttribute("data-ready", "true");
  const before = await sample(canvas);
  await page.mouse.move(400, 250);
  const after = await sample(canvas);
  expect(after.paints).toBe(0);
  expect(after.area).toBe(before.area);
  expect(after.crimson).toBe(before.crimson);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(environment).toHaveAttribute("data-motion", "running");
  expect((await sample(canvas)).paints).toBeGreaterThan(1);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(environment).toHaveAttribute("data-motion", "static");
  expect((await sample(canvas)).paints).toBe(0);
});

test("pointer response leaves the wordmark and shopping hit targets fixed", async ({ page }) => {
  await ember(page);
  const environment = page.locator("#home > .ember-environment");
  await expect(environment).toHaveAttribute("data-motion", "running");
  const heading = page.locator("#hero-heading"), action = page.getByRole("link", { name: "Explore Catalog", exact: true });
  // Let the existing entrance animation finish before comparing positions.
  await heading.evaluate(async element => {
    await Promise.all(element.getAnimations().map(animation => animation.finished.catch(() => {})));
  });
  const before = { heading: await heading.boundingBox(), action: await action.boundingBox() };
  await page.mouse.move(520, 190);
  const first = await sample(environment.locator("canvas"));
  await page.mouse.move(100, 200);
  const second = await sample(environment.locator("canvas"));
  expect(second.hash).not.toBe(first.hash);
  for (const [current, previous] of [[await heading.boundingBox(), before.heading], [await action.boundingBox(), before.action]]) {
    for (const key of ["x", "y", "width", "height"] as const) expect(Math.abs(current![key] - previous![key])).toBeLessThan(.5);
  }
  await action.click(); await expect(page).toHaveURL(/#shop$/);
});

test("switching themes and hiding the tab pauses all environmental canvases", async ({ page }) => {
  await ember(page);
  const environment = page.locator("#home > .ember-environment"), canvas = environment.locator("canvas");
  await expect(environment).toHaveAttribute("data-motion", "running");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(environment).toHaveAttribute("data-motion", "paused");
  expect((await sample(canvas)).paints).toBe(0);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(environment).toHaveAttribute("data-motion", "running");
  await page.getByRole("button", { name: "Turn off ember theme", exact: true }).click();
  await expect(environment).toHaveAttribute("data-motion", "off");
  await expect(environment).toBeHidden();
  expect((await sample(canvas)).paints).toBe(0);
});

test("USB scenery keeps capacities, the model and cart functional", async ({ page }, info) => {
  await ember(page, true);
  await page.goto("/product/kingston-dtxg2");
  const environment = page.locator(".usb-page > .ember-environment");
  await expect(environment).toHaveAttribute("data-ready", "true");
  await page.getByRole("button", { name: "64GB RM 40.00", exact: true }).click();
  await expect(page.locator(".usb-selected-option")).toContainText("64GB");
  await expect(page.locator(".usb-model-viewer")).toHaveAttribute("data-status", "ready", { timeout: 15000 });
  if (process.env.MOONSTORE_PREVIEW_DIR) await page.screenshot({ path: `${process.env.MOONSTORE_PREVIEW_DIR}/${info.project.name}-usb.png` });
  await page.getByRole("button", { name: "Add to cart", exact: true }).click();
  await expect(page.locator(".cart-drawer")).toBeVisible();
  await expect(page.locator(".cart-drawer")).toContainText("64GB");
});
