"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Mail, MapPin, MessageCircle, Phone, Sparkles } from "lucide-react";
import BrandLogo from "./brand-logo";
import { business } from "@/lib/business";

const quickLinks = [
  { href: "/#home", label: "Home" },
  { href: "/#shop", label: "Explore catalog" },
  { href: "/#about", label: "Our story" },
  { href: "/#contact", label: "Get in touch" },
];

export default function Footer() {
  const pathname = usePathname();
  function spotlight(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const box = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--fx", `${event.clientX - box.left}px`);
    event.currentTarget.style.setProperty("--fy", `${event.clientY - box.top}px`);
  }

  if (pathname === "/product/popia-nestum" || pathname === "/product/honey-cornflakes") return null;

  return (
    <footer className="site-footer">
      <div className="footer-banner footer-spotlight" data-reveal data-fade-both onPointerMove={spotlight}>
        <span className="footer-banner-ambient" aria-hidden="true" />
        <div><span className="eyebrow"><Sparkles size={16} aria-hidden="true" /> YOUR EVERYDAY, WITH A LITTLE EXTRA</span><h2>See something you like?<br />Let’s make it a conversation.</h2></div>
        <a href={business.whatsapp} target="_blank" rel="noopener noreferrer" className="button button-dark"><MessageCircle size={18} aria-hidden="true" /> Chat on WhatsApp <span className="button-icon"><ArrowUpRight size={16} aria-hidden="true" /></span><span className="sr-only"> (opens in a new tab)</span></a>
      </div>
      <div className="footer-top" data-reveal>
        <div className="footer-brand">
          <BrandLogo className="footer-logo" />
          <p>Tech for your day. Care for your ride.<br />Treats for your happy little moments.</p>
          <span className="footer-local"><MapPin size={16} aria-hidden="true" /> Locally fulfilled in Kampong Raja, Besut.</span>
        </div>
        <nav className="footer-links" aria-label="Footer navigation">
          <h3>Take a look around</h3>
          {quickLinks.map((link) => <Link href={link.href} key={link.href}>{link.label}<ArrowUpRight size={15} aria-hidden="true" /></Link>)}
        </nav>
        <div className="footer-contact">
          <h3>Keep in touch</h3>
          <a href="tel:+601161647061"><Phone size={16} aria-hidden="true" />{business.phone}</a>
          <a href={`mailto:${business.email}`}><Mail size={16} aria-hidden="true" />{business.email}</a>
          <address>{business.address}</address>
          <p className="footer-hours">{business.hours}</p>
          <p className="footer-note">WhatsApp inquiries always open. Availability and delivery confirmed via chat; replies may not be immediate.</p>
        </div>
      </div>
      <div className="footer-bottom"><span>© {new Date().getFullYear()} {business.name}. All rights reserved.</span><span>Good finds. A little closer to home.</span><Link href="/#home">Back to top <ArrowUpRight size={15} aria-hidden="true" /></Link></div>
    </footer>
  );
}
