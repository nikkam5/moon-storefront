"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { corruptionKit, paintCorruption, STEP_MS } from "./corruption-curtain";

// The button loops the switch's own corruption (one 600ms cycle). It starts
// when the falling drop breaks: 0.1s delay + 62% of its 0.9s fall (see
// ember-theme.css, where the button's own jitter uses the same .66s delay).
const CORRUPT_CYCLE = 600;
const CORRUPT_DELAY = 660;

type StandardTheme = "light" | "dark";
type Theme = StandardTheme | "ember";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [busy, setBusy] = useState(false);
  // One drop per hover/focus: it falls halfway and stays frozen, broken, until left.
  const [drip, setDrip] = useState<"off" | "on">("off");
  const startDrip = () => setDrip("on");
  const endDrip = () => setDrip("off");
  const previous = useRef<StandardTheme>("dark");
  const pending = useRef<{ finish: () => void; cancel: () => void } | null>(null);
  const corrupt = useRef<HTMLCanvasElement>(null);

  // While hovered or focused, the button face runs the transition's corruption
  // on repeat, scaled down; it starts once the drop breaks and clears when left.
  useEffect(() => {
    const canvas = corrupt.current;
    const ctx = canvas?.getContext("2d");
    if (drip !== "on" || !canvas || !ctx || matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const width = canvas.clientWidth, height = canvas.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.ceil(width * dpr); canvas.height = Math.ceil(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const kit = corruptionKit(ctx, .25);
    const seed = Math.floor(performance.now());
    let raf = 0, start = 0;
    const frame = (now: number) => {
      const elapsed = now - start;
      paintCorruption(ctx, width, height, (elapsed % CORRUPT_CYCLE) / CORRUPT_CYCLE, Math.floor(elapsed / STEP_MS), seed, kit);
      raf = requestAnimationFrame(frame);
    };
    const delay = setTimeout(() => { start = performance.now(); raf = requestAnimationFrame(frame); }, CORRUPT_DELAY);
    return () => { clearTimeout(delay); cancelAnimationFrame(raf); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); };
  }, [drip]);

  function apply(value: Theme) {
    document.documentElement.dataset.theme = value === "light" ? "light" : "dark";
    if (value === "ember") document.documentElement.dataset.ember = "true";
    else delete document.documentElement.dataset.ember;
    setTheme(value);
  }

  useEffect(() => {
    let selected: Theme | null = null;
    try {
      const saved = localStorage.getItem("moonstore-theme");
      if (saved === "light" || saved === "dark" || saved === "ember") selected = saved;
      const base = localStorage.getItem("moonstore-standard-theme");
      previous.current = selected === "light" || selected === "dark" ? selected : base === "light" ? "light" : "dark";
    } catch { /* Dark is the fallback. */ }
    apply(selected ?? "dark");
    if (selected) document.documentElement.dataset.themeOverride = "true";
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const settle = () => { if (document.hidden || media.matches) pending.current?.finish(); };
    document.addEventListener("visibilitychange", settle);
    media.addEventListener("change", settle);
    return () => {
      pending.current?.cancel();
      document.removeEventListener("visibilitychange", settle);
      media.removeEventListener("change", settle);
    };
  }, []);

  function select(next: Theme) {
    if (pending.current) return;
    const commit = () => {
      if (next !== "ember") previous.current = next;
      apply(next);
      document.documentElement.dataset.themeOverride = "true";
      try {
        localStorage.setItem("moonstore-theme", next);
        localStorage.setItem("moonstore-standard-theme", previous.current);
      } catch { /* Selection still works without browser storage. */ }
    };
    if (theme !== "ember" && next !== "ember") { commit(); return; }

    const root = document.documentElement;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reduced ? 180 : 600;
    let swapped = false;
    let ended = false;
    let swapTimer: ReturnType<typeof setTimeout> | undefined;
    let endTimer: ReturnType<typeof setTimeout> | undefined;
    let transition: ViewTransition | undefined;
    const swap = () => {
      if (swapped) return;
      swapped = true;
      const position = { left: window.scrollX, top: window.scrollY };
      commit();
      // Ember's type metrics can change section heights. Keep the current
      // viewport while the new layout settles under the curtain or snapshot.
      window.scrollTo({ ...position, behavior: "instant" });
    };
    const clear = () => {
      clearTimeout(swapTimer); clearTimeout(endTimer);
      delete root.dataset.themeTransition;
      root.style.removeProperty("--ember-transition-duration");
      pending.current = null;
    };
    const finish = () => { if (ended) return; ended = true; swap(); transition?.skipTransition(); clear(); setBusy(false); };
    pending.current = { finish, cancel: () => { ended = true; transition?.skipTransition(); clear(); } };
    setBusy(true);
    root.dataset.themeTransition = reduced ? "fade" : "corruption";
    root.style.setProperty("--ember-transition-duration", `${duration}ms`);

    // The corruption is a plain overlay: the swap happens while the obsidian
    // covers the screen (52%). Only the reduced-motion fade uses a snapshot.
    if (reduced && typeof document.startViewTransition === "function" && !document.hidden) {
      try {
        transition = document.startViewTransition(() => { if (!ended) swap(); });
        void transition.ready.catch(() => { /* A skipped snapshot still applies the selection. */ });
        void transition.finished.then(finish, finish);
      } catch { swap(); }
    } else swapTimer = setTimeout(swap, Math.round(duration * (reduced ? .45 : .52)));
    // Also recovers a skipped/unsupported snapshot or a backgrounded transition.
    endTimer = setTimeout(finish, duration + (transition ? 250 : 0));
  }

  const normalLabel = `Switch to ${theme === "light" ? "dark" : "light"} theme`;
  const emberLabel = theme === "ember" ? "Turn off ember theme" : "Turn on ember theme";
  return <div className="theme-controls" role="group" aria-label="Appearance" aria-busy={busy}>
    <button type="button" className="icon-button theme-toggle" disabled={busy} onClick={() => select(theme === "light" ? "dark" : "light")} aria-label={normalLabel} title={normalLabel}><Sun className="theme-sun" size={19} aria-hidden="true" /><Moon className="theme-moon" size={19} aria-hidden="true" /></button>
    <button type="button" className="icon-button ember-toggle" disabled={busy} onClick={() => select(theme === "ember" ? previous.current : "ember")} aria-pressed={theme === "ember"} aria-label={emberLabel} title={emberLabel}
      data-drip={drip}
      onPointerEnter={startDrip}
      onPointerLeave={(event) => { if (!event.currentTarget.matches(":focus-visible")) endDrip(); }}
      onFocus={(event) => { if (event.currentTarget.matches(":focus-visible")) startDrip(); }}
      onBlur={endDrip}>
      <svg className="ember-drop" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M12 2.2c-.6 1.6-6.4 8.7-6.4 13.1a6.4 6.4 0 0 0 12.8 0C18.4 10.9 12.6 3.8 12 2.2Z" />
        <path className="ember-drop-shine" d="M8.9 14.6a3.4 3.4 0 0 0 2.4 3.6" />
      </svg>
      <span className="ember-drip" aria-hidden="true" />
      <canvas ref={corrupt} className="ember-corrupt" aria-hidden="true" />
    </button>
    <span className="sr-only" role="status">{busy ? "Changing appearance" : theme === "ember" ? "Ember theme enabled" : `${theme === "light" ? "Light" : "Dark"} theme enabled`}</span>
  </div>;
}
