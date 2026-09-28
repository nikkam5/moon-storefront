"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function RevealRoot({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const elements = new Set<HTMLElement>();
    let lastScroll = window.scrollY;
    let scrollingUp = false;
    const home = document.getElementById("home");
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const element = entry.target as HTMLElement;
        if (media.matches || entry.isIntersecting) {
          element.classList.remove("reveal-pending");
          element.classList.add("is-visible");
          if (element.id === "about" && !media.matches) element.classList.add("story-on");
        } else if (element.hasAttribute("data-fade-both") || (scrollingUp && entry.boundingClientRect.top > window.innerHeight - 50)) {
          // data-fade-both fades out whenever it leaves the viewport (either
          // direction) so it fades back in when scrolled back into view.
          element.classList.remove("is-visible");
          // Reset only sections below the viewport; keep content above readable.
          element.classList.remove("is-visible");
          element.classList.add("reveal-pending");
          if (element.id === "about") element.classList.remove("story-on");
        }
      }
    }, { threshold: 0, rootMargin: "0px 0px -35px 0px" });
    function watch(element: HTMLElement) {
      if (elements.has(element)) return;
      elements.add(element);
      const rect = element.getBoundingClientRect();
      if (media.matches || rect.top < window.innerHeight - 35) { element.classList.add("is-visible"); if (element.id === "about" && !media.matches) element.classList.add("story-on"); }
      else element.classList.add("reveal-pending");
      observer.observe(element);
    }
    document.querySelectorAll<HTMLElement>("[data-reveal]").forEach(watch);
    const mutation = new MutationObserver((changes) => { for (const change of changes) for (const node of change.addedNodes) if (node instanceof HTMLElement) { if (node.matches("[data-reveal]")) watch(node); node.querySelectorAll<HTMLElement>("[data-reveal]").forEach(watch); } });
    mutation.observe(document.body, { childList: true, subtree: true });
    function onScroll() {
      scrollingUp = window.scrollY < lastScroll;
      lastScroll = window.scrollY;
      if (home && !media.matches) {
        const end = home.offsetHeight * 0.8;
        const progress = Math.max(0, Math.min(1, (window.scrollY - 140) / Math.max(1, end)));
        home.style.setProperty("--hero-exit", String(progress));
        home.classList.toggle("hero-exit", progress > 0.95);
      }
    }
    function revealAll() { elements.forEach((element) => { element.classList.remove("reveal-pending"); element.classList.add("is-visible"); if (element.id === "about") element.classList.remove("story-on"); }); home?.classList.remove("hero-exit"); home?.style.removeProperty("--hero-exit"); }
    function motionChange() { if (media.matches) revealAll(); }
    function focusReveal(event: FocusEvent) { if (event.target instanceof Element) { const element = event.target.closest<HTMLElement>(".reveal-pending"); if (element) { element.classList.remove("reveal-pending"); element.classList.add("is-visible"); } } }
    window.addEventListener("scroll", onScroll, { passive: true });
    media.addEventListener("change", motionChange);
    document.addEventListener("focusin", focusReveal);
    return () => { revealAll(); observer.disconnect(); mutation.disconnect(); window.removeEventListener("scroll", onScroll); media.removeEventListener("change", motionChange); document.removeEventListener("focusin", focusReveal); };
  }, [path]);
  return <>{children}</>;
}
