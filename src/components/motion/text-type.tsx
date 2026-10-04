"use client";

import { createElement, useEffect, useMemo, useRef, useState, type ElementType, type HTMLAttributes, type ReactNode } from "react";
import { gsap } from "gsap";
import "./text-type.css";

type Props = Omit<HTMLAttributes<HTMLElement>, "children"> & {
  text: string | string[];
  as?: ElementType;
  typingSpeed?: number;
  initialDelay?: number;
  pauseDuration?: number;
  deletingSpeed?: number;
  loop?: boolean;
  showCursor?: boolean;
  hideCursorWhileTyping?: boolean;
  cursorCharacter?: ReactNode;
  cursorClassName?: string;
  cursorBlinkDuration?: number;
  textColors?: string[];
  variableSpeed?: { min: number; max: number };
  onSentenceComplete?: (sentence: string, index: number) => void;
  startOnVisible?: boolean;
  reverseMode?: boolean;
};
type Playback = { index: number; characters: number; phase: "initial" | "typing" | "pause" | "deleting" | "done" };

// React Bits TextType, adapted for stable heading layout, SSR and reduced motion.
export default function TextType({ text, as: Component = "div", typingSpeed = 50, initialDelay = 0, pauseDuration = 2000, deletingSpeed = 30, loop = true, className = "", showCursor = true, hideCursorWhileTyping = false, cursorCharacter = "|", cursorClassName = "", cursorBlinkDuration = .5, textColors = [], variableSpeed, onSentenceComplete, startOnVisible = false, reverseMode = false, ...props }: Props) {
  const textKey = JSON.stringify(Array.isArray(text) ? text : [text]);
  const textArray = useMemo<string[]>(() => {
    const sentences: string[] = JSON.parse(textKey);
    return sentences.length ? sentences : [""];
  }, [textKey]);
  const processedTexts = useMemo(() => textArray.map((sentence) => {
    const characters = Array.from(sentence);
    return reverseMode ? characters.reverse() : characters;
  }), [textArray, reverseMode]);
  const [playback, setPlayback] = useState<Playback>({ index: 0, characters: 0, phase: "initial" });
  const [hydrated, setHydrated] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [started, setStarted] = useState(!startOnVisible);
  const [inView, setInView] = useState(false);
  const [tabVisible, setTabVisible] = useState(true);
  const containerRef = useRef<HTMLElement>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);
  const completeRef = useRef(onSentenceComplete);
  completeRef.current = onSentenceComplete;
  const index = Math.min(playback.index, textArray.length - 1);
  const characters = processedTexts[index];
  const staticText = !hydrated || reduced;
  const displayedText = staticText ? characters.join("") : characters.slice(0, playback.characters).join("");
  const typing = playback.phase === "initial" || playback.phase === "typing" || playback.phase === "deleting";
  const hideCursor = staticText || (hideCursorWhileTyping && typing);
  const minimumSpeed = variableSpeed?.min;
  const maximumSpeed = variableSpeed?.max;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const motionChange = () => setReduced(media.matches);
    const visibilityChange = () => setTabVisible(!document.hidden);
    motionChange();
    visibilityChange();
    setHydrated(true);
    media.addEventListener("change", motionChange);
    document.addEventListener("visibilitychange", visibilityChange);
    return () => {
      media.removeEventListener("change", motionChange);
      document.removeEventListener("visibilitychange", visibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    if (!("IntersectionObserver" in window)) { setInView(true); setStarted(true); return; }
    const observer = new IntersectionObserver(([entry]) => {
      setInView(entry.isIntersecting);
      if (entry.isIntersecting) setStarted(true);
    }, { threshold: .1 });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setPlayback({ index: 0, characters: 0, phase: "initial" });
  }, [textKey, reverseMode]);

  useEffect(() => {
    const cursor = cursorRef.current;
    if (!showCursor || !cursor || staticText || !inView || !tabVisible || (startOnVisible && !started)) return;
    const context = gsap.context(() => {
      gsap.set(cursor, { opacity: 1 });
      gsap.to(cursor, { opacity: 0, duration: Math.max(.1, cursorBlinkDuration), repeat: -1, yoyo: true, ease: "power2.inOut" });
    });
    return () => context.revert();
  }, [showCursor, staticText, inView, tabVisible, started, startOnVisible, cursorBlinkDuration]);

  useEffect(() => {
    if (!hydrated || reduced || !tabVisible || !inView || (startOnVisible && !started) || playback.phase === "done") return;
    let delay = typingSpeed;
    let advance: () => void;
    if (playback.phase === "initial") {
      delay = initialDelay;
      advance = () => setPlayback({ index, characters: 0, phase: "typing" });
    } else if (playback.phase === "pause") {
      delay = pauseDuration;
      advance = () => setPlayback({ ...playback, phase: "deleting" });
    } else if (playback.phase === "deleting") {
      delay = deletingSpeed;
      advance = () => {
        const remaining = Math.max(0, playback.characters - 1);
        setPlayback(remaining ? { index, characters: remaining, phase: "deleting" } : { index: (index + 1) % textArray.length, characters: 0, phase: "typing" });
      };
    } else {
      if (minimumSpeed !== undefined && maximumSpeed !== undefined) {
        const min = Math.max(0, Math.min(minimumSpeed, maximumSpeed));
        const max = Math.max(min, maximumSpeed, minimumSpeed);
        delay = min + Math.random() * (max - min);
      }
      advance = () => {
        const next = Math.min(characters.length, playback.characters + 1);
        const complete = next === characters.length;
        setPlayback({ index, characters: next, phase: complete ? !loop && index === textArray.length - 1 ? "done" : "pause" : "typing" });
        if (complete) completeRef.current?.(textArray[index], index);
      };
    }
    const timer = window.setTimeout(advance, Math.max(0, delay));
    return () => window.clearTimeout(timer);
  }, [hydrated, reduced, tabVisible, startOnVisible, started, inView, playback, index, characters, textArray, typingSpeed, initialDelay, pauseDuration, deletingSpeed, loop, minimumSpeed, maximumSpeed]);

  return createElement(Component, {
    ...props,
    ref: containerRef,
    className: `text-type ${className}`.trim(),
    "aria-label": props["aria-label"] ?? textArray.join(" "),
    "data-typing-state": staticText ? "static" : startOnVisible && !started ? "waiting" : playback.phase,
  },
  processedTexts.map((sentence, sentenceIndex) => <span key={sentenceIndex} className="text-type__measure" aria-hidden="true">{sentence.join("")}{showCursor && <span className={`text-type__cursor ${cursorClassName}`}>{cursorCharacter}</span>}</span>),
  <span className="text-type__line" aria-hidden="true"><span className="text-type__content" style={{ color: textColors.length ? textColors[index % textColors.length] : "inherit" }}>{displayedText}</span>{showCursor && <span ref={cursorRef} className={`text-type__cursor ${cursorClassName}${hideCursor ? " text-type__cursor--hidden" : ""}`}>{cursorCharacter}</span>}</span>);
}
