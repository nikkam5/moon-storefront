import { expect, test, type Locator, type Page } from "@playwright/test";

async function prepare(page: Page, reduced = false) {
  await page.addInitScript(() => localStorage.setItem("moonstore-theme", "ember"));
  await page.emulateMedia({ reducedMotion: reduced ? "reduce" : "no-preference" });
  await page.goto("/");
  await page.evaluate(async () => { await document.fonts.ready; });
  const word = page.locator(".moonstore-word .tech-text");
  await expect(word).toBeVisible();
  await expect(word).toHaveAttribute("data-signal", "idle");
  const box = (await word.boundingBox())!;
  const home = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const live = { x: home.x + 60, y: home.y + 150 };
  const canvas = word.locator("canvas");
  await expect.poll(() => pixels(canvas, home).then(p => p.ink)).toBeGreaterThan(20);
  return { word, canvas, home, live };
}

async function pixels(canvas: Locator, point: { x: number; y: number }) {
  return canvas.evaluate((element, point) => {
    const c = element as HTMLCanvasElement;
    const box = c.getBoundingClientRect();
    const scale = c.width / box.width;
    const x = Math.max(0, Math.round((point.x - box.left - 42) * scale));
    const y = Math.max(0, Math.round((point.y - box.top - 48) * scale));
    const w = Math.min(c.width - x, Math.round(84 * scale));
    const h = Math.min(c.height - y, Math.round(96 * scale));
    const data = c.getContext("2d")!.getImageData(x, y, w, h).data;
    let red = 0, ink = 0, hash = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 50) ink++;
      if (data[i] > 225 && data[i + 1] < 65 && data[i + 2] < 110 && data[i + 3] > 60) red++;
      hash = (Math.imul(hash, 31) + data[i] + data[i + 1] * 3 + data[i + 3]) | 0;
    }
    return { red, ink, hash };
  }, point);
}

async function hold(page: Page, home: { x: number; y: number }, live: { x: number; y: number }) {
  await page.mouse.move(home.x, home.y);
  await page.mouse.down();
  await page.mouse.move(live.x, live.y, { steps: 4 });
}

test("only the dragged Ember letter gains rapidly changing red signal slices and returns cleanly", async ({ page }, info) => {
  const { word, canvas, home, live } = await prepare(page);
  if (process.env.MOONSTORE_PREVIEW_DIR && info.project.name === "desktop") {
    await page.mouse.move(0, 0);
    await page.screenshot({ path: `${process.env.MOONSTORE_PREVIEW_DIR}/wordmark-rest.png` });
  }
  await hold(page, home, live);
  await expect(word).toHaveAttribute("data-signal", "drag");
  await expect.poll(() => pixels(canvas, live).then(p => p.red)).toBeGreaterThan(10);
  const hashes = new Set<number>();
  for (let i = 0; i < 12; i++) {
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
    hashes.add((await pixels(canvas, live)).hash);
  }
  expect(hashes.size).toBeGreaterThan(2);
  if (process.env.MOONSTORE_PREVIEW_DIR && info.project.name === "desktop") {
    await page.screenshot({ path: `${process.env.MOONSTORE_PREVIEW_DIR}/wordmark-drag.png` });
    const box = (await word.boundingBox())!;
    await page.screenshot({ path: `${process.env.MOONSTORE_PREVIEW_DIR}/wordmark-detail.png`, clip: { x: box.x - 12, y: box.y - 20, width: box.width + 100, height: box.height + 240 } });
  }
  await page.mouse.up();
  await expect(word).toHaveAttribute("data-signal", "idle");
  await expect.poll(() => pixels(canvas, live).then(p => p.ink), { timeout: 8000 }).toBe(0);
  await expect.poll(() => pixels(canvas, home).then(p => p.ink)).toBeGreaterThan(20);
});

for (const interruption of ["cancel", "lost capture", "blur"] as const) {
  test(`${interruption} clears the signal and keeps surrounding links usable`, async ({ page }) => {
    const { word, home, live } = await prepare(page);
    await hold(page, home, live);
    await expect(word).toHaveAttribute("data-signal", "drag");
    if (interruption === "cancel") await word.evaluate(element => element.dispatchEvent(new PointerEvent("pointercancel", { pointerId: 1, bubbles: true })));
    if (interruption === "lost capture") {
      await expect.poll(() => word.evaluate(element => element.hasPointerCapture(1))).toBe(true);
      await word.evaluate(element => element.releasePointerCapture(1));
      // The browser processes pending capture changes before the next pointer event.
      await page.mouse.move(live.x + 1, live.y + 1);
    }
    if (interruption === "blur") await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    await expect(word).toHaveAttribute("data-signal", "idle");
    await page.mouse.up();
    await expect.poll(() => word.evaluate(element => element.hasPointerCapture(1))).toBe(false);
    await page.getByRole("link", { name: "Share feedback", exact: true }).click();
    await expect(page).toHaveURL(/#feedback$/);
  });
}

test("reduced motion uses a static red offset while held and returns immediately", async ({ page }) => {
  const { word, canvas, home, live } = await prepare(page, true);
  await hold(page, home, live);
  await expect(word).toHaveAttribute("data-signal", "static");
  await expect.poll(() => pixels(canvas, live).then(p => p.red)).toBeGreaterThan(5);
  const first = (await pixels(canvas, live)).hash;
  for (let i = 0; i < 6; i++) await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
  expect((await pixels(canvas, live)).hash).toBe(first);
  await page.mouse.up();
  await expect(word).toHaveAttribute("data-signal", "idle");
  await expect.poll(() => pixels(canvas, live).then(p => p.ink)).toBe(0);
});

for (const ending of ["touchEnd", "touchCancel"] as const) {
  test(`touch drag clears the signal on ${ending}`, async ({ page }, info) => {
    test.skip(info.project.name !== "mobile", "Touch input is covered by the mobile project.");
    const { word, canvas, home, live } = await prepare(page);
    const session = await page.context().newCDPSession(page);
    try {
      await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: home.x, y: home.y }] });
      await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: live.x, y: live.y }] });
      await expect(word).toHaveAttribute("data-signal", "drag");
      await expect.poll(() => pixels(canvas, live).then(p => p.red)).toBeGreaterThan(10);
      await session.send("Input.dispatchTouchEvent", { type: ending, touchPoints: [] });
      await expect(word).toHaveAttribute("data-signal", "idle");
      await expect.poll(() => pixels(canvas, live).then(p => p.ink), { timeout: 8000 }).toBe(0);
      await expect(page).toHaveURL(/\/$/);
    } finally { await session.detach(); }
  });
}

test("changing motion preference during a drag removes dynamic interference", async ({ page }) => {
  const { word, home, live } = await prepare(page);
  await hold(page, home, live);
  await expect(word).toHaveAttribute("data-signal", "drag");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(word).toHaveAttribute("data-signal", "idle");
  await page.mouse.up();
  await hold(page, home, live);
  await expect(word).toHaveAttribute("data-signal", "static");
  await page.mouse.up();
});

test("normal light and dark wordmarks retain their original dragging without red signal", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  for (const theme of ["dark", "light"]) {
    if (await page.locator("html").getAttribute("data-theme") !== theme) await page.getByRole("button", { name: `Switch to ${theme} theme`, exact: true }).click();
    await page.evaluate(async () => { await document.fonts.ready; });
    const word = page.locator(".moonstore-word .tech-text");
    const box = (await word.boundingBox())!;
    const home = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    const live = { x: home.x + 60, y: home.y + 150 };
    await expect.poll(() => pixels(word.locator("canvas"), home).then(p => p.ink)).toBeGreaterThan(20);
    await hold(page, home, live);
    await expect.poll(() => pixels(word.locator("canvas"), live).then(p => p.ink)).toBeGreaterThan(20);
    await expect(word).toHaveAttribute("data-signal", "idle");
    expect((await pixels(word.locator("canvas"), live)).red).toBe(0);
    await page.mouse.up();
    await expect.poll(() => pixels(word.locator("canvas"), live).then(p => p.ink)).toBe(0);
  }
});
