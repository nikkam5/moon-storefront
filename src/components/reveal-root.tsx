"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Reveal on entry via IntersectionObserver only (no scroll listeners).
// Content above the viewport stays readable; content below hides until seen.
// The home curtain handoff is driven by the catalog section intersecting.
export default function RevealRoot({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const elements = new Set<HTMLElement>();
    const home = document.getElementById("home");
    const shop = document.getElementById("shop");
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const element = entry.target as HTMLElement;
        if (media.matches || entry.isIntersecting) {
          element.classList.remove("reveal-pending");
          element.classList.add("is-visible");
          if (element.id === "about" && !media.matches) element.classList.add("story-on");
        } else if (element.hasAttribute("data-fade-both") || entry.boundingClientRect.top > window.innerHeight - 50) {
          // data-fade-both fades out whenever it leaves the viewport (either
          // direction) so it fades back in when scrolled back into view.
          // Other sections below the viewport reset too; content above stays readable.
          element.classList.remove("is-visible");
          element.classList.add("reveal-pending");
          if (element.id === "about") element.classList.remove("story-on");
        }
      }
    }, { threshold: 0, rootMargin: "0px 0px -35px 0px" });
    // Catalog entering the viewport drives the home curtain exit.
    // The bottom 40% of the viewport is excluded so the exit only starts
    // once the catalog is well inside view, and clears back at the top.
    const curtain = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!home || media.matches) continue;
        // Class only (test hook + pointer-events). The blur amount itself is
        // owned by the per-frame progress driver below so it ramps smoothly
        // instead of snapping to full the moment the catalog enters view.
        if (entry.isIntersecting) {
          home.classList.add("hero-exit");
        } else if (entry.boundingClientRect.top > 0) {
          home.classList.remove("hero-exit");
        }
      }
    }, { threshold: 0, rootMargin: "0px 0px -40% 0px" });
    // Scroll-linked curtain progress: --hero-exit eases 0→1 as the shop
    // sheet rises over the sticky hero, so the gaussian blur tracks the
    // sheet 1:1. Homepage only, skipped for reduced motion. The class
    // toggle above stays as the test hook and no-JS-safe fallback.
    let progressTick = false;
    function curtainProgress() {
      progressTick = false;
      if (!home || !shop || media.matches) return;
      const top = shop.getBoundingClientRect().top;
      const start = window.innerHeight;
      const end = 150;
      const raw = Math.min(1, Math.max(0, (start - top) / (start - end)));
      const eased = raw * raw * (3 - 2 * raw);
      if (eased <= 0.001) home.style.removeProperty("--hero-exit");
      else home.style.setProperty("--hero-exit", eased.toFixed(3));
    }
    function requestProgress() {
      if (!progressTick && home && shop && !media.matches) {
        progressTick = true;
        requestAnimationFrame(curtainProgress);
      }
    }
    if (home && shop && !media.matches) {
      curtainProgress();
      window.addEventListener("scroll", requestProgress, { passive: true });
      window.addEventListener("resize", requestProgress);
    }
    function watch(element: HTMLElement) {
      if (elements.has(element)) return;
      elements.add(element);
      const rect = element.getBoundingClientRect();
      if (media.matches || rect.top < window.innerHeight - 35) { element.classList.add("is-visible"); if (element.id === "about" && !media.matches) element.classList.add("story-on"); }
      else element.classList.add("reveal-pending");
      observer.observe(element);
    }
    document.querySelectorAll<HTMLElement>("[data-reveal]").forEach(watch);
    if (shop) curtain.observe(shop);
    const mutation = new MutationObserver((changes) => { for (const change of changes) for (const node of change.addedNodes) if (node instanceof HTMLElement) { if (node.matches("[data-reveal]")) watch(node); node.querySelectorAll<HTMLElement>("[data-reveal]").forEach(watch); } });
    mutation.observe(document.body, { childList: true, subtree: true });
    function revealAll() { elements.forEach((element) => { element.classList.remove("reveal-pending"); element.classList.add("is-visible"); if (element.id === "about") element.classList.remove("story-on"); }); home?.classList.remove("hero-exit"); home?.style.removeProperty("--hero-exit"); }
    function motionChange() { if (media.matches) revealAll(); }
    function focusReveal(event: FocusEvent) { if (event.target instanceof Element) { const element = event.target.closest<HTMLElement>(".reveal-pending"); if (element) { element.classList.remove("reveal-pending"); element.classList.add("is-visible"); } } }
    media.addEventListener("change", motionChange);
    document.addEventListener("focusin", focusReveal);
    return () => { revealAll(); observer.disconnect(); curtain.disconnect(); mutation.disconnect(); media.removeEventListener("change", motionChange); document.removeEventListener("focusin", focusReveal); window.removeEventListener("scroll", requestProgress); window.removeEventListener("resize", requestProgress); };
  }, [path]);
  return <>{children}</>;
}
