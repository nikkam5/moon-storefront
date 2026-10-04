import { expect, test, type Page } from "@playwright/test";
import { business } from "../src/lib/business";
import { CART_STORAGE_KEY, getProduct, MAX_QUANTITY, type CartItem } from "../src/lib/product";

test.use({ reducedMotion: "reduce" });

async function restoreCart(page: Page, items: CartItem[]) {
  await page.addInitScript(({ key, items }) => {
    if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify(items));
  }, { key: CART_STORAGE_KEY, items });
}

for (const [id, addLabel, total] of [
  ["popia-nestum", "Tambah ke Cart", "RM 50.00"],
  ["honey-cornflakes", "Add to cart", "RM 55.00"],
] as const) {
  test(`${id} opens one complete cart with mixed products and checkout`, async ({ page }) => {
    await restoreCart(page, [{ productId: "kingston-dtxg2", variantId: "64gb", quantity: 1 }]);
    await page.goto(`/product/${id}`);
    if (id === "popia-nestum") {
      await page.getByRole("button", { name: "Lihat Cart" }).click();
      await expect(page.getByRole("dialog")).toContainText(getProduct("kingston-dtxg2").orderName);
      await expect(page.getByRole("dialog").locator(".subtotal")).toContainText("RM 40.00");
      await page.getByRole("button", { name: "Close cart" }).click();
    }
    await page.getByRole("button", { name: addLabel, exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toHaveCount(1);
    await expect(dialog).toHaveJSProperty("open", true);
    await expect(dialog.locator(".cart-row")).toHaveCount(2);
    await expect(dialog).toContainText(getProduct("kingston-dtxg2").orderName);
    await expect(dialog).toContainText(getProduct(id).orderName);
    await expect(dialog.locator(".subtotal")).toContainText(total);
    await expect(dialog.getByRole("link", { name: "Review full cart" })).toHaveAttribute("href", "/cart");
    const checkout = await dialog.getByRole("link", { name: "Order on WhatsApp" }).getAttribute("href");
    const message = new URL(checkout!).searchParams.get("text");
    expect(message).toContain(getProduct("kingston-dtxg2").orderName);
    expect(message).toContain(getProduct(id).orderName);
    expect(message).toContain(total);
  });
}

test("snack cart traps keyboard focus, locks scrolling and closes with Escape", async ({ page }) => {
  await restoreCart(page, [{ productId: "kingston-dtxg2", variantId: "64gb", quantity: 1 }]);
  await page.goto("/product/popia-nestum");
  const trigger = page.getByRole("button", { name: "Lihat Cart" });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("button", { name: "Close cart" })).toBeFocused();
  await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
  for (const key of ["Tab", "Shift+Tab"]) {
    for (let index = 0; index < 12; index++) {
      await page.keyboard.press(key);
      expect(await page.evaluate(() => !!document.activeElement?.closest("dialog[open]"))).toBe(true);
    }
  }
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
});

test("Cornflakes back link restores both catalog sources and their category", async ({ page }) => {
  for (const origin of ["/#shop", "/shop"]) {
    await page.goto(origin);
    const filters = page.getByRole("group", { name: "Filter products by category" });
    await filters.getByRole("button", { name: "Sweet Treats" }).click();
    await page.getByRole("article", { name: "Golden Honey Cornflakes" }).getByRole("link").click();
    await expect(page).toHaveURL(/\/product\/honey-cornflakes$/);
    const back = page.getByRole("link", { name: "Back to catalog", exact: true });
    await expect(back).toHaveAttribute("href", origin);
    await back.click();
    await expect(page).toHaveURL(`http://127.0.0.1:3100${origin}`);
    await expect(filters.getByRole("button", { name: "Sweet Treats" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".catalog-card:visible")).toHaveCount(2);
  }
});

test("Cornflakes uses the shared ingredient information, contacts and one main landmark", async ({ page }) => {
  await page.goto("/product/honey-cornflakes");
  const product = getProduct("honey-cornflakes");
  await expect(page.getByRole("main")).toHaveCount(1);
  await expect(page.locator(".honey-page .allergy-note")).toHaveText(product.note!);
  await expect(page.locator(".honey-page .product-desc")).toHaveText(product.description);
  await expect(page.getByRole("rowheader", { name: "Glaze" }).locator("..")).toContainText("sweet butter");
  await expect(page.getByRole("link", { name: business.email, exact: true })).toHaveAttribute("href", `mailto:${business.email}`);
  await expect(page.locator(".honey-page")).not.toContainText("Zero added artificial preservatives");
  await expect(page.getByRole("link", { name: "Back to catalog", exact: true })).toHaveAttribute("href", "/#shop");
});

test("USB capacity limit prevents false additions and recovers when cart quantity decreases", async ({ page }) => {
  await restoreCart(page, [{ productId: "kingston-dtxg2", variantId: "64gb", quantity: MAX_QUANTITY }]);
  await page.goto("/product/kingston-dtxg2");
  const add = page.getByRole("button", { name: "Add to cart", exact: true });
  await expect(page.locator("#detail-quantity-limit")).toContainText(`Limit ${MAX_QUANTITY} per capacity`);
  await expect(add).toBeDisabled();
  await page.getByRole("button", { name: /^128GB/ }).click();
  await expect(add).toBeEnabled();
  await expect(page.locator("#detail-quantity-limit")).toHaveCount(0);
  await add.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator(".cart-row")).toHaveCount(2);
  await expect(dialog.locator(".subtotal")).toContainText("RM 460.00");
  await dialog.getByRole("button", { name: "Decrease Kingston DTXG2 USB Flash Drive 64GB quantity" }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /^64GB/ }).click();
  await expect(add).toBeEnabled();
  await expect(page.locator("#detail-quantity-limit")).toHaveCount(0);
});

test("Motul form explains invalid phone and blank fields and focuses the first error", async ({ page }) => {
  await page.goto("/product/motul-5100");
  const form = page.locator(".motul-order-panel form");
  const name = form.getByLabel("Nama penuh");
  const phone = form.getByLabel("No. WhatsApp");
  const location = form.getByLabel("Model motosikal & lokasi penghantaran");
  let popupCount = 0;
  page.on("popup", () => { popupCount++; });
  await name.fill("   ");
  await phone.fill("abc");
  await location.fill("   ");
  await form.getByRole("button", { name: "HANTAR TEMPAHAN KE WHATSAPP" }).click();
  await expect(name).toBeFocused();
  await expect(name).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#motul-name-error")).toBeVisible();
  await expect(page.locator("#motul-phone-error")).toContainText("7–15 digit");
  await expect(page.locator("#motul-location-error")).toBeVisible();
  await name.fill("Audit Customer");
  await location.fill("Y15ZR, Besut");
  await form.getByRole("button", { name: "HANTAR TEMPAHAN KE WHATSAPP" }).click();
  await expect(phone).toBeFocused();
  await expect(name).toHaveAttribute("aria-invalid", "false");
  await expect(location).toHaveAttribute("aria-invalid", "false");
  await phone.fill("+60 12-345 6789");
  await location.fill("   ");
  await form.getByRole("button", { name: "HANTAR TEMPAHAN KE WHATSAPP" }).click();
  await expect(phone).toHaveAttribute("aria-invalid", "false");
  await expect(location).toBeFocused();
  await expect(form.getByRole("group", { name: "Kuantiti botol" })).toBeVisible();
  expect(popupCount).toBe(0);
});
