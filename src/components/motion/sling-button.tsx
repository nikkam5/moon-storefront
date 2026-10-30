"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactNode } from "react";
import { animate, motion, useMotionTemplate, useMotionValue, useMotionValueEvent, useReducedMotion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUp02Icon } from "@hugeicons/core-free-icons";
import { corruptionKit, paintCorruption, STEP_MS, type CorruptionKit } from "../layout/corruption-curtain";
import "./sling-button.css";

const GAP = 4;
const SLOP = { fine: 4, coarse: 8 };
const FINGER_MAX = 3000;
const HAND_MAX = 6000;
const CANCEL = .5;
const POWER_CAP = 1.5;
const DOT_MS = 300;
const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";
// Ember corruption (opt-in): a soft glitch creeps in after a long hold, grows
// heavier past the arm point, bursts for a moment before the link opens, then
// the pad is "deleted" once it is back in its socket and reboots.
const HOLD_DELAY = 900;
const BURST_MS = 350;
const DELETE_AFTER = 450;
const DELETE_MS = 1050;
type Corrupt = "off" | "held" | "burst" | "delete";
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const rubberband = (offset: number, dimension: number, constant = .55) => (offset * dimension * constant) / (dimension + constant * Math.abs(offset));

type Props = {
  children?: ReactNode;
  onSend?: () => void;
  href?: string;
  padColor?: string;
  iconColor?: string;
  accentColor?: string;
  wellColor?: string;
  bandColor?: string;
  size?: number;
  strokeWidth?: number;
  armAt?: number;
  maxPull?: number;
  launchSpeed?: number;
  recoil?: number;
  flight?: number;
  particles?: number;
  spread?: number;
  axis?: "any" | "horizontal" | "vertical";
  tapSends?: boolean;
  disabled?: boolean;
  corrupt?: boolean;
  ariaLabel?: string;
  className?: string;
};
type Grip = {
  id: number;
  startX: number;
  startY: number;
  scale: number;
  moved: boolean;
  hist: { x: number; y: number; t: number }[];
  rawOrigin: { x: number; y: number };
  slop: number;
};

// React Bits SlingButton with TypeScript types and native-link support.
export default function SlingButton({ children, onSend, href, padColor = "#f5f5f5", iconColor = "#18181b", accentColor = "#f5f5f5", wellColor = "#27272a", bandColor = "#52525b", size = 56, strokeWidth = 3, armAt = 48, maxPull = 160, launchSpeed = 2600, recoil = .2, flight = 120, particles = 14, spread = 60, axis = "any", tapSends = true, disabled = false, corrupt = false, ariaLabel = "Send", className = "" }: Props) {
  const reduce = useReducedMotion();
  const R = Math.max(1, maxPull);
  const ARM = Math.max(1, Math.min(armAt, .8 * R));
  const wellR = size / 2 + GAP + strokeWidth;
  const padR = size / 2 - strokeWidth / 2;
  const H = wellR + strokeWidth + 2;
  const DOT = Math.max(6, Math.round(size / 7));
  const count = Math.max(0, Math.round(particles));
  const [held, setHeld] = useState(false);
  const [armed, setArmed] = useState(false);
  const [sent, setSent] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const padRef = useRef<HTMLAnchorElement | HTMLButtonElement | null>(null);
  const fxRef = useRef<SVGGElement>(null);
  const bandRef = useRef<SVGPathElement>(null);
  const hotRef = useRef<SVGPathElement>(null);
  const arcRef = useRef<SVGCircleElement>(null);
  const dotRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const power = useRef(0);
  const iconRef = useRef<HTMLSpanElement>(null);
  const grip = useRef<Grip | null>(null);
  const dir = useRef({ ux: 0, uy: -1 });
  const animX = useRef<ReturnType<typeof animate> | null>(null);
  const animY = useRef<ReturnType<typeof animate> | null>(null);
  const armedRef = useRef(false);
  const dotPending = useRef(false);
  const dotTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const sentTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const paintFrame = useRef<number | null>(null);
  const skipClick = useRef(false);
  const resetGestureRef = useRef<() => void>(() => {});
  const hintId = useId();
  const corruptRef = useRef<HTMLCanvasElement>(null);
  const glitch = useRef<{ mode: Corrupt; since: number; pull: number; raf: number; kit: CorruptionKit | null; seed: number; timers: ReturnType<typeof setTimeout>[]; deleteOnReturn: boolean }>({ mode: "off", since: 0, pull: 0, raf: 0, kit: null, seed: 0, timers: [], deleteOnReturn: false });
  // The delayed link is never cancelled by the glitch, so the link always opens.
  const linkTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const padT = useMotionTemplate`translate(${px}px, ${py}px)`;

  function send() {
    onSend?.();
    if (href) window.open(href, "_blank", "noopener,noreferrer");
  }

  // Corruption runs only when enabled, in Ember, with motion allowed.
  const corruptOn = () => corrupt && document.documentElement.dataset.ember === "true" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function stopGlitch() {
    const g = glitch.current;
    cancelAnimationFrame(g.raf); g.raf = 0;
    g.timers.forEach(clearTimeout); g.timers = [];
    g.mode = "off";
    if (rootRef.current) delete rootRef.current.dataset.corrupt;
    const canvas = corruptRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
  }

  function glitchTo(mode: Corrupt) {
    const g = glitch.current, canvas = corruptRef.current, ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    if (!g.kit) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.ceil(canvas.clientWidth * dpr); canvas.height = Math.ceil(canvas.clientHeight * dpr);
      g.kit = corruptionKit(ctx, .3);
      g.seed = Math.floor(performance.now());
    }
    g.mode = mode; g.since = performance.now();
    if (!g.raf) g.raf = requestAnimationFrame(frameGlitch);
  }

  // Drives the face canvas with the switch's own painter (phase p picks the
  // look) and sets data-corrupt so CSS can jitter, split, collapse and reboot.
  function frameGlitch(now: number) {
    const g = glitch.current, canvas = corruptRef.current, ctx = canvas?.getContext("2d"), root = rootRef.current;
    g.raf = 0;
    if (!canvas || !ctx || !root || !g.kit || g.mode === "off") return;
    const t = now - g.since;
    let p = -1, level = "";
    if (g.mode === "held") {
      // Past the arm point it worsens with the pull; before it, a soft glitch after a long hold.
      if (g.pull >= 1) { p = .14 + clamp((g.pull - 1) / Math.max(.01, R / ARM - 1), 0, 1) * .3; level = "hard"; }
      else if (t > HOLD_DELAY) { p = .04 + .08 * clamp((t - HOLD_DELAY) / 800, 0, 1); level = "soft"; }
    } else if (g.mode === "burst") {
      p = .45 + clamp(t / BURST_MS, 0, 1) * .129;
      level = "burst";
    } else {
      if (t >= DELETE_MS) { stopGlitch(); return; }
      // Violent until the pad collapses to a line; after that there is nothing left to corrupt.
      if (t < DELETE_MS * .45) p = .2 + ((t / 140) % 1) * .38;
      level = "delete";
    }
    if ((root.dataset.corrupt ?? "") !== level) { if (level) root.dataset.corrupt = level; else delete root.dataset.corrupt; }
    const w = canvas.clientWidth, h = canvas.clientHeight;
    ctx.setTransform(canvas.width / w, 0, 0, canvas.height / h, 0, 0);
    if (p < 0) ctx.clearRect(0, 0, w, h);
    else paintCorruption(ctx, w, h, p, Math.floor(now / STEP_MS), g.seed, g.kit);
    g.raf = requestAnimationFrame(frameGlitch);
  }

  function relaxIcon() {
    const icon = iconRef.current;
    if (!icon) return;
    icon.style.transition = reduce ? "none" : "transform 360ms cubic-bezier(0.23, 1, 0.32, 1)";
    icon.style.transform = "rotate(0deg)";
  }

  function launchDot() {
    dotPending.current = false;
    clearTimeout(dotTimer.current);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.hidden) return;
    const { ux, uy } = dir.current;
    relaxIcon();
    const base = Math.atan2(-uy, -ux);
    const cone = spread * Math.PI / 180;
    const push = .85 + .35 * power.current;
    dotRefs.current.forEach((dot, index) => {
      if (!dot || typeof dot.animate !== "function") return;
      dot.getAnimations().forEach((animation) => animation.cancel());
      const lead = index === 0;
      const angle = base + (lead ? 0 : (Math.random() + Math.random() - 1) * cone / 2);
      const cx = Math.cos(angle);
      const cy = Math.sin(angle);
      const reach = (lead ? flight : flight * (.3 + Math.random())) * push;
      const drift = lead ? 0 : (Math.random() - .5) * flight * .4;
      const scale = lead ? 1 : .3 + Math.random() * .6;
      const shrink = lead ? .6 : scale * (.2 + Math.random() * .4);
      const duration = lead ? DOT_MS : DOT_MS * (.7 + Math.random());
      const delay = lead ? 0 : Math.random() * 70;
      const to = wellR + reach;
      dot.animate([
        { transform: `translate(${cx * wellR}px, ${cy * wellR}px) scale(${scale})` },
        { transform: `translate(${cx * to - cy * drift}px, ${cy * to + cx * drift}px) scale(${shrink})` },
      ], { duration, delay, easing: EASE_OUT, fill: "none" });
      dot.animate([{ opacity: 1, offset: 0 }, { opacity: 1, offset: .55 }, { opacity: 0, offset: 1 }], { duration, delay, easing: "linear", fill: "none" });
    });
  }

  function aimIcon(ux: number, uy: number, distance: number) {
    const icon = iconRef.current;
    if (!icon || reduce) return;
    const angle = Math.atan2(-uy, -ux) * 180 / Math.PI + 90;
    icon.style.transition = "none";
    icon.style.transform = `rotate(${angle * clamp(distance / 12, 0, 1)}deg)`;
  }

  function paint() {
    paintFrame.current = null;
    const band = bandRef.current;
    const hot = hotRef.current;
    const arc = arcRef.current;
    const fx = fxRef.current;
    if (!band || !hot || !arc || !fx) return;
    const x = px.get();
    const y = py.get();
    const { ux, uy } = dir.current;
    const projection = x * ux + y * uy;
    const p = clamp(projection / ARM, 0, 1);
    const distance = Math.hypot(x, y);
    let d = "";
    if (distance > .5) {
      const a = Math.atan2(y, x);
      const b = Math.acos(clamp((wellR - padR) / distance, -1, 1));
      d = [a + b, a - b].map((t) => {
        const cx = Math.cos(t);
        const cy = Math.sin(t);
        return `M${(wellR * cx).toFixed(2)},${(wellR * cy).toFixed(2)}L${(x + padR * cx).toFixed(2)},${(y + padR * cy).toFixed(2)}`;
      }).join("");
    }
    band.setAttribute("d", d);
    hot.setAttribute("d", d);
    hot.style.opacity = String(p);
    fx.style.opacity = String(clamp(projection / 6, 0, 1));
    arc.setAttribute("stroke-dasharray", `${p} ${1 - p}`);
    arc.setAttribute("stroke-dashoffset", String(p / 2));
    arc.style.opacity = p > .01 ? "1" : "0";
    if (grip.current) { aimIcon(ux, uy, distance); glitch.current.pull = distance / ARM; }
    arc.setAttribute("transform", `rotate(${Math.atan2(-uy, -ux) * 180 / Math.PI})`);
    if (dotPending.current && projection <= size / 4) launchDot();
  }

  function schedulePaint() {
    if (paintFrame.current === null) paintFrame.current = requestAnimationFrame(paint);
  }
  useMotionValueEvent(px, "change", schedulePaint);
  useMotionValueEvent(py, "change", schedulePaint);
  useEffect(() => {
    resetGestureRef.current();
    animX.current?.stop();
    animY.current?.stop();
    px.jump(0);
    py.jump(0);
    paint();
    // Paint is event-driven; only geometry changes reset the spring.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, strokeWidth, armAt, maxPull, axis]);

  function settle(velocity: { x: number; y: number }) {
    if (reduce) {
      px.jump(0);
      py.jump(0);
      return;
    }
    animX.current = animate(px, 0, { type: "spring", duration: .4, bounce: recoil, velocity: velocity.x });
    animY.current = animate(py, 0, { type: "spring", duration: .4, bounce: recoil, velocity: velocity.y });
  }

  function onPointerDown(event: PointerEvent<HTMLElement>) {
    if (disabled || grip.current || event.button !== 0) return;
    const element = rootRef.current;
    if (!element) return;
    skipClick.current = false;
    animX.current?.stop();
    animY.current?.stop();
    const rect = element.getBoundingClientRect();
    const scale = rect.width / (element.offsetWidth || rect.width) || 1;
    const x = px.get();
    const y = py.get();
    const distance = Math.hypot(x, y);
    const clamped = Math.min(distance, .95 * R);
    const raw = distance > .5 ? R * clamped / (R - clamped) : 0;
    grip.current = { id: event.pointerId, startX: event.clientX, startY: event.clientY, scale, moved: false, hist: [], rawOrigin: distance > .5 ? { x: raw * x / distance, y: raw * y / distance } : { x: 0, y: 0 }, slop: event.pointerType === "touch" ? SLOP.coarse : SLOP.fine };
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch {}
    setHeld(true);
    stopGlitch();
    glitch.current.deleteOnReturn = false;
    glitch.current.pull = 0;
    if (corruptOn()) glitchTo("held");
  }

  function onPointerMove(event: PointerEvent<HTMLElement>) {
    const g = grip.current;
    if (!g || g.id !== event.pointerId) return;
    const dx = (event.clientX - g.startX) / g.scale;
    const dy = (event.clientY - g.startY) / g.scale;
    let rx = g.rawOrigin.x + dx;
    let ry = g.rawOrigin.y + dy;
    if (axis === "horizontal") ry = rubberband(ry, size / 4);
    else if (axis === "vertical") rx = rubberband(rx, size / 4);
    if (!g.moved && Math.hypot(dx, dy) > g.slop) g.moved = true;
    const raw = Math.hypot(rx, ry);
    if (raw < .01) {
      px.set(0);
      py.set(0);
      armedRef.current = false;
      setArmed(false);
      return;
    }
    const distance = R * raw / (R + raw);
    const ux = rx / raw;
    const uy = ry / raw;
    dir.current = { ux, uy };
    px.set(distance * ux);
    py.set(distance * uy);
    const t = performance.now();
    g.hist.push({ x: distance * ux, y: distance * uy, t });
    while (g.hist.length > 4 || (g.hist.length && t - g.hist[0].t > 80)) g.hist.shift();
    const loaded = distance >= ARM;
    if (loaded !== armedRef.current) { armedRef.current = loaded; setArmed(loaded); }
  }

  function release(pointerId: number, cancelled: boolean) {
    const g = grip.current;
    if (!g || g.id !== pointerId) return;
    grip.current = null;
    skipClick.current = true;
    try { padRef.current?.releasePointerCapture(pointerId); } catch {}
    const distance = Math.hypot(px.get(), py.get());
    const p = distance / ARM;
    const { ux, uy } = dir.current;
    let vx = 0;
    let vy = 0;
    if (!cancelled && g.hist.length > 1) {
      const a = g.hist[0];
      const b = g.hist[g.hist.length - 1];
      const dt = b.t - a.t;
      if (dt > 0 && performance.now() - b.t < 50) { vx = (b.x - a.x) / dt * 1000; vy = (b.y - a.y) / dt * 1000; }
    }
    const speed = Math.hypot(vx, vy);
    if (speed > FINGER_MAX) { vx *= FINGER_MAX / speed; vy *= FINGER_MAX / speed; }
    if (!g.moved) {
      stopGlitch();
      relaxIcon();
      if (tapSends && !cancelled && !disabled) send();
      if (distance > .5) settle({ x: 0, y: 0 });
    } else {
      const fire = armedRef.current && !cancelled && !disabled;
      const launch = (fire ? 1 : CANCEL) * launchSpeed * Math.min(p, fire ? POWER_CAP : 1);
      let v0x = vx - ux * launch;
      let v0y = vy - uy * launch;
      const magnitude = Math.hypot(v0x, v0y);
      if (magnitude > HAND_MAX) { v0x *= HAND_MAX / magnitude; v0y *= HAND_MAX / magnitude; }
      if (!fire) relaxIcon();
      const corrupting = glitch.current.mode === "held";
      if (!fire) stopGlitch();
      if (fire) {
        if (corrupting) {
          glitchTo("burst");
          clearTimeout(linkTimer.current);
          linkTimer.current = setTimeout(send, BURST_MS);
          glitch.current.timers.push(setTimeout(() => glitchTo("delete"), DELETE_AFTER));
        } else send();
        if (reduce) {
          setSent(true);
          clearTimeout(sentTimer.current);
          sentTimer.current = setTimeout(() => setSent(false), 200);
        } else {
          power.current = clamp((Math.min(p, POWER_CAP) - 1) / (POWER_CAP - 1), 0, 1);
          dotPending.current = true;
          clearTimeout(dotTimer.current);
          dotTimer.current = setTimeout(launchDot, 150);
        }
      }
      settle({ x: v0x, y: v0y });
    }
    armedRef.current = false;
    setHeld(false);
    setArmed(false);
  }

  useEffect(() => {
    const stopEffects = () => {
      animX.current?.stop();
      animY.current?.stop();
      clearTimeout(dotTimer.current);
      clearTimeout(sentTimer.current);
      dotPending.current = false;
      if (paintFrame.current !== null) cancelAnimationFrame(paintFrame.current);
      paintFrame.current = null;
      dotRefs.current.forEach((dot) => dot?.getAnimations().forEach((animation) => animation.cancel()));
      stopGlitch();
    };
    const cancel = () => {
      const id = grip.current?.id;
      grip.current = null;
      skipClick.current = true;
      armedRef.current = false;
      if (id !== undefined && padRef.current?.hasPointerCapture(id)) padRef.current.releasePointerCapture(id);
      stopEffects();
      px.jump(0);
      py.jump(0);
      if (iconRef.current) { iconRef.current.style.transition = "none"; iconRef.current.style.transform = "rotate(0deg)"; }
      setHeld(false);
      setArmed(false);
      setSent(false);
    };
    resetGestureRef.current = cancel;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const motionChange = () => { if (media.matches) cancel(); };
    const leave = () => {
      if (glitch.current.mode === "burst" || glitch.current.mode === "delete") glitch.current.deleteOnReturn = true;
      cancel();
    };
    const back = () => {
      if (!glitch.current.deleteOnReturn || document.hidden) return;
      glitch.current.deleteOnReturn = false;
      if (corruptOn()) glitchTo("delete");
    };
    const visibilityChange = () => { if (document.hidden) leave(); else back(); };
    window.addEventListener("blur", leave);
    window.addEventListener("focus", back);
    document.addEventListener("visibilitychange", visibilityChange);
    media.addEventListener("change", motionChange);
    return () => {
      stopEffects();
      clearTimeout(linkTimer.current);
      resetGestureRef.current = () => {};
      window.removeEventListener("blur", leave);
      window.removeEventListener("focus", back);
      document.removeEventListener("visibilitychange", visibilityChange);
      media.removeEventListener("change", motionChange);
    };
  }, [px, py]);

  useEffect(() => { if (disabled) resetGestureRef.current(); }, [disabled]);

  const Pad = href ? "a" : "button";
  return <span ref={rootRef} className={`sling-button${className ? ` ${className}` : ""}`} data-armed={armed ? "" : undefined} data-sent={sent ? "" : undefined} style={{ "--sl-size": `${size}px`, "--sl-svg": `${2 * H}px`, "--sl-pad": padColor, "--sl-icon": iconColor, "--sl-accent": accentColor, "--sl-well": wellColor, "--sl-band": bandColor, "--sl-stroke": `${strokeWidth}px`, "--sl-dot": `${DOT}px` } as CSSProperties}>
    <svg className="sling-button__fx" viewBox={`${-H} ${-H} ${2 * H} ${2 * H}`} aria-hidden="true"><g ref={fxRef} className="sling-button__tension" style={{ opacity: 0 }}><path ref={bandRef} className="sling-button__band" /><path ref={hotRef} className="sling-button__band sling-button__band--hot" /></g><circle className="sling-button__well" r={wellR} /><circle ref={arcRef} className="sling-button__arc" r={wellR} pathLength="1" strokeDasharray="0 1" style={{ opacity: 0 }} /></svg>
    {Array.from({ length: count }, (_, index) => <span key={index} ref={(element) => { dotRefs.current[index] = element; }} className="sling-button__dot" aria-hidden="true" />)}
    <motion.span className="sling-button__move" style={{ transform: padT }}>
      <Pad
        ref={(element: HTMLAnchorElement | HTMLButtonElement | null) => { padRef.current = element; }}
        type={href ? undefined : "button"}
        href={href}
        target={href ? "_blank" : undefined}
        rel={href ? "noopener noreferrer" : undefined}
        className="sling-button__pad"
        draggable={false}
        aria-label={ariaLabel}
        aria-describedby={hintId}
        aria-disabled={disabled || undefined}
        data-held={held ? "" : undefined}
        data-armed={armed ? "" : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(event: PointerEvent<HTMLElement>) => release(event.pointerId, false)}
        onPointerCancel={(event: PointerEvent<HTMLElement>) => release(event.pointerId, true)}
        onLostPointerCapture={(event: PointerEvent<HTMLElement>) => release(event.pointerId, true)}
        onKeyDown={(event: KeyboardEvent<HTMLElement>) => {
        if (event.key === "Escape" && grip.current) release(grip.current.id, true);
        if (event.key === "Enter" || event.key === " ") skipClick.current = false;
        if (href && event.key === " ") { event.preventDefault(); if (!disabled && !event.repeat) send(); }
      }} onClick={(event: MouseEvent<HTMLElement>) => {
        if (href) event.preventDefault();
        if (skipClick.current) { skipClick.current = false; return; }
        if (!disabled) send();
      }}>
        <span className="sling-button__face"><span ref={iconRef} className="sling-button__icon">{children ?? <HugeiconsIcon icon={ArrowUp02Icon} size={Math.round(size * .4)} strokeWidth={2.2} />}</span>{corrupt && <canvas ref={corruptRef} className="sling-button__corrupt" aria-hidden="true" />}</span>
      </Pad>
    </motion.span>
    <span id={hintId} className="sling-button__sr">Press Enter to {href ? "open the link" : "send"}, or drag away and release.</span>
  </span>;
}
