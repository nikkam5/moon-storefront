import { expect, test } from "@playwright/test";
import { CART_STORAGE_KEY, cartTotal, MAX_QUANTITY, parseCart } from "../src/lib/product";
import { orderMessage } from "../src/lib/whatsapp";

test.use({ colorScheme: "light" });

test("Back to catalog restores listing and filter", async ({ page }) => {
  await page.goto("/shop");
  await page.getByRole("group", { name: "Filter products by category" }).getByRole("button", { name: "Motor Care" }).click();
  const before = await page.evaluate(() => scrollY);
  await page.getByRole("article", { name: "Motul 5100 4T 10W-40" }).locator(".catalog-card-link").click();
  await page.getByRole("link", { name: "Back to catalog" }).click();
  await expect(page).toHaveURL(/\/shop$/);
  await expect(page.getByRole("group", { name: "Filter products by category" }).getByRole("button", { name: "Motor Care" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".catalog-card:visible")).toHaveCount(2);
  await expect.poll(async () => page.evaluate(() => scrollY)).toBeGreaterThanOrEqual(before - 20);

  await page.goto("/");
  await page.getByRole("article", { name: "Kingston DataTraveler Exodia G2" }).locator(".catalog-card-link").click();
  await page.getByRole("link", { name: "Back to catalog" }).click();
  await expect(page).toHaveURL(/\/#shop$/);
  await expect(page.locator("#shop .catalog-card:visible")).toHaveCount(5);
});

test("catalog curtains over hero and story opens like a screen", async ({ page }) => {
  await page.goto("/");
  const hero = page.locator("#home");
  const catalog = page.locator("#shop");
  const story = page.locator("#about");
  await expect.poll(async () => catalog.evaluate((element) => getComputedStyle(element).position)).toBe("relative");
  const heroEnd = await hero.evaluate((element) => element.getBoundingClientRect().bottom + scrollY);
  const catalogTop = await catalog.evaluate((element) => element.getBoundingClientRect().top + scrollY);
  expect(catalogTop).toBeGreaterThanOrEqual(heroEnd - 1);
  await page.evaluate(() => window.scrollTo({ top: 220, behavior: "instant" }));
  const heroHeight = await hero.evaluate((element) => element.offsetHeight);
  await page.evaluate((height) => window.scrollTo({ top: 140 + height, behavior: "instant" }), heroHeight);
  await expect(hero).toHaveClass(/hero-exit/);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect(hero).not.toHaveClass(/hero-exit/);
  expect(await catalog.evaluate((element) => getComputedStyle(element).zIndex)).toBe("2");
  await story.scrollIntoViewIfNeeded();
  await expect(story).toHaveClass(/story-on/);
  await expect.poll(async () => story.locator(".story-screen").evaluate((element) => getComputedStyle(element).clipPath)).toContain("inset(0px");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect(story).not.toHaveClass(/story-on/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("reduced motion leaves the entire story visible", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("#about .story-screen")).toHaveCSS("clip-path", "none");
  await expect(page.locator("#about")).toHaveCSS("opacity", "1");
});

test("homepage product opens its own details and adds the chosen variant", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("article", { name: "Kingston DataTraveler Exodia G2" }).locator(".catalog-card-link").click();
  await expect(page).toHaveURL(/\/product\/kingston-dtxg2$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kingston DataTraveler Exodia G2");
  await expect(page.locator(".product-gallery img")).toHaveAttribute("src", "/products/usb.png");
  await expect(page.getByText("5-year official warranty")).toBeVisible();
  await page.getByRole("button", { name: /128GB/ }).click();
  await expect(page.locator(".detail-price")).toContainText("RM 55.00");
  await page.getByRole("button", { name: "Add to cart", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("128GB · Sky Blue");
  await page.getByRole("button", { name: "Close cart" }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto("/product/not-a-product");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Let’s find your way back.");
});

test("Popia detail preserves the supplied page with Moon Store header and working cart", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("article", { name: "Signature Popia Nestum Rangup" }).locator(".catalog-card-link").click();
  await expect(page).toHaveURL(/\/product\/popia-nestum$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Rangup.Manis.Nestum.");
  await expect(page.locator(".popia-page .photo img")).toHaveAttribute("src", "/products/popia-nestum.png");
  await expect(page.locator(".popia-page .price-row")).toContainText("RM10.00");
  await expect(page.locator(".popia-page .topbar")).toHaveText("Popia Nestum rangup • 250g • RM10 sahaja");
  await expect(page.locator(".popia-page .sticker")).toContainText("RM10");
  await expect(page.locator(".popia-page .band h2")).toHaveText("Satu bekas, banyak kenangan.");
  await expect(page.locator(".popia-page .card")).toHaveCount(3);
  await expect(page.locator(".site-footer")).toHaveCount(0);
  await expect(page.locator(".popia-page footer")).toContainText("Rangup sampai habis.");
  await expect(page.getByRole("banner").getByRole("link", { name: "MOON STORE home" })).toBeVisible();
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator(".popia-page")).toHaveCSS("background-color", "rgb(25, 30, 25)");
  await page.getByRole("button", { name: "Increase quantity" }).click();
  await expect(page.locator(".popia-page .qty")).toContainText("2");
  await page.getByRole("button", { name: "Tambah ke Cart" }).click();
  await expect(page.getByRole("dialog", { name: "Your Cart" }).locator(".total")).toContainText("RM20.00");
  await page.getByRole("button", { name: "Close cart" }).click();
  await page.getByRole("button", { name: "Open cart, 2 items" }).click();
  await expect(page.getByRole("dialog").locator(".subtotal")).toContainText("RM 20.00");
  await page.getByRole("button", { name: "Close cart" }).click();
  await page.getByRole("banner").getByRole("link", { name: "MOON STORE home" }).click();
  await expect(page).toHaveURL(/\/$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("catalog filters, capacities, contacts and anchored navigation", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page).toHaveTitle(/Moon Store/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tech Essentials, Performance Engine Oils & Signature Treats.");
  await page.getByRole("link", { name: "Explore Catalog", exact: true }).click();
  await expect(page).toHaveURL(/#shop$/);
  await expect(page.locator(".catalog-card:visible")).toHaveCount(5);
  const filters = page.getByRole("group", { name: "Filter products by category" });
  await filters.getByRole("button", { name: "Tech Storage" }).click();
  await expect(page.locator(".catalog-card:visible")).toHaveCount(1);
  const usb = page.getByRole("article", { name: "Kingston DataTraveler Exodia G2" });
  await expect(usb.locator(".product-price")).toHaveText("From RM 35.00");
  await filters.getByRole("button", { name: "Motor Care" }).click();
  await expect(page.locator(".catalog-card:visible")).toHaveCount(2);
  await filters.getByRole("button", { name: "Sweet Treats" }).click();
  await expect(page.locator(".catalog-card:visible")).toHaveCount(2);
  await filters.getByRole("button", { name: "All" }).click();
  await usb.locator(".catalog-card-link").click();
  for (const [capacity, price] of [["64GB", "35.00"], ["128GB", "55.00"], ["256GB", "95.00"], ["512GB", "165.00"]]) {
    await page.getByRole("button", { name: new RegExp(capacity) }).click();
    await expect(page.locator(".detail-price")).toContainText(`RM ${price}`);
  }
  await expect(page.getByText("5-year official warranty")).toBeVisible();
  await page.goto("/#about");
  for (const name of ["Iman Asnawi", "Arish Haikal", "Nik Amir"]) await expect(page.locator(".team-list")).toContainText(name);
  await expect(page.locator("#contact")).toContainText("22000 Jerteh, Besut, Terengganu");
  await expect(page.locator('#contact a[href="tel:+601161647061"]')).toBeVisible();
  await expect(page.locator('#contact a[href="mailto:m00nstor32026@gmail.com"]')).toBeVisible();
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Contact" }).click();
    await expect(page).toHaveURL(/#contact$/);
    await expect(page.getByRole("button", { name: "Open menu" })).toHaveAttribute("aria-expanded", "false");
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test("variant cart totals, persistence, and exact WhatsApp handoff", async ({ page, context }) => {
  await page.goto("/shop");
  const usb = page.getByRole("article", { name: "Kingston DataTraveler Exodia G2" });
  await usb.getByRole("button", { name: "128GB", exact: true }).click();
  await usb.getByRole("button", { name: /Add .* to cart/ }).click();
  const drawer = page.getByRole("dialog");
  await expect(drawer.locator(".subtotal")).toHaveText("SubtotalRM 55.00");
  await page.getByRole("button", { name: "Close cart" }).click();
  await page.getByRole("article", { name: "Motul 7100 4T 10W-40" }).getByRole("button", { name: /Add .* to cart/ }).click();
  await page.getByRole("button", { name: "Close cart" }).click();
  await page.getByRole("article", { name: "Signature Popia Nestum Rangup" }).getByRole("button", { name: /Add .* to cart/ }).click();
  await page.getByRole("button", { name: "Increase Signature Popia Nestum Standard Jar quantity" }).click();
  await expect(drawer.locator(".subtotal")).toContainText("RM 225.00");
  const checkout = drawer.getByRole("link", { name: "Order on WhatsApp" });
  const url = new URL((await checkout.getAttribute("href"))!);
  expect(url.origin + url.pathname).toBe("https://wa.me/601161647061");
  expect(url.searchParams.get("text")).toBe("Hello Moon Store! I would like to place an order from your website:\n\n- 1x Kingston DTXG2 USB Flash Drive (128GB - Sky Blue) - RM 55.00\n- 1x Motul 7100 4T 10W-40 (1 Litre) - RM 150.00\n- 2x Signature Popia Nestum (Standard Jar) - RM 20.00\n\nTotal: RM 225.00\n\nDelivery / Pickup details:\nName: [Customer to fill]\nDelivery Address: [Customer to fill]");
  // Intercept externally: verify navigation without sending an order or contacting WhatsApp.
  await context.route("https://wa.me/**", (route) => route.fulfill({ contentType: "text/html", body: "<h1>WhatsApp handoff test</h1>" }));
  const popupPromise = page.waitForEvent("popup");
  await checkout.click();
  const popup = await popupPromise;
  await popup.waitForLoadState();
  expect(popup.url()).toBe(url.href);
  await popup.close();
  await page.getByRole("button", { name: "Close cart" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Open cart, 4 items" }).click();
  await expect(drawer.locator(".subtotal")).toContainText("RM 225.00");
  await page.getByRole("button", { name: "Close cart" }).click();
  await usb.getByRole("button", { name: "64GB", exact: true }).click();
  await usb.getByRole("button", { name: /Add .* to cart/ }).click();
  await expect(drawer.locator(".cart-row")).toHaveCount(4);
  await expect(drawer.locator(".subtotal")).toContainText("RM 260.00");
  await page.getByRole("button", { name: "Remove Kingston DTXG2 USB Flash Drive 128GB", exact: true }).click();
  await expect(drawer.locator(".subtotal")).toContainText("RM 205.00");
  await page.getByRole("link", { name: "Review full cart" }).click();
  await expect(page).toHaveURL(/\/cart$/);
  await page.getByRole("button", { name: "Decrease Signature Popia Nestum Standard Jar quantity" }).click();
  await expect(page.locator(".summary-total")).toContainText("RM 195.00");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("light and dark themes persist and work on cart pages", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  const light = await page.locator("body").evaluate((element) => getComputedStyle(element).backgroundColor);
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const dark = await page.locator("body").evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(dark).not.toBe(light);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.goto("/cart");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Switch to light theme" }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("system theme and reduced-motion content stay accessible", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator(".reveal-pending")).toHaveCount(0);
  await expect(page.locator("#contact")).toHaveCSS("opacity", "1");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("malformed cart recovery, quantity limits, and empty checkout", async ({ page }) => {
  await page.addInitScript(({ key, max }) => {
    localStorage.setItem(key, JSON.stringify([{ productId: "usb", quantity: 1 }, { productId: "kingston-dtxg2", variantId: "bad", quantity: 4 }, { productId: "motul-5100", variantId: "1-litre", quantity: -2 }, { productId: "honey-cornflakes", variantId: "standard-jar", quantity: max + 5 }]));
  }, { key: CART_STORAGE_KEY, max: MAX_QUANTITY });
  await page.goto("/shop");
  await page.getByRole("button", { name: "Open cart, 10 items" }).click();
  await expect(page.getByRole("dialog").locator(".cart-row")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Increase Golden Honey Cornflakes Standard Jar quantity" })).toBeDisabled();
  await page.getByRole("button", { name: "Remove Golden Honey Cornflakes Standard Jar" }).click();
  await expect(page.getByRole("link", { name: "Order on WhatsApp" })).toHaveCount(0);
  await page.getByRole("button", { name: "Close cart" }).click();
  await page.getByRole("article", { name: "Motul 5100 4T 10W-40" }).getByRole("button", { name: /Add .* to cart/ }).click();
  await expect(page.getByRole("dialog").locator(".subtotal")).toContainText("RM 55.00");
});

test("cross-tab cart changes are synchronized", async ({ page, context }) => {
  await page.goto("/shop");
  const second = await context.newPage();
  await second.goto("/shop");
  await page.getByRole("article", { name: "Kingston DataTraveler Exodia G2" }).getByRole("button", { name: /Add .* to cart/ }).click();
  await expect(second.getByRole("button", { name: "Open cart, 1 item" })).toBeVisible();
  await second.getByRole("article", { name: "Motul 7100 4T 10W-40" }).getByRole("button", { name: /Add .* to cart/ }).click();
  await expect(page.getByRole("dialog").locator(".subtotal")).toContainText("RM 185.00");
  await expect(second.getByRole("dialog").locator(".cart-row")).toHaveCount(2);
  await second.close();
});

test("landscape drawer allows quantity controls", async ({ page }) => {
  await page.setViewportSize({ width: 667, height: 375 });
  await page.goto("/shop");
  await page.getByRole("article", { name: "Kingston DataTraveler Exodia G2" }).getByRole("button", { name: /Add .* to cart/ }).click();
  await page.getByRole("button", { name: "Increase Kingston DTXG2 USB Flash Drive 64GB quantity" }).click();
  await expect(page.getByRole("dialog").locator(".subtotal")).toContainText("RM 70.00");
});

test("cart parser rejects invalid values and uses catalog prices", () => {
  const cart = parseCart([null, {}, { productId: "kingston-dtxg2", variantId: "128gb", quantity: 1, price: 1 }, { productId: "kingston-dtxg2", variantId: "128gb", quantity: 5 }, { productId: "motul-7100", variantId: "1-litre", quantity: 1 }, { productId: "popia-nestum", variantId: "standard-jar", quantity: 2 }, { productId: "popia-nestum", variantId: "standard-jar", quantity: 1.2 }]);
  expect(cart).toHaveLength(3);
  expect(cartTotal(cart)).toBe(225);
  expect(orderMessage(cart)).toContain("Total: RM 225.00");
  expect(parseCart("not an array")).toEqual([]);
});

test("cart remains usable when browser storage writes fail", async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new DOMException("Storage full", "QuotaExceededError"); };
  });
  await page.goto("/shop");
  await page.getByRole("article", { name: "Kingston DataTraveler Exodia G2" }).getByRole("button", { name: /Add .* to cart/ }).click();
  await page.getByRole("button", { name: "Close cart" }).click();
  await page.getByRole("article", { name: "Motul 5100 4T 10W-40" }).getByRole("button", { name: /Add .* to cart/ }).click();
  await expect(page.getByRole("dialog").locator(".cart-row")).toHaveCount(2);
  await expect(page.getByRole("dialog").locator(".subtotal")).toContainText("RM 90.00");
});

test("server-rendered content stays readable without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL: "http://127.0.0.1:3100" });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.locator("#about .about-copy")).toHaveCSS("opacity", "1");
  await expect(page.locator("#contact")).toHaveCSS("opacity", "1");
  await expect(page.locator(".catalog-card")).toHaveCount(5);
  await context.close();
});
