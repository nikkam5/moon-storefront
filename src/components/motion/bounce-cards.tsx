"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { gsap } from "gsap";
import "./bounce-cards.css";

type BounceCardsProps = {
  items: { id: string; label: string; content: ReactNode }[];
  onSelect: (index: number) => void;
  controls: string;
  expanded: boolean;
  animationDelay?: number;
  animationStagger?: number;
  easeType?: string;
  enableHover?: boolean;
};

// Adapted from the supplied React Bits BounceCards component. Keep its elastic
// entrance and hover spread, with responsive offsets and native image buttons.
export default function BounceCards({ items, onSelect, controls, expanded, animationDelay = .18, animationStagger = .08, easeType = "elastic.out(1, 0.5)", enableHover = true }: BounceCardsProps) {
  const root = useRef<HTMLDivElement>(null);
  const interaction = useRef<(index: number | null, keyboard?: boolean) => void>(() => {});
  const syncActivity = useRef<() => void>(() => {});
  const suspended = useRef(expanded);
  const count = items.length;

  useEffect(() => {
    const element = root.current;
    if (!element || !count) return;
    const cards = Array.from(element.querySelectorAll<HTMLButtonElement>(".feedback-bounce-card"));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const hover = window.matchMedia("(hover: hover) and (pointer: fine)");
    let visible = false;
    let started = false;
    let finished = false;
    let spacing = 0;
    let push = 0;
    let entrance: gsap.core.Tween | null = null;
    let hoverTweens: gsap.core.Tween[] = [];
    const middle = (count - 1) / 2;
    const rotation = (index: number) => index % 2 ? -5 : 5;
    const baseLayer = (index: number) => index === Math.floor(middle) ? count + 1 : index + 1;

    function stopHover() {
      hoverTweens.forEach(tween => tween.kill());
      hoverTweens = [];
      delete element!.dataset.hovered;
    }

    function rest() {
      stopHover();
      cards.forEach((card, index) => gsap.set(card, { x: (index - middle) * spacing, rotation: rotation(index), zIndex: baseLayer(index) }));
    }

    function layout() {
      const width = element!.clientWidth;
      const cardWidth = cards[0].offsetWidth;
      spacing = Math.max(0, Math.min(96, width * .18, (width - cardWidth) / 2 - 28));
      push = Math.max(0, Math.min(74, (width - cardWidth) / 2 - spacing - 24));
      rest();
    }

    const context = gsap.context(() => {
      layout();
      entrance = gsap.fromTo(cards, { scale: 0 }, {
        scale: 1, duration: .8, delay: animationDelay, stagger: animationStagger,
        ease: easeType, paused: true,
        onComplete: () => { finished = true; element.dataset.animation = reduced.matches ? "static" : "ready"; },
      });
    }, element);

    function sync() {
      if (reduced.matches) {
        entrance?.progress(1).pause();
        finished = true;
        rest();
        element!.dataset.animation = "static";
      } else if (!visible || document.hidden || suspended.current) {
        entrance?.pause();
        rest();
        element!.dataset.animation = started || finished ? "paused" : "waiting";
      } else if (!finished) {
        element!.dataset.animation = "entering";
        if (!started) { started = true; entrance?.play(0); }
        else entrance?.resume();
      } else element!.dataset.animation = "ready";
    }

    interaction.current = (selected, keyboard = false) => {
      // Tabbing into the preview should never focus an invisible scaled card.
      if (keyboard && !finished) { entrance?.progress(1).pause(); finished = true; sync(); }
      if (!finished || !visible || suspended.current || document.hidden || reduced.matches || !enableHover || (!keyboard && !hover.matches)) return;
      stopHover();
      if (selected !== null) element.dataset.hovered = String(selected);
      cards.forEach((card, index) => {
        const offset = selected === null || selected === index ? 0 : index < selected ? -push : push;
        gsap.set(card, { zIndex: index === selected ? count + 5 : baseLayer(index) });
        hoverTweens.push(gsap.to(card, {
          x: (index - middle) * spacing + offset,
          rotation: index === selected ? 0 : rotation(index),
          duration: .4, ease: "back.out(1.4)", overwrite: "auto",
          delay: selected === null ? 0 : Math.abs(selected - index) * .05,
        }));
      });
    };
    syncActivity.current = sync;
    const resize = new ResizeObserver(layout);
    const viewport = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }, { threshold: .15 });
    resize.observe(element);
    viewport.observe(element);
    reduced.addEventListener("change", sync);
    hover.addEventListener("change", rest);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      resize.disconnect();
      viewport.disconnect();
      reduced.removeEventListener("change", sync);
      hover.removeEventListener("change", rest);
      document.removeEventListener("visibilitychange", sync);
      interaction.current = () => {};
      syncActivity.current = () => {};
      stopHover();
      context.revert();
    };
  }, [count, animationDelay, animationStagger, easeType, enableHover]);

  useEffect(() => { suspended.current = expanded; syncActivity.current(); }, [expanded]);

  return <div ref={root} className="feedback-bounce-cards" data-animation="waiting" onPointerLeave={() => interaction.current(null)} onPointerCancel={() => interaction.current(null)}>
    {items.map((item, index) => <button key={item.id} type="button" className="feedback-bounce-card" aria-label={item.label} aria-haspopup="dialog" aria-controls={controls} aria-expanded={expanded} style={{ "--bounce-offset": index - (count - 1) / 2, "--bounce-rotation": `${index % 2 ? -5 : 5}deg`, zIndex: index === Math.floor((count - 1) / 2) ? count + 1 : index + 1 } as CSSProperties} onPointerEnter={event => { if (event.pointerType === "mouse") interaction.current(index); }} onFocus={() => interaction.current(index, true)} onBlur={() => interaction.current(null)} onClick={() => onSelect(index)}>
      <span className="feedback-bounce-photo" aria-hidden="true">{item.content}</span>
    </button>)}
  </div>;
}
