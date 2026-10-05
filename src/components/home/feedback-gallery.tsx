"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import Folder from "../motion/folder";
import { customerFeedback, type CustomerFeedbackImage } from "@/lib/customer-feedback";
import "./feedback-gallery.css";

function FeedbackPhoto({ photo, preview = false }: { photo: CustomerFeedbackImage; preview?: boolean }) {
  const [failed, setFailed] = useState(false);
  return failed ? <span className="feedback-image-error">Image unavailable. Please try again later.</span> : <img src={photo.src} alt={preview ? "" : photo.alt} width={photo.width} height={photo.height} loading={preview ? "lazy" : "eager"} decoding="async" onError={() => setFailed(true)} />;
}

function keepGalleryFocus(event: KeyboardEvent<HTMLDialogElement>) {
  if (event.key !== "Tab" || event.altKey || event.ctrlKey || event.metaKey) return;
  const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
  if (!buttons.length) return;
  event.preventDefault();
  const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
  const next = event.shiftKey ? (current <= 0 ? buttons.length - 1 : current - 1) : (current + 1) % buttons.length;
  buttons[next].focus();
}

export default function FeedbackGallery() {
  const [opening, setOpening] = useState(false);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const photoButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const lastPhoto = useRef<number | null>(null);

  useEffect(() => {
    if (!opening) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const reveal = () => { setOpen(true); setOpening(false); };
    const timer = window.setTimeout(reveal, media.matches ? 0 : 420);
    const sync = () => { if (media.matches) { window.clearTimeout(timer); reveal(); } };
    media.addEventListener("change", sync);
    return () => { window.clearTimeout(timer); media.removeEventListener("change", sync); };
  }, [opening]);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const element = dialog.current;
    const overflow = document.body.style.overflow;
    element?.showModal();
    closeButton.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = overflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (selected === null && lastPhoto.current !== null) photoButtons.current[lastPhoto.current]?.focus();
    else if (selected !== null && lastPhoto.current === null) closeButton.current?.focus();
    lastPhoto.current = selected;
  }, [selected, open]);

  function close() { setOpen(false); setOpening(false); setSelected(null); lastPhoto.current = null; }

  if (!customerFeedback.length) return null;
  return <section className="feedback-proof" aria-labelledby="feedback-proof-heading">
    <div className="feedback-proof-copy">
      <h2 id="feedback-proof-heading">Customer Feedback</h2>
      <p>Real messages from our customers. Open the folder to take a look.</p>
      <span>{customerFeedback.length} customer screenshots</span>
    </div>
    <Folder open={opening || open} onClick={() => { if (!opening && !open) setOpening(true); }} label="View All Feedback" controls="feedback-gallery" items={customerFeedback.slice(0, 3).map(photo => <FeedbackPhoto key={photo.id} photo={photo} preview />)} />

    <dialog id="feedback-gallery" ref={dialog} className="feedback-gallery-dialog" aria-labelledby="feedback-gallery-heading" onKeyDown={event => {
      keepGalleryFocus(event);
      if (selected !== null && (event.key === "ArrowRight" || event.key === "ArrowLeft")) {
        event.preventDefault();
        setSelected((selected + (event.key === "ArrowRight" ? 1 : -1) + customerFeedback.length) % customerFeedback.length);
      }
    }} onCancel={event => { event.preventDefault(); if (selected !== null) setSelected(null); else close(); }} onClick={event => { if (event.target === event.currentTarget) { const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close(); } }}>
      <div className="feedback-gallery-shell">
        <header className="feedback-gallery-header">
          <div><h2 id="feedback-gallery-heading">Customer Feedback</h2><p>{selected === null ? "Select an image to read the full message." : `Screenshot ${selected + 1} of ${customerFeedback.length}`}</p></div>
          <button ref={closeButton} type="button" className="feedback-gallery-close" aria-label="Close feedback gallery" onClick={close}><X size={22} aria-hidden="true" /></button>
        </header>
        {open && (selected === null ? <div className="feedback-image-grid">
          {customerFeedback.map((photo, index) => <button key={photo.id} ref={element => { photoButtons.current[index] = element; }} type="button" className="feedback-image-card" aria-label={`Enlarge customer feedback screenshot ${index + 1}`} onClick={() => setSelected(index)}>
            <span className="feedback-image-frame"><FeedbackPhoto photo={photo} /></span><span className="feedback-image-label">Screenshot {index + 1}<span>View image <ArrowRight size={16} aria-hidden="true" /></span></span>
          </button>)}
        </div> : <div className="feedback-image-viewer">
          <div className="feedback-viewer-controls">
            <button type="button" onClick={() => setSelected(null)}><ArrowLeft size={17} aria-hidden="true" /> All feedback</button>
            {customerFeedback.length > 1 && <div><button type="button" aria-label="Previous feedback image" onClick={() => setSelected((selected - 1 + customerFeedback.length) % customerFeedback.length)}><ArrowLeft size={20} aria-hidden="true" /></button><button type="button" aria-label="Next feedback image" onClick={() => setSelected((selected + 1) % customerFeedback.length)}><ArrowRight size={20} aria-hidden="true" /></button></div>}
          </div>
          <p className="sr-only" aria-live="polite">Screenshot {selected + 1} of {customerFeedback.length}</p>
          <div className="feedback-full-image" key={customerFeedback[selected].id}><FeedbackPhoto photo={customerFeedback[selected]} /></div>
        </div>)}
      </div>
    </dialog>
    <noscript><div className="feedback-noscript">{customerFeedback.map((photo, index) => <a key={photo.id} href={photo.src}>View customer feedback screenshot {index + 1}</a>)}</div></noscript>
  </section>;
}
