import type { Metadata } from "next";
import ShopCatalog from "@/components/catalog/shop-catalog";
import { siteUrl } from "@/lib/site";
import "@/components/catalog/shop-compact.css";

export const metadata: Metadata = { title: "Shop the collection", description: "Kingston USB flash drives, Motul motorcycle oils and homemade snacks. Browse in RM and order with Moon Store on WhatsApp.", alternates: siteUrl ? { canonical: "/shop" } : undefined };
export default function Shop() {
  return <section id="shop" className="section-wrap standalone-shop"><div className="section-heading"><div><h1>Shop the collection.</h1><p className="section-intro">Tech storage, motor care and homemade treats. Select an option, then order with our team on WhatsApp.</p></div></div><ShopCatalog /></section>;
}
