import { expect, test, type Page } from "@playwright/test";

const enter = (page: Page) => page.getByRole("button", { name: "Turn on ember theme", exact: true });
const leave = (page: Page) => page.getByRole("button", { name: "Turn off ember theme", exact: true });
async function settled(page: Page) {
  await expect(page.getByRole("group", { name: "Appearance", exact: true })).toHaveAttribute("aria-busy", "false");
  await expect(page.locator("html")).not.toHaveAttribute("data-theme-transition");
}

test("ember activation, reload, return to the previous mode and normal toggle work", async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Switch to light theme", exact: true }).click();
  await enter(page).click();
  await settled(page);
  await expect(leave(page)).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(8, 8, 8)");
  if (process.env.MOONSTORE_PREVIEW_DIR && info.project.name === "desktop") {
    await page.screenshot({ path: `${process.env.MOONSTORE_PREVIEW_DIR}/homepage-ember.png` });
  }
  await page.reload();
  await expect(leave(page)).toHaveAttribute("aria-pressed", "true");
  await leave(page).click();
  await settled(page);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator("html")).not.toHaveAttribute("data-ember");
  await page.getByRole("button", { name: "Switch to dark theme", exact: true }).click();
  await enter(page).click();
  await settled(page);
  await page.getByRole("button", { name: "Switch to light theme", exact: true }).click();
  await settled(page);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(enter(page)).toHaveAttribute("aria-pressed", "false");
});

test("cinematic transition locks both controls and preserves the scroll position", async ({ page }) => {
  await page.goto("/#about");
  await expect(page.locator("#about")).toBeInViewport();
  await page.evaluate(() => window.scrollTo({ top: window.scrollY, behavior: "instant" }));
  // The switch lasts only 600ms, so its in-flight state is read (and the
  // controls clicked again) immediately after the activating click, in the page.
  const watchClick = () => page.evaluate(() => {
    const w = window as unknown as { activationY: number; during: Record<string, unknown> };
    // Capture actual activation, after the browser's initial hash navigation
    // and Playwright's actionability scrolling have finished.
    document.querySelector(".ember-toggle")!.addEventListener("pointerdown", () => { w.activationY = scrollY; }, { once: true });
    window.addEventListener("click", () => queueMicrotask(() => {
      const html = document.documentElement;
      const ember = document.querySelector<HTMLButtonElement>(".ember-toggle")!;
      w.during = {
        transition: html.dataset.themeTransition, duration: html.style.getPropertyValue("--ember-transition-duration"),
        emberDisabled: ember.disabled, normalDisabled: document.querySelector<HTMLButtonElement>(".theme-toggle")!.disabled,
      };
      ember.click(); ember.click();
    }), { once: true });
  });
  const readClick = () => page.evaluate(() => {
    const w = window as unknown as { activationY: number; during: Record<string, unknown> };
    return { y: w.activationY, during: w.during };
  });
  const locked = { transition: "corruption", duration: "600ms", emberDisabled: true, normalDisabled: true };
  await watchClick();
  await enter(page).click();
  const entry = await readClick();
  expect(entry.during).toEqual(locked);
  const before = entry.y;
  await settled(page);
  await expect(leave(page)).toBeEnabled();
  expect(await page.evaluate(() => window.scrollY)).toBeCloseTo(before, 0);
  await expect(page.locator(".ember-curtain")).toBeHidden();
  await expect(page.locator(".ember-atmosphere")).toBeVisible();
  await watchClick();
  await leave(page).click();
  const exit = await readClick();
  expect(exit.during).toEqual(locked);
  const beforeExit = exit.y;
  await settled(page);
  await expect(page.locator(".ember-atmosphere")).toBeHidden();
  expect(await page.evaluate(() => scrollY)).toBeCloseTo(beforeExit, 0);
});

test("the crimson corruption overload fully covers the screen centre mid-switch, then clears", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/shop");
  const heading = page.locator("#main h1").first();
  const original = await heading.innerText();
  const watch = page.evaluate(() => new Promise<number>(resolve => {
    let peak = 0;
    const sample = () => {
      const canvas = document.querySelector<HTMLCanvasElement>(".ember-curtain canvas");
      if (canvas && canvas.width > 1) {
        const pixel = canvas.getContext("2d")!.getImageData(canvas.width >> 1, canvas.height >> 1, 1, 1).data;
        peak = Math.max(peak, pixel[3]);
      }
      if (document.documentElement.dataset.themeTransition || performance.now() - start < 300) requestAnimationFrame(sample);
      else resolve(peak);
    };
    const start = performance.now();
    requestAnimationFrame(sample);
  }));
  await enter(page).click();
  expect(await watch).toBe(255);
  await settled(page);
  const after = await page.locator(".ember-curtain canvas").evaluate((canvas: HTMLCanvasElement) => canvas.getContext("2d")!.getImageData(canvas.width >> 1, canvas.height >> 1, 1, 1).data[3]);
  expect(after).toBe(0);
  // The decoded heading ends exactly as it was, and nothing is left tearing.
  await expect(heading).toHaveText(original);
  await expect(page.locator("[data-glitching], [data-glitch-shift]")).toHaveCount(0);
});

test("unsupported snapshot transitions and blocked storage remain usable", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(document, "startViewTransition", { value: undefined, configurable: true });
    Storage.prototype.setItem = () => { throw new DOMException("Blocked", "SecurityError"); };
  });
  await page.goto("/");
  await enter(page).click();
  await settled(page);
  await expect(leave(page)).toBeEnabled();
  await leave(page).click();
  await settled(page);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(errors).toEqual([]);
});

test("saved ember appearance is applied before the application hydrates", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("moonstore-theme", "ember"));
  await page.route("**/_next/static/chunks/**", route => route.abort());
  await page.goto("/shop");
  await expect(page.locator("html")).toHaveAttribute("data-ember", "true");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(8, 8, 8)");
  await expect(page.locator("html")).not.toHaveAttribute("data-theme-transition");
});

test("ember applies to every route while preserving each product identity", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("moonstore-theme", "ember"));
  for (const path of ["/", "/shop", "/cart", "/product/kingston-dtxg2", "/product/popia-nestum", "/product/honey-cornflakes", "/product/motul-5100"]) {
    await page.goto(path);
    await expect(leave(page)).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".site-header")).toHaveCSS("background-color", "rgb(8, 8, 8)");
    await page.getByRole("button", { name: /^Open cart/ }).click();
    await expect(page.getByRole("dialog")).toHaveCSS("background-color", "rgb(8, 8, 8)");
    await page.getByRole("button", { name: "Close cart", exact: true }).click();
    if (path.endsWith("popia-nestum")) await expect(page.locator(".popia-page .topbar")).toHaveCSS("background-color", "rgb(38, 53, 38)");
    if (path.endsWith("honey-cornflakes")) await expect(page.locator(".honey-page")).toHaveCSS("--honey", "#D4A017");
    if (path.endsWith("motul-5100")) await expect(page.locator(".motul-primary")).toHaveCSS("background-color", "rgb(227, 6, 19)");
  }
});

test("one drop falls halfway on hover or focus, freezes broken, and clears on exit", async ({ page }, info) => {
  await page.goto("/shop");
  const control = enter(page);
  const drip = control.locator(".ember-drip");
  await expect(control).toHaveAttribute("data-drip", "off");
  await expect(drip).toHaveCSS("animation-name", "none");
  const before = await control.boundingBox();
  // The button face runs the switch's corruption on repeat while hovered.
  const corruption = () => control.locator(".ember-corrupt").evaluate((canvas: HTMLCanvasElement) => {
    const data = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data;
    let ink = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 30) ink++;
    return ink;
  });
  if (info.project.name === "desktop") {
    await control.hover();
    await expect(control).toHaveAttribute("data-drip", "on");
    // The button stays normal while the drop falls; it corrupts once the drop breaks.
    await expect(control).toHaveCSS("animation-delay", "0.66s");
    await expect.poll(corruption).toBeGreaterThan(0);
    // It runs once and holds the broken frame: still visible, no repeat.
    await expect.poll(() => drip.evaluate(element => element.getAnimations()[0]?.playState)).toBe("finished");
    await expect(drip).toHaveCSS("opacity", "1");
    expect(await drip.evaluate(element => getComputedStyle(element).filter)).toContain("drop-shadow");
    await page.mouse.move(40, 220);
    await expect(control).toHaveAttribute("data-drip", "off");
    await expect(drip).toHaveCSS("opacity", "0");
    expect(await corruption()).toBe(0);
  }
  await page.locator(".theme-toggle").focus();
  await page.keyboard.press("Tab");
  await expect(control).toBeFocused();
  await expect(control).toHaveAttribute("data-drip", "on");
  await expect(drip).toHaveCSS("animation-name", "ember-drip");
  await page.keyboard.press("Tab");
  await expect(control).toHaveAttribute("data-drip", "off");
  expect(await control.boundingBox()).toEqual(before);
});

test("reduced motion uses a fade and disables glitch and ambient movement", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/shop");
  await enter(page).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme-transition", "fade");
  await settled(page);
  await expect(page.locator(".ember-drip")).toBeHidden();
  await expect(page.locator(".ember-aura-left")).toHaveCSS("animation-name", "none");
  await expect(page.locator(".ember-sparks")).toBeHidden();
  await expect(leave(page)).toHaveAttribute("aria-pressed", "true");
});

test("live motion changes and hidden tabs finish transitions and pause ambience", async ({ page }) => {
  await page.goto("/shop");
  await enter(page).click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await settled(page);
  await expect(leave(page)).toBeEnabled();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await leave(page).click();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await settled(page);
  await expect(page.locator(".ember-atmosphere")).toHaveAttribute("data-paused", "true");
  await expect(page.locator(".ember-drip")).toHaveCSS("animation-play-state", "paused");
});

test("both appearance controls fit phones and the ember CTA stays readable", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("moonstore-theme", "ember"));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  for (const width of [320, 375, 820, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(leave(page)).toBeVisible();
    const layout = await page.evaluate(() => {
      const logo = document.querySelector(".header-logo")!.getBoundingClientRect();
      const controls = document.querySelector(".theme-controls")!.getBoundingClientRect();
      return { width: innerWidth, scroll: document.documentElement.scrollWidth, logoEnd: logo.right, controlStart: controls.left };
    });
    expect(layout.scroll).toBeLessThanOrEqual(layout.width + 1);
    expect(layout.logoEnd).toBeLessThanOrEqual(layout.controlStart);
  }
  const contrast = await page.locator(".hero-button").evaluate(button => {
    const style = getComputedStyle(button);
    const luminance = (rgb: string) => {
      const values = rgb.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(value => {
        const channel = value / 255;
        return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
      });
      return values[0] * .2126 + values[1] * .7152 + values[2] * .0722;
    };
    const a = luminance(style.color), b = luminance(style.backgroundColor);
    return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
  });
  expect(contrast).toBeGreaterThanOrEqual(4.5);
});
