"use client";

import { useEffect, useRef } from "react";

// Theme switch, both ways: "Blackwall" crimson data corruption in 4 phases.
// 1 Desync (0–20%): the live page tears sideways through an SVG displacement
//   filter with a red ghost split off; red slice bands jitter on top.
// 2 Datamosh (20–45%): 40–70 glitch bands, dark red macroblocks, static,
//   corrupted hex strings and small flickering ring sigils.
// 3 Overload (45–58%): crimson/black inversion frames fully cover the screen;
//   the theme swaps underneath at 52%.
// 4 Signal lock (58–100%): bands and tearing decay while the headings on screen
//   decode from block characters back into their real text.
// Randomness changes every 45ms, so the motion steps like a broken signal.
const DESYNC = .2;
const MOSH = .45;
const PEAK_END = .58;
export const STEP_MS = 45;
const VOID = "#060508", CRIMSON = "#9e001a", SIGNAL = "#ff0033", MAROON = "#380008", BONE = "#e8e0d4";
const CODES = ["0xFA91_ERR", "BLACKWALL_BREACH", "MEM_FAULT", "0xFF_SEG", "SIG_LOST", "0x9E001A", "PTR_NULL", "CRC_FAIL"];
const JUNK = "█▓▒░0xF";
// The SVG tear filter is rendered on the CPU, so it only touches small areas:
// the header and the headings on screen. Whole sections just jump sideways in
// steps (a cheap composited offset), which keeps the torn-signal feel.
const TEAR_TARGETS = ".announcement, .site-header, #main h1, #main h2";
const SHIFT_TARGETS = ".ember-section, .site-footer";

const hash = (...values: number[]) => {
  let h = 2166136261;
  for (const value of values) { h = Math.imul(h ^ (value | 0), 16777619); h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15; }
  return (h >>> 0) / 4294967296;
};

// The ring sigil from the backgrounds, small, as a reusable sprite.
function sigil(r: number, stroke: string) {
  const size = Math.ceil(r * 3.2);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const c = canvas.getContext("2d")!;
  c.translate(size / 2, size / 2);
  c.lineCap = "round"; c.lineWidth = Math.max(2, r * .14); c.strokeStyle = stroke;
  c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.stroke();
  c.beginPath(); c.arc(0, 0, r * 1.45, .5, Math.PI * 1.6); c.stroke();
  c.beginPath(); c.arc(0, 0, r * .22, 0, Math.PI * 2); c.stroke();
  return canvas;
}

function staticTile() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 96;
  const c = canvas.getContext("2d")!;
  for (let i = 0; i < 1400; i++) {
    const pick = hash(i, 1);
    c.fillStyle = pick < .5 ? MAROON : pick < .8 ? CRIMSON : pick < .95 ? VOID : SIGNAL;
    c.fillRect(Math.floor(hash(i, 2) * 96), Math.floor(hash(i, 3) * 96), 1 + Math.floor(hash(i, 4) * 2), 1);
  }
  return canvas;
}

// Fades in over the desync, holds through the overload, decays during the lock.
export const envelopeAt = (p: number) => p < DESYNC ? p / DESYNC : p < PEAK_END ? 1 : 1 - (p - PEAK_END) / (1 - PEAK_END);

// Sprites and patterns for one surface. `scale` sizes everything for that
// surface: 1 for the full-screen switch, about .25 for the 38px ember button.
export type CorruptionKit = { scale: number; sprites: HTMLCanvasElement[]; noise: HTMLCanvasElement; scanlines: CanvasPattern | null };

export function corruptionKit(ctx: CanvasRenderingContext2D, scale: number): CorruptionKit {
  const line = document.createElement("canvas");
  line.width = 1; line.height = 3;
  const lc = line.getContext("2d")!;
  lc.fillStyle = "rgba(0, 0, 0, .6)"; lc.fillRect(0, 0, 1, 1);
  return {
    scale,
    sprites: [sigil(Math.max(3, 16 * scale), CRIMSON), sigil(Math.max(4, 22 * scale), SIGNAL), sigil(Math.max(3, 14 * scale), "#1a0a0e")],
    noise: staticTile(),
    scanlines: ctx.createPattern(line, "repeat"),
  };
}

// One frame of the corruption at progress p (0–1) on a width × height area,
// in the context's current units. Randomness is fixed per 45ms step.
export function paintCorruption(ctx: CanvasRenderingContext2D, width: number, height: number, p: number, step: number, seed: number, kit: CorruptionKit) {
  const { scale, sprites, noise, scanlines } = kit;
  const r = (...salt: number[]) => hash(seed, step, ...salt);
  const envelope = envelopeAt(p);
  ctx.clearRect(0, 0, width, height);
  ctx.textBaseline = "top";

  // Hex strings are unreadable on tiny surfaces, so they only appear at full size.
  const codes = (count: number, alpha: number) => {
    if (scale < .5) return;
    for (let i = 0; i < count; i++) {
      ctx.globalAlpha = alpha;
      ctx.font = `600 ${11 + Math.floor(r(i, 40) * 6)}px ui-monospace, Consolas, monospace`;
      ctx.fillStyle = r(i, 41) > .35 ? BONE : SIGNAL;
      ctx.fillText(CODES[Math.floor(r(i, 42) * CODES.length)], r(i, 43) * width * .85, r(i, 44) * height);
    }
    ctx.globalAlpha = 1;
  };
  // Sigils torn into three horizontal slices that jump sideways.
  const sigils = (count: number, alpha: number) => {
    ctx.globalAlpha = alpha;
    for (let i = 0; i < count; i++) {
      const sprite = sprites[Math.floor(r(i, 50) * sprites.length)];
      const x = r(i, 51) * Math.max(0, width - sprite.width), y = r(i, 52) * Math.max(0, height - sprite.height);
      const size = sprite.width, bands = 3;
      for (let b = 0; b < bands; b++) {
        const top = Math.floor((b / bands) * size), h = Math.ceil(size / bands);
        ctx.drawImage(sprite, 0, top, size, h, x + (hash(seed, step, i, b) - .5) * size * .35, y + top, size, h);
      }
    }
    ctx.globalAlpha = 1;
  };

  if (p >= MOSH && p < PEAK_END) {
    // Overload: alternating crimson/black inversion frames, fully opaque.
    const invert = step % 2 === 0;
    ctx.fillStyle = invert ? CRIMSON : VOID; ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = invert ? VOID : CRIMSON;
    for (let i = 0; i < 14; i++) ctx.fillRect(0, r(i, 1) * height, width, 2 * scale + r(i, 2) * height * .06);
    ctx.fillStyle = SIGNAL;
    for (let i = 0; i < 5; i++) ctx.fillRect(0, r(i, 3) * height, width, Math.max(.5, (1 + r(i, 4) * 2) * scale));
    codes(5, 1);
    sigils(3, 1);
  } else {
    const mosh = p >= DESYNC && p < MOSH;
    const count = mosh ? 40 + Math.floor(r(0) * 30) : Math.round((p < DESYNC ? 12 : 50) * envelope);
    for (let i = 0; i < count; i++) {
      const pick = r(i, 5);
      ctx.globalAlpha = (.35 + r(i, 6) * .6) * envelope;
      ctx.fillStyle = pick < .45 ? MAROON : pick < .75 ? CRIMSON : pick < .9 ? VOID : SIGNAL;
      ctx.fillRect((r(i, 3) - .5) * width * .3 * envelope, r(i, 1) * height, width * (.3 + r(i, 4) * .9), Math.max(.5, scale) + r(i, 2) ** 2 * height * .05);
    }
    if (mosh || envelope > .3) {
      // Macroblocks: clusters of grid-aligned blocks knocked out of place.
      const grid = Math.max(2, Math.round(8 * scale));
      for (let c = 0; c < 8; c++) {
        const cx = Math.floor(r(c, 20) * width / grid) * grid, cy = Math.floor(r(c, 21) * height / grid) * grid;
        for (let b = 0; b < 6 + Math.floor(r(c, 22) * 8); b++) {
          const size = grid * (1 + Math.floor(r(c, b, 23) * 3));
          ctx.globalAlpha = .8 * envelope;
          ctx.fillStyle = r(c, b, 24) < .5 ? MAROON : r(c, b, 24) < .85 ? CRIMSON : VOID;
          ctx.fillRect(cx + Math.floor((r(c, b, 25) - .5) * 10) * grid, cy + Math.floor((r(c, b, 26) - .5) * 6) * grid, size, size);
        }
      }
      if (mosh || r(99) > .6) {
        ctx.globalAlpha = .5 * envelope;
        const tile = 192 * scale;
        for (let i = 0; i < 8; i++) ctx.drawImage(noise, r(i, 30) * width, r(i, 31) * height, tile, tile * (.2 + r(i, 32)));
      }
      codes(mosh ? 9 : 4, envelope);
      sigils(mosh ? 3 : 1, envelope);
    }
    ctx.globalAlpha = 1;
  }

  // CRT scanlines and a dark red vignette over everything, following the envelope.
  if (scanlines) { ctx.globalAlpha = .35 * envelope; ctx.fillStyle = scanlines; ctx.fillRect(0, 0, width, height); }
  ctx.globalAlpha = envelope;
  const vignette = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * .3, width / 2, height / 2, Math.hypot(width, height) * .6);
  vignette.addColorStop(0, "rgba(56, 0, 8, 0)"); vignette.addColorStop(1, "rgba(56, 0, 8, .75)");
  ctx.fillStyle = vignette; ctx.fillRect(0, 0, width, height);
  ctx.globalAlpha = 1;
}

type Decode = { node: Text; text: string }[];

export default function CorruptionCurtain() {
  const ref = useRef<HTMLCanvasElement>(null);
  const turbulence = useRef<SVGFETurbulenceElement>(null);
  const displace = useRef<SVGFEDisplacementMapElement>(null);
  const ghost = useRef<SVGFEOffsetElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return undefined;
    const root = document.documentElement;
    let raf = 0, start = 0, duration = 600, width = 1, height = 1, seed = 0;
    let torn: Element[] = [];
    let shifted: HTMLElement[] = [];
    let decode: Decode | null = null;
    let kit: CorruptionKit | null = null;

    const setTear = (on: boolean) => torn.forEach((el) => { if (on) el.setAttribute("data-glitching", ""); else el.removeAttribute("data-glitching"); });
    const setShift = (x: number) => shifted.forEach((el) => {
      if (x) { el.setAttribute("data-glitch-shift", ""); el.style.setProperty("--glitch-x", `${x}px`); }
      else { el.removeAttribute("data-glitch-shift"); el.style.removeProperty("--glitch-x"); }
    });
    // Always leaves the headings exactly as they were.
    const restoreText = () => { decode?.forEach(({ node, text }) => { node.nodeValue = text; }); decode = null; };
    const stop = () => {
      cancelAnimationFrame(raf); raf = 0;
      setTear(false); torn = [];
      setShift(0); shifted = [];
      restoreText();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    const inView = (el: Element) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < height && r.width > 0; };

    // Plain headings only: components that animate their own text are skipped.
    const collectHeadings = (): Decode => [...document.querySelectorAll("#main h1, #main h2")]
      .filter((h) => inView(h) && !h.querySelector(".decrypted-text, .text-type__content"))
      .flatMap((h) => {
        const walker = document.createTreeWalker(h, NodeFilter.SHOW_TEXT);
        const nodes: Decode = [];
        for (let node = walker.nextNode(); node; node = walker.nextNode()) nodes.push({ node: node as Text, text: node.nodeValue ?? "" });
        return nodes;
      });

    const draw = (now: number) => {
      const elapsed = now - start, p = elapsed / duration;
      if (p >= 1) { stop(); return; }
      const step = Math.floor(elapsed / STEP_MS);
      const r = (...salt: number[]) => hash(seed, step, ...salt);
      const envelope = envelopeAt(p);

      // The live page tears during onset and decay; the overload hides it.
      const tearing = p < MOSH || (p > PEAK_END && p < .92);
      setTear(tearing);
      setShift(tearing && r(93) > .45 ? Math.round((r(94) - .5) * 24 * envelope) : 0);
      if (tearing) {
        turbulence.current?.setAttribute("seed", String(step % 97));
        displace.current?.setAttribute("scale", String(Math.round(envelope * (30 + r(90) * 50))));
        ghost.current?.setAttribute("dx", String(Math.round(envelope * (6 + r(91) * 10) * (r(92) > .5 ? 1 : -1))));
      }

      ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
      if (kit) paintCorruption(ctx, width, height, p, step, seed, kit);

      // Signal lock: headings decode left to right back into clean text.
      if (p >= PEAK_END) {
        decode ??= collectHeadings();
        const q = (p - PEAK_END) / (1 - PEAK_END);
        decode.forEach(({ node, text }, n) => {
          node.nodeValue = [...text].map((ch, i) => (
            ch.trim() && q < (i / Math.max(1, text.length)) * .75 + hash(seed, n, i) * .25 ? JUNK[Math.floor(r(n, i, 60) * JUNK.length)] : ch
          )).join("");
        });
      }
      raf = requestAnimationFrame(draw);
    };

    const sync = () => {
      if (root.dataset.themeTransition !== "corruption") { stop(); return; }
      if (raf) return;
      duration = parseFloat(getComputedStyle(root).getPropertyValue("--ember-transition-duration")) || 600;
      width = window.innerWidth; height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.ceil(width * dpr); canvas.height = Math.ceil(height * dpr);
      seed = Math.floor(performance.now());
      kit = corruptionKit(ctx, 1);
      torn = [...document.querySelectorAll(TEAR_TARGETS)].filter(inView);
      shifted = [...document.querySelectorAll<HTMLElement>(SHIFT_TARGETS)].filter(inView);
      start = performance.now();
      raf = requestAnimationFrame(draw);
    };

    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme-transition"] });
    return () => { observer.disconnect(); stop(); };
  }, []);

  return <>
    <div className="ember-curtain" aria-hidden="true"><canvas ref={ref} /></div>
    {/* Tears the live page: row noise (high vertical frequency) displaces it sideways, then a red-only copy is offset and screened back on as a ghost. Kept outside the hidden curtain so the filter always resolves. */}
    <svg className="ember-glitch-defs" width="0" height="0" focusable="false" aria-hidden="true">
      <filter id="crimson-glitch-filter" x="-5%" y="0" width="110%" height="100%" colorInterpolationFilters="sRGB">
        <feTurbulence ref={turbulence} type="fractalNoise" baseFrequency="0.00001 0.08" numOctaves={1} seed={1} result="noise" />
        <feColorMatrix in="noise" type="matrix" values="1 0 0 0 0  0 0 0 0 0.5  0 0 1 0 0  0 0 0 0 1" result="rows" />
        <feDisplacementMap ref={displace} in="SourceGraphic" in2="rows" scale={0} xChannelSelector="R" yChannelSelector="G" result="torn" />
        <feColorMatrix in="torn" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.7 0" result="red" />
        <feOffset ref={ghost} in="red" dx={0} dy={0} result="ghost" />
        <feBlend in="ghost" in2="torn" mode="screen" />
      </filter>
    </svg>
  </>;
}
