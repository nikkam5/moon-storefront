import { expect, test } from "@playwright/test";

const feedbackTitle = "Your voice makes us better.";

test("feedback heading types on entry without shifting the form", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const heading = page.locator("#feedback-heading");
  const content = heading.locator(".text-type__content");
  await expect(heading).toHaveAttribute("data-typing-state", "waiting");
  await expect(content).toHaveText("");
  await heading.scrollIntoViewIfNeeded();
  await expect(heading).toHaveAttribute("data-typing-state", "typing");
  const heightBefore = await heading.evaluate((element) => element.getBoundingClientRect().height);
  await expect.poll(async () => (await content.textContent() || "").length).toBeGreaterThan(0);
  await expect(heading).toHaveAccessibleName(feedbackTitle);
  await expect(content).toHaveText(feedbackTitle);
  await expect(heading).toHaveAttribute("data-typing-state", "done");
  const heightAfter = await heading.evaluate((element) => element.getBoundingClientRect().height);
  expect(Math.abs(heightAfter - heightBefore)).toBeLessThan(1);
  const cursor = heading.locator(".text-type__line .text-type__cursor");
  const firstOpacity = await cursor.evaluate((element) => getComputedStyle(element).opacity);
  await expect.poll(() => cursor.evaluate((element) => getComputedStyle(element).opacity)).not.toBe(firstOpacity);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("feedback heading becomes static when reduced motion is enabled", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/#feedback");
  const heading = page.locator("#feedback-heading");
  await expect(heading).toHaveAttribute("data-typing-state", "typing");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(heading).toHaveAttribute("data-typing-state", "static");
  await expect(heading.locator(".text-type__content")).toHaveText(feedbackTitle);
  await expect(heading.locator(".text-type__line .text-type__cursor")).toHaveCSS("visibility", "hidden");
});

test("Popia back button restores both catalog sources and their category", async ({ page }) => {
  for (const origin of ["/#shop", "/shop"]) {
    await page.goto(origin);
    const filters = page.getByRole("group", { name: "Filter products by category" });
    await filters.getByRole("button", { name: "Sweet Treats" }).click();
    const popia = page.getByRole("article", { name: "Signature Popia Nestum Rangup" });
    await popia.getByRole("link").click();
    await expect(page).toHaveURL(/\/product\/popia-nestum$/);
    const back = page.locator(".popia-page").getByRole("link", { name: "Back to catalog", exact: true });
    await expect(back).toHaveAttribute("href", origin);
    await expect(back).toBeInViewport();
    await back.click();
    await expect(page).toHaveURL(`http://127.0.0.1:3100${origin}`);
    await expect(filters.getByRole("button", { name: "Sweet Treats" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".catalog-card:visible")).toHaveCount(2);
  }
});

test("direct Popia visitors have a working catalog fallback", async ({ page }) => {
  await page.goto("/product/popia-nestum");
  const back = page.getByRole("link", { name: "Back to catalog", exact: true });
  await expect(back).toHaveAttribute("href", "/#shop");
  await back.click();
  await expect(page).toHaveURL(/\/#shop$/);
  await expect(page.getByRole("heading", { name: "Shop the collection." })).toBeVisible();
});
