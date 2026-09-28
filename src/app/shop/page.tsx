import type { Metadata } from "next";
import ShopCatalog from "@/components/shop-catalog";

export const metadata: Metadata = { title: "Shop the collection", description: "Kingston USB flash drives, Motul motorcycle oils and homemade snacks. Browse in RM and order with Moon Store on WhatsApp." };
export default function Shop() {
  return <section id="shop" className="section-wrap standalone-shop"><div className="section-heading"><div><span className="eyebrow">THE MOON STORE COLLECTION</span><h1>Everyday essentials.<br /><span className="text-accent">Unexpected good finds.</span></h1></div><p className="section-intro">Tech for your day. Care for your ride.<br />A treat for you. All in one place.</p></div><ShopCatalog /></section>;
}
