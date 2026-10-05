"use client";

import { useState, type FormEvent } from "react";
import { ArrowUpRight, MessageCircle } from "lucide-react";
import BorderGlow from "../motion/border-glow";
import PeekRating from "../motion/peek-rating";
import TextType from "../motion/text-type";
import FeedbackGallery from "./feedback-gallery";
import { business } from "@/lib/business";
import "./customer-feedback.css";

export default function CustomerFeedback() {
  const [rating, setRating] = useState(0);
  const [error, setError] = useState("");

  function prepareFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const name = String(fields.get("name") || "").trim();
    const feedback = String(fields.get("feedback") || "").trim();
    if (!feedback) {
      setError("Please write your feedback before continuing.");
      return;
    }
    setError("");
    const message = [
      "Hello Moon Store, I’d like to share some feedback:",
      "",
      name ? `Name: ${name}` : "Name: Anonymous",
      ...(rating ? [`Rating: ${rating}/5`] : []),
      `Feedback: ${feedback}`,
    ].join("\n");
    window.open(`${business.whatsapp}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  return <section id="feedback" className="customer-feedback section-wrap" aria-labelledby="feedback-heading">
    <FeedbackGallery />
    <div className="customer-feedback-layout">
      <div className="customer-feedback-intro">
        <span className="feedback-eyebrow">MOON STORE / CUSTOMER FEEDBACK</span>
        <TextType as="h2" id="feedback-heading" text="Your voice makes us better." typingSpeed={75} initialDelay={150} pauseDuration={1500} showCursor cursorCharacter="|" cursorClassName="feedback-heading-cursor" startOnVisible loop={false} />
        <p>Tried something from Moon Store? Tell us what you loved or what we can improve. We read every message.</p>
        <span className="feedback-signoff">A little note from you. A better store for everyone.</span>
      </div>
      <BorderGlow className="feedback-glow" borderRadius={20} glowRadius={28} glowIntensity={.5} glowColor="268 35 67" colors={["var(--accent)", "var(--lilac)", "var(--accent)"]}>
        <form className="feedback-form" onSubmit={prepareFeedback}>
          <div className="feedback-form-heading"><span>SHARE YOUR THOUGHTS</span><MessageCircle size={22} aria-hidden="true" /></div>
          <label htmlFor="feedback-name">Your name <span>(optional)</span></label>
          <input id="feedback-name" name="name" autoComplete="name" maxLength={80} placeholder="What should we call you?" />
          <div className="feedback-rating-heading"><span id="feedback-rating-label">How was your experience? <small>(optional)</small></span><span aria-live="polite">{rating ? `${rating} / 5` : "Select a rating"}</span></div>
          <PeekRating
            className="feedback-rating"
            value={rating}
            onChange={setRating}
            count={5}
            shape="star"
            labels={["Poor", "Fair", "Good", "Great", "Superb"]}
            activeColor="var(--accent)"
            idleColor="#52525b"
            tipColor="#27272a"
            tipTextColor="#f5f5f5"
            size={32}
            lift={7}
            magnify={1.15}
            riseDuration={320}
            popScale={1.3}
            showTip
            allowClear
            ariaLabel="How was your experience? (optional)"
          />
          <label htmlFor="feedback-message">Your feedback</label>
          <textarea id="feedback-message" name="feedback" rows={5} maxLength={800} required placeholder="Tell us about your experience…" onChange={() => setError("")} aria-describedby={error ? "feedback-error" : undefined} />
          {error && <p id="feedback-error" className="feedback-error" role="alert">{error}</p>}
          <button type="submit" className="feedback-submit">Review in WhatsApp <ArrowUpRight size={19} aria-hidden="true" /></button>
          <p className="feedback-note">A WhatsApp draft will open. Review it and tap Send to share your feedback.</p>
        </form>
      </BorderGlow>
    </div>
  </section>;
}
