"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import "./border-glow.css";

type Props = {
  children: ReactNode;
  className?: string;
  edgeSensitivity?: number;
  glowColor?: string;
  backgroundColor?: string;
  borderRadius?: number;
  glowRadius?: number;
  glowIntensity?: number;
  coneSpread?: number;
  colors?: [string, string, string];
  as?: "div" | "article";
  hidden?: boolean;
  labelledBy?: string;
};

export default function BorderGlow({ children, className = "", edgeSensitivity = 30, glowColor = "210 80 75", backgroundColor = "var(--surface)", borderRadius = 20, glowRadius = 30, glowIntensity = .8, coneSpread = 25, colors = ["#90c7f9", "#b8dfff", "#699fda"], as = "div", hidden, labelledBy }: Props) {
  const root = useRef<HTMLElement | null>(null);
  const frame = useRef(0);
  const pointer = useRef({ x: 0, y: 0 });
  const Element = as;
  const [h, s, l] = glowColor.trim().split(/\s+/).map((value) => parseFloat(value));
  const hue = Number.isFinite(h) ? h : 210;
  const saturation = Number.isFinite(s) ? s : 80;
  const lightness = Number.isFinite(l) ? l : 75;
  const style = {
    "--glow-surface": backgroundColor,
    "--glow-radius": `${borderRadius}px`,
    "--glow-outer": `${glowRadius}px`,
    "--glow-color": `hsl(${hue}deg ${saturation}% ${lightness}%)`,
    "--glow-intensity": glowIntensity,
    "--glow-cone": `${coneSpread}%`,
    "--glow-one": colors[0],
    "--glow-two": colors[1],
    "--glow-three": colors[2],
  } as CSSProperties;

  const paint = () => {
    const card = root.current;
    if (!card) return;
    const box = card.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const x = pointer.current.x - box.left;
    const y = pointer.current.y - box.top;
    const edge = Math.min(x, y, box.width - x, box.height - y);
    const threshold = Math.max(25, Math.min(box.width, box.height) * Math.max(1, edgeSensitivity) / 100);
    const proximity = Math.max(0, Math.min(1, 1 - edge / threshold));
    const angle = (Math.atan2(y - box.height / 2, x - box.width / 2) * 180 / Math.PI + 90 + 360) % 360;
    card.style.setProperty("--edge-proximity", proximity.toFixed(3));
    card.style.setProperty("--cursor-angle", `${angle.toFixed(2)}deg`);
    card.style.setProperty("--glow-x", `${(x / box.width * 100).toFixed(2)}%`);
    card.style.setProperty("--glow-y", `${(y / box.height * 100).toFixed(2)}%`);
  };
  const paintRef = useRef(paint);
  paintRef.current = paint;
  const reset = () => { cancelAnimationFrame(frame.current); frame.current = 0; root.current?.style.setProperty("--edge-proximity", "0"); };
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const motionChange = () => { if (motion.matches) reset(); };
    motion.addEventListener("change", motionChange);
    window.addEventListener("blur", reset);
    return () => { reset(); motion.removeEventListener("change", motionChange); window.removeEventListener("blur", reset); };
  }, []);

  return <Element ref={(node) => { root.current = node; }} hidden={hidden} aria-labelledby={labelledBy} className={`border-glow-card ${className}`.trim()} style={style} onPointerMove={(event) => {
    if (event.pointerType !== "mouse" || document.hidden || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    pointer.current = { x: event.clientX, y: event.clientY };
    if (!frame.current) frame.current = requestAnimationFrame(() => { frame.current = 0; paintRef.current(); });
  }} onPointerLeave={reset} onPointerCancel={reset}>
    <div className="border-glow-inner">{children}</div>
  </Element>;
}
