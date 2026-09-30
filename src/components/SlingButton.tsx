"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactNode } from "react";
import { animate, motion, useMotionTemplate, useMotionValue, useMotionValueEvent, useReducedMotion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUp02Icon } from "@hugeicons/core-free-icons";
import "./SlingButton.css";

const GAP = 4;
const SLOP = { fine: 4, coarse: 8 };
const FINGER_MAX = 3000;
const HAND_MAX = 6000;
const CANCEL = .5;
const POWER_CAP = 1.5;
const DOT_MS = 300;
const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";
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
export default function SlingButton({ children, onSend, href, padColor = "#f5f5f5", iconColor = "#18181b", accentColor = "#f5f5f5", wellColor = "#27272a", bandColor = "#52525b", size = 56, strokeWidth = 3, armAt = 48, maxPull = 160, launchSpeed = 2600, recoil = .2, flight = 120, particles = 14, spread = 60, axis = "any", tapSends = true, disabled = false, ariaLabel = "Send", className = "" }: Props) {
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
  const hintId = useId();
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const padT = useMotionTemplate`translate(${px}px, ${py}px)`;

  function send() {
    onSend?.();
    if (href) window.open(href, "_blank", "noopener,noreferrer");
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
    if (grip.current) aimIcon(ux, uy, distance);
    arc.setAttribute("transform", `rotate(${Math.atan2(-uy, -ux) * 180 / Math.PI})`);
    if (dotPending.current && projection <= size / 4) launchDot();
  }

  function schedulePaint() {
    if (paintFrame.current === null) paintFrame.current = requestAnimationFrame(paint);
  }
  useMotionValueEvent(px, "change", schedulePaint);
  useMotionValueEvent(py, "change", schedulePaint);
  useEffect(() => {
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
      if (fire) {
        send();
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

  useEffect(() => () => {
    animX.current?.stop();
    animY.current?.stop();
    clearTimeout(dotTimer.current);
    clearTimeout(sentTimer.current);
    if (paintFrame.current !== null) cancelAnimationFrame(paintFrame.current);
    dotRefs.current.forEach((dot) => dot?.getAnimations().forEach((animation) => animation.cancel()));
  }, []);

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
        <span className="sling-button__face"><span ref={iconRef} className="sling-button__icon">{children ?? <HugeiconsIcon icon={ArrowUp02Icon} size={Math.round(size * .4)} strokeWidth={2.2} />}</span></span>
      </Pad>
    </motion.span>
    <span id={hintId} className="sling-button__sr">Press Enter to {href ? "open the link" : "send"}, or drag away and release.</span>
  </span>;
}
