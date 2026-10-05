import { expect, test } from "@playwright/test";
import { customerFeedback } from "../src/lib/customer-feedback";
import { CART_STORAGE_KEY, MAX_QUANTITY } from "../src/lib/product";

test("feedback photo preview precedes the form and opens all supplied images in equal frames", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/#feedback");
  const preview = page.locator(".feedback-proof-preview");
  const viewAll = page.getByRole("button", { name: "View All Feedback", exact: true });
  await expect(preview).toBeVisible();
  const positions = await page.evaluate(() => ({
    preview: document.querySelector(".feedback-proof-preview")!.getBoundingClientRect().top,
    form: document.querySelector(".feedback-form")!.getBoundingClientRect().top,
  }));
  expect(positions.preview).toBeLessThan(positions.form);
  await expect(preview.locator(".feedback-bounce-cards")).toHaveAttribute("data-animation", "ready");
  await expect(preview.locator(".feedback-bounce-card img")).toHaveCount(3);
  const previewSizes = await preview.locator(".feedback-bounce-card").evaluateAll(cards => cards.map(card => ({ width: (card as HTMLElement).offsetWidth, height: (card as HTMLElement).offsetHeight })));
  for (const size of previewSizes) expect(size).toEqual(previewSizes[0]);
  for (const image of await preview.locator(".feedback-bounce-card img").all()) await expect(image).toHaveCSS("object-fit", "contain");
  await viewAll.click();
  const gallery = page.getByRole("dialog", { name: "Customer Feedback", exact: true });
  await expect(gallery).toBeVisible();
  await expect(viewAll).toHaveAttribute("aria-expanded", "true");
  await expect(gallery.locator(".feedback-image-card")).toHaveCount(customerFeedback.length);
  await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
  const frames = await gallery.locator(".feedback-image-frame").evaluateAll(elements => elements.map(element => {
    const bounds = element.getBoundingClientRect();
    return { width: bounds.width, height: bounds.height };
  }));
  for (const frame of frames) {
    expect(Math.abs(frame.width - frames[0].width)).toBeLessThan(1);
    expect(Math.abs(frame.height - frames[0].height)).toBeLessThan(1);
  }
  for (const photo of customerFeedback) {
    const image = gallery.getByRole("img", { name: photo.alt, exact: true });
    await expect(image).toHaveCSS("object-fit", "contain");
    await expect.poll(() => image.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBe(photo.width);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("gallery enlarges screenshots, supports navigation and restores focus on Escape", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#feedback");
  const viewAll = page.getByRole("button", { name: "View All Feedback", exact: true });
  await viewAll.press("Enter");
  const gallery = page.getByRole("dialog", { name: "Customer Feedback", exact: true });
  const close = gallery.getByRole("button", { name: "Close feedback gallery" });
  await expect(close).toBeFocused();
  const secondImage = gallery.getByRole("button", { name: "Enlarge customer feedback screenshot 2" });
  await secondImage.click();
  await expect(gallery.locator(".feedback-full-image img")).toHaveAttribute("src", customerFeedback[1].src);
  await gallery.getByRole("button", { name: "Next feedback image", exact: true }).click();
  await expect(gallery.locator(".feedback-full-image img")).toHaveAttribute("src", customerFeedback[2].src);
  await page.keyboard.press("ArrowRight");
  await expect(gallery.locator(".feedback-full-image img")).toHaveAttribute("src", customerFeedback[0].src);
  await page.keyboard.press("Escape");
  await expect(gallery.locator(".feedback-image-grid")).toBeVisible();
  await expect(gallery.getByRole("button", { name: "Enlarge customer feedback screenshot 1" })).toBeFocused();
  for (const key of ["Tab", "Shift+Tab"]) for (let index = 0; index < 6; index++) {
    await page.keyboard.press(key);
    expect(await page.evaluate(() => !!document.activeElement?.closest("dialog[open]"))).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(gallery).not.toBeVisible();
  await expect(viewAll).toBeFocused();
  await expect(viewAll).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
});

test("feedback gallery fits narrow screens in both themes and respects live reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/#feedback");
  const viewAll = page.getByRole("button", { name: "View All Feedback", exact: true });
  for (const theme of ["light", "dark"] as const) {
    const toggle = page.getByRole("button", { name: `Switch to ${theme} theme` });
    if (await toggle.count()) await toggle.click();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.locator(".feedback-bounce-cards")).toHaveAttribute("data-animation", "static");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    await viewAll.click();
    const gallery = page.getByRole("dialog", { name: "Customer Feedback", exact: true });
    await expect(gallery).toBeVisible();
    const dimensions = await gallery.evaluate(element => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, right: rect.right, overflow: element.scrollWidth > element.clientWidth };
    });
    expect(dimensions.left).toBeGreaterThanOrEqual(0);
    expect(dimensions.right).toBeLessThanOrEqual(320);
    expect(dimensions.overflow).toBe(false);
    await gallery.getByRole("button", { name: "Close feedback gallery" }).click();
  }
});

test("feedback images remain directly accessible without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  try {
    const page = await context.newPage();
    await page.goto("/#feedback");
    for (const [index, photo] of customerFeedback.entries()) {
      await expect(page.getByRole("link", { name: `View customer feedback screenshot ${index + 1}`, exact: true })).toHaveAttribute("href", photo.src);
    }
  } finally { await context.close(); }
});

test("each preview photo opens its full screenshot and restores focus", async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#feedback");
  for (const [index, photo] of customerFeedback.slice(0, 3).entries()) {
    const card = page.getByRole("button", { name: `Open customer feedback screenshot ${index + 1}`, exact: true });
    if (index === 0) await card.press("Enter");
    else {
      // The right photo overlaps the center photo; use its visible right edge.
      const position = await card.evaluate((element, ratio) => ({ x: (element as HTMLElement).clientWidth * ratio, y: (element as HTMLElement).clientHeight * .5 }), index === 2 ? .85 : .5);
      if (info.project.name === "mobile") await card.tap({ position });
      else await card.click({ position });
    }
    const gallery = page.getByRole("dialog", { name: "Customer Feedback", exact: true });
    await expect(gallery.locator(".feedback-full-image img")).toHaveAttribute("src", photo.src);
    await page.keyboard.press("Escape");
    await expect(gallery.locator(".feedback-image-grid")).toBeVisible();
    await expect(gallery.getByRole("button", { name: `Enlarge customer feedback screenshot ${index + 1}`, exact: true })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(card).toBeFocused();
  }
});

test("bounce preview enters on view, spreads on focus and settles for reduced motion", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const stage = page.locator(".feedback-bounce-cards");
  const cards = stage.locator(".feedback-bounce-card");
  await expect(stage).toHaveAttribute("data-animation", "waiting");
  await stage.scrollIntoViewIfNeeded();
  await expect(stage).toHaveAttribute("data-animation", "ready");
  const rotation = () => cards.first().evaluate(element => {
    const matrix = new DOMMatrix(getComputedStyle(element).transform);
    return Math.abs(Math.atan2(matrix.b, matrix.a) * 180 / Math.PI);
  });
  expect(await rotation()).toBeGreaterThan(1);
  const otherBefore = await cards.nth(2).boundingBox();
  if (info.project.name === "desktop") {
    const first = (await cards.first().boundingBox())!;
    await page.mouse.move(first.x + first.width / 2, first.y + first.height / 2);
  } else await cards.first().focus();
  await expect.poll(rotation).toBeLessThan(.1);
  await expect.poll(async () => (await cards.nth(2).boundingBox())!.x - otherBefore!.x).toBeGreaterThan(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(stage).toHaveAttribute("data-animation", "static");
  const still = await cards.evaluateAll(elements => elements.map(element => getComputedStyle(element).transform));
  await cards.nth(2).focus();
  await cards.first().focus();
  expect(await cards.evaluateAll(elements => elements.map(element => getComputedStyle(element).transform))).toEqual(still);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(stage).toHaveAttribute("data-animation", "ready");
  await page.locator("#home").scrollIntoViewIfNeeded();
  await expect(stage).toHaveAttribute("data-animation", "paused");
  await page.getByRole("link", { name: "Shop all products", exact: true }).click();
  await expect(stage).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("Cornflakes jar options carry their price and quantity into separate cart rows and checkout", async ({ page }) => {
  await page.goto("/product/honey-cornflakes");
  const mini = page.getByRole("radio", { name: /Mini Jar/ });
  const standard = page.getByRole("radio", { name: /Standard Jar/ });
  await expect(standard).toBeChecked();
  await expect(page.locator(".honey-page .price")).toHaveText("RM 15.00");
  await mini.check();
  await expect(page.locator(".honey-page .price")).toHaveText("RM 10.00");
  await page.getByRole("button", { name: "Increase quantity", exact: true }).click();
  await page.getByRole("button", { name: "Add to cart", exact: true }).click();
  const cart = page.getByRole("dialog", { name: /^Your cart/ });
  await expect(cart.locator(".subtotal")).toContainText("RM 20.00");
  await page.getByRole("button", { name: "Close cart", exact: true }).click();
  await standard.check();
  await expect(page.locator(".honey-page .qty span")).toHaveText("1");
  await page.getByRole("button", { name: "Add to cart", exact: true }).click();
  await expect(cart.locator(".cart-row")).toHaveCount(2);
  await expect(cart.locator(".subtotal")).toContainText("RM 35.00");
  const href = await cart.getByRole("link", { name: "Order on WhatsApp" }).getAttribute("href");
  const message = new URL(href!).searchParams.get("text");
  expect(message).toContain("2x Golden Honey Cornflakes (Mini Jar - Approx. 150g) - RM 20.00");
  expect(message).toContain("1x Golden Honey Cornflakes (Standard Jar - Approx. 250g) - RM 15.00");
  await page.getByRole("button", { name: "Close cart", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "Open cart, 3 items", exact: true }).click();
  await expect(cart.locator(".subtotal")).toContainText("RM 35.00");
});

test("Cornflakes variants respect separate limits and clamp when another tab changes the cart", async ({ page, context }) => {
  await page.addInitScript(({ key, max }) => {
    if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify([{ productId: "honey-cornflakes", variantId: "mini-jar", quantity: max }]));
  }, { key: CART_STORAGE_KEY, max: MAX_QUANTITY });
  await page.goto("/product/honey-cornflakes");
  await page.getByRole("radio", { name: /Mini Jar/ }).check();
  const add = page.getByRole("button", { name: "Add to cart", exact: true });
  await expect(add).toBeDisabled();
  await page.getByRole("radio", { name: /Standard Jar/ }).check();
  for (let index = 0; index < 4; index++) await page.getByRole("button", { name: "Increase quantity", exact: true }).click();
  const second = await context.newPage();
  try {
    await second.goto("/product/honey-cornflakes");
    const secondAdd = second.getByRole("button", { name: "Add to cart", exact: true });
    await expect(secondAdd).toBeEnabled();
    for (let index = 0; index < 8; index++) await second.getByRole("button", { name: "Increase quantity", exact: true }).click();
    await expect(second.locator(".honey-page .qty span")).toHaveText("9");
    await secondAdd.click();
    await expect(second.getByRole("dialog").locator(".subtotal")).toContainText("RM 235.00");
    await expect(page.locator(".honey-page .qty span")).toHaveText("1");
    await expect(add).toBeEnabled();
    await add.click();
    await expect(page.getByRole("dialog").getByRole("button", { name: "Increase Golden Honey Cornflakes Standard Jar quantity" })).toBeDisabled();
  } finally { await second.close(); }
});

test("shop jar selections update Cornflakes price and add the chosen option", async ({ page }) => {
  await page.goto("/shop");
  const product = page.getByRole("article", { name: "Golden Honey Cornflakes" });
  await expect(product.getByRole("group", { name: "Golden Honey Cornflakes jar size" })).toBeVisible();
  await product.getByRole("button", { name: "Standard Jar", exact: true }).click();
  await expect(product.locator(".product-price")).toHaveText("RM 15.00");
  await product.getByRole("button", { name: "Mini Jar", exact: true }).click();
  await expect(product.locator(".product-price")).toHaveText("RM 10.00");
  await product.getByRole("button", { name: "Add Golden Honey Cornflakes Mini Jar to cart", exact: true }).click();
  await expect(page.getByRole("dialog").locator(".cart-row")).toContainText("Mini Jar · Approx. 150g");
});

test("Cornflakes decorative motion follows live reduced-motion preference", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/product/honey-cornflakes");
  await expect(page.locator(".honey-page")).toHaveAttribute("data-motion", "active");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".honey-page")).toHaveAttribute("data-motion", "paused");
  await expect(page.locator(".honey-page .hex-float").first()).toHaveCSS("animation-name", "none");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator(".honey-page")).toHaveAttribute("data-motion", "active");
});
