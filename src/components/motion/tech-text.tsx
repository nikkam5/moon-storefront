'use client';

import { useEffect, useRef } from 'react';

import './tech-text.css';

type RevealMode = 'area' | 'letter' | 'off';
type LineStyle = 'dashed' | 'solid';

export type TechTextProps = {
  text?: string;
  fontFamily?: string;
  fontWeight?: number;
  fontSize?: number;
  letterSpacing?: number;
  color?: string;
  accentColor?: string;
  reveal?: RevealMode;
  reach?: number;
  softness?: number;
  dashLength?: number;
  dashGap?: number;
  lineStyle?: LineStyle;
  strokeWidth?: number;
  specks?: number;
  selection?: boolean;
  labels?: boolean;
  draggable?: boolean;
  sweep?: boolean;
  speed?: number;
  fractured?: boolean;
  dragGlitch?: boolean;
  bleed?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

type Settings = Required<Omit<TechTextProps, 'className' | 'style'>>;

const LABEL_FONT = '10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const FALLOFF_STEPS = 8;
const SPRING = 320;
const DAMPING = 22;
// How close (px, canvas space) a press must land to a glyph to grab it.
// Generous so visible ink is easy to catch, but empty space never hijacks
// clicks meant for surrounding content.
const GRAB_SLOP = 56;
// Blood timeline (seconds): letters fill from the top once per visit; then
// each drip keeps cycling (grow, release a drop, retract to a residual stem,
// rest) for as long as the wordmark is on screen.
const POUR = 1.6;
const POUR_STAGGER = 0.07;
const RETRACT = 0.35;
const RESIDUAL = 0.42;
const BLEED_KEY = 'moonstore-bleed';

const approach = (current: number, target: number, dt: number, seconds: number) =>
  current + (target - current) * (1 - Math.exp(-dt / seconds));

const hexToRgb = (hex: string): [number, number, number] => {
  let h = String(hex || '').replace('#', '');
  if (h.length === 3) h = h.replace(/./g, (c) => c + c);
  const n = parseInt(h.slice(0, 6), 16);
  return Number.isNaN(n) ? [255, 255, 255] : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const rgba = (hex: string, alpha: number) => {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const noise = (...values: number[]) => {
  let h = 2166136261;
  for (const value of values) {
    h = Math.imul(h ^ (value | 0), 16777619);
    h ^= h >>> 13;
    h = Math.imul(h, 0x5bd1e995);
    h ^= h >>> 15;
  }
  return (h >>> 0) / 4294967296;
};

const signed = (value: number) => (value > 0 ? `+${value}` : value < 0 ? `−${-value}` : '0');

type Box = { x1: number; y1: number; x2: number; y2: number };
type Sprite = { image: HTMLCanvasElement; left: number; top: number };
type Glyph = {
  char: string;
  x: number;
  box: Box;
  offset: { x: number; y: number };
  velocity: { x: number; y: number };
  outline: number;
  index: number;
  fill: Sprite;
  dashes: Sprite;
  signal: Sprite | null;
};
// Position is canvas space at the glyph's home; the glyph offset is added when drawn.
// `released` is the last cycle whose drop has been handed to BloodFall.
type Drip = { glyph: number; x: number; y: number; start: number; grow: number; rest: number; length: number; width: number; head: number; released: number };
type WordView = {
  size: number;
  baseline: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
};

const TechText = ({
  text = 'React Bits',
  fontFamily = '',
  fontWeight = 600,
  fontSize = 150,
  letterSpacing = -0.05,
  color = '#ffffff',
  accentColor = '#ffffff',
  reach = 200,
  softness = 0.7,
  dashLength = 4,
  dashGap = 2,
  strokeWidth = 1.5,
  lineStyle = 'dashed',
  reveal = 'letter',
  specks = 15,
  selection = true,
  labels = true,
  draggable = true,
  sweep = true,
  speed = 1,
  fractured = false,
  dragGlitch = false,
  bleed = false,
  className = '',
  style,
}: TechTextProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const settingsRef = useRef<Settings | null>(null);
  const wakeRef = useRef<() => void>(() => {});

  useEffect(() => {
    settingsRef.current = {
      text,
      fontFamily,
      fontWeight,
      fontSize,
      letterSpacing,
      color,
      accentColor,
      reach,
      softness,
      dashLength,
      dashGap,
      strokeWidth,
      lineStyle,
      reveal,
      specks,
      selection,
      labels,
      draggable,
      sweep,
      speed,
      fractured,
      dragGlitch,
      bleed,
    };
    wakeRef.current();
  });

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const scratch = document.createElement('canvas');
    const scratchCtx = scratch.getContext('2d');
    // Only the held glyph is recomposited here, never the full drag field.
    const signalCanvas = document.createElement('canvas');
    const signalCtx = signalCanvas.getContext('2d');
    if (!container || !canvas || !ctx || !scratchCtx) return undefined;

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reducedMotion = motion.matches;
    let width = 1;
    let height = 1;
    // Layout-box size (the element's own box, used for word fit/centering).
    let containerW = 1;
    let containerH = 1;
    // Offset of the layout box origin inside canvas space. The canvas is
    // styled larger than the element (see tech-text.css) so dragged letters
    // stay visible far outside the word box; ancestors may still clip it.
    let padX = 0;
    let padTop = 0;
    let dpr = 1;
    let raf = 0;
    let last = performance.now();
    let visible = true;
    let intersects = true;
    let alive = true;
    let layoutKey = '';
    let requestedFont = '';
    let word: WordView | null = null;
    let glyphs: Glyph[] = [];
    let presence = 0;
    let clock = 0;
    let pulse = 0;
    let placed = false;
    let dragging = -1;
    let dragPointerId: number | null = null;
    let paintedBounds: Box | null = null;
    let signalIndex = -1;
    let signalStrength = 0;
    let fontSettled = '';
    // -1 waits for the font; Infinity is the finished, static blood.
    let bleedT = -1;
    let bleedPlaying = false;
    let drips: Drip[] = [];
    const pointer = { x: 0, y: 0, inside: false };
    const grab = { x: 0, y: 0 };
    const lens = { x: 0, y: 0 };
    const frame = { x1: 0, y1: 0, x2: 0, y2: 0, alpha: 0, index: -1 };

    const refreshFonts = () => {
      if (!alive) return;
      layoutKey = '';
      wakeRef.current();
    };

    const family = (s: Settings) => s.fontFamily || getComputedStyle(container).fontFamily || 'sans-serif';
    const fontFor = (s: Settings, size: number) => `${s.fontWeight} ${size}px ${family(s)}`;

    const setFont = (target: CanvasRenderingContext2D, s: Settings, size: number) => {
      target.font = fontFor(s, size);
      const spaced = target as CanvasRenderingContext2D & { letterSpacing?: string };
      if ('letterSpacing' in target) spaced.letterSpacing = `${s.letterSpacing * size}px`;
      target.textAlign = 'left';
      target.textBaseline = 'alphabetic';
    };

    const sprite = (s: Settings, view: WordView, glyph: { char: string; x: number; box: Box }, stroke: boolean): Sprite => {
      const pad = Math.ceil(s.strokeWidth * 2 + 4);
      const left = glyph.box.x1 - pad;
      const top = glyph.box.y1 - pad;
      const w = glyph.box.x2 - glyph.box.x1 + pad * 2;
      const h = glyph.box.y2 - glyph.box.y1 + pad * 2;
      const image = document.createElement('canvas');
      image.width = Math.max(1, Math.ceil(w * dpr));
      image.height = Math.max(1, Math.ceil(h * dpr));
      const c = image.getContext('2d');
      if (!c) return { image, left, top };
      c.setTransform(dpr, 0, 0, dpr, -left * dpr, -top * dpr);
      setFont(c, s, view.size);
      if (stroke) {
        c.lineJoin = 'round';
        c.lineWidth = s.strokeWidth * 2;
        c.lineCap = 'butt';
        c.strokeStyle = s.bleed ? '#ff3b47' : s.color;
        if (s.lineStyle !== 'solid') c.setLineDash([Math.max(1, s.dashLength), Math.max(1, s.dashGap)]);
        c.strokeText(glyph.char, glyph.x, view.baseline);
        c.setLineDash([]);
        c.globalCompositeOperation = 'destination-out';
        c.fillStyle = '#000000';
        c.fillText(glyph.char, glyph.x, view.baseline);
        c.globalCompositeOperation = 'source-over';
      } else if (s.bleed) {
        const blood = c.createLinearGradient(0, glyph.box.y1, 0, glyph.box.y2);
        blood.addColorStop(0, '#d0172a');
        blood.addColorStop(0.5, '#c1121f');
        blood.addColorStop(1, '#6b0510');
        c.fillStyle = blood;
        c.fillText(glyph.char, glyph.x, view.baseline);
        // A thin hot rim inside the letter edge reads as wet.
        c.globalCompositeOperation = 'source-atop';
        c.lineWidth = 1.4;
        c.strokeStyle = '#ff2a3a';
        c.strokeText(glyph.char, glyph.x, view.baseline);
        c.globalCompositeOperation = 'source-over';
      } else {
        c.fillStyle = s.color;
        c.fillText(glyph.char, glyph.x, view.baseline);
      }
      if (s.fractured) {
        const { x1, x2, y1, y2 } = glyph.box;
        const chamfer = Math.max(1, Math.min((x2 - x1) * .12, (y2 - y1) * .08));
        c.save();
        c.globalCompositeOperation = 'destination-out';
        c.beginPath();
        c.moveTo(x1 - 1, y1 - 1); c.lineTo(x1 + chamfer, y1 - 1); c.lineTo(x1 - 1, y1 + chamfer); c.closePath();
        c.moveTo(x2 + 1, y2 + 1); c.lineTo(x2 - chamfer, y2 + 1); c.lineTo(x2 + 1, y2 - chamfer); c.closePath();
        c.fill();
        if ('MNR'.includes(glyph.char)) {
          const seam = () => {
            c.beginPath(); c.moveTo(x1 - 1, y1 + (y2 - y1) * .64); c.lineTo(x2 + 1, y1 + (y2 - y1) * .38);
          };
          c.globalCompositeOperation = 'source-atop';
          c.strokeStyle = '#a71930'; c.lineWidth = Math.max(1.8, view.size * .042); seam(); c.stroke();
          c.globalCompositeOperation = 'destination-out';
          c.lineWidth = Math.max(.75, view.size * .018); seam(); c.stroke();
        }
        c.restore();
      }
      return { image, left, top };
    };

    const signalSprite = (art: Sprite): Sprite => {
      const image = document.createElement('canvas');
      image.width = art.image.width; image.height = art.image.height;
      const c = image.getContext('2d');
      if (c) {
        c.drawImage(art.image, 0, 0);
        c.globalCompositeOperation = 'source-in';
        c.fillStyle = '#ff183b'; c.fillRect(0, 0, image.width, image.height);
      }
      return { ...art, image };
    };

    const ensureLayout = (s: Settings): WordView => {
      const key = [
        s.text,
        family(s),
        s.fontWeight,
        s.fontSize,
        s.letterSpacing,
        s.color,
        s.dashLength,
        s.dashGap,
        s.strokeWidth,
        s.lineStyle,
        s.fractured,
        s.dragGlitch,
        s.bleed,
        containerW,
        containerH,
        padX,
        padTop,
        dpr,
      ].join('|');
      if (key === layoutKey && word) return word;
      layoutKey = key;
      const wanted = fontFor(s, 64);
      if (document.fonts && wanted !== requestedFont) {
        requestedFont = wanted;
        const settle = () => { fontSettled = wanted; refreshFonts(); };
        document.fonts.load(wanted, s.text).then(settle, settle);
      }

      const probe = scratchCtx;
      setFont(probe, s, s.fontSize);
      let m = probe.measureText(s.text);
      const fit = Math.min(
        1,
        (containerW * 0.9) / Math.max(m.actualBoundingBoxLeft + m.actualBoundingBoxRight, 1),
        (containerH * 0.66) / Math.max(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent, 1),
      );
      const size = s.fontSize * fit;
      setFont(probe, s, size);
      m = probe.measureText(s.text);
      const inkWidth = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
      const inkHeight = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
      // Center the word inside the layout box; canvas space is the layout
      // box shifted by the drag-field padding.
      const x = padX + (containerW - inkWidth) / 2 + m.actualBoundingBoxLeft;
      const baseline = padTop + (containerH - inkHeight) / 2 + m.actualBoundingBoxAscent;
      const next: WordView = {
        size,
        baseline,
        left: x - m.actualBoundingBoxLeft,
        right: x + m.actualBoundingBoxRight,
        top: baseline - m.actualBoundingBoxAscent,
        bottom: baseline + m.actualBoundingBoxDescent,
      };
      word = next;

      const chars = Array.from(s.text);
      const previous = glyphs;
      glyphs = [];
      let prefix = '';
      chars.forEach((char, i) => {
        prefix += char;
        const own = probe.measureText(char);
        const gx = x + probe.measureText(prefix).width - own.width;
        if (!char.trim()) return;
        const base = {
          char,
          x: gx,
          box: {
            x1: gx - own.actualBoundingBoxLeft,
            y1: baseline - own.actualBoundingBoxAscent,
            x2: gx + own.actualBoundingBoxRight,
            y2: baseline + own.actualBoundingBoxDescent,
          },
        };
        const kept = previous[glyphs.length];
        const fill = sprite(s, next, base, false);
        glyphs.push({
          ...base,
          offset: kept?.char === char ? kept.offset : { x: 0, y: 0 },
          velocity: { x: 0, y: 0 },
          outline: 0,
          index: i,
          fill,
          dashes: sprite(s, next, base, true),
          signal: s.dragGlitch ? signalSprite(fill) : null,
        });
      });
      drips = s.bleed ? planDrips(next) : [];
      // Re-planned after a resize: drops that already fell are not released again.
      drips.forEach((drip) => { drip.released = latestRelease(drip); });
      dragging = -1;
      signalIndex = -1;
      signalStrength = 0;
      if (dragPointerId !== null && container.hasPointerCapture(dragPointerId)) container.releasePointerCapture(dragPointerId);
      dragPointerId = null;
      frame.index = -1;
      return next;
    };

    // Drips leave only from a letter's base: runs of columns whose lowest ink
    // sits on the glyph's floor (stems, serifs, the bottom of round letters).
    const planDrips = (view: WordView): Drip[] => {
      const planned: Drip[] = [];
      glyphs.forEach((glyph, g) => {
        if (noise(glyph.index, 31) < 0.15) return;
        const art = glyph.fill;
        const c = art.image.getContext('2d');
        if (!c) return;
        const { width: w, height: h } = art.image;
        const alpha = c.getImageData(0, 0, w, h).data;
        const lows = new Int32Array(w).fill(-1);
        let floor = -1;
        for (let x = 0; x < w; x++) {
          for (let y = h - 1; y >= 0; y--) {
            if (alpha[(y * w + x) * 4 + 3] > 160) { lows[x] = y; floor = Math.max(floor, y); break; }
          }
        }
        if (floor < 0) return;
        const runs: [number, number][] = [];
        for (let x = 0; x < w; x++) {
          if (lows[x] < 0 || floor - lows[x] > 2.5 * dpr) continue;
          const run = runs[runs.length - 1];
          if (run && run[1] === x - 1) run[1] = x;
          else runs.push([x, x]);
        }
        runs.sort((a, b) => b[1] - b[0] - (a[1] - a[0]));
        runs.slice(0, noise(glyph.index, 37) > 0.6 ? 2 : 1).forEach(([from, to], k) => {
          const n = (salt: number) => noise(glyph.index, k, salt);
          planned.push({
            glyph: g,
            x: art.left + (from + (to - from) * (0.3 + n(3) * 0.4)) / dpr,
            y: art.top + floor / dpr,
            start: POUR * 0.75 + g * POUR_STAGGER + n(1) * 2.6,
            grow: 1.6 + n(2) * 1.2,
            rest: 0.6 + n(7) * 2.4,
            length: view.size * (0.32 + n(4) * 0.26),
            width: Math.max(1.4, view.size * (0.022 + n(5) * 0.016)),
            head: Math.max(3, view.size * (0.06 + n(6) * 0.03)),
            released: -1,
          });
        });
      });
      return planned;
    };

    const pourEnd = () => POUR + glyphs.length * POUR_STAGGER;
    const cycleOf = (drip: Drip) => drip.grow + RETRACT + drip.rest;
    // Seconds into the drip's current cycle; null before it first starts.
    const phaseOf = (drip: Drip) => {
      const local = bleedT - drip.start;
      return local > 0 && Number.isFinite(local) ? local % cycleOf(drip) : null;
    };
    const latestRelease = (drip: Drip) => {
      const local = bleedT - drip.start - drip.grow;
      return local < 0 ? -1 : Math.floor(local / cycleOf(drip));
    };

    // Reduced motion (bleedT = Infinity) shows the residual stems, still.
    const dripLength = (drip: Drip) => {
      if (!Number.isFinite(bleedT)) return drip.length * RESIDUAL;
      const p = phaseOf(drip);
      if (p === null) return 0;
      const base = bleedT - drip.start >= cycleOf(drip) ? drip.length * RESIDUAL : 0;
      if (p < drip.grow) {
        const t = p / drip.grow;
        return base + (drip.length - base) * t * t * (3 - 2 * t);
      }
      const q = Math.min(1, (p - drip.grow) / RETRACT);
      return drip.length * (1 - (1 - RESIDUAL) * q);
    };

    const dripBounds = (): Box | null => {
      let box: Box | null = null;
      for (const drip of drips) {
        const glyph = glyphs[drip.glyph];
        const x = drip.x + glyph.offset.x;
        const y = drip.y + glyph.offset.y;
        const reach = Math.max(drip.head, drip.width * 2) + 2;
        const next = clipBounds((x - reach) * dpr, (y - 2) * dpr, (x + reach) * dpr, (y + drip.length + 3) * dpr);
        if (next) box = box ? { x1: Math.min(box.x1, next.x1), y1: Math.min(box.y1, next.y1), x2: Math.max(box.x2, next.x2), y2: Math.max(box.y2, next.y2) } : next;
      }
      return box;
    };

    const drawDrips = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (const drip of drips) {
        const length = dripLength(drip);
        if (length < 1) continue;
        const glyph = glyphs[drip.glyph];
        const x = drip.x + glyph.offset.x;
        const y = drip.y + glyph.offset.y - 1;
        const p = phaseOf(drip);
        const spent = !Number.isFinite(bleedT) || (p !== null && p >= drip.grow);
        const r = Math.min(drip.head * (spent ? 0.7 : 1), length * 0.45);
        const w = Math.min(drip.width, r);
        const cy = y + length - r;
        const body = ctx.createLinearGradient(0, y, 0, cy + r);
        body.addColorStop(0, '#6b0510');
        body.addColorStop(1, '#b3101e');
        // A flared neck where it leaves the letter, a thin stem and a round head.
        ctx.beginPath();
        ctx.moveTo(x - w * 1.8, y);
        ctx.bezierCurveTo(x - w * 0.6, y + 1, x - w, cy - r, x - r, cy);
        ctx.arc(x, cy, r, Math.PI, 0, true);
        ctx.bezierCurveTo(x + w, cy - r, x + w * 0.6, y + 1, x + w * 1.8, y);
        ctx.closePath();
        ctx.fillStyle = body;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x - r * 0.35, cy - r * 0.3, r * 0.28, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 150, 150, 0.5)';
        ctx.fill();
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    };

    // Blood fills the letter from the top; the empty part keeps its outline.
    const drawPoured = (glyph: Glyph, order: number) => {
      const p = Math.min(1, Math.max(0, (bleedT - order * POUR_STAGGER) / POUR));
      const level = p * p * (3 - 2 * p);
      const ox = glyph.offset.x;
      const oy = glyph.offset.y;
      const alpha = ctx.globalAlpha;
      ctx.globalAlpha = alpha * 0.7;
      blit(ctx, glyph.dashes, ox, oy, 0, 0);
      ctx.globalAlpha = alpha;
      if (level <= 0) return;
      const left = glyph.box.x1 - 8 + ox;
      const right = glyph.box.x2 + 8 + ox;
      const top = glyph.box.y1 - 6 + oy;
      const surface = top + (glyph.box.y2 - glyph.box.y1 + 12) * level;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(left * dpr, top * dpr);
      ctx.lineTo(right * dpr, top * dpr);
      // An uneven leading edge, like liquid running down a wall.
      for (let k = 0; k <= 6; k++) {
        const run = Math.sin(k * 1.9 + glyph.index * 2.3 + bleedT * 5) * 3 + noise(glyph.index, k, 5) * 7;
        ctx.lineTo((right - ((right - left) * k) / 6) * dpr, (surface + run) * dpr);
      }
      ctx.closePath();
      ctx.clip();
      blit(ctx, glyph.fill, ox, oy, 0, 0);
      ctx.restore();
    };

    const advanceBleed = (s: Settings, dt: number) => {
      if (!s.bleed) { container.dataset.bleed = 'off'; return; }
      if (bleedT < 0 && (fontSettled === requestedFont || !document.fonts)) {
        let seen = false;
        try {
          seen = sessionStorage.getItem(BLEED_KEY) === 'done';
          sessionStorage.setItem(BLEED_KEY, 'done');
        } catch { /* Without storage it plays on each load. */ }
        resumeBleed(seen);
      } else if (bleedPlaying) {
        // Only advances while the wordmark is on screen: scrolling away from
        // Home stops the loop and coming back resumes it.
        bleedT += dt;
        const art = canvas.getBoundingClientRect();
        for (const drip of drips) {
          const cycle = latestRelease(drip);
          if (cycle <= drip.released) continue;
          drip.released = cycle;
          const glyph = glyphs[drip.glyph];
          // The falling drop is drawn by the page (BloodFall), behind the hero copy.
          container.dispatchEvent(new CustomEvent('moonstore-bleed', {
            bubbles: true,
            detail: { x: art.left + drip.x + glyph.offset.x, y: art.top + drip.y + glyph.offset.y + drip.length - drip.head, radius: drip.head },
          }));
        }
      }
      container.dataset.bleed = bleedT < 0 ? 'waiting' : !bleedPlaying ? 'still' : bleedT < pourEnd() ? 'pouring' : 'dripping';
    };

    // A repeat visit skips the pour and goes straight to dripping.
    const resumeBleed = (poured: boolean) => {
      bleedPlaying = !reducedMotion;
      bleedT = !bleedPlaying ? Infinity : poured ? pourEnd() : 0;
      drips.forEach((drip) => { drip.released = latestRelease(drip); });
    };

    const glyphAt = (x: number, y: number) => {
      if (!word) return -1;
      let best = -1;
      let bestDistance = Infinity;
      glyphs.forEach((glyph, i) => {
        const x1 = glyph.box.x1 + glyph.offset.x;
        const x2 = glyph.box.x2 + glyph.offset.x;
        const y1 = glyph.box.y1 + glyph.offset.y;
        const y2 = glyph.box.y2 + glyph.offset.y;
        const dx = x < x1 ? x1 - x : x > x2 ? x - x2 : 0;
        const dy = y < y1 ? y1 - y : y > y2 ? y - y2 : 0;
        const d = Math.hypot(dx, dy);
        if (d < bestDistance) {
          bestDistance = d;
          best = i;
        }
      });
      // Grab only near a letter (generous slop) so empty space never
      // hijacks clicks. Once grabbed, pointer capture keeps the drag alive
      // anywhere the pointer roams.
      return bestDistance <= GRAB_SLOP ? best : -1;
    };

    const falloff = (target: CanvasRenderingContext2D, cx: number, cy: number, radius: number, strength: number, soft: number) => {
      const inner = Math.min(1, Math.max(0, 1 - soft));
      const gradient = target.createRadialGradient(cx, cy, 0, cx, cy, radius);
      gradient.addColorStop(0, `rgba(0, 0, 0, ${strength})`);
      if (inner > 0.995) {
        gradient.addColorStop(0.995, `rgba(0, 0, 0, ${strength})`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        return gradient;
      }
      for (let i = 0; i <= FALLOFF_STEPS; i++) {
        const t = i / FALLOFF_STEPS;
        const eased = t * t * (3 - 2 * t);
        gradient.addColorStop(inner + (1 - inner) * t, `rgba(0, 0, 0, ${strength * (1 - eased)})`);
      }
      return gradient;
    };

    const blit = (target: CanvasRenderingContext2D, art: Sprite, dx: number, dy: number, originX: number, originY: number) => {
      target.drawImage(art.image, Math.round((art.left + dx) * dpr - originX), Math.round((art.top + dy) * dpr - originY));
    };

    const drawSignal = (glyph: Glyph, now: number) => {
      if (!signalCtx || !glyph.signal) { blit(ctx, glyph.fill, glyph.offset.x, glyph.offset.y, 0, 0); return; }
      const art = glyph.fill;
      const margin = Math.ceil(16 * dpr);
      const w = art.image.width;
      const h = art.image.height;
      if (signalCanvas.width !== w + margin * 2 || signalCanvas.height !== h) {
        signalCanvas.width = w + margin * 2; signalCanvas.height = h;
      }
      signalCtx.clearRect(0, 0, signalCanvas.width, h);
      signalCtx.globalAlpha = 1;
      signalCtx.drawImage(art.image, margin, 0);
      const distance = Math.hypot(glyph.offset.x, glyph.offset.y);
      const strength = signalStrength * Math.min(1, .4 + distance / 140);
      if (reducedMotion) {
        signalCtx.globalAlpha = .85;
        signalCtx.drawImage(glyph.signal.image, margin + Math.round(3 * dpr), 0);
        signalCtx.globalAlpha = 1;
        signalCtx.drawImage(art.image, margin, 0);
      } else {
        // Change spatial slices at ~22Hz. The ivory core stays visible; there
        // is no whole-letter luminance flashing or full-screen interference.
        const phase = Math.floor(now / 46);
        for (let band = 0; band < 5; band++) {
          const y = Math.floor((.08 + noise(glyph.index, phase, band, 1) * .8) * h);
          const bandH = Math.min(h - y, Math.max(1, Math.round((1 + noise(glyph.index, phase, band, 2) * 2) * dpr)));
          const displacement = Math.round((3 + noise(glyph.index, phase, band, 3) * 9) * strength * dpr) * (band % 2 ? -1 : 1);
          signalCtx.clearRect(0, y, signalCanvas.width, bandH);
          signalCtx.globalAlpha = .88 * signalStrength;
          signalCtx.drawImage(glyph.signal.image, 0, y, w, bandH, margin - displacement, y, w, bandH);
          signalCtx.globalAlpha = 1;
          signalCtx.drawImage(art.image, 0, y, w, bandH, margin + displacement * .5, y, w, bandH);
        }
        signalCtx.globalAlpha = .65 * signalStrength;
        signalCtx.fillStyle = '#ff183b';
        for (let pixel = 0; pixel < 7; pixel++) {
          const x = margin + noise(glyph.index, phase, pixel, 7) * w;
          const y = noise(glyph.index, phase, pixel, 8) * h;
          signalCtx.fillRect(Math.round(x), Math.round(y), Math.ceil((1 + noise(phase, pixel) * 3) * dpr), Math.ceil(dpr));
        }
      }
      signalCtx.globalAlpha = 1;
      ctx.drawImage(signalCanvas, Math.round((art.left + glyph.offset.x) * dpr) - margin, Math.round((art.top + glyph.offset.y) * dpr));
    };

    const clipBounds = (x1: number, y1: number, x2: number, y2: number): Box | null => {
      const bounds = {
        x1: Math.max(0, Math.floor(x1)),
        y1: Math.max(0, Math.floor(y1)),
        x2: Math.min(canvas.width, Math.ceil(x2)),
        y2: Math.min(canvas.height, Math.ceil(y2)),
      };
      return bounds.x2 > bounds.x1 && bounds.y2 > bounds.y1 ? bounds : null;
    };

    // Keep the wide drag canvas, but only paint where glyph pixels exist.
    const inkBounds = (): Box | null => {
      let x1 = Infinity;
      let y1 = Infinity;
      let x2 = -Infinity;
      let y2 = -Infinity;
      for (const glyph of glyphs) {
        const art = glyph.fill;
        const homeX = Math.round(art.left * dpr);
        const homeY = Math.round(art.top * dpr);
        const liveX = Math.round((art.left + glyph.offset.x) * dpr);
        const liveY = Math.round((art.top + glyph.offset.y) * dpr);
        const signalPad = glyph.index === signalIndex && signalStrength > .002 ? Math.ceil(16 * dpr) : 0;
        x1 = Math.min(x1, homeX, liveX - signalPad);
        y1 = Math.min(y1, homeY, liveY);
        x2 = Math.max(x2, homeX + art.image.width, liveX + art.image.width + signalPad);
        y2 = Math.max(y2, homeY + art.image.height, liveY + art.image.height);
      }
      return clipBounds(x1, y1, x2, y2);
    };

    const drawReveal = (s: Settings, ink: Box) => {
      const radius = s.reach * dpr;
      const cx = lens.x * dpr;
      const cy = lens.y * dpr;
      const x0 = Math.max(ink.x1, Math.floor(cx - radius));
      const y0 = Math.max(ink.y1, Math.floor(cy - radius));
      const x1 = Math.min(ink.x2, Math.ceil(cx + radius));
      const y1 = Math.min(ink.y2, Math.ceil(cy + radius));
      if (x1 <= x0 || y1 <= y0) return;
      const w = x1 - x0;
      const h = y1 - y0;
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = falloff(ctx, cx, cy, radius, presence, s.softness);
      ctx.fillRect(x0, y0, w, h);
      ctx.globalCompositeOperation = 'source-over';

      if (scratch.width < w || scratch.height < h) {
        scratch.width = Math.max(scratch.width, w);
        scratch.height = Math.max(scratch.height, h);
      }
      scratchCtx.setTransform(1, 0, 0, 1, 0, 0);
      scratchCtx.globalCompositeOperation = 'source-over';
      scratchCtx.clearRect(0, 0, w, h);
      for (const glyph of glyphs) blit(scratchCtx, glyph.dashes, glyph.offset.x, glyph.offset.y, x0, y0);
      scratchCtx.globalCompositeOperation = 'destination-in';
      scratchCtx.fillStyle = falloff(scratchCtx, cx - x0, cy - y0, radius, 1, s.softness);
      scratchCtx.fillRect(0, 0, w, h);
      scratchCtx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = presence;
      ctx.drawImage(scratch, 0, 0, w, h, x0, y0, w, h);
      ctx.globalAlpha = 1;
    };

    const crisp = (value: number) => (Math.round(value * dpr) + 0.5) / dpr;

    const perimeterPoint = (distance: number, w: number, h: number): [number, number, number, number] => {
      let d = ((distance % (2 * (w + h))) + 2 * (w + h)) % (2 * (w + h));
      if (d < w) return [frame.x1 + d, frame.y1, 0, -1];
      d -= w;
      if (d < h) return [frame.x2, frame.y1 + d, 1, 0];
      d -= h;
      if (d < w) return [frame.x2 - d, frame.y2, 0, 1];
      d -= w;
      return [frame.x1, frame.y2 - d, -1, 0];
    };

    const drawSpecks = (s: Settings, a: number) => {
      const w = frame.x2 - frame.x1;
      const h = frame.y2 - frame.y1;
      if (w < 2 || h < 2) return;
      const perimeter = 2 * (w + h);
      const seed = frame.index + 1;
      const grid = 3;

      for (let k = 0; k < s.specks; k++) {
        const period = 0.5 + noise(seed, k, 11) * 1.2;
        const t = pulse / period + noise(seed, k, 17);
        const cycle = Math.floor(t);
        const life = t - cycle;
        if (life > 0.7) continue;
        const [px, py, nx, ny] = perimeterPoint(noise(seed, k, cycle) * perimeter, w, h);
        const pick = noise(seed, k, cycle, 2);
        const size = pick < 0.46 ? 2 : pick < 0.7 ? 3 : pick < 0.84 ? 5 : pick < 0.94 ? 8 : 11;
        const large = size >= 8;
        const out = (large ? 9 : 4) + Math.floor(noise(seed, k, cycle, 1) * 5) * grid;
        const x = frame.x1 + Math.round((px + nx * out - frame.x1) / grid) * grid;
        const y = frame.y1 + Math.round((py + ny * out - frame.y1) / grid) * grid;
        const tone = noise(seed, k, cycle, 3);
        const blink = life < 0.06 || (life > 0.32 && life < 0.36) ? 0.35 : 1;
        const alpha = a * (large ? 0.3 + 0.4 * tone : 0.3 + 0.6 * tone) * blink;
        const left = Math.round(x - size / 2);
        const top = Math.round(y - size / 2);
        if (tone < 0.26 || (large && tone < 0.78)) {
          ctx.strokeStyle = rgba(s.accentColor, alpha);
          ctx.strokeRect(left + 0.5, top + 0.5, size, size);
          if (large && tone > 0.5) {
            ctx.fillStyle = rgba(s.accentColor, alpha);
            ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2);
          }
        } else {
          ctx.fillStyle = rgba(s.accentColor, alpha);
          ctx.fillRect(left, top, size, size);
        }
      }

      for (let j = 0; j < 2; j++) {
        const head = (pulse * 0.42 * s.speed + j * 0.5) * perimeter;
        for (let i = 0; i < 4; i++) {
          const [x, y] = perimeterPoint(head - i * 6, w, h);
          const size = i === 0 ? 3 : 2;
          ctx.fillStyle = rgba(s.accentColor, a * [0.95, 0.55, 0.32, 0.16][i]);
          ctx.fillRect(Math.round(x - size / 2), Math.round(y - size / 2), size, size);
        }
      }
    };

    const drawFrame = (s: Settings) => {
      const glyph = glyphs[frame.index];
      if (!glyph || frame.alpha < 0.01) return;
      const a = frame.alpha;
      const x1 = crisp(frame.x1);
      const y1 = crisp(frame.y1);
      const x2 = crisp(frame.x2);
      const y2 = crisp(frame.y2);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const moved = Math.hypot(glyph.offset.x, glyph.offset.y);
      if (moved > 1) {
        const hx = (glyph.box.x1 + glyph.box.x2) / 2;
        const hy = (glyph.box.y1 + glyph.box.y2) / 2;
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.lineTo(hx + glyph.offset.x, hy + glyph.offset.y);
        ctx.setLineDash([3, 4]);
        ctx.lineWidth = 1;
        ctx.strokeStyle = rgba(s.accentColor, 0.45 * a);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.rect(Math.round(hx) - 2, Math.round(hy) - 2, 4, 4);
        ctx.fillStyle = rgba(s.accentColor, 0.7 * a);
        ctx.fill();
      }

      ctx.beginPath();
      ctx.rect(x1, y1, x2 - x1, y2 - y1);
      ctx.lineWidth = 1;
      ctx.strokeStyle = rgba(s.accentColor, 0.5 * a);
      ctx.stroke();

      ctx.beginPath();
      for (const [cx, cy] of [
        [x1, y1],
        [x2, y1],
        [x2, y2],
        [x1, y2],
      ]) {
        ctx.rect(Math.round(cx) - 2, Math.round(cy) - 2, 5, 5);
      }
      ctx.fillStyle = rgba(s.accentColor, 0.95 * a);
      ctx.fill();

      if (s.specks > 0 && dragging < 0) {
        ctx.lineWidth = 1;
        drawSpecks(s, a);
      }

      if (!s.labels) return;
      ctx.font = LABEL_FONT;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = rgba(s.accentColor, 0.62 * a);
      const label =
        moved > 1
          ? `${signed(Math.round(glyph.offset.x))}, ${signed(Math.round(-glyph.offset.y))}`
          : `${glyph.char}  ${Math.round(glyph.box.x2 - glyph.box.x1)} × ${Math.round(glyph.box.y2 - glyph.box.y1)}`;
      ctx.fillText(label, Math.round(frame.x1), Math.round(frame.y1) - 7);
    };

    const tick = (now: number) => {
      raf = 0;
      const s = settingsRef.current;
      if (!s || !visible || !alive || document.hidden) return;
      const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;
      const view = ensureLayout(s);
      advanceBleed(s, dt);
      if (dragging >= 0 && s.dragGlitch) {
        signalIndex = glyphs[dragging].index;
        signalStrength = 1;
      } else {
        signalStrength = reducedMotion ? 0 : approach(signalStrength, 0, dt, .045);
        if (signalStrength < .002) { signalStrength = 0; signalIndex = -1; }
      }
      const signalActive = signalIndex >= 0 && signalStrength > .002;
      container.dataset.signal = signalActive ? reducedMotion ? 'static' : 'drag' : 'idle';

      const sweeping = s.sweep && !reducedMotion && !pointer.inside && dragging < 0;
      if (sweeping) clock += dt * s.speed;
      if (dragging < 0) pulse += dt;
      let targetX = pointer.x;
      let targetY = pointer.y;
      if (sweeping) {
        targetX = view.left + (view.right - view.left) * (0.5 - 0.5 * Math.cos(clock * 0.45));
        targetY = view.top + (view.bottom - view.top) * (0.45 + 0.1 * Math.sin(clock * 0.8));
      }
      const active = !reducedMotion && (pointer.inside || sweeping || dragging >= 0);
      if (active && !placed) {
        lens.x = targetX;
        lens.y = targetY;
      }
      if (active) {
        const lag = pointer.inside ? 0.05 : 0.22;
        lens.x = approach(lens.x, targetX, dt, lag);
        lens.y = approach(lens.y, targetY, dt, lag);
      }
      placed = active;
      presence = approach(presence, s.reveal === 'area' && active && dragging < 0 ? 1 : 0, dt, 0.16);

      let moving = false;
      glyphs.forEach((glyph, i) => {
        if (i === dragging) {
          // 1:1 tracking while held: no smoothing lag between pointer and ink.
          glyph.offset.x = pointer.x - grab.x;
          glyph.offset.y = pointer.y - grab.y;
          glyph.velocity.x = 0;
          glyph.velocity.y = 0;
          moving = !reducedMotion;
          return;
        }
        const { offset, velocity } = glyph;
        if (Math.abs(offset.x) < 0.05 && Math.abs(offset.y) < 0.05 && Math.hypot(velocity.x, velocity.y) < 0.5) {
          offset.x = 0;
          offset.y = 0;
          velocity.x = 0;
          velocity.y = 0;
          return;
        }
        velocity.x += (-SPRING * offset.x - DAMPING * velocity.x) * dt;
        velocity.y += (-SPRING * offset.y - DAMPING * velocity.y) * dt;
        offset.x += velocity.x * dt;
        offset.y += velocity.y * dt;
        moving = true;
      });

      const focus = dragging >= 0 ? dragging : active ? glyphAt(lens.x, lens.y) : -1;
      if (focus >= 0 && s.selection) {
        const glyph = glyphs[focus];
        const bx1 = glyph.box.x1 + glyph.offset.x - 6;
        const by1 = glyph.box.y1 + glyph.offset.y - 6;
        const bx2 = glyph.box.x2 + glyph.offset.x + 6;
        const by2 = glyph.box.y2 + glyph.offset.y + 6;
        if (frame.index < 0 || frame.alpha < 0.02) {
          frame.x1 = bx1;
          frame.y1 = by1;
          frame.x2 = bx2;
          frame.y2 = by2;
        }
        const glide = focus === dragging ? 0.02 : 0.08;
        frame.x1 = approach(frame.x1, bx1, dt, glide);
        frame.y1 = approach(frame.y1, by1, dt, glide);
        frame.x2 = approach(frame.x2, bx2, dt, glide);
        frame.y2 = approach(frame.y2, by2, dt, glide);
        frame.index = focus;
      }
      frame.alpha = approach(frame.alpha, focus >= 0 && s.selection ? 1 : 0, dt, 0.1);
      if (reducedMotion) frame.alpha = focus >= 0 && s.selection ? 1 : 0;

      glyphs.forEach((glyph, i) => {
        if (i === dragging) return;
        const target = s.reveal === 'letter' && i === focus && i !== dragging ? 1 : 0;
        glyph.outline = approach(glyph.outline, target, dt, 0.09);
        if (Math.abs(glyph.outline - target) > 0.002) moving = true;
        else glyph.outline = target;
      });

      if (s.draggable) container.style.cursor = dragging >= 0 ? 'grabbing' : focus >= 0 && pointer.inside ? 'grab' : '';

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      if (paintedBounds) ctx.clearRect(paintedBounds.x1, paintedBounds.y1, paintedBounds.x2 - paintedBounds.x1, paintedBounds.y2 - paintedBounds.y1);
      const letters = inkBounds();
      const blood = drips.length ? dripBounds() : null;
      const ink = letters && blood ? { x1: Math.min(letters.x1, blood.x1), y1: Math.min(letters.y1, blood.y1), x2: Math.max(letters.x2, blood.x2), y2: Math.max(letters.y2, blood.y2) } : letters ?? blood;
      let nextBounds = ink;
      if (frame.index >= 0 && frame.alpha >= 0.01) {
        // Include the brackets, labels, tether and scattered frame specks.
        const fx = clipBounds((frame.x1 - 40) * dpr, (frame.y1 - 40) * dpr, Math.max(frame.x2 + 40, frame.x1 + 160) * dpr, (frame.y2 + 40) * dpr);
        if (fx) nextBounds = ink ? { x1: Math.min(ink.x1, fx.x1), y1: Math.min(ink.y1, fx.y1), x2: Math.max(ink.x2, fx.x2), y2: Math.max(ink.y2, fx.y2) } : fx;
      }
      for (const glyph of glyphs) {
        const moved = Math.hypot(glyph.offset.x, glyph.offset.y);
        if (moved > 1) {
          ctx.globalAlpha = Math.min(1, moved / 24) * 0.55;
          blit(ctx, glyph.dashes, 0, 0, 0, 0);
          ctx.globalAlpha = 1;
        }
      }
      glyphs.forEach((glyph, order) => {
        if (glyph.outline < 0.999) {
          ctx.globalAlpha = 1 - glyph.outline;
          if (glyph.index === signalIndex && signalActive) drawSignal(glyph, now);
          else if (s.bleed && bleedT < POUR + order * POUR_STAGGER) drawPoured(glyph, order);
          else blit(ctx, glyph.fill, glyph.offset.x, glyph.offset.y, 0, 0);
        }
        if (glyph.outline > 0.001) {
          ctx.globalAlpha = glyph.outline;
          blit(ctx, glyph.dashes, glyph.offset.x, glyph.offset.y, 0, 0);
        }
        ctx.globalAlpha = 1;
      });
      if (drips.length) drawDrips();
      // The reveal compositing is the costliest pass: skip it while a letter
      // is held so drags stay fluid. It resumes on release.
      if (ink && presence > 0.001 && dragging < 0) drawReveal(s, ink);
      drawFrame(s);
      paintedBounds = nextBounds;

      const settling =
        moving || bleedPlaying || (!reducedMotion && signalActive) || Math.abs(presence - (s.reveal === 'area' && active && dragging < 0 ? 1 : 0)) > 0.002 || (frame.alpha > 0.01 && frame.alpha < 0.99);
      if ((active || settling) && visible && alive) raf = requestAnimationFrame(tick);
    };

    const wake = () => {
      if (raf || !visible || !alive || document.hidden) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };
    wakeRef.current = wake;

    const resize = () => {
      containerW = Math.max(1, container.clientWidth);
      containerH = Math.max(1, container.clientHeight);
      width = Math.max(1, canvas.clientWidth || containerW);
      height = Math.max(1, canvas.clientHeight || containerH);
      const box = container.getBoundingClientRect();
      const art = canvas.getBoundingClientRect();
      padX = Math.max(0, Math.round(box.left - art.left));
      padTop = Math.max(0, Math.round(box.top - art.top));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      paintedBounds = null;
      layoutKey = '';
      wake();
    };

    const locate = (e: React.PointerEvent<HTMLDivElement>) => {
      const rect = container.getBoundingClientRect();
      pointer.x = e.clientX - rect.left + padX;
      pointer.y = e.clientY - rect.top + padTop;
    };
    const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
      locate(e);
      pointer.inside = true;
      wake();
    };
    const onLeave = () => {
      if (dragging >= 0) return;
      pointer.inside = false;
      wake();
    };
    const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
      if ((e.target as Element).closest('a,button,input,summary,[role="button"],#hero-heading')) return;
      locate(e);
      pointer.inside = true;
      const s = settingsRef.current;
      if (s?.draggable && (!reducedMotion || s.dragGlitch) && dragPointerId === null && (e.pointerType !== 'mouse' || e.button === 0)) {
        const index = glyphAt(pointer.x, pointer.y);
        if (index >= 0) {
          dragging = index;
          dragPointerId = e.pointerId;
          grab.x = pointer.x - glyphs[index].offset.x;
          grab.y = pointer.y - glyphs[index].offset.y;
          container.setPointerCapture(e.pointerId);
          // Don't start a text selection under the dragged letter.
          e.preventDefault();
        }
      }
      wake();
    };
    const onUp = (e: React.PointerEvent<HTMLDivElement>) => {
      if (dragging >= 0) {
        if (dragPointerId !== e.pointerId) return;
        locate(e);
        glyphs[dragging].offset.x = pointer.x - grab.x;
        glyphs[dragging].offset.y = pointer.y - grab.y;
        if (reducedMotion) { glyphs[dragging].offset.x = 0; glyphs[dragging].offset.y = 0; signalStrength = 0; signalIndex = -1; }
        dragging = -1;
        dragPointerId = null;
        if (container.hasPointerCapture(e.pointerId)) container.releasePointerCapture(e.pointerId);
        const rect = container.getBoundingClientRect();
        pointer.inside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
      }
      wake();
    };
    const clearInteraction = () => {
      dragging = -1;
      signalIndex = -1;
      signalStrength = 0;
      container.dataset.signal = 'idle';
      pointer.inside = false;
      const captured = dragPointerId;
      dragPointerId = null;
      if (captured !== null && container.hasPointerCapture(captured)) container.releasePointerCapture(captured);
      wake();
    };
    const onLostCapture = (event: PointerEvent) => { if (dragPointerId === event.pointerId) clearInteraction(); };
    const onCancel = (event: PointerEvent) => { if (dragPointerId === event.pointerId) clearInteraction(); };
    const onMotionChange = () => {
      reducedMotion = motion.matches;
      if (reducedMotion) {
        if (bleedPlaying) resumeBleed(true);
        clearInteraction();
        presence = 0;
        frame.alpha = 0;
        frame.index = -1;
        glyphs.forEach((glyph) => { glyph.offset.x = 0; glyph.offset.y = 0; glyph.velocity.x = 0; glyph.velocity.y = 0; glyph.outline = 0; });
        container.style.cursor = '';
      } else if (bleedT === Infinity) resumeBleed(true);
      wake();
    };
    container.addEventListener('pointermove', onMove as unknown as EventListener, { passive: true });
    container.addEventListener('pointerenter', onMove as unknown as EventListener, { passive: true });
    container.addEventListener('pointerdown', onDown as unknown as EventListener, { passive: false });
    container.addEventListener('pointerup', onUp as unknown as EventListener, { passive: true });
    container.addEventListener('pointercancel', onCancel, { passive: true });
    container.addEventListener('pointerleave', onLeave as unknown as EventListener, { passive: true });
    container.addEventListener('lostpointercapture', onLostCapture);
    window.addEventListener('blur', clearInteraction);
    motion.addEventListener('change', onMotionChange);

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    const hero = container.closest('.hero-section');
    const syncVisibility = () => {
      visible = intersects && !hero?.classList.contains('hero-exit');
      if (!visible) { cancelAnimationFrame(raf); raf = 0; }
      else wake();
    };
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      intersects = entry.isIntersecting;
      syncVisibility();
    });
    intersectionObserver.observe(container);
    const curtainObserver = hero ? new MutationObserver(syncVisibility) : null;
    if (hero) curtainObserver?.observe(hero, { attributes: true, attributeFilter: ['class'] });
    syncVisibility();
    const onVisibilityChange = () => {
      if (document.hidden) { clearInteraction(); cancelAnimationFrame(raf); raf = 0; }
      else wake();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    if (document.fonts) document.fonts.ready.then(refreshFonts, refreshFonts);

    resize();

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      wakeRef.current = () => {};
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      curtainObserver?.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', clearInteraction);
      motion.removeEventListener('change', onMotionChange);
      container.removeEventListener('lostpointercapture', onLostCapture);
      if (dragPointerId !== null && container.hasPointerCapture(dragPointerId)) container.releasePointerCapture(dragPointerId);
      container.removeEventListener('pointermove', onMove as unknown as EventListener);
      container.removeEventListener('pointerenter', onMove as unknown as EventListener);
      container.removeEventListener('pointerdown', onDown as unknown as EventListener);
      container.removeEventListener('pointerup', onUp as unknown as EventListener);
      container.removeEventListener('pointercancel', onCancel);
      container.removeEventListener('pointerleave', onLeave as unknown as EventListener);
    };
  }, []);

  return (
    <div ref={containerRef} className={`tech-text ${className}`.trim()} style={style} role="img" aria-label={text}>
      <canvas ref={canvasRef} className="tech-text-canvas" />
    </div>
  );
};

export default TechText;
