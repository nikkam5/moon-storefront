'use client';

import { useEffect, useRef } from 'react';
import './shiny-text.css';

type ShinyTextProps = {
  text: string;
  color?: string;
  shineColor?: string;
  speed?: number;
  delay?: number;
  spread?: number;
  yoyo?: boolean;
  pauseOnHover?: boolean;
  direction?: 'left' | 'right';
  disabled?: boolean;
  className?: string;
};

// Dependency-free port of the React Bits ShinyText timing logic.
// The shine position is written straight to the DOM node (no re-renders),
// one rAF loop per instance, cleaned up on unmount.
const ShinyText = ({
  text,
  color = '#b5b5b5',
  shineColor = '#ffffff',
  speed = 2,
  delay = 0,
  spread = 120,
  yoyo = false,
  pauseOnHover = false,
  direction = 'left',
  disabled = false,
  className = '',
}: ShinyTextProps) => {
  const nodeRef = useRef<HTMLSpanElement | null>(null);
  const elapsedRef = useRef(0);
  const lastRef = useRef<number | null>(null);
  const pausedRef = useRef(false);
  const playbackRef = useRef<() => void>(() => {});
  const dirRef = useRef(direction === 'left' ? 1 : -1);
  const settingsRef = useRef({ disabled, speed, delay, yoyo });
  settingsRef.current = { disabled, speed, delay, yoyo };

  const paint = (p: number) => {
    nodeRef.current?.style.setProperty('background-position', `${150 - p * 2}% center`);
  };

  useEffect(() => {
    dirRef.current = direction === 'left' ? 1 : -1;
    elapsedRef.current = 0;
    lastRef.current = null;
    paint(0);
  }, [direction]);

  useEffect(() => {
    let raf = 0;
    let visible = false;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const hero = nodeRef.current?.closest('.hero-section');
    const canPlay = () => !settingsRef.current.disabled && !pausedRef.current && visible && !document.hidden && !motion.matches && !hero?.classList.contains('hero-exit');
    const syncPlayback = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      lastRef.current = null;
      if (motion.matches) paint(50);
      else if (canPlay()) raf = requestAnimationFrame(loop);
    };
    playbackRef.current = syncPlayback;
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      syncPlayback();
    });
    if (nodeRef.current) observer.observe(nodeRef.current);
    const loop = (time: number) => {
      raf = 0;
      const s = settingsRef.current;
      if (!canPlay()) {
        lastRef.current = null;
        return;
      }
      if (lastRef.current === null) {
        lastRef.current = time;
        raf = requestAnimationFrame(loop);
        return;
      }
      const delta = time - lastRef.current;
      lastRef.current = time;
      elapsedRef.current += delta;

      const animationDuration = Math.max(1, s.speed * 1000);
      const delayDuration = Math.max(0, s.delay * 1000);
      const forward = dirRef.current === 1;
      let p: number;
      if (s.yoyo) {
        const cycle = animationDuration + delayDuration;
        const t = elapsedRef.current % (cycle * 2);
        if (t < animationDuration) p = (t / animationDuration) * 100;
        else if (t < cycle) p = 100;
        else if (t < cycle + animationDuration) p = 100 - ((t - cycle) / animationDuration) * 100;
        else p = 0;
        p = forward ? p : 100 - p;
      } else {
        const cycle = animationDuration + delayDuration;
        const t = elapsedRef.current % cycle;
        p = t < animationDuration ? (t / animationDuration) * 100 : 100;
        p = forward ? p : 100 - p;
      }
      paint(p);
      raf = requestAnimationFrame(loop);
    };
    document.addEventListener('visibilitychange', syncPlayback);
    motion.addEventListener('change', syncPlayback);
    const curtain = hero ? new MutationObserver(syncPlayback) : null;
    if (hero) curtain?.observe(hero, { attributes: true, attributeFilter: ['class'] });
    syncPlayback();
    return () => {
      cancelAnimationFrame(raf);
      playbackRef.current = () => {};
      observer.disconnect();
      curtain?.disconnect();
      document.removeEventListener('visibilitychange', syncPlayback);
      motion.removeEventListener('change', syncPlayback);
    };
  }, []);

  useEffect(() => { playbackRef.current(); }, [disabled]);
  useEffect(() => {
    if (!pauseOnHover) { pausedRef.current = false; playbackRef.current(); }
  }, [pauseOnHover]);

  return (
    <span
      ref={nodeRef}
      className={`shiny-text ${className}`.trim()}
      style={{
        backgroundImage: `linear-gradient(${spread}deg, ${color} 0%, ${color} 38%, ${shineColor} 50%, ${color} 62%, ${color} 100%)`,
      }}
      onMouseEnter={() => {
        if (pauseOnHover) { pausedRef.current = true; playbackRef.current(); }
      }}
      onMouseLeave={() => {
        if (pauseOnHover) { pausedRef.current = false; playbackRef.current(); }
      }}
    >
      {text}
    </span>
  );
};

export default ShinyText;
