"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";
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

  return <Element ref={(node) => { root.current = node; }} hidden={hidden} aria-labelledby={labelledBy} className={`border-glow-card ${className}`.trim()} style={style} onPointerMove={(event) => {
    if (event.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const card = root.current;
    if (!card) return;
    const box = card.getBoundingClientRect();
    const x = event.clientX - box.left;
    const y = event.clientY - box.top;
    const edge = Math.min(x, y, box.width - x, box.height - y);
    const threshold = Math.max(25, Math.min(box.width, box.height) * Math.max(1, edgeSensitivity) / 100);
    const proximity = Math.max(0, Math.min(1, 1 - edge / threshold));
    const angle = (Math.atan2(y - box.height / 2, x - box.width / 2) * 180 / Math.PI + 90 + 360) % 360;
    card.style.setProperty("--edge-proximity", proximity.toFixed(3));
    card.style.setProperty("--cursor-angle", `${angle.toFixed(2)}deg`);
    card.style.setProperty("--glow-x", `${(x / box.width * 100).toFixed(2)}%`);
    card.style.setProperty("--glow-y", `${(y / box.height * 100).toFixed(2)}%`);
  }} onPointerLeave={() => root.current?.style.setProperty("--edge-proximity", "0")}>
    <div className="border-glow-inner">{children}</div>
  </Element>;
}
