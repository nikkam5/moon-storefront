"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import "./pill-nav.css";

const items = [
  ["home", "Home"],
  ["shop", "Shop"],
  ["about", "Our story"],
  ["feedback", "Feedback"],
] as const;

export default function PillNav() {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | undefined>(() => path === "/" ? "home" : path === "/shop" || path.startsWith("/product/") ? "shop" : undefined);
  const [indicatorX, setIndicatorX] = useState<number | null>(null);
  const root = useRef<HTMLElement>(null);
  const popover = useRef<HTMLDivElement>(null);
  const navItems = useRef<HTMLDivElement>(null);
  const circles = useRef<(HTMLSpanElement | null)[]>([]);
  const timelines = useRef<gsap.core.Timeline[]>([]);
  const scrollLock = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setOpen(false), [path]);

  useEffect(() => {
    if (path !== "/") {
      setActive(path === "/shop" || path.startsWith("/product/") ? "shop" : undefined);
      return;
    }
    const syncSection = () => {
      if (scrollLock.current) return;
      const marker = window.innerHeight * 0.38;
      let current = "home";
       for (const id of ["shop", "about", "feedback"]) {
        const section = document.getElementById(id);
        if (section && section.getBoundingClientRect().top <= marker) current = id;
      }
      setActive(current);
    };
    syncSection();
    window.addEventListener("scroll", syncSection, { passive: true });
    window.addEventListener("resize", syncSection);
    window.addEventListener("popstate", syncSection);
    window.addEventListener("hashchange", syncSection);
    return () => {
      window.removeEventListener("scroll", syncSection);
      window.removeEventListener("resize", syncSection);
      window.removeEventListener("popstate", syncSection);
      window.removeEventListener("hashchange", syncSection);
    };
  }, [path]);

  useEffect(() => {
    const list = navItems.current;
    if (!list) return;
    const position = () => {
      const selected = list.querySelector<HTMLElement>(`.pill[data-section="${active}"]`);
      if (!selected) { setIndicatorX(null); return; }
      const listBox = list.getBoundingClientRect();
      const pillBox = selected.getBoundingClientRect();
      setIndicatorX(pillBox.left - listBox.left + pillBox.width / 2);
    };
    position();
    const resize = new ResizeObserver(position);
    resize.observe(list);
    document.fonts?.ready.then(position).catch(() => {});
    return () => resize.disconnect();
  }, [active]);

  useEffect(() => () => { if (scrollLock.current) clearTimeout(scrollLock.current); }, []);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node) && !popover.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
    };
  }, [open]);

  function navigate(event: React.MouseEvent<HTMLAnchorElement>, id: string) {
    setOpen(false);
    setActive(id);
    if (scrollLock.current) clearTimeout(scrollLock.current);
    scrollLock.current = setTimeout(() => { scrollLock.current = null; }, 1100);
    const smooth = matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" as const : "smooth" as const;
    event.preventDefault();
    if (id === "home") {
      if (path !== "/") router.push("/");
      else {
        history.replaceState(null, "", "/");
        window.scrollTo({ top: 0, behavior: smooth });
      }
      return;
    }
    if (path !== "/") {
      router.push(`/#${id}`);
      return;
    }
    document.getElementById(id)?.scrollIntoView({ behavior: smooth, block: "start" });
    history.replaceState(null, "", `/#${id}`);
  }

  useEffect(() => {
    const layout = () => {
      circles.current.forEach((circle, index) => {
        const pill = circle?.parentElement as HTMLElement | null;
        if (!circle || !pill) return;
        const { width: w, height: h } = pill.getBoundingClientRect();
        const radius = ((w * w) / 4 + h * h) / (2 * h);
        const diameter = Math.ceil(2 * radius) + 2;
        const delta = Math.ceil(radius - Math.sqrt(Math.max(0, radius * radius - (w * w) / 4))) + 1;
        circle.style.width = `${diameter}px`;
        circle.style.height = `${diameter}px`;
        circle.style.bottom = `-${delta}px`;
        gsap.set(circle, { xPercent: -50, scale: 0, transformOrigin: `50% ${diameter - delta}px` });
        const label = pill.querySelector<HTMLElement>(".pill-label");
        const hover = pill.querySelector<HTMLElement>(".pill-label-hover");
        if (label) gsap.set(label, { y: 0 });
        if (hover) gsap.set(hover, { y: h + 12, opacity: 0 });
        timelines.current[index]?.kill();
        const tl = gsap.timeline({ paused: true });
        tl.to(circle, { scale: 1.2, duration: 0.7, ease: "power2.out" }, 0);
        if (label) tl.to(label, { y: -(h + 8), duration: 0.7, ease: "power2.out" }, 0);
        if (hover) tl.to(hover, { y: 0, opacity: 1, duration: 0.7, ease: "power2.out" }, 0);
        timelines.current[index] = tl;
      });
    };
    layout();
    window.addEventListener("resize", layout);
    document.fonts?.ready.then(layout).catch(() => {});
    return () => {
      window.removeEventListener("resize", layout);
      timelines.current.forEach((timeline) => timeline.kill());
    };
  }, []);

  function hover(index: number, entering: boolean) {
    const timeline = timelines.current[index];
    if (!timeline || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    timeline.tweenTo(entering ? timeline.duration() : 0, { duration: entering ? 0.22 : 0.16, ease: "power2.out", overwrite: "auto" });
  }

  return <>
    <div className="pill-nav-container">
    <nav ref={root} id="main-navigation" className="pill-nav" aria-label="Main navigation">
      <div ref={navItems} className="pill-nav-items desktop-only">
        <ul className="pill-list">
          {items.map(([id, label], index) => <li key={id}>
            <Link href={id === "home" ? "/" : `/#${id}`} data-section={id} aria-current={active === id ? "page" : undefined} className={`pill ${active === id ? "is-active" : ""}`} onClick={(event) => navigate(event, id)} onMouseEnter={() => hover(index, true)} onMouseLeave={() => hover(index, false)} onFocus={() => hover(index, true)} onBlur={() => hover(index, false)}>
              <span className="hover-circle" ref={(element) => { circles.current[index] = element; }} aria-hidden="true" />
              <span className="label-stack"><span className="pill-label">{label}</span><span className="pill-label-hover" aria-hidden="true">{label}</span></span>
            </Link>
          </li>)}
        </ul>
        <span className="pill-active-indicator" style={{ left: indicatorX ?? 0, opacity: indicatorX === null ? 0 : 1 }} aria-hidden="true" />
      </div>
      <button className="pill-mobile-toggle mobile-only" aria-label={open ? "Close menu" : "Open menu"} aria-controls="pill-mobile-links" aria-expanded={open} onClick={() => setOpen((value) => !value)}><span /><span /></button>
    </nav>
    <div ref={popover} id="pill-mobile-links" className={`pill-mobile-popover mobile-only ${open ? "is-open" : ""}`}>
      {items.map(([id, label]) => <Link key={id} href={id === "home" ? "/" : `/#${id}`} className={active === id ? "is-active" : ""} onClick={(event) => navigate(event, id)}>{label}</Link>)}
    </div>
    </div>
  </>;
}
