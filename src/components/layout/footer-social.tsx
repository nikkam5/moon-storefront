"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Facebook01Icon, InstagramIcon, WhatsappIcon } from "@hugeicons/core-free-icons";
import { business } from "@/lib/business";
import SlingButton from "../motion/sling-button";
import "./footer-social.css";

const socials = [
  { label: "Facebook", href: business.facebook, icon: Facebook01Icon },
  { label: "Instagram", href: business.instagram, icon: InstagramIcon },
  { label: "WhatsApp", href: business.whatsapp, icon: WhatsappIcon },
];

export default function FooterSocial() {
  return <nav className="footer-social" aria-label="Moon Store social links">{socials.map(({ label, href, icon }) => <SlingButton key={label} href={href} ariaLabel={`${label} (opens in a new tab)`} padColor="var(--social-pad)" iconColor="var(--social-icon)" accentColor="var(--social-accent)" wellColor="var(--social-well)" bandColor="var(--social-band)" size={48} strokeWidth={2} armAt={38} maxPull={120} flight={70} particles={10} tapSends><HugeiconsIcon icon={icon} size={23} strokeWidth={1.8} aria-hidden="true" /></SlingButton>)}</nav>;
}
