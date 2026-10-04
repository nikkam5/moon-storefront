import { expect, test } from "@playwright/test";

const path = "/product/kingston-dtxg2";
const model = "**/models/kingston-exodia-g2-128gb.glb";

test("the approved model renders, responds to keyboard controls and resets exactly", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(path);
  await expect(page.locator(".usb-model-viewer")).toHaveAttribute("data-status", "ready", { timeout: 20000 });
  const canvas = page.locator(".usb-model-canvas");
  await expect(canvas).toBeVisible();
  await expect(page.locator(".usb-product-photo")).toBeHidden();
  await expect(page.locator(".usb-scene-bottom")).toContainText("3D model: 128GB · Sky Blue");
  const closed = await canvas.screenshot();
  const open = page.getByRole("button", { name: "Open USB cap", exact: true });
  await open.focus(); await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Close USB cap" })).toHaveAttribute("aria-pressed", "true");
  await expect(canvas).toHaveAttribute("aria-label", /cap open/);
  await expect.poll(async () => (await canvas.screenshot()).equals(closed)).toBe(false);
  const opened = await canvas.screenshot();
  await page.getByRole("button", { name: "Rotate USB view" }).focus();
  await page.keyboard.press("Space");
  await expect.poll(async () => (await canvas.screenshot()).equals(opened)).toBe(false);
  await page.getByRole("button", { name: "Reset USB view" }).click();
  await expect(canvas).toHaveAttribute("aria-label", /cap closed/);
  await expect.poll(async () => (await canvas.screenshot()).equals(closed)).toBe(true);
  await page.screenshot({ path: info.outputPath("usb-model-integrated.png") });
  expect(errors).toEqual([]);
});

for (const failure of ["model download", "graphics unavailable"]) {
  test(failure + " preserves the photo and the full buying flow", async ({ page }) => {
    if (failure === "model download") await page.route(model, route => route.abort());
    else await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...args: unknown[]) {
        if (type === "webgl2") return null;
        return Reflect.apply(original, this, [type, ...args]);
      } as typeof original;
    });
    await page.goto(path);
    await expect(page.locator(".usb-model-viewer")).toHaveAttribute("data-status", "fallback", { timeout: 20000 });
    await expect(page.locator(".usb-product-photo")).toBeVisible();
    await expect(page.locator(".usb-model-controls")).toBeHidden();
    await expect(page.locator(".usb-scene-bottom")).toContainText("Photo: 128GB · Sky Blue");
    await page.getByRole("button", { name: "128GB RM 60.00", exact: true }).click();
    await page.getByRole("button", { name: "Add to cart", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("128GB · Sky Blue");
    await expect(page.getByRole("dialog").locator(".subtotal")).toContainText("RM 60.00");
  });
}

test("idle rendering stops, cap interaction resumes it, and a lost context falls back", async ({ page }) => {
  await page.addInitScript(() => {
    const draws = { count: 0 };
    Object.assign(window, { usbModelDraws: draws });
    const original = WebGL2RenderingContext.prototype.drawElements;
    WebGL2RenderingContext.prototype.drawElements = function (...args) {
      if (this.canvas instanceof HTMLCanvasElement && this.canvas.classList.contains("usb-model-canvas")) draws.count++;
      return Reflect.apply(original, this, args);
    };
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(path);
  await expect(page.locator(".usb-model-viewer")).toHaveAttribute("data-status", "ready", { timeout: 20000 });
  const drawCount = () => page.evaluate(() => (window as unknown as { usbModelDraws: { count: number } }).usbModelDraws.count);
  const initial = await drawCount();
  expect(initial).toBeGreaterThan(0);
  await page.waitForTimeout(250);
  expect(await drawCount()).toBe(initial);
  await page.getByRole("button", { name: "Open USB cap" }).click();
  await expect.poll(drawCount).toBeGreaterThan(initial);
  const settled = await drawCount();
  await page.waitForTimeout(250);
  expect(await drawCount()).toBe(settled);
  await page.locator(".usb-model-canvas").evaluate(el => {
    const gl = (el as HTMLCanvasElement).getContext("webgl2");
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  });
  await expect(page.locator(".usb-model-viewer")).toHaveAttribute("data-status", "fallback");
  await expect(page.locator(".usb-product-photo")).toBeVisible();
  await page.getByRole("button", { name: "512GB RM 170.00", exact: true }).click();
  await expect(page.locator(".usb-price")).toContainText("RM 170.00");
});

test("rotation preserves the purchase layout and touch allows vertical page scrolling", async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(path);
  await expect(page.locator(".usb-model-viewer")).toHaveAttribute("data-status", "ready", { timeout: 20000 });
  const canvas = page.locator(".usb-model-canvas");
  await expect(canvas).toHaveCSS("touch-action", "pan-y");
  const before = await page.locator(".usb-purchase").boundingBox();
  const closed = await canvas.screenshot();
  const box = (await canvas.boundingBox())!;
  if (info.project.name === "mobile") {
    const session = await page.context().newCDPSession(page);
    const x = box.x + box.width / 2, y = box.y + box.height * .75;
    await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    for (let i = 1; i <= 6; i++) await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y - i * 22 }] });
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(50);
    await session.detach();
    await canvas.scrollIntoViewIfNeeded();
  } else {
    await page.mouse.move(box.x + box.width * .35, box.y + box.height * .5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * .7, box.y + box.height * .55, { steps: 8 });
    await page.mouse.up();
    await expect.poll(async () => (await canvas.screenshot()).equals(closed)).toBe(false);
    expect(await page.locator(".usb-purchase").boundingBox()).toEqual(before);
  }
  await page.getByRole("button", { name: "256GB RM 100.00", exact: true }).click();
  await expect(page.locator(".usb-price")).toContainText("RM 100.00");
  await expect(page.locator(".usb-scene-bottom")).toContainText("128GB · Sky Blue");
});

test("client navigation releases the old graphics context and reloads a working model", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(path);
  await expect(page.locator(".usb-model-viewer")).toHaveAttribute("data-status", "ready", { timeout: 20000 });
  await page.locator(".usb-model-canvas").evaluate(el => {
    Object.assign(window, { previousUsbContext: (el as HTMLCanvasElement).getContext("webgl2") });
  });
  await page.getByRole("link", { name: "Back to catalog", exact: true }).click();
  await expect(page).toHaveURL(/\/#shop$/);
  await expect(page.locator(".usb-model-canvas")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => (window as unknown as { previousUsbContext: WebGL2RenderingContext }).previousUsbContext.isContextLost())).toBe(true);
  await page.getByRole("article", { name: "Kingston DataTraveler Exodia G2" }).getByRole("button", { name: /Tear to view/ }).press("Enter");
  await expect(page).toHaveURL(/\/product\/kingston-dtxg2$/);
  await expect(page.locator(".usb-model-viewer")).toHaveAttribute("data-status", "ready", { timeout: 20000 });
  await page.getByRole("button", { name: "Open USB cap" }).click();
  await expect(page.getByRole("button", { name: "Close USB cap" })).toHaveAttribute("aria-pressed", "true");
  expect(errors).toEqual([]);
});
