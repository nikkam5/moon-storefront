import { expect, test } from "@playwright/test";

const destinations = [
  ["Facebook", "https://www.facebook.com/share/1EUjt43LbE/"],
  ["Instagram", "https://www.instagram.com/moon.store_my/"],
  ["WhatsApp", "https://wa.me/601161647061"],
] as const;

test("footer social links open the supplied destinations exactly once", async ({ page, context }, testInfo) => {
  await page.goto("/shop");
  const socials = page.getByRole("navigation", { name: "Moon Store social links" });
  await socials.scrollIntoViewIfNeeded();
  await expect(socials.getByRole("link")).toHaveCount(3);
  const row = await socials.boundingBox();
  const tagline = await page.locator(".footer-brand > p").boundingBox();
  expect(row!.y + row!.height).toBeLessThanOrEqual(tagline!.y);
  await context.route(/^https:\/\/(?:www\.facebook\.com|www\.instagram\.com|wa\.me)\//, (route) => route.fulfill({ contentType: "text/html", body: "<h1>Social link test</h1>" }));
  let popups = 0;
  page.on("popup", () => popups++);
  for (const [label, href] of destinations) {
    const link = socials.getByRole("link", { name: `${label} (opens in a new tab)` });
    await expect(link).toHaveAttribute("href", href);
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
    const opened = page.waitForEvent("popup");
    if (testInfo.project.name === "mobile") await link.tap();
    else await link.click();
    const popup = await opened;
    await popup.waitForLoadState();
    expect(popup.url()).toBe(href);
    expect(await popup.evaluate(() => window.opener === null)).toBe(true);
    await popup.close();
  }
  expect(popups).toBe(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("SlingButton can cancel a pull and still open by keyboard", async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop");
  await page.goto("/shop");
  const socials = page.getByRole("navigation", { name: "Moon Store social links" });
  await socials.scrollIntoViewIfNeeded();
  const link = socials.getByRole("link", { name: "Instagram (opens in a new tab)" });
  await link.hover();
  const box = await link.boundingBox();
  let popups = 0;
  page.on("popup", () => popups++);
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2 - 100, { steps: 6 });
  await expect(link).toHaveAttribute("data-armed", "");
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(link).not.toHaveAttribute("data-armed", "");
  expect(popups).toBe(0);
  await context.route("https://www.instagram.com/**", (route) => route.fulfill({ contentType: "text/html", body: "<h1>Instagram test</h1>" }));
  await link.focus();
  const opened = page.waitForEvent("popup");
  await page.keyboard.press("Enter");
  const popup = await opened;
  await popup.waitForLoadState();
  expect(popup.url()).toBe(destinations[1][1]);
  expect(popups).toBe(1);
  await popup.close();
});

test("SlingButton loaded release opens one social page and resets", async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop");
  await page.goto("/shop");
  const socials = page.getByRole("navigation", { name: "Moon Store social links" });
  await socials.scrollIntoViewIfNeeded();
  const link = socials.getByRole("link", { name: "Facebook (opens in a new tab)" });
  await link.hover();
  const box = await link.boundingBox();
  await context.route("https://www.facebook.com/**", (route) => route.fulfill({ contentType: "text/html", body: "<h1>Facebook test</h1>" }));
  let popups = 0;
  page.on("popup", () => popups++);
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2 - 100, { steps: 6 });
  await expect(link).toHaveAttribute("data-armed", "");
  const opened = page.waitForEvent("popup");
  await page.mouse.up();
  const popup = await opened;
  await popup.waitForLoadState();
  expect(popup.url()).toBe(destinations[0][1]);
  await popup.close();
  await expect(link).not.toHaveAttribute("data-held", "");
  await expect.poll(() => socials.locator(".sling-button__move").first().evaluate((element) => {
    const transform = getComputedStyle(element).transform;
    if (transform === "none") return 0;
    const matrix = new DOMMatrixReadOnly(transform);
    return Math.hypot(matrix.m41, matrix.m42);
  })).toBeLessThan(1);
  expect(popups).toBe(1);
});

test("social keyboard activation works with reduced motion", async ({ page, context }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/shop");
  const socials = page.getByRole("navigation", { name: "Moon Store social links" });
  const link = socials.getByRole("link", { name: "WhatsApp (opens in a new tab)" });
  await link.focus();
  await context.route("https://wa.me/**", (route) => route.fulfill({ contentType: "text/html", body: "<h1>WhatsApp test</h1>" }));
  const opened = page.waitForEvent("popup");
  await link.press("Space");
  const popup = await opened;
  await popup.waitForLoadState();
  expect(popup.url()).toBe(destinations[2][1]);
  await popup.close();
  await expect(link.locator(".sling-button__face")).toHaveCSS("transform", "none");
});

test("Cornflakes footer places the same social links above its tagline", async ({ page }) => {
  await page.goto("/product/honey-cornflakes");
  const socials = page.getByRole("navigation", { name: "Moon Store social links" });
  await expect(socials.getByRole("link")).toHaveCount(3);
  for (const [label, href] of destinations) await expect(socials.getByRole("link", { name: `${label} (opens in a new tab)` })).toHaveAttribute("href", href);
  const row = await socials.boundingBox();
  const tagline = await page.locator(".honey-page .footer-tagline").boundingBox();
  expect(row!.y + row!.height).toBeLessThanOrEqual(tagline!.y);
});

test("compact shop keeps prices, capacities, details and add-to-cart usable", async ({ page }, testInfo) => {
  if (testInfo.project.name === "desktop") await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/shop");
  const cards = page.locator(".catalog-card");
  await expect(cards).toHaveCount(4);
  await expect(page.locator(".tilted-card-figure")).toHaveCount(4);
  await expect(page.locator(".tilted-card-mobile-alert")).toHaveCount(0);
  const boxes = await cards.evaluateAll((elements) => elements.map((element) => {
    const box = element.getBoundingClientRect();
    return { top: box.top, height: box.height, width: box.width };
  }));
  expect(boxes.every((box) => box.height < 520)).toBe(true);
  if (testInfo.project.name === "desktop") {
    expect(boxes.every((box) => Math.abs(box.top - boxes[0].top) < 1)).toBe(true);
    expect(boxes.every((box) => box.width < 350)).toBe(true);
    for (const card of await cards.all()) await expect(card.locator(".add-button")).toBeInViewport();
  }
  const usb = page.getByRole("article", { name: "Kingston DataTraveler Exodia G2" });
  await usb.getByRole("button", { name: "128GB", exact: true }).click();
  await expect(usb.locator(".product-price")).toHaveText("RM 60.00");
  await usb.locator("summary").click();
  await expect(usb.getByText("5-year official warranty")).toBeVisible();
  await usb.getByRole("button", { name: /Add .* to cart/ }).click();
  await expect(page.getByRole("dialog").locator(".subtotal")).toContainText("RM 60.00");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("shop photos tilt on hover and settle for reduced motion", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop");
  await page.goto("/shop");
  const figure = page.getByRole("article", { name: "Kingston DataTraveler Exodia G2" }).locator(".tilted-card-figure");
  const inner = figure.locator(".tilted-card-inner");
  const box = await figure.boundingBox();
  await page.mouse.move(box!.x + box!.width - 8, box!.y + 8);
  await expect.poll(() => inner.evaluate((element) => {
    const transform = getComputedStyle(element).transform;
    if (transform === "none") return 0;
    const matrix = new DOMMatrixReadOnly(transform);
    return Math.abs(matrix.m13) + Math.abs(matrix.m23);
  })).toBeGreaterThan(.02);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(inner).toHaveCSS("transform", "none");
});
