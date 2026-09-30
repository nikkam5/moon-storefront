"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";
import BrandLogo from "./brand-logo";
import FooterSocial from "./footer-social";
import { business } from "@/lib/business";

const quickLinks = [
  { href: "/#home", label: "Home" },
  { href: "/#shop", label: "Explore catalog" },
  { href: "/#about", label: "Our story" },
  { href: "/#feedback", label: "Customer feedback" },
];

export default function Footer() {
  const pathname = usePathname();
  if (pathname === "/product/popia-nestum" || pathname === "/product/honey-cornflakes" || pathname === "/product/motul-5100") return null;

  return (
    <footer className="site-footer">
      <div className="footer-top" data-reveal>
        <div className="footer-brand">
          <BrandLogo className="footer-logo" />
          <FooterSocial />
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
