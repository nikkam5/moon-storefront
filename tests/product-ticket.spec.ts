import { expect, test, type Locator, type Page } from "@playwright/test";

async function prepareTicket(page: Page, name = "Signature Popia Nestum Rangup") {
  await page.goto("/#shop");
  const article = page.getByRole("article", { name });
  await article.scrollIntoViewIfNeeded();
  const ticket = article.locator(".tear-ticket");
  await expect(ticket).toHaveAttribute("data-tear-phase", "idle");
  return { article, ticket };
}

async function stubPoint(ticket: Locator) {
  return ticket.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const width = parseFloat((element as HTMLElement).style.getPropertyValue("--tt-w"));
    const stub = parseFloat((element as HTMLElement).style.getPropertyValue("--tt-stub"));
    const scale = box.width / width;
    return { x: box.left + (width - stub / 2) * scale, y: box.top + box.height * .55, scale };
  });
}

async function holdStub(page: Page, ticket: Locator) {
  const { x, y, scale } = await stubPoint(ticket);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await expect(ticket).toHaveAttribute("data-grabbing", "");
  return { x, y, scale };
}

test("homepage previews have larger tickets with picture links and prices", async ({ page }, testInfo) => {
  await page.goto("/#shop");
  const cards = page.locator(".shop-catalog-tickets .catalog-ticket");
  await expect(cards).toHaveCount(4);
  await expect(page.locator(".shop-catalog-tickets .catalog-card-link")).toHaveCount(0);
  await expect(cards.getByRole("link", { name: /^View / })).toHaveCount(4);
  const bounds = await cards.evaluateAll((elements) => elements.map((element) => {
    const box = element.getBoundingClientRect();
    return { width: box.width, height: box.height, top: box.top };
  }));
  expect(bounds.every((box) => box.height > 200 && box.height <= 245)).toBe(true);
  if (testInfo.project.name === "desktop") {
    expect(Math.abs(bounds[0].top - bounds[1].top)).toBeLessThan(1);
    expect(Math.abs(bounds[2].top - bounds[3].top)).toBeLessThan(1);
    expect(bounds[2].top).toBeGreaterThan(bounds[0].top);
  }
  await expect(cards.nth(0).getByRole("heading")).toHaveText("Signature Popia Nestum Rangup");
  await expect(cards.nth(0).getByRole("button")).toHaveAttribute("aria-label", /RM 10\.00/);
  await expect(cards.nth(1).getByRole("button")).toHaveAttribute("aria-label", /From RM 10\.00/);
  await expect(cards.nth(2).getByRole("button")).toHaveAttribute("aria-label", /From RM 40\.00/);
  await expect(cards.nth(3).getByRole("button")).toHaveAttribute("aria-label", /RM 55\.00/);
  await expect(cards.nth(3)).toContainText("1 Litre · 4L photo shown");
  for (const card of await cards.all()) {
    const button = card.getByRole("button");
    const visibleLabel = (await button.textContent() || "").replace(/\s+/g, " ").trim();
    expect(await button.getAttribute("aria-label")).toContain(visibleLabel);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("a fully detached stub navigates only after mouse release", async ({ page }) => {
  const { ticket } = await prepareTicket(page);
  const start = await holdStub(page, ticket);
  await page.mouse.move(start.x, start.y - 120 * start.scale, { steps: 12 });
  await expect(ticket).toHaveAttribute("data-ready", "");
  await expect(page).toHaveURL(/\/#shop$/);
  await expect(ticket).not.toHaveAttribute("data-used", "");
  await page.waitForTimeout(650);
  await expect(page).toHaveURL(/\/#shop$/);
  await page.mouse.up();
  await expect(page).toHaveURL(/\/product\/popia-nestum$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Rangup.Manis.Nestum.");
});

test("short stub pulls ending over the picture do not accidentally navigate", async ({ page }) => {
  const { article, ticket } = await prepareTicket(page);
  const start = await holdStub(page, ticket);
  await page.mouse.move(start.x - 100 * start.scale, start.y, { steps: 8 });
  await page.mouse.up();
  await expect(ticket).toHaveAttribute("data-tear-phase", "idle");
  await expect(ticket).not.toHaveAttribute("data-used", "");
  await expect(page).toHaveURL(/\/#shop$/);
  await expect(article.getByRole("heading")).toBeVisible();
});

test("each ticket picture opens its product directly", async ({ page }, testInfo) => {
  for (const [name, id] of [
    ["Signature Popia Nestum Rangup", "popia-nestum"],
    ["Golden Honey Cornflakes", "honey-cornflakes"],
    ["Kingston DataTraveler Exodia G2", "kingston-dtxg2"],
    ["Motul 5100 4T 10W-40", "motul-5100"],
  ]) {
    const { article } = await prepareTicket(page, name);
    const picture = article.getByRole("link", { name: `View ${name}`, exact: true });
    await expect(picture).toHaveAttribute("href", `/product/${id}`);
    if (testInfo.project.name === "mobile") await picture.tap();
    else await picture.click();
    await expect(page).toHaveURL(new RegExp(`/product/${id}$`));
  }
});

test("ticket picture links work without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL: "http://127.0.0.1:3100" });
  const page = await context.newPage();
  await page.goto("/#shop");
  await page.getByRole("article", { name: "Kingston DataTraveler Exodia G2" }).getByRole("link", { name: "View Kingston DataTraveler Exodia G2" }).press("Enter");
  await expect(page).toHaveURL(/\/product\/kingston-dtxg2$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kingston DataTraveler Exodia G2");
  await context.close();
});

test("Escape cancels a detached stub without opening the product", async ({ page }) => {
  const { ticket, article } = await prepareTicket(page);
  const start = await holdStub(page, ticket);
  await page.mouse.move(start.x, start.y - 120 * start.scale, { steps: 12 });
  await expect(ticket).toHaveAttribute("data-ready", "");
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(ticket).toHaveAttribute("data-tear-phase", "idle");
  await expect(page).toHaveURL(/\/#shop$/);
  await article.getByRole("button", { name: /Tear to view/ }).press("Enter");
  await expect(page).toHaveURL(/\/product\/popia-nestum$/);
});

test("reduced-motion tears still wait for mouse release", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const { ticket } = await prepareTicket(page, "Kingston DataTraveler Exodia G2");
  const start = await holdStub(page, ticket);
  await page.mouse.move(start.x, start.y - 60 * start.scale, { steps: 5 });
  await expect(ticket).toHaveAttribute("data-ready", "");
  await expect(page).toHaveURL(/\/#shop$/);
  await page.mouse.up();
  await expect(page).toHaveURL(/\/product\/kingston-dtxg2$/);
});

test("ticket keyboard navigation restores the homepage category", async ({ page }) => {
  await page.goto("/#shop");
  const filters = page.getByRole("group", { name: "Filter products by category" });
  await filters.getByRole("button", { name: "Tech Storage" }).click();
  const usb = page.getByRole("article", { name: "Kingston DataTraveler Exodia G2" });
  await usb.getByRole("button", { name: /Tear to view/ }).press("Space");
  await expect(page).toHaveURL(/\/product\/kingston-dtxg2$/);
  await page.getByRole("link", { name: "Back to catalog" }).click();
  await expect(page).toHaveURL(/\/#shop$/);
  await expect(filters.getByRole("button", { name: "Tech Storage" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".catalog-ticket:visible")).toHaveCount(1);
});

test("touch tears wait for lift and open the correct product", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile");
  const { ticket } = await prepareTicket(page, "Golden Honey Cornflakes");
  const { x, y, scale } = await stubPoint(ticket);
  const session = await page.context().newCDPSession(page);
  await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y - 120 * scale }] });
  await expect(ticket).toHaveAttribute("data-ready", "");
  await expect(page).toHaveURL(/\/#shop$/);
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(page).toHaveURL(/\/product\/honey-cornflakes$/);
  await session.detach();
});

test("a cancelled touch tear restores the stub without navigation", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile");
  const { ticket, article } = await prepareTicket(page, "Golden Honey Cornflakes");
  const { x, y, scale } = await stubPoint(ticket);
  const session = await page.context().newCDPSession(page);
  await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y - 120 * scale }] });
  await expect(ticket).toHaveAttribute("data-ready", "");
  await session.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
  await expect(ticket).toHaveAttribute("data-tear-phase", "idle");
  await expect(page).toHaveURL(/\/#shop$/);
  await article.getByRole("button", { name: /Tear to view/ }).press("Space");
  await expect(page).toHaveURL(/\/product\/honey-cornflakes$/);
  await session.detach();
});
