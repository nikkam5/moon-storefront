"use client";

import { useEffect, useRef } from "react";

export default function GlowPanel({ children }: { children: React.ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);
  const target = useRef({ x: 0, y: 0 });
  const position = useRef({ x: 0, y: 0 });
  const frame = useRef<number>(0);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  function animate() {
    const current = position.current;
    current.x += (target.current.x - current.x) * 0.11;
    current.y += (target.current.y - current.y) * 0.11;
    panel.current?.style.setProperty("--glow-x", `${current.x}px`);
    panel.current?.style.setProperty("--glow-y", `${current.y}px`);
    if (Math.abs(target.current.x - current.x) + Math.abs(target.current.y - current.y) > 0.5) frame.current = requestAnimationFrame(animate);
    else frame.current = 0;
  }

  function move(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const box = event.currentTarget.getBoundingClientRect();
    target.current = { x: event.clientX - box.left, y: event.clientY - box.top };
    if (!frame.current) frame.current = requestAnimationFrame(animate);
  }

  return <div ref={panel} className="about-art glow-panel" onPointerMove={move}>{children}</div>;
}
