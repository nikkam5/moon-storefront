"use client";

import { useEffect, useRef } from "react";
import CorruptionCurtain from "./corruption-curtain";

export default function EmberAtmosphere() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sync = () => {
      if (ref.current) ref.current.dataset.paused = String(document.hidden);
      document.documentElement.dataset.pageHidden = String(document.hidden);
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);
  return <>
    <div ref={ref} className="ember-atmosphere" aria-hidden="true">
      <div className="ember-aura ember-aura-left" /><div className="ember-aura ember-aura-right" />
      <div className="ember-fractures" />
      <div className="ember-sparks">{Array.from({ length: 12 }, (_, i) => <i key={i} style={{ left: `${(i * 37 + 3) % 100}%`, animationDelay: `${-i * 1.7}s`, animationDuration: `${16 + i % 5 * 2}s` }} />)}</div>
    </div>
    <CorruptionCurtain />
  </>;
}
