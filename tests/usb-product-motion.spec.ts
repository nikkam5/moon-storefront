import { expect, test } from "@playwright/test";
import { CART_STORAGE_KEY, MAX_QUANTITY } from "../src/lib/product";

const usbPath = "/product/kingston-dtxg2";

test("USB capacities update together and retain the labelled blue 128GB presentation", async ({ page }) => {
  await page.goto(usbPath);
  for (const [capacity, price, colour] of [
    ["64GB", "40.00", "Matte Black"], ["128GB", "60.00", "Sky Blue"],
    ["256GB", "100.00", "Lime Green"], ["512GB", "170.00", "Deep Purple"],
  ]) {
    const option = page.getByRole("button", { name: capacity + " RM " + price, exact: true });
    await option.click();
    await expect(option).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".usb-selected-option")).toContainText(capacity + " / " + colour);
    await expect(page.locator(".usb-price")).toContainText("RM " + price);
    await expect(page.locator(".usb-capacity-value")).toHaveText(capacity.replace("GB", ""));
    await expect(page.locator(".usb-scene-bottom")).toContainText("128GB · Sky Blue");
  }
  await page.getByRole("button", { name: "Increase USB quantity" }).click();
  await page.getByRole("button", { name: "Add to cart", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("512GB");
  await expect(dialog.locator(".subtotal")).toContainText("RM 340.00");
  await dialog.getByRole("button", { name: "Close cart" }).click();
  await expect(page.getByRole("button", { name: "Add to cart", exact: true })).toContainText("Added to cart");
});

test("rapid capacity selection settles on one option and one visible price", async ({ page }) => {
  await page.goto(usbPath);
  const options = page.locator(".usb-capacity-options button");
  await expect(options.first()).toBeEnabled();
  for (const index of [3, 1, 2, 0, 3, 2]) await options.nth(index).click();
  await expect(options.nth(2)).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('.usb-capacity-options button[aria-pressed="true"]')).toHaveCount(1);
  await expect(page.locator(".usb-price strong")).toHaveCount(1);
  await expect(page.locator(".usb-price strong")).toHaveText("RM 100.00");
  await expect(page.locator(".usb-capacity-value > span")).toHaveCount(1);
  await expect(page.locator(".usb-capacity-value")).toHaveText("256");
  await expect(page.locator(".usb-capacity-highlight")).toHaveCount(1);
});

test("quantity uses only the remaining capacity limit and recovers on another variant", async ({ page }) => {
  await page.addInitScript(({ key, max }) => {
    localStorage.setItem(key, JSON.stringify([{ productId: "kingston-dtxg2", variantId: "64gb", quantity: max - 2 }]));
  }, { key: CART_STORAGE_KEY, max: MAX_QUANTITY });
  await page.goto(usbPath);
  const increase = page.getByRole("button", { name: "Increase USB quantity" });
  await increase.click();
  await expect(increase).toBeDisabled();
  await expect(page.locator(".usb-quantity > span")).toHaveText("2");
  await page.getByRole("button", { name: "Add to cart", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Close cart" }).click();
  await expect(page.getByRole("button", { name: "Add to cart", exact: true })).toBeDisabled();
  await expect(page.locator("#detail-quantity-limit")).toContainText("Limit 10 per capacity");
  await page.getByRole("button", { name: "128GB RM 60.00", exact: true }).click();
  await expect(page.getByRole("button", { name: "Add to cart", exact: true })).toBeEnabled();
  await expect(page.locator(".usb-quantity > span")).toHaveText("1");
  await expect(increase).toBeEnabled();
});

test("USB capacity and quantity work by keyboard and cart restores focus", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(usbPath);
  const capacity = page.getByRole("button", { name: "128GB RM 60.00", exact: true });
  await expect(capacity).toBeEnabled();
  await capacity.focus();
  await page.keyboard.press("Enter");
  await expect(capacity).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Increase USB quantity" }).focus();
  await page.keyboard.press("Space");
  await expect(page.locator(".usb-quantity > span")).toHaveText("2");
  const add = page.getByRole("button", { name: "Add to cart", exact: true });
  await add.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog").locator(".subtotal")).toContainText("RM 120.00");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(add).toBeFocused();
});

test("USB ambient motion pauses off-screen and responds to live reduced motion", async ({ page }) => {
  await page.setViewportSize({ ...page.viewportSize()!, height: 700 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(usbPath);
  const scene = page.locator(".usb-scene");
  const beam = page.locator(".usb-ambient-sweep");
  await expect(scene).toHaveAttribute("data-motion", "running");
  await expect(beam).toHaveCSS("animation-play-state", "running");
  await page.locator(".footer-bottom").scrollIntoViewIfNeeded();
  await expect(scene).toHaveAttribute("data-motion", "paused");
  await expect(beam).toHaveCSS("animation-play-state", "paused");
  await scene.scrollIntoViewIfNeeded();
  await expect(scene).toHaveAttribute("data-motion", "running");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(scene).toHaveAttribute("data-motion", "paused");
  await expect(beam).toHaveCSS("animation-name", "none");
  await expect(page.locator(".usb-title-model")).toHaveCSS("opacity", "1");
  await page.getByRole("button", { name: "256GB RM 100.00", exact: true }).click();
  await expect(page.locator(".usb-capacity-value")).toHaveText("256");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await scene.scrollIntoViewIfNeeded();
  await expect(scene).toHaveAttribute("data-motion", "running");
});

test("desktop model hover resets on reduced motion and leaves purchase controls stationary", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "Mouse tilt is deliberately excluded on touch devices.");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(usbPath);
  await expect(page.locator(".usb-scene")).toHaveAttribute("data-motion", "running");
  const orbit = page.locator(".usb-product-orbit");
  await expect(page.locator(".usb-model-viewer")).toHaveAttribute("data-status", "ready", { timeout: 20000 });
  const purchase = page.locator(".usb-purchase");
  const before = await purchase.boundingBox();
  const box = (await orbit.boundingBox())!;
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".usb-scene")).toHaveAttribute("data-motion", "paused");
  await page.getByRole("button", { name: "Reset USB view" }).click();
  // Compare the model itself; the background type has compositor edge rounding.
  const takeModel = () => page.screenshot({ clip: {
    x: Math.floor(box.x + box.width * .4), y: Math.floor(box.y + box.height * .2),
    width: Math.floor(box.width * .25), height: Math.floor(box.height * .65),
  } });
  const still = await takeModel();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.mouse.move(box.x + box.width * .85, box.y + box.height * .8);
  await expect.poll(async () => (await takeModel()).equals(still)).toBe(false);
  expect(await purchase.boundingBox()).toEqual(before);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".usb-scene")).toHaveAttribute("data-motion", "paused");
  await expect.poll(async () => (await takeModel()).equals(still)).toBe(true);
});

test("mobile purchase bar appears after the controls and orders the chosen quantity", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile", "The purchase bar is a phone-only affordance.");
  await page.goto(usbPath);
  await expect(page.locator(".usb-mobile-purchase")).toHaveCount(0);
  await page.getByRole("button", { name: "256GB RM 100.00", exact: true }).click();
  await page.getByRole("button", { name: "Increase USB quantity" }).click();
  await expect(page.locator(".usb-quantity > span")).toHaveText("2");
  await page.getByRole("contentinfo").scrollIntoViewIfNeeded();
  const bar = page.locator(".usb-mobile-purchase");
  await expect(bar).toBeVisible();
  await expect(bar).toContainText("RM 200.00");
  await expect(bar).toContainText("2 × 256GB");
  await bar.getByRole("button", { name: "Add selected USB to cart" }).click();
  await expect(page.getByRole("dialog")).toContainText("256GB");
  await expect(page.getByRole("dialog").locator(".subtotal")).toContainText("RM 200.00");
});

test("USB layout fits narrow phones and both themes without horizontal overflow", async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto(usbPath);
  for (const theme of ["light", "dark"]) {
    const current = await page.locator("html").getAttribute("data-theme");
    if (current !== theme) await page.getByRole("button", { name: "Switch to " + theme + " theme" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await page.getByRole("button", { name: "512GB RM 170.00", exact: true }).click();
    await expect(page.locator(".usb-price")).toContainText("RM 170.00");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    await page.locator(".usb-purchase").scrollIntoViewIfNeeded();
    const button = (await page.getByRole("button", { name: "Add to cart", exact: true }).boundingBox())!;
    expect(button.x).toBeGreaterThanOrEqual(0);
    expect(button.x + button.width).toBeLessThanOrEqual(320);
  }
  await page.getByRole("heading", { name: "Kingston DataTraveler Exodia G2", exact: true }).click();
  await page.screenshot({ path: info.outputPath("usb-320px.png") });
});
