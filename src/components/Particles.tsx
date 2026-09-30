"use client";

import { useEffect, useRef } from "react";

type Props = {
  particleColors?: string[];
  particleCount?: number;
  particleSpread?: number;
  speed?: number;
  particleBaseSize?: number;
  moveParticlesOnHover?: boolean;
  particleHoverFactor?: number;
  alphaParticles?: boolean;
  sizeRandomness?: number;
  cameraDistance?: number;
  disableRotation?: boolean;
  pixelRatio?: number;
};

type Particle = { x: number; y: number; vx: number; vy: number; size: number; color: string; alpha: number; phase: number };

export default function Particles({ particleColors = ["#ffffff"], particleCount = 200, particleSpread = 10, speed = .1, particleBaseSize = 100, moveParticlesOnHover = false, particleHoverFactor = 1, alphaParticles = false, sizeRandomness = 1, cameraDistance = 20, disableRotation = false, pixelRatio = 1 }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const palette = particleColors.join(",");

  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext("2d");
    if (!element || !context) return;
    const colors = palette.split(",").filter(Boolean);
    const stars: Particle[] = Array.from({ length: particleCount }, (_, index) => ({
      x: Math.random(), y: Math.random(),
      vx: (Math.random() - .5) * .00055, vy: (Math.random() - .5) * .00055,
      size: Math.max(.4, 1.8 * Math.sqrt(Math.max(1, particleBaseSize) / 100) * (1 + (Math.random() - .5) * Math.max(0, sizeRandomness))),
      color: colors[index % colors.length] || "#ffffff", alpha: .35 + Math.random() * .65, phase: Math.random() * Math.PI * 2,
    }));
    let width = 0;
    let height = 0;
    let frame = 0;
    let last = 0;
    let elapsed = 0;
    let visible = false;
    let pointer: { x: number; y: number } | null = null;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

    function draw(time: number) {
      if (!context || !element) return;
      const step = Math.min((time - (last || time)) / 16.67, 3);
      last = time;
      if (!motion.matches) elapsed += step * 16.67;
      context.clearRect(0, 0, width, height);
      const perspective = 20 / Math.max(1, cameraDistance);
      const spread = Math.max(1, particleSpread) / 10 * perspective;
      for (const star of stars) {
        if (!motion.matches) {
          // At the documented 0.1 speed, drift should still be perceptible.
          star.x = (star.x + star.vx * speed * 9 * step + 1) % 1;
          star.y = (star.y + star.vy * speed * 9 * step + 1) % 1;
        }
        let x = (star.x - .5) * width * spread + width / 2;
        let y = (star.y - .5) * height * spread + height / 2;
        if (!disableRotation && !motion.matches) {
          const angle = elapsed * speed * .00015;
          const dx = x - width / 2;
          const dy = y - height / 2;
          x = width / 2 + dx * Math.cos(angle) - dy * Math.sin(angle);
          y = height / 2 + dx * Math.sin(angle) + dy * Math.cos(angle);
        }
        if (moveParticlesOnHover && pointer && !motion.matches) {
          const dx = x - pointer.x;
          const dy = y - pointer.y;
          const distance = Math.hypot(dx, dy);
          if (distance > 0 && distance < 150) {
            const offset = (1 - distance / 150) * 28 * particleHoverFactor;
            x += dx / distance * offset;
            y += dy / distance * offset;
          }
        }
        context.globalAlpha = alphaParticles ? star.alpha : 1;
        context.fillStyle = star.color;
        context.beginPath();
        const pulse = motion.matches ? 1 : 1 + .2 * Math.sin(elapsed * .002 + star.phase);
        context.arc(x, y, star.size * perspective * pulse, 0, Math.PI * 2);
        context.fill();
      }
      context.globalAlpha = 1;
      if (visible && !motion.matches) frame = requestAnimationFrame(draw);
    }

    function restart() {
      cancelAnimationFrame(frame);
      last = 0;
      if (visible) frame = requestAnimationFrame(draw);
    }

    const resize = new ResizeObserver(() => {
      const bounds = element.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      const dpr = Math.min(Math.max(1, pixelRatio), 3);
      element.width = Math.round(width * dpr);
      element.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      restart();
    });
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) restart();
      else cancelAnimationFrame(frame);
    });
    function onPointerMove(event: PointerEvent) {
      const bounds = element!.getBoundingClientRect();
      pointer = event.clientX >= bounds.left && event.clientX <= bounds.right && event.clientY >= bounds.top && event.clientY <= bounds.bottom
        ? { x: event.clientX - bounds.left, y: event.clientY - bounds.top } : null;
    }
    resize.observe(element);
    observer.observe(element);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    motion.addEventListener("change", restart);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      observer.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      motion.removeEventListener("change", restart);
    };
  }, [palette, particleCount, particleSpread, speed, particleBaseSize, moveParticlesOnHover, particleHoverFactor, alphaParticles, sizeRandomness, cameraDistance, disableRotation, pixelRatio]);

  return <canvas ref={canvas} className="story-particles" aria-hidden="true" />;
}
