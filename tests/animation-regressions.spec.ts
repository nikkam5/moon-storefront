import { expect, test, type Locator } from "@playwright/test";

async function canvasPaints(canvas: Locator, frames = 12) {
  return canvas.evaluate(async (element, count) => {
    const context = (element as HTMLCanvasElement).getContext("2d")!;
    const clear = context.clearRect;
    let paints = 0;
    context.clearRect = function (x, y, width, height) { paints++; clear.call(this, x, y, width, height); };
    try {
      for (let i = 0; i < count; i++) await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    } finally { context.clearRect = clear; }
    return paints;
  }, frames);
}

test("featured photo waits for working handlers before offering keyboard activation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  let resumeScripts!: () => void;
  const hydration = new Promise<void>((resolve) => { resumeScripts = resolve; });
  await page.route(/\/_next\/static\/.*\.js(?:\?.*)?$/, async (route) => { await hydration; await route.continue(); });
  try {
    await page.goto("/", { waitUntil: "commit" });
    const stack = page.getByRole("group", { name: "Featured products" });
    await expect(stack).toHaveAttribute("data-ready", "false");
    await expect(stack.locator('[data-front="true"] img')).toBeVisible();
    await expect(stack.getByRole("button", { name: "Show next featured product" })).toHaveCount(0);
    resumeScripts();
    await expect(stack).toHaveAttribute("data-ready", "true");
    await stack.getByRole("button", { name: "Show next featured product" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(".hero-stack-details")).toContainText("Kingston DataTraveler Exodia G2");
    await page.keyboard.press("ArrowRight");
    await expect(page.locator(".hero-stack-details")).toContainText("Golden Honey Cornflakes");
  } finally { resumeScripts(); }
});

test("Galaxy keeps one context across curtain pause and resume", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const canvas = page.locator(".galaxy-backdrop canvas");
  await expect(canvas).toHaveCount(1);
  const original = await canvas.elementHandle();
  await page.locator("#shop").scrollIntoViewIfNeeded();
  await expect(page.locator("#home")).toHaveClass(/hero-exit/);
  expect(await original!.evaluate((element) => element.isConnected)).toBe(true);
  await page.getByRole("banner").getByRole("link", { name: "MOON STORE home" }).click();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await expect(page.locator("#home")).not.toHaveClass(/hero-exit/);
  expect(await original!.evaluate((element) => element.isConnected)).toBe(true);
  await expect(canvas).toHaveCount(1);
});

test("live reduced motion stops hero canvases and restores motion on request", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await page.mouse.move(0, 0);
  const wordmark = page.locator(".moonstore-word canvas");
  await expect(page.locator(".galaxy-backdrop canvas")).toHaveCount(1);
  await expect.poll(() => canvasPaints(wordmark)).toBeGreaterThan(1);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".galaxy-backdrop canvas")).toHaveCount(0);
  await expect.poll(() => canvasPaints(wordmark)).toBe(0);
  const shine = page.locator("#hero-heading .shiny-text");
  await expect(shine).toHaveCSS("background-position", "50% 50%");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator(".galaxy-backdrop canvas")).toHaveCount(1);
  await expect.poll(() => canvasPaints(wordmark)).toBeGreaterThan(1);
});

test("team particles stop for reduced motion and resume without a page reload", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/#about");
  const particles = page.locator(".story-particles");
  await expect.poll(() => canvasPaints(particles)).toBeGreaterThan(1);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(() => canvasPaints(particles)).toBe(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect.poll(() => canvasPaints(particles)).toBeGreaterThan(1);
});

test("interrupted portrait transition clears every pixel and keeps carousel usable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/#about");
  const portrait = page.locator('.depth-carousel__card[aria-hidden="false"] .pixel-transition');
  await portrait.focus();
  await portrait.press("Enter");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(portrait).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => portrait.locator(".pixel-transition__pixel").evaluateAll((pixels) => pixels.every((pixel) => getComputedStyle(pixel).opacity === "0"))).toBe(true);
  await page.getByRole("button", { name: "Next team member" }).click();
  await expect(page.getByRole("button", { name: "View Iman Asnawi" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('.depth-carousel__card[aria-hidden="false"]')).not.toHaveAttribute("inert");
  expect(await page.locator('.depth-carousel__card[aria-hidden="true"]').evaluateAll((cards) => cards.every((card) => (card as HTMLElement).inert))).toBe(true);
});

test("reduced motion restores readable team heading during decryption", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/#about");
  await page.emulateMedia({ reducedMotion: "reduce" });
  const heading = page.locator("#about-heading");
  const text = "The people behind Moon Store.";
  const glyphs = heading.locator(".decrypted-text__glyph");
  // Each character has an invisible width-measuring copy. Validate the
  // displayed layer rather than including that copy in textContent.
  await expect(glyphs).toHaveText(Array.from(text).filter((character) => /\S/.test(character)));
  await expect(heading).toHaveAccessibleName(text);
  expect(await glyphs.evaluateAll((elements) => elements.every((element) => {
    const style = getComputedStyle(element);
    return style.visibility === "visible" && style.display !== "none";
  }))).toBe(true);
  expect(await heading.locator(".decrypted-text__measure").evaluateAll((elements) => elements.every((element) => getComputedStyle(element).visibility === "hidden"))).toBe(true);
});

test("curtain stays usable after changing motion preference while scrolled", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.locator("#shop").scrollIntoViewIfNeeded();
  await expect(page.locator("#home")).not.toHaveClass(/hero-exit/);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator("#home")).toHaveClass(/hero-exit/);
  await page.getByRole("banner").getByRole("link", { name: "MOON STORE home" }).click();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await expect(page.locator("#home")).not.toHaveClass(/hero-exit/);
});
