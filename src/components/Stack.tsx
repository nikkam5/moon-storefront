"use client";

import { animate, motion, useMotionValue, useReducedMotion, useTransform, type PanInfo } from "motion/react";
import { useCallback, useEffect, useImperativeHandle, useRef, useState, type ReactNode, type Ref } from "react";
import "./Stack.css";

type SpringConfig = { stiffness: number; damping: number };
export type StackHandle = { next: () => void };
type Props = {
  ref?: Ref<StackHandle>;
  randomRotation?: boolean;
  sensitivity?: number;
  cards?: ReactNode[];
  animationConfig?: SpringConfig;
  sendToBackOnClick?: boolean;
  autoplay?: boolean;
  autoplayDelay?: number;
  pauseOnHover?: boolean;
  mobileClickOnly?: boolean;
  mobileBreakpoint?: number;
  onChange?: (index: number) => void;
  ariaLabel?: string;
};

const defaultSpring = { stiffness: 260, damping: 20 };
const emptyCards: ReactNode[] = [];

function CardRotate({ children, onSendToBack, sensitivity, disableDrag, active, enableClick, animationConfig, index }: {
  children: ReactNode;
  onSendToBack: () => void;
  sensitivity: number;
  disableDrag: boolean;
  active: boolean;
  enableClick: boolean;
  animationConfig: SpringConfig;
  index: number;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-100, 100], [60, -60]);
  const rotateY = useTransform(x, [-100, 100], [-60, 60]);
  const dragged = useRef(false);

  function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    if (Math.abs(info.offset.x) > sensitivity || Math.abs(info.offset.y) > sensitivity) onSendToBack();
    animate(x, 0, { type: "spring", ...animationConfig });
    animate(y, 0, { type: "spring", ...animationConfig });
  }

  const clickable = active && enableClick;
  return <motion.div
    className={`stack-card-rotate${disableDrag ? " stack-card-rotate-disabled" : ""}`}
    style={{ x, y, rotateX: disableDrag ? 0 : rotateX, rotateY: disableDrag ? 0 : rotateY, zIndex: index, pointerEvents: active ? "auto" : "none" }}
    data-front={active}
    role={clickable ? "button" : undefined}
    aria-label={clickable ? "Show next featured product" : undefined}
    aria-hidden={!active}
    tabIndex={clickable ? 0 : -1}
    drag={!disableDrag && active}
    dragConstraints={{ top: 0, right: 0, bottom: 0, left: 0 }}
    dragElastic={.6}
    dragMomentum={false}
    whileTap={disableDrag ? undefined : { cursor: "grabbing" }}
    onPointerDown={() => { dragged.current = false; }}
    onDragStart={() => { dragged.current = true; }}
    onDragEnd={handleDragEnd}
    onClick={() => { if (clickable && !dragged.current) onSendToBack(); }}
    onKeyDown={(event) => {
      if (clickable && (event.key === "Enter" || event.key === " " || event.key === "ArrowRight")) {
        event.preventDefault();
        onSendToBack();
      }
    }}
  >{children}</motion.div>;
}

// React Bits Stack, adapted to TypeScript with stable card rotations,
// scoped CSS, keyboard controls and reduced-motion support.
export default function Stack({ ref: controlsRef, randomRotation = false, sensitivity = 200, cards = emptyCards, animationConfig = defaultSpring, sendToBackOnClick = false, autoplay = false, autoplayDelay = 3000, pauseOnHover = false, mobileClickOnly = false, mobileBreakpoint = 768, onChange, ariaLabel = "Featured products" }: Props) {
  const [isMobile, setIsMobile] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [order, setOrder] = useState(() => cards.map((_, index) => index).reverse());
  const [rotations, setRotations] = useState<number[]>([]);
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const top = order[order.length - 1];

  useEffect(() => {
    const mobile = window.matchMedia(`(max-width: ${mobileBreakpoint - 1}px)`);
    const update = () => setIsMobile(mobile.matches);
    update();
    mobile.addEventListener("change", update);
    return () => mobile.removeEventListener("change", update);
  }, [mobileBreakpoint]);

  useEffect(() => {
    setOrder(cards.map((_, index) => index).reverse());
    setRotations(cards.map(() => randomRotation ? Math.random() * 10 - 5 : 0));
  }, [cards, randomRotation]);

  useEffect(() => {
    if (top !== undefined) onChange?.(top);
    if (root.current?.contains(document.activeElement)) root.current.querySelector<HTMLElement>('[data-front="true"]')?.focus({ preventScroll: true });
  }, [top, onChange]);

  const sendToBack = useCallback((id?: number) => {
    setOrder((previous) => {
      const front = previous[previous.length - 1];
      if (previous.length < 2 || (id !== undefined && front !== id)) return previous;
      return [front, ...previous.slice(0, -1)];
    });
  }, []);
  useImperativeHandle(controlsRef, () => ({ next: () => sendToBack() }), [sendToBack]);

  useEffect(() => {
    if (!autoplay || !root.current) return;
    const observer = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting));
    observer.observe(root.current);
    return () => observer.disconnect();
  }, [autoplay]);

  useEffect(() => {
    if (!autoplay || cards.length < 2 || isPaused || !isVisible || reduced) return;
    const interval = window.setInterval(() => { if (!document.hidden) sendToBack(); }, autoplayDelay);
    return () => window.clearInterval(interval);
  }, [autoplay, autoplayDelay, cards.length, isPaused, isVisible, reduced, sendToBack]);

  const disableDrag = !!reduced || (mobileClickOnly && isMobile);
  const enableClick = sendToBackOnClick || (mobileClickOnly && isMobile);
  return <div
    ref={root}
    className="stack-container"
    role="group"
    aria-roledescription="carousel"
    aria-label={ariaLabel}
    onMouseEnter={() => { if (pauseOnHover) setIsPaused(true); }}
    onMouseLeave={() => { if (pauseOnHover) setIsPaused(false); }}
    onFocusCapture={() => { if (pauseOnHover) setIsPaused(true); }}
    onBlurCapture={(event) => { if (pauseOnHover && !event.currentTarget.contains(event.relatedTarget as Node | null)) setIsPaused(false); }}
  >
    {order.map((id, index) => <CardRotate key={id} index={index} active={id === top} onSendToBack={() => sendToBack(id)} sensitivity={sensitivity} disableDrag={disableDrag} enableClick={enableClick} animationConfig={animationConfig}>
      <motion.div
        className="stack-card"
        animate={{ rotateZ: reduced ? 0 : (order.length - index - 1) * 4 + (rotations[id] || 0), scale: 1 + index * .06 - order.length * .06, transformOrigin: "90% 90%" }}
        initial={false}
        transition={reduced ? { duration: 0 } : { type: "spring", ...animationConfig }}
      >{cards[id]}</motion.div>
    </CardRotate>)}
  </div>;
}
