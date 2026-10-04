"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { gsap } from "gsap";
import "./depth-carousel.css";

type Props<T> = {
  items: readonly T[];
  renderCard: (item: T, focused: boolean) => ReactNode;
  getLabel: (item: T) => string;
  onChange?: (index: number) => void;
  cardWidth?: number;
  cardHeight?: number;
  depth?: number;
  spread?: number;
  tilt?: number;
  visibleCards?: number;
  blur?: number;
  duration?: number;
};

export default function DepthCarousel<T>({ items, renderCard, getLabel, onChange, cardWidth = 440, cardHeight = 330, depth = 165, spread = 78, tilt = 15, visibleCards = 3, blur = 2, duration = 650 }: Props<T>) {
  const root = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLDivElement | null)[]>([]);
  const position = useRef(0);
  const destination = useRef(0);
  const focused = useRef(0);
  const scale = useRef(1);
  const tween = useRef<gsap.core.Tween | null>(null);
  const pointer = useRef<{ x: number; id: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const clickTimer = useRef<number | null>(null);
  const transitioning = useRef(false);
  const [active, setActive] = useState(0);
  const [settled, setSettled] = useState(true);

  const layout = useCallback((pos: number) => {
    const count = items.length;
    if (!count) return;
    cards.current.forEach((card, index) => {
      if (!card) return;
      let distance = ((index - pos) % count + count) % count;
      if (distance > count / 2) distance -= count;
      const back = Math.max(0, distance);
      const opacity = distance < 0 ? Math.max(0, 1 + distance * 2) : distance > visibleCards ? 0 : 1;
      const x = spread * distance * scale.current;
      card.style.transform = `translate(-50%, -50%) translateX(${x.toFixed(2)}px) translateZ(${(-depth * back).toFixed(2)}px) rotateY(${(tilt * Math.min(back, 1)).toFixed(2)}deg) scale(${scale.current})`;
      card.style.opacity = String(opacity);
      card.style.filter = `brightness(${Math.max(.65, 1 - back * .18).toFixed(2)}) blur(${Math.min(blur, back * blur / visibleCards).toFixed(2)}px)`;
      card.style.zIndex = String(Math.round(50 - distance * 10));
      // Receding cards may overlap the front portrait. Only the settled
      // focused card can receive hover/clicks, so transitions never fight.
      card.style.pointerEvents = !transitioning.current && index === focused.current && opacity > .6 ? "auto" : "none";
    });
  }, [items.length, depth, spread, tilt, visibleCards, blur]);

  function goTo(index: number) {
    const count = items.length;
    if (count < 2) return;
    const next = ((index % count) + count) % count;
    if (next === focused.current) return;
    let delta = next - focused.current;
    if (delta > count / 2) delta -= count;
    if (delta < -count / 2) delta += count;
    tween.current?.kill();
    transitioning.current = true;
    setSettled(false);
    focused.current = next;
    setActive(next);
    onChange?.(next);
    destination.current += delta;
    layout(position.current);
    const proxy = { p: position.current };
    tween.current = gsap.to(proxy, {
      p: destination.current,
      duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : duration / 1000,
      ease: "power3.out",
      onUpdate: () => { position.current = proxy.p; layout(proxy.p); },
      onComplete: () => { position.current = ((position.current % count) + count) % count; destination.current = focused.current; transitioning.current = false; setSettled(true); layout(position.current); },
    });
  }

  useEffect(() => {
    if (!root.current) return;
    const observer = new ResizeObserver(([entry]) => {
      scale.current = Math.min(1, Math.max(.5, (entry.contentRect.width - 32) / cardWidth));
      layout(position.current);
    });
    observer.observe(root.current);
    layout(position.current);
    return () => { observer.disconnect(); tween.current?.kill(); };
  }, [cardWidth, layout]);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const settle = () => { if (motion.matches || document.hidden) tween.current?.progress(1); };
    const cancelPointer = () => {
      const id = pointer.current?.id;
      pointer.current = null;
      if (id !== undefined && root.current?.hasPointerCapture(id)) root.current.releasePointerCapture(id);
    };
    const onVisibilityChange = () => { if (document.hidden) { cancelPointer(); settle(); } };
    motion.addEventListener("change", settle);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", cancelPointer);
    return () => {
      cancelPointer();
      if (clickTimer.current !== null) window.clearTimeout(clickTimer.current);
      motion.removeEventListener("change", settle);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", cancelPointer);
    };
  }, []);

  return <div ref={root} className="depth-carousel" role="group" aria-roledescription="carousel" aria-label="Moon Store team" tabIndex={0} onKeyDown={(event) => { if (event.key === "ArrowRight") { event.preventDefault(); goTo(focused.current + 1); } if (event.key === "ArrowLeft") { event.preventDefault(); goTo(focused.current - 1); } }} onPointerDown={(event) => { if (pointer.current || event.button !== 0 || (event.target as Element).closest("button, a, input")) return; pointer.current = { x: event.clientX, id: event.pointerId, moved: false }; }} onPointerMove={(event) => { const start = pointer.current; if (!start || start.id !== event.pointerId) return; if (Math.abs(event.clientX - start.x) > 14) { start.moved = true; if (!root.current?.hasPointerCapture(start.id)) root.current?.setPointerCapture(start.id); } }} onPointerUp={(event) => { const start = pointer.current; if (!start || start.id !== event.pointerId) return; pointer.current = null; if (!start.moved) return; suppressClick.current = true; if (root.current?.hasPointerCapture(start.id)) root.current.releasePointerCapture(start.id); goTo(focused.current + (event.clientX < start.x ? 1 : -1)); clickTimer.current = window.setTimeout(() => { suppressClick.current = false; clickTimer.current = null; }, 0); }} onPointerCancel={() => { pointer.current = null; }} onLostPointerCapture={() => { pointer.current = null; }}>
    <div className="depth-carousel__stage">
      {items.map((item, index) => <div key={getLabel(item)} ref={(element) => { cards.current[index] = element; }} className="depth-carousel__card" style={{ width: cardWidth, height: cardHeight }} aria-roledescription="slide" aria-label={`${getLabel(item)}, ${index + 1} of ${items.length}`} aria-hidden={active !== index} inert={active !== index || !settled} onClick={() => { if (!suppressClick.current && active !== index) goTo(index); }}>{renderCard(item, active === index && settled)}</div>)}
    </div>
    <div className="depth-carousel__controls"><button type="button" aria-label="Previous team member" onClick={() => goTo(focused.current - 1)}><ArrowLeft size={19} aria-hidden="true" /></button><span aria-live="polite">{String(active + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}</span><button type="button" aria-label="Next team member" onClick={() => goTo(focused.current + 1)}><ArrowRight size={19} aria-hidden="true" /></button></div>
    <div className="depth-carousel__dots" aria-label="Choose team member">{items.map((item, index) => <button type="button" key={getLabel(item)} aria-label={`View ${getLabel(item)}`} aria-pressed={active === index} className={active === index ? "is-active" : ""} onClick={() => goTo(index)} />)}</div>
  </div>;
}
