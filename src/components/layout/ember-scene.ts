export type EmberScene = "threshold" | "fault" | "suspended" | "quiet";
// Without a look, a section keeps the original fractured-plate scene.
// "grid-soft" is the same lattice, calmer, so foreground effects lead.
export type EmberLook = "grid" | "grid-soft" | "void" | "lava" | "grid-lava";
type Point = readonly [number, number];
type Plate = { points: readonly Point[]; hot: number; depth: number };
export type ScenePointer = { x: number; y: number; strength: number };

// A single architectural vocabulary, with a different composition for each
// section. These are flat fractured planes, not floating 3D decorations.
const formations: Record<EmberScene, readonly Plate[]> = {
  threshold: [
    { points: [[-.09, -.1], [.2, -.08], [.29, .13], [.07, .39], [-.08, .22]], hot: 1, depth: .4 },
    { points: [[.45, -.15], [.59, -.06], [.66, .2], [.52, .35], [.43, .13]], hot: 2, depth: .7 },
    { points: [[.88, -.12], [1.12, .03], [1.06, .5], [.93, .34], [.81, .1]], hot: 3, depth: .6 },
    { points: [[-.12, .82], [.06, .64], [.17, .87], [.09, 1.18], [-.09, 1.06]], hot: 0, depth: .9 },
    { points: [[.47, .83], [.54, .72], [.65, .94], [.58, 1.12], [.43, 1.07]], hot: 1, depth: 1 },
    { points: [[.87, .78], [1.13, .58], [1.16, 1.15], [.77, 1.07]], hot: 0, depth: .5 },
  ],
  fault: [
    { points: [[-.11, .08], [.2, -.1], [.36, .11], [.13, .29], [-.1, .19]], hot: 2, depth: .5 },
    { points: [[.61, -.08], [.82, -.12], [1.12, .1], [.87, .28]], hot: 2, depth: .8 },
    { points: [[-.15, .52], [.01, .33], [.11, .46], [.02, .67], [-.1, .72]], hot: 1, depth: 1 },
    { points: [[.96, .35], [1.1, .22], [1.18, .67], [.92, .75], [.86, .53]], hot: 3, depth: .7 },
    { points: [[-.1, 1.08], [.12, .75], [.35, .89], [.5, .8], [.62, 1.1]], hot: 0, depth: .7 },
    { points: [[.55, 1.15], [.68, .87], [.8, .96], [.95, .79], [1.12, .98]], hot: 1, depth: .4 },
  ],
  suspended: [
    { points: [[-.08, -.1], [.14, -.04], [.24, .2], [.1, .34], [-.08, .17]], hot: 1, depth: .4 },
    { points: [[.47, -.1], [.59, .04], [.55, .23], [.41, .08]], hot: 1, depth: 1 },
    { points: [[1.12, .03], [.94, .18], [.84, .03], [.92, -.12]], hot: 0, depth: .7 },
    { points: [[-.08, .76], [.06, .63], [.15, .89], [.07, 1.16]], hot: 1, depth: .8 },
    { points: [[.39, 1.1], [.5, .82], [.57, .91], [.55, 1.12]], hot: 1, depth: 1 },
    { points: [[.84, .9], [1.09, .63], [1.15, 1.13], [.73, 1.07]], hot: 0, depth: .5 },
  ],
  quiet: [
    { points: [[-.12, -.04], [.15, -.14], [.28, .07], [.06, .17]], hot: 2, depth: .4 },
    { points: [[.89, -.07], [1.14, .02], [1.08, .31], [.96, .2]], hot: 3, depth: .6 },
    { points: [[-.08, .94], [.04, .75], [.27, .91], [.41, .84], [.55, 1.16]], hot: 0, depth: .7 },
    { points: [[.55, 1.16], [.67, .93], [.83, .84], [1.09, 1.02]], hot: 1, depth: .5 },
  ],
};

function path(ctx: CanvasRenderingContext2D, points: Point[]) {
  ctx.beginPath();
  points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath();
}

const hash = (...values: number[]) => {
  let h = 2166136261;
  for (const value of values) { h = Math.imul(h ^ (value | 0), 16777619); h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15; }
  return (h >>> 0) / 4294967296;
};

// A dark veil sits under reading areas, so even the strongest edge cannot
// compete with copy. Products and forms have their own opaque surfaces.
function shieldCopy(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.globalCompositeOperation = "destination-out";
  const shield = ctx.createRadialGradient(width * .29, height * .45, 0, width * .29, height * .45, width * .5);
  shield.addColorStop(0, "rgba(0,0,0,.88)"); shield.addColorStop(.45, "rgba(0,0,0,.6)"); shield.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = shield; ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = "source-over";
}

// Picture 1: a tilted lattice of black tiles laid like stone, joined by thin
// hot red seams, with red dust, a few sparks and faint ring glyphs.
// The lattice is drawn once per size into a cached image. Each frame only
// slides that image and adds the live parts (cursor glow, dust, sparks), so
// it can follow the display's own frame rate instead of a 30 fps cap.
type Seam = readonly [number, number, number, number];
type Lattice = { key: string; image: HTMLCanvasElement; pad: number; tiles: { cx: number; cy: number; seams: Seam[] }[] };
const lattices = new WeakMap<CanvasRenderingContext2D, Lattice>();
const gridCell = (width: number) => Math.max(110, Math.min(210, width * .15));
const GRID_ANGLE = -Math.PI / 4.6;

function buildLattice(key: string, width: number, height: number, dpr: number, scene: EmberScene, soft: boolean): Lattice {
  const seed = ["threshold", "fault", "suspended", "quiet"].indexOf(scene) + 1;
  const cell = gridCell(width);
  const cos = Math.cos(GRID_ANGLE), sin = Math.sin(GRID_ANGLE);
  // Room for the slide (up to 0.4 cell) and scroll travel (±20px) at any offset.
  const pad = Math.ceil(cell * .4 + 24);
  const span = Math.hypot(width + pad * 2, height + pad * 2) / 2 + cell * 2;
  const toScreen = (x: number, y: number): [number, number] => [width / 2 + x * cos - y * sin, height / 2 + x * sin + y * cos];
  const image = document.createElement("canvas");
  image.width = Math.ceil((width + pad * 2) * dpr);
  image.height = Math.ceil((height + pad * 2) * dpr);
  const c = image.getContext("2d")!;
  c.setTransform(dpr, 0, 0, dpr, pad * dpr, pad * dpr);

  // Seams are batched by brightness: a handful of strokes in total.
  const dim = new Path2D(), hot = new Path2D(), inner = new Path2D(), rings = new Path2D();
  const tiles: Lattice["tiles"] = [];
  const segment = (path: Path2D, ax: number, ay: number, bx: number, by: number): Seam => {
    const [x1, y1] = toScreen(ax, ay), [x2, y2] = toScreen(bx, by);
    path.moveTo(x1, y1); path.lineTo(x2, y2);
    return [x1, y1, x2, y2];
  };
  for (let row = 0, y = -span; y < span; row++, y += cell) {
    let x = -span - hash(seed, row) * cell;
    for (let k = 0; x < span; k++) {
      const w = cell * (.7 + hash(seed, row, k) * 1.1);
      const [cx, cy] = toScreen(x + w / 2, y + cell / 2);
      if (cx > -cell - pad && cx < width + cell + pad && cy > -cell - pad && cy < height + cell + pad) {
        const top = hash(seed, row, k, 2) > (soft ? .85 : .55) ? hot : dim;
        const side = hash(seed, row, k, 3) > (soft ? .88 : .6) ? hot : dim;
        tiles.push({ cx, cy, seams: [segment(top, x, y, x + w, y), segment(side, x, y, x, y + cell)] });
        // Some tiles carry a second, inset line along two sides.
        if (hash(seed, row, k, 4) > .72) {
          const inset = Math.min(14, cell * .09);
          segment(inner, x + inset, y + inset, x + w - inset, y + inset);
          segment(inner, x + inset, y + inset, x + inset, y + cell - inset);
        }
        if (hash(seed, row, k, 5) > .9) {
          const r = cell * .16;
          rings.moveTo(cx + r, cy); rings.arc(cx, cy, r, 0, Math.PI * 2);
          rings.moveTo(cx + r * 1.45 * Math.cos(.5), cy + r * 1.45 * Math.sin(.5)); rings.arc(cx, cy, r * 1.45, .5, Math.PI * 1.6);
          rings.moveTo(cx + r * .22, cy); rings.arc(cx, cy, r * .22, 0, Math.PI * 2);
        }
      }
      x += w;
    }
  }
  c.lineCap = "square";
  c.lineWidth = Math.max(4, cell * .025); c.strokeStyle = `rgba(255, 26, 26, ${soft ? .07 : .13})`; c.stroke(hot);
  c.lineWidth = 1; c.strokeStyle = `rgba(150, 10, 22, ${soft ? .26 : .42})`; c.stroke(dim);
  c.strokeStyle = `rgba(255, 26, 26, ${soft ? .6 : .9})`; c.stroke(hot);
  c.strokeStyle = "rgba(170, 12, 26, .3)"; c.stroke(inner);
  c.lineWidth = Math.max(2, cell * .022); c.strokeStyle = "rgba(110, 8, 18, .32)"; c.stroke(rings);
  return { key, image, pad, tiles };
}

function paintGrid(ctx: CanvasRenderingContext2D, width: number, height: number, scene: EmberScene, time: number, progress: number, pointer: ScenePointer, soft: boolean) {
  const seed = ["threshold", "fault", "suspended", "quiet"].indexOf(scene) + 1;
  const dpr = ctx.getTransform().a || 1;
  const key = `${width}x${height}@${dpr}:${scene}:${soft}`;
  let lattice = lattices.get(ctx);
  if (lattice?.key !== key) { lattice = buildLattice(key, width, height, dpr, scene, soft); lattices.set(ctx, lattice); }

  const edges = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * .35, width / 2, height / 2, Math.hypot(width, height) * .62);
  edges.addColorStop(0, "rgba(90, 0, 8, 0)"); edges.addColorStop(1, "rgba(120, 4, 14, .22)");
  ctx.fillStyle = edges; ctx.fillRect(0, 0, width, height);

  // Bounded, slow slide of the whole lattice along its seams, plus scroll travel.
  const slide = Math.sin(time * .05) * gridCell(width) * .4;
  const dx = slide * Math.cos(GRID_ANGLE), dy = slide * Math.sin(GRID_ANGLE) + (progress - .5) * 40;
  const { image, pad } = lattice;
  ctx.drawImage(image, dx - pad, dy - pad, image.width / dpr, image.height / dpr);

  // Seams near the cursor brighten with a smooth falloff rather than switching on.
  if (pointer.strength > .01) {
    ctx.lineCap = "square";
    for (const tile of lattice.tiles) {
      const near = pointer.strength * Math.max(0, 1 - Math.hypot(pointer.x - tile.cx - dx, pointer.y - tile.cy - dy) / 220);
      if (near < .02) continue;
      const path = new Path2D();
      for (const [x1, y1, x2, y2] of tile.seams) { path.moveTo(x1 + dx, y1 + dy); path.lineTo(x2 + dx, y2 + dy); }
      ctx.globalAlpha = near;
      ctx.lineWidth = 7; ctx.strokeStyle = "rgba(255, 40, 40, .2)"; ctx.stroke(path);
      ctx.lineWidth = 1.4; ctx.strokeStyle = "rgb(255, 70, 70)"; ctx.stroke(path);
    }
    ctx.globalAlpha = 1;
  }

  // Red dust twinkles in place; a few brighter four-point sparks.
  const dust = Math.min(soft ? 90 : 240, Math.round(width * height / (soft ? 14000 : 6500)));
  ctx.fillStyle = "#ff2424";
  for (let i = 0; i < dust; i++) {
    ctx.globalAlpha = .18 + .5 * (.5 + .5 * Math.sin(time * (.6 + hash(seed, i, 7)) + i));
    const size = hash(seed, i, 8) > .85 ? 2 : 1;
    ctx.fillRect(Math.round(hash(seed, i, 9) * width), Math.round(hash(seed, i, 10) * height), size, size);
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "rgba(255, 50, 50, .85)"; ctx.lineWidth = 1;
  for (let i = 0; i < (soft ? 0 : 6); i++) {
    const x = hash(seed, i, 11) * width, y = hash(seed, i, 12) * height;
    const arm = 3 + 4 * (.5 + .5 * Math.sin(time * .9 + i * 2));
    ctx.beginPath(); ctx.moveTo(x - arm, y); ctx.lineTo(x + arm, y); ctx.moveTo(x, y - arm); ctx.lineTo(x, y + arm); ctx.stroke();
  }
  shieldCopy(ctx, width, height);
}

// Picture 2: a black void with a low crimson horizon glow. Dark stone blocks
// are stacked at the edges with red-lit rims and dim glyphs; a few float and
// drift. Stacks are cached like the grid lattice; floaters, glow and embers
// are drawn live, so it also paints at the display's frame rate.
type Block = { x: number; y: number; s: number; glyph: boolean; phase: number };
type Void = { key: string; image: HTMLCanvasElement; pad: number; rims: Seam[]; floaters: Block[] };
const voids = new WeakMap<CanvasRenderingContext2D, Void>();

function paintBlock(c: CanvasRenderingContext2D, { x, y, s, glyph }: Block, rims: Seam[]) {
  const dx = s * .32, dy = -s * .22;
  c.fillStyle = "#2c1418";
  c.beginPath(); c.moveTo(x, y); c.lineTo(x + dx, y + dy); c.lineTo(x + s + dx, y + dy); c.lineTo(x + s, y); c.closePath(); c.fill();
  c.fillStyle = "#0e0709";
  c.beginPath(); c.moveTo(x + s, y); c.lineTo(x + s + dx, y + dy); c.lineTo(x + s + dx, y + s + dy); c.lineTo(x + s, y + s); c.closePath(); c.fill();
  // The front face darkens towards the floor, lit faintly from the horizon below.
  const front = c.createLinearGradient(0, y, 0, y + s);
  front.addColorStop(0, "#1c0d10"); front.addColorStop(1, "#2a0c11");
  c.fillStyle = front; c.fillRect(x, y, s, s);
  // Red light catches the top-front and left edges.
  const edges: Seam[] = [[x, y, x + s, y], [x, y, x, y + s]];
  c.lineCap = "round";
  for (const [x1, y1, x2, y2] of edges) {
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2);
    c.lineWidth = 5; c.strokeStyle = "rgba(255, 26, 36, .12)"; c.stroke();
    c.lineWidth = 1.2; c.strokeStyle = "rgba(230, 30, 42, .7)"; c.stroke();
  }
  rims.push(...edges);
  if (glyph) {
    const cx = x + s * .5, cy = y + s * .55, r = s * .17;
    c.lineWidth = Math.max(1.5, s * .035); c.strokeStyle = "rgba(200, 22, 34, .55)";
    c.beginPath(); c.arc(cx, cy, r, Math.PI * .6, Math.PI * 2.3); c.stroke();
    c.beginPath(); c.moveTo(cx, cy - r * .4); c.lineTo(cx, cy + r * .4); c.stroke();
  }
}

function buildVoid(key: string, width: number, height: number, dpr: number, scene: EmberScene): Void {
  const seed = ["threshold", "fault", "suspended", "quiet"].indexOf(scene) + 11;
  const s = Math.max(56, Math.min(130, width * .1));
  const pad = 24;
  const image = document.createElement("canvas");
  image.width = Math.ceil((width + pad * 2) * dpr); image.height = Math.ceil((height + pad * 2) * dpr);
  const c = image.getContext("2d")!;
  c.setTransform(dpr, 0, 0, dpr, pad * dpr, pad * dpr);
  const rims: Seam[] = [];
  // A stack on the right, rising from the floor, smaller towards the top.
  let y = height - s * .2;
  for (let k = 0; k < 4; k++) {
    const size = s * (1.15 - k * .18) * (.9 + hash(seed, k, 1) * .2);
    y -= size;
    // Kept fully on screen, including the receding side face.
    const x = Math.min(width * .86, width - size * 1.32 - 8) + (hash(seed, k, 2) - .5) * s * .3;
    paintBlock(c, { x, y, s: size, glyph: hash(seed, k, 3) > .55, phase: 0 }, rims);
  }
  // A low cluster in the bottom-left corner.
  paintBlock(c, { x: width * .02, y: height - s * 1.1, s: s * .9, glyph: true, phase: 0 }, rims);
  paintBlock(c, { x: width * .02 + s * .95, y: height - s * .75, s: s * .55, glyph: false, phase: 0 }, rims);
  const floaters: Block[] = [[.74, .16, .45], [.93, .4, .35], [.05, .28, .4]].map(([fx, fy, fs], k) => ({
    x: width * fx, y: height * fy, s: s * fs, glyph: k === 0, phase: hash(seed, k, 9) * 6,
  }));
  return { key, image, pad, rims, floaters };
}

function paintVoid(ctx: CanvasRenderingContext2D, width: number, height: number, scene: EmberScene, time: number, progress: number, pointer: ScenePointer) {
  const dpr = ctx.getTransform().a || 1;
  const key = `${width}x${height}@${dpr}:${scene}`;
  let world = voids.get(ctx);
  if (world?.key !== key) { world = buildVoid(key, width, height, dpr, scene); voids.set(ctx, world); }

  // Low crimson glow on the horizon, breathing slowly, flattened into an ellipse.
  const breathe = .9 + .1 * Math.sin(time * .35);
  const horizon = height * 1.02;
  ctx.save();
  ctx.translate(0, horizon); ctx.scale(1, .45); ctx.translate(0, -horizon);
  const glow = ctx.createRadialGradient(width / 2, horizon, 0, width / 2, horizon, Math.max(width * .75, height * .6));
  glow.addColorStop(0, `rgba(150, 12, 24, ${.5 * breathe})`); glow.addColorStop(.45, `rgba(90, 6, 14, ${.22 * breathe})`); glow.addColorStop(1, "rgba(30, 0, 4, 0)");
  ctx.fillStyle = glow; ctx.fillRect(0, -height * 2, width, height * 4);
  ctx.restore();
  const line = ctx.createLinearGradient(0, height * .955, 0, height * .985);
  line.addColorStop(0, "rgba(220, 30, 40, 0)"); line.addColorStop(.5, `rgba(220, 30, 40, ${.16 * breathe})`); line.addColorStop(1, "rgba(220, 30, 40, 0)");
  ctx.fillStyle = line; ctx.fillRect(0, height * .955, width, height * .03);

  // Stacked blocks shift a little with scroll; floaters bob on their own.
  const dy = (progress - .5) * 30;
  const { image, pad } = world;
  ctx.drawImage(image, -pad, dy - pad, image.width / dpr, image.height / dpr);
  const rims = world.rims.map(([x1, y1, x2, y2]): Seam => [x1, y1 + dy, x2, y2 + dy]);
  for (const block of world.floaters) paintBlock(ctx, { ...block, y: block.y + dy * 1.6 + Math.sin(time * .3 + block.phase) * 8 }, rims);

  // Rims near the cursor brighten with a smooth falloff.
  if (pointer.strength > .01) {
    ctx.lineCap = "round";
    for (const [x1, y1, x2, y2] of rims) {
      const near = pointer.strength * Math.max(0, 1 - Math.hypot(pointer.x - (x1 + x2) / 2, pointer.y - (y1 + y2) / 2) / 200);
      if (near < .02) continue;
      ctx.globalAlpha = near;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
      ctx.lineWidth = 7; ctx.strokeStyle = "rgba(255, 40, 40, .22)"; ctx.stroke();
      ctx.lineWidth = 1.6; ctx.strokeStyle = "rgb(255, 80, 80)"; ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // A few embers rise from the horizon and fade before mid-height.
  ctx.fillStyle = "#ff3b30";
  for (let i = 0; i < 14; i++) {
    const rise = (time * (12 + hash(i, 21) * 18) + hash(i, 22) * height * .6) % (height * .6);
    ctx.globalAlpha = .55 * (1 - rise / (height * .6));
    ctx.fillRect(hash(i, 23) * width + Math.sin(time * .5 + i) * 6, height - rise, 1.5, 1.5);
  }
  ctx.globalAlpha = 1;
  shieldCopy(ctx, width, height);
}

// Picture 3: molten light rising from below. A red-orange haze over dark land
// whose cracks run with flowing lava, embers drifting up, and (in "lava")
// dark cubes with neon-red edges tumbling slowly at the sides.
// Everything here is a handful of gradient fills and strokes per frame.
function smoothLine(points: [number, number][]) {
  const path = new Path2D();
  path.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = points[i - 1], [bx, by] = points[i];
    path.quadraticCurveTo(ax, ay, (ax + bx) / 2, (ay + by) / 2);
  }
  const [lx, ly] = points[points.length - 1];
  path.lineTo(lx, ly);
  return path;
}

function paintLavaBase(ctx: CanvasRenderingContext2D, width: number, height: number, scene: EmberScene, time: number, progress: number) {
  const seed = ["threshold", "fault", "suspended", "quiet"].indexOf(scene) + 31;
  const breathe = .88 + .12 * Math.sin(time * .4);
  const shift = (progress - .5) * 30;

  const haze = ctx.createLinearGradient(0, 0, 0, height);
  haze.addColorStop(0, "rgba(20, 2, 4, 0)"); haze.addColorStop(.5, "rgba(90, 8, 10, .3)"); haze.addColorStop(1, `rgba(200, 40, 12, ${.5 * breathe})`);
  ctx.fillStyle = haze; ctx.fillRect(0, 0, width, height);
  const molten = ctx.createRadialGradient(width * .62, height * 1.05, 0, width * .62, height * 1.05, Math.max(width * .7, height * .5));
  molten.addColorStop(0, `rgba(255, 110, 30, ${.42 * breathe})`); molten.addColorStop(.45, "rgba(180, 24, 10, .22)"); molten.addColorStop(1, "rgba(80, 0, 0, 0)");
  ctx.fillStyle = molten; ctx.fillRect(0, 0, width, height);

  // Dark land along the bottom with a jagged, lava-lit top edge.
  const ridge: [number, number][] = Array.from({ length: 25 }, (_, i) => [(i / 24) * width, height * (.8 + hash(seed, i, 1) * .06) + shift]);
  const land = smoothLine(ridge);
  land.lineTo(width, height); land.lineTo(0, height); land.closePath();
  ctx.fillStyle = "#070203"; ctx.fill(land);
  ctx.lineWidth = 2; ctx.strokeStyle = `rgba(255, 90, 30, ${.35 * breathe})`; ctx.stroke(smoothLine(ridge));

  // Lava runs through cracks in the land; the dashed core makes it flow.
  for (let k = 0; k < 3; k++) {
    const base = height * (.87 + k * .045) + shift;
    const river = smoothLine(Array.from({ length: 13 }, (_, i): [number, number] => [
      (i / 12) * width,
      base + Math.sin(i * 1.3 + k * 2 + time * .25) * height * .01 + Math.sin(i * .7 + k + seed) * height * .02,
    ]));
    ctx.lineCap = "round";
    ctx.lineWidth = 18; ctx.strokeStyle = "rgba(255, 80, 20, .16)"; ctx.stroke(river);
    ctx.lineWidth = 6; ctx.strokeStyle = "rgba(255, 110, 30, .5)"; ctx.stroke(river);
    ctx.setLineDash([width * .05, width * .025]); ctx.lineDashOffset = -time * (30 + k * 12);
    ctx.lineWidth = 2; ctx.strokeStyle = `rgba(255, 205, 110, ${.85 * breathe})`; ctx.stroke(river);
    ctx.setLineDash([]);
  }

  // Embers drift up from the land and fade by the upper third.
  ctx.fillStyle = "#ff7a2a";
  const travel = height * .5;
  for (let i = 0; i < 36; i++) {
    const rise = (time * (16 + hash(seed, i, 2) * 26) + hash(seed, i, 3) * travel) % travel;
    ctx.globalAlpha = .7 * (1 - rise / travel);
    const size = hash(seed, i, 4) > .8 ? 2.2 : 1.4;
    ctx.fillRect(hash(seed, i, 5) * width + Math.sin(time * .7 + i) * 10, height * .84 + shift - rise, size, size);
  }
  ctx.globalAlpha = 1;
}

const CUBE: readonly (readonly [number, number, number])[] = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]];
const FACES = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [2, 3, 7, 6], [1, 2, 6, 5], [0, 3, 7, 4]];

function paintCube(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, ax: number, ay: number, glow: number) {
  const points = CUBE.map(([x, y, z]) => {
    const x1 = x * Math.cos(ay) + z * Math.sin(ay), z1 = -x * Math.sin(ay) + z * Math.cos(ay);
    return [x1, y * Math.cos(ax) - z1 * Math.sin(ax), y * Math.sin(ax) + z1 * Math.cos(ax)] as const;
  });
  // Faces whose centre points towards the viewer are the visible ones of a convex cube.
  for (const face of FACES) {
    const centre = [0, 1, 2].map((axis) => face.reduce((sum, v) => sum + points[v][axis], 0) / 4);
    if (centre[2] < .01) continue;
    // Lit from the lava below: downward-facing faces glow red.
    const lit = Math.max(0, centre[1]);
    const path = new Path2D();
    face.forEach((v, i) => { const [x, y] = points[v]; const px = cx + x * size / 2, py = cy + y * size / 2; if (i) path.lineTo(px, py); else path.moveTo(px, py); });
    path.closePath();
    ctx.fillStyle = `rgb(${18 + 70 * lit}, ${5 + 10 * lit}, ${7 + 6 * lit})`; ctx.fill(path);
    ctx.lineWidth = 4; ctx.strokeStyle = `rgba(255, 40, 40, ${.16 + .2 * glow})`; ctx.stroke(path);
    ctx.lineWidth = 1.2; ctx.strokeStyle = `rgba(255, ${60 + 60 * glow}, 50, ${.85 + .15 * glow})`; ctx.stroke(path);
  }
}

function paintLava(ctx: CanvasRenderingContext2D, width: number, height: number, scene: EmberScene, time: number, progress: number, pointer: ScenePointer) {
  paintLavaBase(ctx, width, height, scene, time, progress);
  const seed = ["threshold", "fault", "suspended", "quiet"].indexOf(scene) + 41;
  const unit = Math.max(18, Math.min(60, width * .04));
  const shift = (progress - .5) * 50;
  ctx.lineJoin = "round";
  // Two loose arcs of cubes at the sides, smaller as they rise, as in the reference.
  for (let i = 0; i < 12; i++) {
    const left = i < 6, k = i % 6;
    const t = k / 5;
    const x = (left ? .03 + t * .2 : .97 - t * .2) * width + (hash(seed, i, 1) - .5) * unit;
    const y = (.62 - t * .5 - Math.sin(t * Math.PI) * .06) * height + shift + Math.sin(time * .35 + i) * 6;
    const size = unit * (1.6 - t * .9) * (.8 + hash(seed, i, 2) * .4);
    const near = pointer.strength * Math.max(0, 1 - Math.hypot(pointer.x - x, pointer.y - y) / 180);
    paintCube(ctx, x, y, size, hash(seed, i, 3) * 6 + time * (.12 + hash(seed, i, 4) * .1), hash(seed, i, 5) * 6 + time * (.16 + hash(seed, i, 6) * .12), near);
  }
  shieldCopy(ctx, width, height);
}

export function paintEmberScene(ctx: CanvasRenderingContext2D, width: number, height: number, scene: EmberScene, time: number, progress: number, pointer: ScenePointer, look?: EmberLook) {
  ctx.clearRect(0, 0, width, height);
  if (look === "void") { paintVoid(ctx, width, height, scene, time, progress, pointer); return; }
  if (look === "lava") { paintLava(ctx, width, height, scene, time, progress, pointer); return; }
  // USB: the neon lattice laid over the molten ground.
  if (look === "grid-lava") { paintLavaBase(ctx, width, height, scene, time, progress); paintGrid(ctx, width, height, scene, time, progress, pointer, false); return; }
  if (look) { paintGrid(ctx, width, height, scene, time, progress, pointer, look === "grid-soft"); return; }
  const scale = Math.min(width / 1200, 1);
  const drift = Math.sin(time * .14) * 6;
  const travel = (progress - .5) * 32;
  const quiet = scene === "quiet";

  // This is the requested flame aura. Fracture strokes themselves stay crisp
  // and unfiltered, and the center of the content stays in darkness.
  const aura = (x: number, y: number, radius: number, opacity: number) => {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(183, 13, 26, ${opacity})`);
    gradient.addColorStop(.25, `rgba(104, 5, 15, ${opacity * .55})`);
    gradient.addColorStop(1, "rgba(40, 0, 7, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  };
  const breath = .9 + Math.sin(time * .19) * .1;
  aura(width * -.03, height * (quiet ? .88 : .28) + drift, Math.min(width * .52, 620), (quiet ? .2 : .4) * breath);
  aura(width * 1.02, height * .72 - drift, Math.min(width * .48, 600), .34 * breath);
  // Long, low-opacity tongues of heat stay at the perimeter. Their shape
  // changes slowly, rather than pulsing the brightness of the whole screen.
  for (const side of [-1, 1]) {
    const edge = side === -1 ? 0 : width;
    const reach = Math.min(width * .13, 155);
    const bend = Math.sin(time * .13 + side) * 12;
    const heat = ctx.createLinearGradient(0, height * .2, 0, height);
    heat.addColorStop(0, "rgba(122, 5, 19, 0)");
    heat.addColorStop(.64, `rgba(153, 8, 24, ${quiet ? .09 : .17})`);
    heat.addColorStop(1, "rgba(230, 24, 35, .24)");
    ctx.beginPath(); ctx.moveTo(edge, height);
    ctx.bezierCurveTo(edge - side * reach, height * .86, edge + side * reach * .2, height * .63, edge - side * reach * .48 + bend, height * .44);
    ctx.bezierCurveTo(edge - side * reach * .12, height * .69, edge - side * reach * 1.6, height * .86, edge - side * reach * 1.3, height);
    ctx.closePath(); ctx.fillStyle = heat; ctx.fill();
  }

  formations[scene].forEach((plate, i) => {
    const dx = Math.sin(time * (.11 + i * .012) + i * 1.9) * (2 + plate.depth * 3);
    const dy = Math.cos(time * .12 + i) * 3 + travel * plate.depth;
    const centerX = plate.points.reduce((sum, p) => sum + p[0] * width, 0) / plate.points.length;
    const centerY = plate.points.reduce((sum, p) => sum + p[1] * height, 0) / plate.points.length;
    const proximity = Math.max(0, 1 - Math.hypot(pointer.x - centerX, pointer.y - centerY) / 240) * pointer.strength;
    const reactX = (pointer.x - centerX) * proximity * .018;
    const reactY = (pointer.y - centerY) * proximity * .018;
    const points: Point[] = plate.points.map(([x, y]) => [x * width + dx + reactX, y * height + dy + reactY]);

    path(ctx, points);
    const shade = ctx.createLinearGradient(centerX - 100, centerY - 130, centerX + 100, centerY + 130);
    shade.addColorStop(0, "#1a0a0d"); shade.addColorStop(1, "#09090a");
    ctx.fillStyle = shade; ctx.fill();
    ctx.strokeStyle = "rgba(111, 21, 31, .48)"; ctx.lineWidth = 1; ctx.stroke();

    const a = points[plate.hot], b = points[(plate.hot + 1) % points.length];
    // Broken edges, with a dark gap at the fault rather than a complete box.
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(a[0] + (b[0] - a[0]) * .39, a[1] + (b[1] - a[1]) * .39);
    ctx.moveTo(a[0] + (b[0] - a[0]) * .43, a[1] + (b[1] - a[1]) * .43);
    ctx.lineTo(b[0], b[1]);
    ctx.lineWidth = 1.2 + proximity * .6;
    ctx.strokeStyle = `rgba(219, 29, 40, ${.65 + proximity * .25})`; ctx.stroke();

    // A displaced sliver beside the split gives the plane a corrupted edge.
    const mx = a[0] + (b[0] - a[0]) * .41, my = a[1] + (b[1] - a[1]) * .41;
    ctx.fillStyle = "#63101c";
    ctx.fillRect(mx + 7 * scale, my - 3, Math.max(3, 13 * scale), 1.2);
  });

  // Sparse, flat pieces of the same material. Their gentle drift and nearby
  // pointer response never transform text, photographs or hit targets.
  for (let i = 0; i < (quiet ? 8 : 16); i++) {
    const seed = (i * 73 + 29) % 101 / 101;
    const x = ((i * 137 + 43) % 997) / 997 * width;
    const y = ((i * 257 + 83) % 991) / 991 * height;
    const proximity = Math.max(0, 1 - Math.hypot(pointer.x - x, pointer.y - y) / 180) * pointer.strength;
    const px = x + Math.sin(time * .16 + i) * 4 + (pointer.x - x) * proximity * .025;
    const py = y + Math.cos(time * .1 + i) * 5 - travel * seed;
    const size = (i % 4 === 0 ? 13 : 4) * Math.max(.6, scale);
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + size, py - size * .28); ctx.lineTo(px + size * .6, py + size * .6); ctx.closePath();
    ctx.fillStyle = `rgba(137, 21, 31, ${.4 + proximity * .25})`; ctx.fill();
    ctx.strokeStyle = `rgba(233, 37, 43, ${.35 + proximity * .45})`; ctx.lineWidth = .7; ctx.stroke();
  }

  // A narrow, branching fault anchors the scene to the lower boundary.
  // Its angle continues between sections without repeating their scenery.
  const floor = quiet ? .93 : scene === "fault" ? .9 : .97;
  ctx.beginPath(); ctx.moveTo(-10, height * floor);
  ctx.lineTo(width * .07, height * (floor - .06));
  ctx.lineTo(width * .14, height * (floor - .035));
  ctx.lineTo(width * .2, height * (floor - .08));
  ctx.moveTo(width * .07, height * (floor - .06));
  ctx.lineTo(width * .095, height * (floor - .12));
  ctx.strokeStyle = "rgba(211, 24, 37, .5)"; ctx.lineWidth = 1; ctx.stroke();

  shieldCopy(ctx, width, height);
}
