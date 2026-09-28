"use client";

import Link from "next/link";
import { ArrowDown, ArrowUpRight, Cookie, Droplets, MapPin, Sparkles, Usb } from "lucide-react";

const categories = [
  { name: "Tech essentials", note: "For your everyday connections.", label: "PLUG INTO YOUR DAY", className: "hero-category-tech", Icon: Usb },
  { name: "Motor care", note: "For the road ahead.", label: "KEEP THINGS MOVING", className: "hero-category-motor", Icon: Droplets },
  { name: "Signature treats", note: "For your little snack breaks.", label: "A LITTLE HOMEMADE JOY", className: "hero-category-treats", Icon: Cookie },
];

export default function Hero() {
  function spotlight(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const box = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--mx", `${event.clientX - box.left}px`);
    event.currentTarget.style.setProperty("--my", `${event.clientY - box.top}px`);
  }

  return (
    <section id="home" className="hero-section section-wrap" aria-labelledby="hero-heading">
      <div className="hero-copy" data-reveal>
        <span className="eyebrow"><Sparkles size={16} aria-hidden="true" /> A LITTLE BIT OF EVERYTHING YOU LOVE</span>
        <h1 id="hero-heading">Tech Essentials, <span className="hero-heading-accent">Performance Engine Oils</span> &amp; Signature Treats.</h1>
        <p className="hero-subtitle">Curated quality essentials dispatched locally from Besut, Terengganu.</p>
        <div className="hero-actions">
          <Link href="#shop" className="button button-dark hero-button">Explore Catalog <ArrowUpRight size={19} aria-hidden="true" /></Link>
          <Link href="#about" className="underlined-link">Meet Moon Store <ArrowUpRight size={17} aria-hidden="true" /></Link>
        </div>
        <p className="hero-local-note"><MapPin size={16} aria-hidden="true" /> From Kampong Raja, with a little Moon magic.</p>
      </div>

      <div className="hero-visual hero-spotlight" data-reveal onPointerMove={spotlight}>
        <div className="hero-visual-header"><span className="eyebrow">THE MOON MIX</span><Sparkles size={24} aria-hidden="true" /></div>
        <div className="hero-category-stack">
          {categories.map(({ name, note, label, className, Icon }) => (
            <Link href="#shop" className={`hero-category ${className}`} key={name} aria-label={`Explore ${name.toLowerCase()} in the catalog`}>
              <span className="hero-category-icon"><Icon size={48} strokeWidth={1.6} aria-hidden="true" /></span>
              <div className="hero-category-copy"><span className="hero-category-label">{label}</span><h2>{name}</h2><p>{note}</p></div>
              <ArrowUpRight className="hero-category-arrow" size={23} aria-hidden="true" />
            </Link>
          ))}
        </div>
        <div className="hero-visual-bottom"><span>Different essentials. One friendly store.</span><span className="hero-edition">BESUT, TERENGGANU</span></div>
      </div>

      <a className="hero-bottom-note" href="#shop"><ArrowDown size={15} aria-hidden="true" /> YOUR EVERYDAY FINDS START HERE</a>
    </section>
  );
}
