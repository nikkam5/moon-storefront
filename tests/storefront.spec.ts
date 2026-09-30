import { expect, test, type Page } from "@playwright/test";
import { CART_STORAGE_KEY, cartTotal, MAX_QUANTITY, parseCart } from "../src/lib/product";
import { orderMessage } from "../src/lib/whatsapp";

test.use({ colorScheme: "light" });

async function clickMainNav(page: Page, label: string, mobile: boolean) {
  if (mobile) {
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.locator("#pill-mobile-links").getByRole("link", { name: label, exact: true }).click();
  } else {
    await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: label, exact: true }).click();
  }
}

async function openPreviewProduct(page: Page, name: string) {
  await page.getByRole("article", { name }).getByRole("button", { name: /Tear to view/ }).press("Enter");
}

test("Home returns to a sharp, full-size hero", async ({ page }, testInfo) => {
  await page.goto("/#shop");
  await clickMainNav(page, "Home", testInfo.project.name === "mobile");
  await expect(page).toHaveURL(/\/$/);
  await expect.poll(async () => page.evaluate(() => scrollY)).toBe(0);
  const hero = page.locator("#home");
  await expect.poll(async () => hero.evaluate((element) => getComputedStyle(element).filter)).toBe("none");
  await expect.poll(async () => hero.evaluate((element) => getComputedStyle(element).transform)).toBe("none");
  await expect(page.locator("#hero-heading .shiny-text")).toHaveText("Good finds, close to home.");
});

test("heading shines and navigation lands on each section", async ({ page }, testInfo) => {
  await page.goto("/");
  const shine = page.locator("#hero-heading .shiny-text");
  await expect.poll(() => shine.evaluate((element) => element.style.backgroundPosition)).not.toBe("");
  const first = await shine.evaluate((element) => element.style.backgroundPosition);
  await expect.poll(() => shine.evaluate((element) => element.style.backgroundPosition)).not.toBe(first);
  for (const [label, id] of [["Shop", "shop"], ["Our story", "about"], ["Feedback", "feedback"]]) {
    await clickMainNav(page, label, testInfo.project.name === "mobile");
    await expect(page).toHaveURL(new RegExp(`/#${id}$`));
    await expect.poll(() => page.locator(`#${id}`).evaluate((element) => element.getBoundingClientRect().top)).toBeGreaterThanOrEqual(0);
  }
  await clickMainNav(page, "Home", testInfo.project.name === "mobile");
  await expect(page).toHaveURL(/\/$/);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
});

test("the first screen presents real products and a visible way to shop", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop");
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/");
  const hero = page.locator("#home");
  await expect(hero.getByRole("link", { name: "Explore Catalog" })).toBeInViewport();
  await expect(hero.locator(".hero-product-stack img")).toHaveCount(4);
  await expect.poll(() => hero.locator(".hero-product-stack img").evaluateAll((images) => images.every((image) => (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
  await expect(hero.getByRole("link", { name: "Share feedback" })).toBeInViewport();
  await expect(hero.locator(".hero-stack-stage")).toBeInViewport();
  const layout = await hero.evaluate((element) => {
    const copy = element.querySelector(".hero-copy")!.getBoundingClientRect();
    const stack = element.querySelector(".hero-product-stack")!.getBoundingClientRect();
    return { gap: stack.left - copy.right, bottom: element.getBoundingClientRect().bottom, viewportHeight: innerHeight };
  });
  expect(layout.gap).toBeGreaterThan(25);
  expect(layout.bottom).toBeLessThanOrEqual(layout.viewportHeight + 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("featured product stack cycles all four photos on click", async ({ page }) => {
  test.setTimeout(60000);
  await page.goto("/");
  const stack = page.getByRole("group", { name: "Featured products" });
  const details = page.locator(".hero-stack-details");
  await expect(stack.locator("img")).toHaveCount(4);
  await expect(details).toContainText("Signature Popia Nestum Rangup");
  for (const name of ["Kingston DataTraveler Exodia G2", "Golden Honey Cornflakes", "Motul 5100 4T 10W-40", "Signature Popia Nestum Rangup"]) {
    await stack.getByRole("button", { name: "Show next featured product" }).click();
    await expect(details).toContainText(name);
    await expect(stack.locator('[data-front="true"] img')).toHaveAttribute("alt", new RegExp(name));
    await expect(stack.locator('[data-front="true"]')).toHaveCount(1);
  }
  await page.getByRole("button", { name: "Next featured product", exact: true }).click();
  await expect(details).toContainText("Kingston DataTraveler Exodia G2");
  await details.getByRole("link", { name: "Kingston DataTraveler Exodia G2" }).click();
  await expect(page).toHaveURL(/\/product\/kingston-dtxg2$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("featured stack supports drag and fast clicks without double advancing", async ({ page }, testInfo) => {
  test.setTimeout(60000);
  test.skip(testInfo.project.name !== "desktop");
  await page.goto("/");
  const stack = page.getByRole("group", { name: "Featured products" });
  const box = await stack.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width / 2 + 220, box!.y + box!.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator(".hero-stack-details")).toContainText("Kingston DataTraveler Exodia G2");
  for (let i = 0; i < 7; i++) await page.getByRole("button", { name: "Next featured product", exact: true }).dispatchEvent("click");
  await expect(page.locator(".hero-stack-details")).toContainText("Signature Popia Nestum Rangup");
  await expect(stack.locator('[data-front="true"]')).toHaveCSS("pointer-events", "auto");
});

test("featured stack can be cycled by keyboard with reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const stack = page.getByRole("group", { name: "Featured products" });
  await stack.getByRole("button", { name: "Show next featured product" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".hero-stack-details")).toContainText("Kingston DataTraveler Exodia G2");
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".hero-stack-details")).toContainText("Golden Honey Cornflakes");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("short phone screens can reach the stack controls", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 667 });
  await page.goto("/");
  await expect(page.locator("#home")).toHaveClass(/hero-natural-scroll/);
  await page.getByRole("button", { name: "Next featured product", exact: true }).click();
  await expect(page.locator(".hero-stack-details")).toContainText("Kingston DataTraveler Exodia G2");
  await page.locator(".hero-stack-details").getByRole("link", { name: "Kingston DataTraveler Exodia G2" }).click();
  await expect(page).toHaveURL(/\/product\/kingston-dtxg2$/);
});

test("centered pills follow the active section and both themes", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile");
  test.setTimeout(90000);
  await page.goto("/");
  const brand = page.getByRole("banner").getByRole("link", { name: "MOON STORE home" });
  await expect(brand).toContainText("MOON STORE");
  const pills = page.locator(".pill-nav-items");
  const indicator = pills.locator(".pill-active-indicator");
  await expect.poll(async () => pills.evaluate((element) => {
    const box = element.getBoundingClientRect();
    return Math.abs(box.left + box.width / 2 - innerWidth / 2);
  })).toBeLessThan(2);
  const alignedWith = async (id: string) => pills.evaluate((element, section) => {
    const pill = element.querySelector<HTMLElement>(`[data-section="${section}"]`)!;
    const dot = element.querySelector<HTMLElement>(".pill-active-indicator")!;
    const pillBox = pill.getBoundingClientRect();
    const dotBox = dot.getBoundingClientRect();
    return Math.abs(pillBox.left + pillBox.width / 2 - (dotBox.left + dotBox.width / 2));
  }, id);
  await expect.poll(() => alignedWith("home")).toBeLessThan(2);
  const dark = await pills.evaluate((element) => getComputedStyle(element).backgroundColor);
  await page.getByRole("button", { name: "Switch to light theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  const light = await pills.evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(light).not.toBe(dark);
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Our story" }).click();
  await expect(pills.locator('[data-section="about"]')).toHaveAttribute("aria-current", "page");
  await expect.poll(() => alignedWith("about")).toBeLessThan(2);
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Feedback" }).click();
  await expect(pills.locator('[data-section="feedback"]')).toHaveAttribute("aria-current", "page");
  await expect.poll(() => alignedWith("feedback")).toBeLessThan(2);
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(pills).toHaveCSS("background-color", dark);
  await expect(indicator).toHaveCSS("opacity", "1");
});

test("mobile header keeps its brand and opens section pills", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("banner").getByRole("link", { name: "MOON STORE home" })).toContainText("MOON STORE");
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.locator("#pill-mobile-links").getByRole("link", { name: "Shop" }).click();
  await expect(page).toHaveURL(/\/#shop$/);
  await expect(page.getByRole("button", { name: "Open menu" })).toHaveAttribute("aria-expanded", "false");
});

test("dragged wordmark letter springs back after release", async ({ page }) => {
  test.setTimeout(90000);
  await page.goto("/");
  const wordmark = page.locator(".moonstore-word .tech-text");
  const bounds = await wordmark.boundingBox();
  expect(bounds).not.toBeNull();
  const x = bounds!.x + bounds!.width / 2;
  const y = bounds!.y + bounds!.height / 2;
  const canvas = page.locator(".moonstore-word canvas");
  const visibleAt = (clientX: number, clientY: number) => canvas.evaluate((element, point) => {
    const context = (element as HTMLCanvasElement).getContext("2d");
    const box = element.getBoundingClientRect();
    if (!context) return false;
    const scaleX = (element as HTMLCanvasElement).width / box.width;
    const scaleY = (element as HTMLCanvasElement).height / box.height;
    const sx = Math.round((point.x - box.left) * scaleX);
    const sy = Math.round((point.y - box.top) * scaleY);
    const image = context.getImageData(sx - 50, sy - 50, 100, 100).data;
    for (let i = 3; i < image.length; i += 4) if (image[i] > 50) return true;
    return false;
  }, { x: clientX, y: clientY });
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 90, y + 190);
  await expect.poll(() => visibleAt(x + 90, y + 190)).toBe(true);
  await page.mouse.up();
  await expect.poll(() => visibleAt(x + 90, y + 190), { timeout: 10000 }).toBe(false);
});

test("Back to catalog restores listing and filter", async ({ page }) => {
  await page.goto("/shop");
  await page.getByRole("group", { name: "Filter products by category" }).getByRole("button", { name: "Motor Care" }).click();
  const before = await page.evaluate(() => scrollY);
  await page.getByRole("article", { name: "Motul 5100 4T 10W-40" }).locator(".catalog-card-link").click();
  await page.getByRole("link", { name: "Back to catalog" }).click();
  await expect(page).toHaveURL(/\/shop$/);
  await expect(page.getByRole("group", { name: "Filter products by category" }).getByRole("button", { name: "Motor Care" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".catalog-card:visible")).toHaveCount(1);
  await expect.poll(async () => page.evaluate(() => scrollY)).toBeGreaterThanOrEqual(before - 20);

  await page.goto("/");
  await openPreviewProduct(page, "Kingston DataTraveler Exodia G2");
  await page.getByRole("link", { name: "Back to catalog" }).click();
  await expect(page).toHaveURL(/\/#shop$/);
  await expect(page.locator("#shop .catalog-card:visible")).toHaveCount(4);
});

test("catalog curtains over hero and team story stays navigable", async ({ page }) => {
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
  await expect(story.getByRole("heading", { name: "The people behind Moon Store." })).toBeVisible();
  await expect(story.getByRole("group", { name: "Moon Store team" })).toBeVisible();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("reduced motion leaves the team story visible", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("#about .team-words")).toBeVisible();
  await expect(page.locator("#about")).toHaveCSS("opacity", "1");
});

test("story particles animate while visible and pause for reduced motion", async ({ page }) => {
  await page.goto("/#about");
  const canvas = page.locator("#about .story-particles");
  await canvas.scrollIntoViewIfNeeded();
  await expect.poll(() => canvas.evaluate((element) => (element as HTMLCanvasElement).width)).toBeGreaterThan(0);
  const first = await canvas.evaluate((element) => (element as HTMLCanvasElement).toDataURL());
  await page.waitForTimeout(500);
  const second = await canvas.evaluate((element) => (element as HTMLCanvasElement).toDataURL());
  expect(second).not.toBe(first);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForTimeout(100);
  const still = await canvas.evaluate((element) => (element as HTMLCanvasElement).toDataURL());
  await page.waitForTimeout(350);
  await expect(canvas.evaluate((element) => (element as HTMLCanvasElement).toDataURL())).resolves.toBe(still);
});

test("team carousel changes the words panel and portrait reveals each role", async ({ page }, testInfo) => {
  await page.goto("/#about");
  const story = page.locator("#about");
  await story.scrollIntoViewIfNeeded();
  const words = story.locator(".team-words");
  await expect(words).toContainText("Nik Amir");
  await expect.poll(async () => story.locator(".decrypted-text__glyph").allTextContents().then((letters) => letters.join(""))).toBe("ThepeoplebehindMoonStore.");
  await expect(words).not.toContainText("Portraits and personal notes will be added");
  const portrait = story.locator('.depth-carousel__card[aria-hidden="false"] .pixel-transition');
  const ratio = await portrait.evaluate((element) => { const box = element.getBoundingClientRect(); return box.width / box.height; });
  expect(ratio).toBeGreaterThan(1.29);
  expect(ratio).toBeLessThan(1.38);
  if (testInfo.project.name === "mobile") await portrait.click();
  else await portrait.hover();
  await expect(portrait).toHaveAttribute("aria-pressed", "true");
  await expect(story.locator(".team-position")).toBeVisible();
  await expect(story.locator(".team-position")).toContainText("Team lead");
  await expect(story.locator(".team-position")).not.toContainText("Hover away to see the portrait");
  const next = story.getByRole("button", { name: "Next team member" });
  for (const name of ["Iman Asnawi", "Luqman", "Arish Haikal", "Nik Amir"]) {
    await next.click();
    await expect(words).toContainText(name);
    await expect(story.locator('.depth-carousel__card[aria-hidden="false"]')).toContainText(name);
    await expect.poll(async () => story.locator('.depth-carousel__card').evaluateAll((cards) => cards.filter((card) => getComputedStyle(card).pointerEvents !== "none").length)).toBeLessThanOrEqual(1);
  }
});

test("rapid portrait navigation settles on one focused card", async ({ page }) => {
  await page.goto("/#about");
  const story = page.locator("#about");
  const next = story.getByRole("button", { name: "Next team member" });
  for (let index = 0; index < 7; index++) await next.dispatchEvent("click");
  await expect(story.locator(".team-words")).toContainText("Arish Haikal");
  await expect.poll(async () => story.locator('.depth-carousel__card[aria-hidden="false"]').evaluate((card) => card.style.transform)).toMatch(/translateX\(0(?:\.00)?px\) translateZ\(0(?:\.00)?px\) rotateY\(0(?:\.00)?deg\)/);
  await expect.poll(async () => story.locator(".depth-carousel__card").evaluateAll((cards) => cards.filter((card) => getComputedStyle(card).pointerEvents !== "none").length)).toBe(1);
});

test("words and Motul cards glow only near the pointer edge", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop");
  await page.goto("/shop");
  const shopCard = page.getByRole("article", { name: "Kingston DataTraveler Exodia G2" });
  const shopBox = await shopCard.boundingBox();
  expect(shopBox).not.toBeNull();
  await page.mouse.move(shopBox!.x + 4, shopBox!.y + shopBox!.height / 2);
  await expect.poll(() => shopCard.evaluate((element) => Number(element.style.getPropertyValue("--edge-proximity")))).toBeGreaterThan(.2);
  await page.goto("/#about");
  const glow = page.locator("#about .team-words-glow");
  await glow.scrollIntoViewIfNeeded();
  const box = await glow.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + 4, box!.y + box!.height / 2);
  await expect.poll(() => glow.evaluate((element) => Number(element.style.getPropertyValue("--edge-proximity")))).toBeGreaterThan(.2);
  await page.mouse.move(0, 0);
  await expect(glow).toHaveCSS("--edge-proximity", "0");
  await page.goto("/product/motul-5100");
  const motul = page.locator(".motul-glow");
  const motulBox = await motul.boundingBox();
  expect(motulBox).not.toBeNull();
  await page.mouse.move(motulBox!.x + 4, motulBox!.y + motulBox!.height / 2);
  await expect.poll(() => motul.evaluate((element) => Number(element.style.getPropertyValue("--edge-proximity")))).toBeGreaterThan(.2);
});

test("Motul 5100 keeps the teammate layout with real cart and WhatsApp ordering", async ({ page, context }) => {
  await page.goto("/product/motul-5100");
  const pageContent = page.locator(".motul-page");
  await expect(pageContent.getByRole("heading", { level: 1 })).toContainText("MOTUL 5100");
  await expect(pageContent.locator(".motul-price")).toContainText("RM 55.00");
  await expect(pageContent.locator(".motul-photo img")).toHaveAttribute("src", "/products/motul-5100-10w-40.jpg");
  await pageContent.getByRole("button", { name: "Next Motul photo" }).click();
  await expect(pageContent.locator(".motul-photo img")).toHaveAttribute("src", "/products/motul-5100-4t.jpg");
  await pageContent.getByRole("button", { name: "View 10W-40 label photo" }).click();
  await expect(pageContent.locator(".motul-photo img")).toHaveAttribute("src", "/products/motul-5100-10w-40.jpg");
  await expect(pageContent.locator(".motul-photo-note")).toContainText("4L packaging");
  await expect(page.locator(".site-footer")).toHaveCount(0);
  await pageContent.getByRole("button", { name: "Tambah kuantiti" }).click();
  await expect(pageContent.locator(".motul-total")).toContainText("RM 110.00");
  await pageContent.getByLabel("Nama penuh").fill("Amin");
  await pageContent.getByLabel("No. WhatsApp").fill("0123456789");
  await pageContent.getByLabel("Model motosikal & lokasi penghantaran").fill("Y15ZR, Besut");
  await context.route("https://wa.me/**", (route) => route.fulfill({ contentType: "text/html", body: "<h1>WhatsApp handoff</h1>" }));
  const popupPromise = page.waitForEvent("popup");
  await pageContent.getByRole("button", { name: "HANTAR TEMPAHAN KE WHATSAPP" }).click();
  const popup = await popupPromise;
  await popup.waitForLoadState();
  const url = new URL(popup.url());
  expect(url.origin + url.pathname).toBe("https://wa.me/601161647061");
  expect(url.searchParams.get("text")).toContain("RM 110.00");
  expect(url.searchParams.get("text")).toContain("Amin");
  await popup.close();
  await pageContent.getByRole("button", { name: "Atau tambah 2 botol ke cart" }).click();
  await expect(page.getByRole("dialog", { name: "Your Cart" }).locator(".subtotal")).toContainText("RM 110.00");
  await page.getByRole("button", { name: "Close cart" }).click();
  await pageContent.getByRole("link", { name: "Back to catalog" }).click();
  await expect(page).toHaveURL(/\/(shop|#shop)$/);
});

test("retired Motul 7100 is absent from the shop and static routes", async ({ page, request }) => {
  await page.goto("/shop");
  await expect(page.getByRole("article", { name: /Motul 7100/ })).toHaveCount(0);
  await expect(page.locator(".catalog-card")).toHaveCount(4);
  const response = await request.get("/product/motul-7100");
  expect(response.status()).toBe(404);
});

test("homepage product opens its own details and adds the chosen variant", async ({ page }) => {
  await page.goto("/");
  await openPreviewProduct(page, "Kingston DataTraveler Exodia G2");
  await expect(page).toHaveURL(/\/product\/kingston-dtxg2$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kingston DataTraveler Exodia G2");
  await expect(page.locator(".product-gallery img")).toHaveAttribute("src", "/products/usb-3.2.jpg");
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
  await openPreviewProduct(page, "Signature Popia Nestum Rangup");
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
  await page.getByRole("button", { name: "Switch to light theme" }).click();
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

test("Cornflakes detail preserves the supplied page with Moon Store header and working cart", async ({ page }) => {
  await page.goto("/");
  await openPreviewProduct(page, "Golden Honey Cornflakes");
  await expect(page).toHaveURL(/\/product\/honey-cornflakes$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Cornflakes Madu");
  await expect(page.locator(".honey-page .product-image img")).toHaveAttribute("src", "/products/cornflakes-madu.jpeg");
  await expect(page.locator(".honey-page .price-row")).toContainText("RM 15.00");
  await expect(page.locator(".honey-page .variant-row")).toContainText("Approx. 300g");
  await expect(page.locator(".honey-page .details-table")).toContainText("Approx. 300g per jar");
  await expect(page.locator(".site-footer")).toHaveCount(0);
  await expect(page.locator(".honey-page .footer")).toContainText("Good finds. A little closer to home.");
  await expect(page.getByRole("banner").getByRole("link", { name: "MOON STORE home" })).toBeVisible();
  await page.getByRole("button", { name: "Increase quantity" }).click();
  await expect(page.locator(".honey-page .qty")).toContainText("2");
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByRole("dialog", { name: "Your Cart" }).locator(".cart-total")).toContainText("RM30.00");
  await page.getByRole("button", { name: "Close cart" }).click();
  await page.getByRole("button", { name: "Open cart, 2 items" }).click();
  await expect(page.getByRole("dialog").locator(".subtotal")).toContainText("RM 30.00");
  await page.getByRole("button", { name: "Close cart" }).click();
  await page.getByRole("banner").getByRole("link", { name: "MOON STORE home" }).click();
  await expect(page).toHaveURL(/\/$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("catalog filters, capacities, feedback and anchored navigation", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page).toHaveTitle(/Moon Store/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Good finds, close to home.");
  await page.getByRole("link", { name: "Explore Catalog", exact: true }).click();
  await expect(page).toHaveURL(/#shop$/);
  await expect(page.locator(".catalog-card:visible")).toHaveCount(4);
  const filters = page.getByRole("group", { name: "Filter products by category" });
  await filters.getByRole("button", { name: "Tech Storage" }).click();
  await expect(page.locator(".catalog-card:visible")).toHaveCount(1);
  const usb = page.getByRole("article", { name: "Kingston DataTraveler Exodia G2" });
  await expect(usb.getByRole("button", { name: /Tear to view/ })).toHaveAttribute("aria-label", /From RM 35\.00/);
  await filters.getByRole("button", { name: "Motor Care" }).click();
  await expect(page.locator(".catalog-card:visible")).toHaveCount(1);
  await filters.getByRole("button", { name: "Sweet Treats" }).click();
  await expect(page.locator(".catalog-card:visible")).toHaveCount(2);
  await filters.getByRole("button", { name: "All" }).click();
  await openPreviewProduct(page, "Kingston DataTraveler Exodia G2");
  for (const [capacity, price] of [["64GB", "35.00"], ["128GB", "55.00"], ["256GB", "95.00"], ["512GB", "165.00"]]) {
    await page.getByRole("button", { name: new RegExp(capacity) }).click();
    await expect(page.locator(".detail-price")).toContainText(`RM ${price}`);
  }
  await expect(page.getByText("5-year official warranty")).toBeVisible();
  await page.goto("/#about");
  for (const name of ["Iman Asnawi", "Arish Haikal", "Nik Amir"]) await expect(page.locator(".team-story")).toContainText(name);
  await expect(page.locator("#feedback")).toContainText("Your voice makes us better.");
  await expect(page.locator('.site-footer a[href="tel:+601161647061"]')).toBeVisible();
  await expect(page.locator('.site-footer a[href="mailto:m00nstor32026@gmail.com"]')).toBeVisible();
  if (testInfo.project.name === "mobile") {
    await clickMainNav(page, "Feedback", true);
    await expect(page).toHaveURL(/#feedback$/);
    await expect(page.getByRole("button", { name: "Open menu" })).toHaveAttribute("aria-expanded", "false");
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test("customer feedback opens a reviewable WhatsApp draft", async ({ page, context }, testInfo) => {
  await page.goto("/#feedback");
  const feedback = page.locator("#feedback");
  await expect(feedback.getByRole("heading", { name: "Your voice makes us better." })).toBeVisible();
  await expect(page.getByText("A little clarity.")).toHaveCount(0);
  await expect(page.getByText("See something you like?")).toHaveCount(0);
  await feedback.getByLabel("Your name").fill("Amin");
  const rating = feedback.getByRole("radiogroup", { name: "How was your experience? (optional)" });
  const fourthStar = rating.getByRole("radio", { name: "4 of 5, Great" });
  await expect(rating).toHaveCSS("--pr-active", "#5673d3");
  if (testInfo.project.name === "desktop") {
    await fourthStar.hover();
    await expect(rating.locator(".peek-rating__tip")).toHaveText("Great");
  }
  await fourthStar.click();
  await expect(fourthStar).toHaveAttribute("aria-checked", "true");
  await expect(fourthStar.locator(".peek-rating__glyph")).toHaveCSS("color", "rgb(86, 115, 211)");
  await feedback.getByLabel("Your feedback").fill("Fast pickup and helpful service.");
  await context.route("https://wa.me/**", (route) => route.fulfill({ contentType: "text/html", body: "<h1>WhatsApp review</h1>" }));
  const popupPromise = page.waitForEvent("popup");
  await feedback.getByRole("button", { name: "Review in WhatsApp" }).click();
  const popup = await popupPromise;
  const url = new URL(popup.url());
  expect(url.origin + url.pathname).toBe("https://wa.me/601161647061");
  expect(url.searchParams.get("text")).toContain("Name: Amin");
  expect(url.searchParams.get("text")).toContain("Rating: 4/5");
  expect(url.searchParams.get("text")).toContain("Feedback: Fast pickup and helpful service.");
  await popup.close();
  await expect(feedback.getByLabel("Your feedback")).toHaveValue("Fast pickup and helpful service.");
  await fourthStar.press("Backspace");
  await expect(fourthStar).toHaveAttribute("aria-checked", "false");
  await expect(feedback.locator(".feedback-rating-heading")).toContainText("Select a rating");
});

test("variant cart totals, persistence, and exact WhatsApp handoff", async ({ page, context }) => {
  await page.goto("/shop");
  const usb = page.getByRole("article", { name: "Kingston DataTraveler Exodia G2" });
  await usb.getByRole("button", { name: "128GB", exact: true }).click();
  await usb.getByRole("button", { name: /Add .* to cart/ }).click();
  const drawer = page.getByRole("dialog");
  await expect(drawer.locator(".subtotal")).toHaveText("SubtotalRM 55.00");
  await page.getByRole("button", { name: "Close cart" }).click();
  await expect(drawer).not.toBeVisible();
  await page.getByRole("article", { name: "Motul 5100 4T 10W-40" }).getByRole("button", { name: /Add .* to cart/ }).click();
  await page.getByRole("button", { name: "Close cart" }).click();
  await expect(drawer).not.toBeVisible();
  await page.getByRole("article", { name: "Signature Popia Nestum Rangup" }).getByRole("button", { name: /Add .* to cart/ }).click();
  await page.getByRole("button", { name: "Increase Signature Popia Nestum Standard Jar quantity" }).click();
  await expect(drawer.locator(".subtotal")).toContainText("RM 130.00");
  const checkout = drawer.getByRole("link", { name: "Order on WhatsApp" });
  const url = new URL((await checkout.getAttribute("href"))!);
  expect(url.origin + url.pathname).toBe("https://wa.me/601161647061");
  expect(url.searchParams.get("text")).toBe("Hello Moon Store! I would like to place an order from your website:\n\n- 1x Kingston DTXG2 USB Flash Drive (128GB - Sky Blue) - RM 55.00\n- 1x Motul 5100 4T 10W-40 (1 Litre) - RM 55.00\n- 2x Signature Popia Nestum (Standard Jar) - RM 20.00\n\nTotal: RM 130.00\n\nDelivery / Pickup details:\nName: [Customer to fill]\nDelivery Address: [Customer to fill]");
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
  await expect(drawer.locator(".subtotal")).toContainText("RM 130.00");
  await page.getByRole("button", { name: "Close cart" }).click();
  await usb.getByRole("button", { name: "64GB", exact: true }).click();
  await usb.getByRole("button", { name: /Add .* to cart/ }).click();
  await expect(drawer.locator(".cart-row")).toHaveCount(4);
  await expect(drawer.locator(".subtotal")).toContainText("RM 165.00");
  await page.getByRole("button", { name: "Remove Kingston DTXG2 USB Flash Drive 128GB", exact: true }).click();
  await expect(drawer.locator(".subtotal")).toContainText("RM 110.00");
  await page.getByRole("link", { name: "Review full cart" }).click();
  await expect(page).toHaveURL(/\/cart$/);
  await page.getByRole("button", { name: "Decrease Signature Popia Nestum Standard Jar quantity" }).click();
  await expect(page.locator(".summary-total")).toContainText("RM 100.00");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("light and dark themes persist and work on cart pages", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const dark = await page.locator("body").evaluate((element) => getComputedStyle(element).backgroundColor);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.goto("/cart");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Switch to light theme" }).click();
  const light = await page.locator("body").evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(light).not.toBe(dark);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("dark default and reduced-motion content stay accessible", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator(".reveal-pending")).toHaveCount(0);
  await expect(page.locator("#feedback")).toHaveCSS("opacity", "1");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
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
  await second.getByRole("article", { name: "Motul 5100 4T 10W-40" }).getByRole("button", { name: /Add .* to cart/ }).click();
  await expect(page.getByRole("dialog").locator(".subtotal")).toContainText("RM 90.00");
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
  const cart = parseCart([null, {}, { productId: "kingston-dtxg2", variantId: "128gb", quantity: 1, price: 1 }, { productId: "kingston-dtxg2", variantId: "128gb", quantity: 5 }, { productId: "motul-7100", variantId: "1-litre", quantity: 1 }, { productId: "motul-5100", variantId: "1-litre", quantity: 1 }, { productId: "popia-nestum", variantId: "standard-jar", quantity: 2 }, { productId: "popia-nestum", variantId: "standard-jar", quantity: 1.2 }]);
  expect(cart).toHaveLength(3);
  expect(cartTotal(cart)).toBe(130);
  expect(orderMessage(cart)).toContain("Total: RM 130.00");
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
  await expect(page.locator("#about .team-story-intro")).toHaveCSS("opacity", "1");
  await expect(page.locator("#about .team-story-noscript")).toContainText("Luqman");
  await expect(page.locator("#feedback")).toHaveCSS("opacity", "1");
  await expect(page.locator(".catalog-card")).toHaveCount(4);
  await context.close();
});
