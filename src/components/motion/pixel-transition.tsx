"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { gsap } from "gsap";
import "./pixel-transition.css";

type Props = {
  firstContent: ReactNode;
  secondContent: ReactNode;
  label: string;
  gridSize?: number;
  pixelColor?: string;
  animationStepDuration?: number;
  aspectRatio?: string;
  once?: boolean;
  className?: string;
};

export default function PixelTransition({ firstContent, secondContent, label, gridSize = 8, pixelColor = "#a9d4ff", animationStepDuration = .38, aspectRatio = "4 / 3", once = false, className = "" }: Props) {
  const gridRef = useRef<HTMLDivElement>(null);
  const delayed = useRef<gsap.core.Tween | null>(null);
  const running = useRef(false);
  const activeRef = useRef(false);
  const targetRef = useRef(false);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    grid.replaceChildren();
    const size = 100 / gridSize;
    for (let row = 0; row < gridSize; row++) for (let col = 0; col < gridSize; col++) {
      const pixel = document.createElement("span");
      pixel.className = "pixel-transition__pixel";
      pixel.style.cssText = `width:${size}%;height:${size}%;left:${col * size}%;top:${row * size}%;background:${pixelColor}`;
      grid.appendChild(pixel);
    }
    const settle = () => {
      gsap.killTweensOf(grid.children);
      delayed.current?.kill();
      gsap.set(grid.children, { opacity: 0 });
      activeRef.current = targetRef.current;
      setActive(targetRef.current);
      running.current = false;
    };
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotionChange = () => { if (media.matches) settle(); };
    const onVisibilityChange = () => { if (document.hidden) settle(); };
    media.addEventListener("change", onMotionChange);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      gsap.killTweensOf(grid.children);
      delayed.current?.kill();
      running.current = false;
      media.removeEventListener("change", onMotionChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      grid.replaceChildren();
    };
  }, [gridSize, pixelColor]);

  function transition(next: boolean) {
    if (once && targetRef.current) return;
    if (next === activeRef.current && !running.current) return;
    const grid = gridRef.current;
    if (!grid) return;
    const pixels = Array.from(grid.children);
    targetRef.current = next;
    gsap.killTweensOf(pixels);
    delayed.current?.kill();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      activeRef.current = next;
      setActive(next);
      running.current = false;
      gsap.set(pixels, { opacity: 0 });
      return;
    }
    running.current = true;
    const step = Math.max(.15, animationStepDuration);
    gsap.set(pixels, { opacity: 0 });
    gsap.to(pixels, { opacity: 1, duration: .07, stagger: { each: step / (pixels.length * 2), from: "random" } });
    delayed.current = gsap.delayedCall(step / 2, () => {
      activeRef.current = next;
      setActive(next);
      gsap.to(pixels, { opacity: 0, duration: .07, stagger: { each: step / (pixels.length * 2), from: "random" }, onComplete: () => { running.current = false; } });
    });
  }

  return <div className={`pixel-transition ${className}`} style={{ aspectRatio } as CSSProperties} role="button" tabIndex={0} aria-label={`${label}. ${active ? "Show portrait" : "Show position"}`} aria-pressed={active} onPointerEnter={(event) => { if (event.pointerType === "mouse") transition(true); }} onPointerLeave={(event) => { if (event.pointerType === "mouse" && !once) transition(false); }} onClick={(event) => { if (window.matchMedia("(hover: none)").matches) { event.stopPropagation(); transition(!activeRef.current); } }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); transition(!activeRef.current); } }}>
    <div className="pixel-transition__default" aria-hidden={active}>{firstContent}</div>
    <div className="pixel-transition__active" aria-hidden={!active} hidden={!active}>{secondContent}</div>
    <div className="pixel-transition__grid" ref={gridRef} aria-hidden="true" />
  </div>;
}
