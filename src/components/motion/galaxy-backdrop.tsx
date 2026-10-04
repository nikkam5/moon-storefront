"use client";

import { useEffect, useRef, useState } from "react";
import Galaxy from "./galaxy";

// Homepage hero-only ambient backdrop. Rendered solely by Hero, which is used
// only on the home page, so no other route ever mounts WebGL.
// Mounts the canvas lazily when the hero nears the viewport, then pauses the
// render loop whenever the hero scrolls away so it never burns CPU offscreen.
// Reduced-motion users and no-JS visitors get the static gradient instead.
export default function GalaxyBackdrop() {
  const host = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(true);

  useEffect(() => {
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(motion.matches);
    update();
    motion.addEventListener("change", update);
    return () => motion.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!host.current || reduced) { setMounted(false); setVisible(false); return; }
    const node = host.current;
    // Outer band mounts the canvas early; inner ratio drives play/pause.
    const mount = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) { setMounted(true); mount.disconnect(); }
      },
      { rootMargin: "300px 0px" }
    );
    // Coverage-based play/pause: the hero is sticky now, so it never leaves
    // the viewport — but the shop sheet slides OVER it. Observing the shop
    // (which moves on scroll) re-fires the callback continuously, letting us
    // pause GL work whenever the hero is covered and resume when uncovered.
    const syncVisibility = () => {
        const heroEl = document.getElementById("home");
        if (!heroEl || heroEl.classList.contains("hero-exit")) { setVisible(false); return; }
        const heroBox = heroEl.getBoundingClientRect();
        const shopBox = document.getElementById("shop")?.getBoundingClientRect();
        const top = Math.max(heroBox.top, 105);
        const bottom = Math.min(heroBox.bottom, shopBox ? shopBox.top : Infinity);
        const visiblePx = Math.min(bottom, innerHeight) - Math.max(top, 0);
        setVisible(visiblePx > 160);
      };
    const play = new IntersectionObserver(
      syncVisibility,
      { threshold: [0, 0.05, 0.1, 0.2, 0.35, 0.5, 0.65, 0.8, 1] }
    );
    mount.observe(node);
    play.observe(node);
    const shopNode = document.getElementById("shop");
    if (shopNode) play.observe(shopNode);
    const hero = document.getElementById("home");
    const curtain = new MutationObserver(syncVisibility);
    if (hero) curtain.observe(hero, { attributes: true, attributeFilter: ["class"] });
    window.addEventListener("resize", syncVisibility);
    syncVisibility();
    return () => { mount.disconnect(); play.disconnect(); curtain.disconnect(); window.removeEventListener("resize", syncVisibility); };
  }, [reduced]);

  return (
    <div ref={host} className="galaxy-backdrop" aria-hidden="true">
      {mounted && !reduced && (
        <Galaxy
          paused={!visible}
          density={0.4}
          glowIntensity={0.2}
          saturation={0.4}
          hueShift={215}
          starSpeed={0.25}
          speed={0.65}
          rotationSpeed={0.05}
          twinkleIntensity={0.16}
          mouseInteraction={false}
          mouseRepulsion={false}
          transparent
        />
      )}
    </div>
  );
}
