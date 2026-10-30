'use client';

import { useEffect, useRef } from 'react';

type Drop = { x: number; y: number; vy: number; radius: number };
const GRAVITY = 1100;

// Drops released by the MOONSTORE drips ('moonstore-bleed' events) fall behind
// the hero copy and leave through the bottom of the section. Idle otherwise.
export default function BloodFall() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const host = canvas?.parentElement;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !host || !ctx) return undefined;
    const drops: Drop[] = [];
    let raf = 0;
    let last = 0;
    let dpr = 1;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.ceil(canvas.clientWidth * dpr);
      canvas.height = Math.ceil(canvas.clientHeight * dpr);
    };
    const draw = (now: number) => {
      raf = 0;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      const height = canvas.clientHeight;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, canvas.clientWidth, height);
      for (let i = drops.length - 1; i >= 0; i--) {
        const drop = drops[i];
        drop.vy += GRAVITY * dt;
        drop.y += drop.vy * dt;
        const stretch = 1 + Math.min(1.4, drop.vy / 700);
        if (drop.y - drop.radius * stretch * 3 > height) { drops.splice(i, 1); continue; }
        const r = drop.radius;
        ctx.fillStyle = '#b3101e';
        ctx.beginPath();
        ctx.ellipse(drop.x, drop.y, r, r * stretch, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(drop.x - r * 0.55, drop.y - r * stretch * 0.5);
        ctx.lineTo(drop.x, drop.y - r * stretch * 2.4);
        ctx.lineTo(drop.x + r * 0.55, drop.y - r * stretch * 0.5);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 160, 160, 0.45)';
        ctx.beginPath();
        ctx.arc(drop.x - r * 0.35, drop.y - r * 0.3, r * 0.28, 0, Math.PI * 2);
        ctx.fill();
      }
      if (drops.length) raf = requestAnimationFrame(draw);
      else last = 0;
    };
    const onBleed = (event: Event) => {
      const { x, y, radius } = (event as CustomEvent<{ x: number; y: number; radius: number }>).detail;
      const box = canvas.getBoundingClientRect();
      drops.push({ x: x - box.left, y: y - box.top, vy: 40, radius });
      if (!raf) raf = requestAnimationFrame(draw);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    host.addEventListener('moonstore-bleed', onBleed);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      host.removeEventListener('moonstore-bleed', onBleed);
    };
  }, []);

  return <canvas ref={ref} className="blood-fall" aria-hidden="true" />;
}
