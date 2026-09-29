"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu, ShoppingBag, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useStore } from "./store-provider";
import BrandLogo from "./brand-logo";
import ThemeToggle from "./theme-toggle";
import { business } from "@/lib/business";

export default function Header() {
  const { count, openCart } = useStore();
  const path = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const header = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => setMobileOpen(false), [path]);
  useEffect(() => {
    if (!mobileOpen) return;
    const closeOutside = (event: PointerEvent) => { if (!header.current?.contains(event.target as Node)) setMobileOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setMobileOpen(false); menuButton.current?.focus(); } };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", closeOutside); document.removeEventListener("keydown", escape); };
  }, [mobileOpen]);
  return <>
    <div className="announcement"><span>Local roots. Everyday good finds.</span><a href={business.whatsapp} target="_blank" rel="noopener noreferrer">Chat on WhatsApp <ArrowUpRight size={12} /></a></div>
    <header className="site-header" ref={header}><div className="header-inner">
      <BrandLogo className="header-logo" />
      <nav id="main-navigation" className={`main-nav ${mobileOpen ? "nav-open" : ""}`} aria-label="Main navigation">{[["home", "Home"], ["shop", "Shop"], ["about", "Our story"], ["contact", "Contact"]].map(([id, label]) => <Link key={id} href={`/#${id}`} onClick={() => setMobileOpen(false)}>{label}</Link>)}</nav>
      <div className="header-actions"><ThemeToggle /><button className="bag-button" onClick={() => { setMobileOpen(false); openCart(); }} aria-label={`Open cart, ${count} ${count === 1 ? "item" : "items"}`}><ShoppingBag size={19} /><span className="bag-label">Cart</span><span className="bag-count" aria-live="polite">{count}</span></button><button ref={menuButton} className="icon-button mobile-menu" aria-label={mobileOpen ? "Close menu" : "Open menu"} aria-controls="main-navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <X /> : <Menu />}</button></div>
    </div></header>
  </>;
}
