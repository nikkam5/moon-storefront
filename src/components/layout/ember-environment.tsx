"use client";

import { useEffect, useRef } from "react";
import { useScroll } from "motion/react";
import { paintEmberScene, type EmberLook, type EmberScene } from "./ember-scene";

export default function EmberEnvironment({ scene, look }: { scene: EmberScene; look?: EmberLook }) {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const { scrollYProgress } = useScroll({ target: root, offset: ["start end", "end start"] });

  useEffect(() => {
    const element = root.current, art = canvas.current;
    const ctx = art?.getContext("2d");
    if (!element || !art || !ctx) return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const fine = matchMedia("(hover: hover) and (pointer: fine)");
    const hero = element.closest(".hero-section");
    let visible = false, enabled = false, raf = 0, last = 0, painted = 0, time = 0;
    let width = 1, height = 1, dpr = 1;
    const target = { x: -1000, y: -1000, strength: 0 };
    const pointer = { ...target };

    const draw = (now: number) => {
      raf = 0;
      if (!enabled || !visible || document.hidden || hero?.classList.contains("hero-exit")) return;
      // Grid looks paint from a cached lattice, cheap enough for every display
      // frame; the original plate scenes stay capped near 30 fps.
      if (!motion.matches && !look && now - painted < 32) { raf = requestAnimationFrame(draw); return; }
      const dt = last ? Math.min(.05, (now - last) / 1000) : 0;
      last = now; painted = now;
      if (!motion.matches) {
        time += dt;
        // ~80ms time constant: follows the cursor closely without jitter.
        const ease = 1 - Math.exp(-dt * 12);
        pointer.x += (target.x - pointer.x) * ease;
        pointer.y += (target.y - pointer.y) * ease;
        pointer.strength += (target.strength - pointer.strength) * ease;
      } else pointer.strength = 0;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Reduced motion is a completely still composition, including scroll.
      paintEmberScene(ctx, width, height, scene, motion.matches ? 0 : time, motion.matches ? .5 : scrollYProgress.get(), pointer, look);
      element.dataset.ready = "true";
      if (!motion.matches) raf = requestAnimationFrame(draw);
    };
    const sync = () => {
      enabled = document.documentElement.dataset.ember === "true";
      cancelAnimationFrame(raf); raf = 0; last = 0; painted = 0;
      if (!enabled || motion.matches || document.hidden) { target.strength = 0; pointer.strength = 0; }
      const running = enabled && visible && !document.hidden && !hero?.classList.contains("hero-exit");
      element.dataset.motion = !enabled ? "off" : !running ? "paused" : motion.matches ? "static" : "running";
      if (running) raf = requestAnimationFrame(draw);
    };
    const resize = () => {
      width = Math.max(1, element.clientWidth); height = Math.max(1, element.clientHeight);
      // Limit raster work for tall mobile sections and high-density screens.
      dpr = Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(2_000_000 / (width * height)));
      art.width = Math.ceil(width * dpr); art.height = Math.ceil(height * dpr);
      sync();
    };
    const onPointer = (event: PointerEvent) => {
      if (!enabled || !visible || motion.matches || !fine.matches || event.pointerType === "touch") return;
      const rect = element.getBoundingClientRect();
      target.x = event.clientX - rect.left; target.y = event.clientY - rect.top;
      target.strength = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom ? 1 : 0;
    };
    const clearPointer = () => { target.strength = 0; };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    observer.observe(element);
    const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(element);
    const themeObserver = new MutationObserver(sync);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-ember"] });
    const curtainObserver = hero ? new MutationObserver(sync) : null;
    if (hero) curtainObserver?.observe(hero, { attributes: true, attributeFilter: ["class"] });
    motion.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("blur", clearPointer);
    document.documentElement.addEventListener("pointerleave", clearPointer);
    const unsubscribe = scrollYProgress.on("change", () => { if (motion.matches) return; if (!raf && enabled && visible && !document.hidden && !hero?.classList.contains("hero-exit")) raf = requestAnimationFrame(draw); });
    resize();
    return () => {
      cancelAnimationFrame(raf); observer.disconnect(); resizeObserver.disconnect(); themeObserver.disconnect(); curtainObserver?.disconnect(); unsubscribe();
      motion.removeEventListener("change", sync); document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("pointermove", onPointer); window.removeEventListener("blur", clearPointer);
      document.documentElement.removeEventListener("pointerleave", clearPointer);
    };
  }, [scene, look, scrollYProgress]);

  return <div ref={root} className={`ember-environment ember-environment-${scene}`} aria-hidden="true" data-scene={scene} data-look={look}><canvas ref={canvas} /></div>;
}
