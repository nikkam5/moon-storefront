import { expect, test, type Locator } from "@playwright/test";

async function samplePaints(canvas: Locator) {
  return canvas.evaluate(async (element) => {
    const canvas = element as HTMLCanvasElement;
    const context = canvas.getContext("2d")!;
    const original = context.clearRect;
    let paints = 0;
    let pixels = 0;
    context.clearRect = (x, y, width, height) => {
      paints++;
      pixels += Math.abs(width * height);
      original.call(context, x, y, width, height);
    };
    const frames = 18;
    try {
      for (let index = 0; index < frames; index++) await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    } finally {
      context.clearRect = original;
    }
    return { frames, paints, clearedFraction: pixels / Math.max(1, paints * canvas.width * canvas.height) };
  });
}

test("idle MOONSTORE paints at the display cadence using a small dirty region", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await page.mouse.move(0, 0);
  const canvas = page.locator(".moonstore-word canvas");
  await expect.poll(() => canvas.evaluate((element) => (element as HTMLCanvasElement).width)).toBeGreaterThan(0);
  const stats = await samplePaints(canvas);
  expect(stats.paints / stats.frames).toBeGreaterThan(.75);
  expect(stats.clearedFraction).toBeLessThan(.5);
});

test("MOONSTORE pauses under the catalog curtain and resumes on Home", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await page.locator("#shop").scrollIntoViewIfNeeded();
  await expect(page.locator("#home")).toHaveClass(/hero-exit/);
  await page.waitForTimeout(100);
  const canvas = page.locator(".moonstore-word canvas");
  expect((await samplePaints(canvas)).paints).toBeLessThanOrEqual(1);
  await page.getByRole("banner").getByRole("link", { name: "MOON STORE home" }).click();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await expect(page.locator("#home")).not.toHaveClass(/hero-exit/);
  const resumed = await samplePaints(canvas);
  expect(resumed.paints / resumed.frames).toBeGreaterThan(.75);
});
