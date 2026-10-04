import { expect, test } from "@playwright/test";
import { resolveSiteUrl } from "../src/lib/site";

const publicOrigin = "https://moonst0re.netlify.app";
const publicRoutes = [
  "/",
  "/shop",
  "/product/kingston-dtxg2",
  "/product/motul-5100",
  "/product/popia-nestum",
  "/product/honey-cornflakes",
];
const storefrontRoutes = [...publicRoutes, "/cart"];

test.describe("public metadata", () => {
  for (const route of publicRoutes) {
    test(`${route} declares its own public canonical`, async ({ page }) => {
      await page.goto(route);
      const canonical = page.locator('head link[rel="canonical"]');
      await expect(canonical).toHaveCount(1);
      await expect.poll(async () => {
        const href = await canonical.getAttribute("href");
        return href ? new URL(href).href : null;
      }).toBe(new URL(route, publicOrigin).href);
    });
  }

  for (const [route, imagePath] of [
    ["/product/popia-nestum", "/products/popia-nestum.webp"],
    ["/product/honey-cornflakes", "/products/cornflakes-madu.jpeg"],
  ]) {
    test(`${route} shares the matching product photograph`, async ({ page, request }) => {
      await page.goto(route);
      const imageUrl = new URL(imagePath, publicOrigin).href;
      await expect(page.locator('head meta[property="og:image"]')).toHaveAttribute("content", imageUrl);
      await expect(page.locator('head meta[name="twitter:image"]')).toHaveAttribute("content", imageUrl);
      await expect(page.locator('head meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");

      // Check the exported asset locally without contacting the live store.
      const image = await request.get(imagePath);
      expect(image.ok()).toBe(true);
      expect(image.headers()["content-type"]).toMatch(/^image\//);
    });
  }

  test("Cornflakes title contains the store brand once", async ({ page }) => {
    await page.goto("/product/honey-cornflakes");
    await expect(page).toHaveTitle("Cornflakes Madu | Moon Store");
  });

  test("cart review is excluded from indexing", async ({ page }) => {
    await page.goto("/cart");
    await expect(page.locator('head meta[name="robots"]')).toHaveAttribute("content", /\bnoindex\b/);
  });

  test("robots and sitemap describe public routes on the deployed domain", async ({ request }) => {
    const robotsResponse = await request.get("/robots.txt");
    expect(robotsResponse.ok()).toBe(true);
    const robots = await robotsResponse.text();
    expect(robots).toMatch(/^User-Agent:\s*\*\s*$/im);
    expect(robots).toMatch(/^Disallow:\s*\/cart\s*$/im);
    expect(robots).toContain(`Sitemap: ${publicOrigin}/sitemap.xml`);

    const sitemapResponse = await request.get("/sitemap.xml");
    expect(sitemapResponse.ok()).toBe(true);
    const sitemap = await sitemapResponse.text();
    const locations = Array.from(sitemap.matchAll(/<loc>([^<]+)<\/loc>/g), (match) => match[1]);
    expect(locations.sort()).toEqual(publicRoutes.map((route) => new URL(route, publicOrigin).href).sort());
    expect(sitemap).not.toMatch(/localhost|127\.0\.0\.1|\/cart(?:<|\/)/);
  });
});

test.describe("small-phone layout and finished team content", () => {
  test.use({ viewport: { width: 320, height: 568 }, reducedMotion: "reduce" });

  for (const route of storefrontRoutes) {
    test(`${route} fits a 320px screen at the top and footer`, async ({ page }) => {
      await page.goto(route);
      await expect(page.locator("#main")).toBeVisible();
      await page.evaluate(async () => { await document.fonts.ready; });
      const overflow = () => page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth);
      await expect.poll(overflow, { message: `${route} overflows at the top of a 320px screen` }).toBeLessThanOrEqual(0);

      await page.locator("footer:visible").last().scrollIntoViewIfNeeded();
      await expect.poll(overflow, { message: `${route} footer overflows a 320px screen` }).toBeLessThanOrEqual(0);
    });
  }

  test("the team presents real names and roles without coming-soon copy", async ({ page }) => {
    await page.goto("/#about");
    const team = page.locator("#about");
    await expect(team).toBeVisible();
    await expect(team).not.toContainText(/portrait coming soon|a personal message .* will appear here/i);

    for (const [name, role] of [
      ["Nik Amir", "Team lead · Management & administration"],
      ["Iman Asnawi", "Marketing executive"],
      ["Luqman", "Operations executive"],
      ["Arish Haikal", "Accounts executive"],
    ]) {
      await team.getByRole("button", { name: `View ${name}`, exact: true }).click();
      const details = team.locator(".team-words");
      await expect(details.getByRole("heading", { name, exact: true })).toBeVisible();
      await expect(details.locator(".team-words-role")).toHaveText(role);
      await expect(details).not.toContainText(/coming soon|will appear here/i);
    }
  });
});

test.describe("deployment URL resolution", () => {
  test("uses the store domain when deployment variables are absent", () => {
    expect(resolveSiteUrl({}).href).toBe(`${publicOrigin}/`);
  });

  test("uses Netlify's primary URL before its preview URL", () => {
    expect(resolveSiteUrl({ URL: publicOrigin, DEPLOY_PRIME_URL: "https://preview-moon-store.netlify.app" }).href).toBe(`${publicOrigin}/`);
    expect(resolveSiteUrl({ DEPLOY_PRIME_URL: "https://preview-moon-store.netlify.app" }).href).toBe("https://preview-moon-store.netlify.app/");
  });

  test("an explicit public domain overrides Netlify and normalizes to the origin", () => {
    expect(resolveSiteUrl({
      NEXT_PUBLIC_SITE_URL: "https://shop.example.com/catalog?from=netlify#shop",
      URL: publicOrigin,
      DEPLOY_PRIME_URL: "https://preview-moon-store.netlify.app",
    }).href).toBe("https://shop.example.com/");
  });

  test("rejects local addresses instead of exporting development metadata", () => {
    for (const address of ["http://localhost:3000", "http://127.0.0.1:3100", "http://0.0.0.0:3000", "http://[::1]:3000"]) {
      expect(() => resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: address, URL: publicOrigin })).toThrow();
      expect(() => resolveSiteUrl({ URL: address })).toThrow();
    }
  });

  test("rejects malformed addresses and non-HTTP protocols", () => {
    for (const address of ["not a website address", "ftp://shop.example.com", "file:///catalog.html"]) {
      expect(() => resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: address })).toThrow();
    }
  });
});
