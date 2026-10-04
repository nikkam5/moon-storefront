"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import "./decrypted-text.css";

type Props = {
  text: string;
  speed?: number;
  maxIterations?: number;
  sequential?: boolean;
  revealDirection?: "start" | "end" | "center";
  useOriginalCharsOnly?: boolean;
  characters?: string;
  className?: string;
  parentClassName?: string;
  encryptedClassName?: string;
  animateOn?: "view" | "hover" | "inViewHover" | "click";
  clickMode?: "once" | "toggle";
};

const defaultCharacters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&";

export default function DecryptedText({ text, speed = 50, maxIterations = 10, sequential = false, revealDirection = "start", useOriginalCharsOnly = false, characters = defaultCharacters, className = "", parentClassName = "", encryptedClassName = "", animateOn = "hover", clickMode = "once" }: Props) {
  const container = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const played = useRef(false);
  const running = useRef(false);
  const decrypted = useRef(animateOn !== "click");
  const original = useMemo(() => Array.from(text), [text]);
  const pool = useMemo(() => {
    const result = useOriginalCharsOnly ? [...new Set(original.filter((char) => /\S/.test(char)))] : Array.from(characters);
    return result.length ? result : Array.from(defaultCharacters);
  }, [useOriginalCharsOnly, original, characters]);
  const [display, setDisplay] = useState(original);
  const [revealed, setRevealed] = useState<Set<number>>(new Set(original.map((_, index) => index)));

  const stop = useCallback(() => { if (timer.current) clearInterval(timer.current); timer.current = null; running.current = false; }, []);
  const order = useMemo(() => {
    const indices = original.map((_, index) => index).filter((index) => /\S/.test(original[index]));
    if (revealDirection === "end") return indices.reverse();
    if (revealDirection === "center") return indices.sort((a, b) => Math.abs(a - (original.length - 1) / 2) - Math.abs(b - (original.length - 1) / 2));
    return indices;
  }, [original, revealDirection]);
  const scramble = useCallback((locked: Set<number>) => original.map((char, index) => /\S/.test(char) && !locked.has(index) ? pool[Math.floor(Math.random() * pool.length)] : char), [original, pool]);

  const play = useCallback(() => {
    if (running.current || document.hidden || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    stop();
    running.current = true;
    let iteration = 0;
    const locked = new Set<number>();
    setRevealed(new Set());
    setDisplay(scramble(locked));
    decrypted.current = false;
    timer.current = setInterval(() => {
      iteration++;
      if (sequential && order[iteration - 1] !== undefined) locked.add(order[iteration - 1]);
      if ((sequential && locked.size >= order.length) || (!sequential && iteration >= maxIterations)) {
        stop();
        setDisplay(original);
        setRevealed(new Set(original.map((_, index) => index)));
        decrypted.current = true;
      } else {
        setDisplay(scramble(locked));
        setRevealed(new Set(locked));
      }
    }, Math.max(16, speed));
  }, [maxIterations, order, original, scramble, sequential, speed, stop]);

  useEffect(() => {
    if (animateOn !== "view" && animateOn !== "inViewHover") return;
    const node = container.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !played.current) { played.current = true; play(); observer.disconnect(); }
    }, { threshold: .15 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [animateOn, play]);

  useEffect(() => {
    stop();
    setDisplay(original);
    setRevealed(new Set(original.map((_, index) => index)));
    played.current = false;
    decrypted.current = animateOn !== "click";
    const resetToText = () => { stop(); setDisplay(original); setRevealed(new Set(original.map((_, index) => index))); decrypted.current = true; };
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const motionChange = () => { if (media.matches) resetToText(); };
    const visibilityChange = () => { if (document.hidden) resetToText(); };
    media.addEventListener("change", motionChange);
    document.addEventListener("visibilitychange", visibilityChange);
    return () => {
      stop();
      media.removeEventListener("change", motionChange);
      document.removeEventListener("visibilitychange", visibilityChange);
    };
  }, [original, animateOn, stop]);

  function reset() { stop(); setDisplay(original); setRevealed(new Set(original.map((_, index) => index))); decrypted.current = true; }

  let index = 0;
  const visual = text.match(/\S+|\s+/g)?.map((part, partIndex) => {
    if (/^\s+$/.test(part)) { index += part.length; return <span key={partIndex}>{part}</span>; }
    const chars = Array.from(part).map((char) => {
      const i = index++;
      return <span key={i} className={`decrypted-text__char ${revealed.has(i) ? className : encryptedClassName}`.trim()}><span className="decrypted-text__measure">{char}</span><span className="decrypted-text__glyph">{display[i] ?? char}</span></span>;
    });
    return <span key={partIndex} className="decrypted-text__word">{chars}</span>;
  });

  return <motion.span ref={container} className={`decrypted-text ${parentClassName}`.trim()} onMouseEnter={() => { if (animateOn === "hover" || (animateOn === "inViewHover" && played.current)) play(); }} onMouseLeave={() => { if (animateOn === "hover" || animateOn === "inViewHover") reset(); }} onClick={() => { if (animateOn !== "click") return; if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { reset(); return; } if (clickMode === "toggle" && decrypted.current) { stop(); setDisplay(scramble(new Set())); setRevealed(new Set()); decrypted.current = false; } else if (clickMode === "toggle" || !played.current) { played.current = true; play(); } }} aria-label={text}>
    <span className="sr-only">{text}</span><span aria-hidden="true">{visual}</span>
  </motion.span>;
}
