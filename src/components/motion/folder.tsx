"use client";

import { useEffect, useRef, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import "./folder.css";

type FolderProps = {
  items: ReactNode[];
  open: boolean;
  onClick: () => void;
  label: string;
  controls: string;
};

// Adapted from the supplied React Bits JavaScript + CSS Folder component.
// Keep its three-paper fan and front tilt; use a native button and CSS values
// for pointer movement so moving the mouse does not re-render the gallery.
export default function Folder({ items, open, onClick, label, controls }: FolderProps) {
  const button = useRef<HTMLButtonElement>(null);
  const reducedMotion = useRef(true);
  const papers = Array.from({ length: 3 }, (_, index) => items[index] ?? null);

  function resetOffsets() {
    button.current?.querySelectorAll<HTMLElement>(".folder-paper").forEach(element => {
      element.style.setProperty("--magnet-x", "0px");
      element.style.setProperty("--magnet-y", "0px");
    });
  }

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => { reducedMotion.current = media.matches; resetOffsets(); };
    sync();
    media.addEventListener("change", sync);
    document.addEventListener("visibilitychange", resetOffsets);
    return () => {
      media.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", resetOffsets);
    };
  }, []);

  function movePaper(event: PointerEvent<HTMLSpanElement>) {
    if (reducedMotion.current || event.pointerType !== "mouse" || document.hidden) return;
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--magnet-x", `${Math.max(-8, Math.min(8, (event.clientX - rect.left - rect.width / 2) * .15))}px`);
    event.currentTarget.style.setProperty("--magnet-y", `${Math.max(-8, Math.min(8, (event.clientY - rect.top - rect.height / 2) * .15))}px`);
  }

  return <button ref={button} type="button" className="feedback-folder-trigger" aria-haspopup="dialog" aria-controls={controls} aria-expanded={open} onClick={onClick} onPointerLeave={resetOffsets} onPointerCancel={resetOffsets}>
    <span className="feedback-folder-stage" aria-hidden="true">
      <span className={`feedback-folder${open ? " is-open" : ""}`}>
        <span className="folder-back">
          {papers.map((item, index) => <span key={index} className={`folder-paper folder-paper-${index + 1}`} style={{ "--magnet-x": "0px", "--magnet-y": "0px" } as CSSProperties} onPointerMove={movePaper}>
            <span className="folder-paper-content">{item}</span>
          </span>)}
          <span className="folder-front" /><span className="folder-front folder-front-right" />
        </span>
      </span>
    </span>
    <span className="feedback-folder-label">{label}</span>
  </button>;
}
