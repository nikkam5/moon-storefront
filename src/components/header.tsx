"use client";

import { ArrowUpRight, ShoppingBag } from "lucide-react";
import { useStore } from "./store-provider";
import BrandLogo from "./brand-logo";
import PillNav from "./pill-nav";
import ThemeToggle from "./theme-toggle";
import { business } from "@/lib/business";

export default function Header() {
  const { count, openCart } = useStore();
  return <>
    <div className="announcement"><span>Based in Kampong Raja, Besut</span><a href={business.whatsapp} target="_blank" rel="noopener noreferrer">Chat on WhatsApp <ArrowUpRight size={12} /></a></div>
    <header className="site-header"><div className="header-inner">
      <BrandLogo className="header-logo" />
      <PillNav />
      <div className="header-actions"><ThemeToggle /><button className="bag-button" onClick={openCart} aria-label={`Open cart, ${count} ${count === 1 ? "item" : "items"}`}><ShoppingBag size={19} /><span className="bag-label">Cart</span><span className="bag-count" aria-live="polite">{count}</span></button></div>
    </div></header>
  </>;
}
