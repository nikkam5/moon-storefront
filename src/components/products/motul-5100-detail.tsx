"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Bike, Check, Gauge, MessageCircle, Minus, Plus, ShieldCheck, ShoppingBag, Thermometer } from "lucide-react";
import { Inter, Montserrat } from "next/font/google";
import { business } from "@/lib/business";
import { readCatalogReturn } from "@/lib/catalog-return";
import { MAX_QUANTITY, money, type Product } from "@/lib/product";
import { useStore } from "../cart/store-provider";
import BorderGlow from "../motion/border-glow";
import "./motul-5100-detail.css";

const bodyFont = Inter({ subsets: ["latin"], variable: "--motul-body", display: "swap" });
const headingFont = Montserrat({ subsets: ["latin"], weight: ["700", "800", "900"], variable: "--motul-heading", display: "swap" });

const features = [
  { Icon: ShieldCheck, title: "Teknologi ester", description: "Campuran Technosynthese berasaskan ester untuk penjagaan enjin harian." },
  { Icon: Gauge, title: "JASO MA2", description: "Piawaian klac basah untuk motosikal yang memerlukan spesifikasi ini." },
  { Icon: Thermometer, title: "Gred SAE 10W-40", description: "Semak gred kelikatan yang disyorkan dalam manual motosikal anda." },
  { Icon: Bike, title: "Untuk perjalanan harian", description: "Sesuai untuk motosikal yang menyatakan gred dan piawaian ini dalam manual." },
];

type OrderField = "name" | "phone" | "location";
type OrderErrors = Partial<Record<OrderField, string>>;

export default function Motul5100Detail({ product }: { product: Product }) {
  const variant = product.variants[0];
  const [quantity, setQuantity] = useState(1);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [returnUrl, setReturnUrl] = useState("/shop");
  const [formErrors, setFormErrors] = useState<OrderErrors>({});
  const photos = product.images?.length ? product.images : product.image ? [product.image] : [];
  const photoLabels = ["10W-40 label", "4T label"];
  const { addMany, ready, items } = useStore();
  const inCart = items.find((item) => item.productId === product.id && item.variantId === variant.id)?.quantity ?? 0;
  const remaining = MAX_QUANTITY - inCart;

  useEffect(() => { setReturnUrl(readCatalogReturn()?.url || "/shop"); }, []);

  function clearFieldError(field: OrderField) {
    setFormErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function sendOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const name = String(fields.get("name") || "").trim();
    const phone = String(fields.get("phone") || "").trim();
    const location = String(fields.get("location") || "").trim();
    const errors: OrderErrors = {};
    if (!name) errors.name = "Sila isi nama penuh anda.";
    if (!phone) errors.phone = "Sila isi nombor WhatsApp anda.";
    else {
      const digits = phone.replace(/\D/g, "");
      if (!/^\+?[\d\s()-]+$/.test(phone) || digits.length < 7 || digits.length > 15) errors.phone = "Sila isi nombor telefon yang sah (7–15 digit).";
    }
    if (!location) errors.location = "Sila isi model motosikal dan lokasi penghantaran.";
    setFormErrors(errors);
    const firstInvalid = Object.keys(errors)[0] as OrderField | undefined;
    if (firstInvalid) {
      event.currentTarget.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${firstInvalid}"]`)?.focus();
      return;
    }
    const message = [
      "Salam Moon Store, saya ingin menempah Motul 5100 4T 10W-40.",
      "",
      `Nama: ${name}`,
      `No. telefon: ${phone}`,
      `Kuantiti: ${quantity} botol (1 Litre)`,
      `Jumlah produk: ${money(quantity * variant.price)}`,
      `Motosikal & lokasi: ${location}`,
      "",
      "Sila sahkan stok, kesesuaian dan pilihan penghantaran sebelum pesanan dimuktamadkan.",
    ].join("\n");
    window.open(`${business.whatsapp}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  return <div className={`motul-page ${bodyFont.variable} ${headingFont.variable}`} lang="ms">
    <nav className="motul-nav" aria-label="Navigasi produk Motul">
      <div className="motul-shell motul-nav-inner">
        <div className="motul-nav-brand"><span className="motul-mark">MOTUL</span><span className="motul-nav-sub">MOTOR CARE<br /><b>MOON STORE · BESUT</b></span></div>
        <div className="motul-nav-links"><a href="#kelebihan">KELEBIHAN</a><a href="#spesifikasi">SPESIFIKASI</a><a href="#tempah">TEMPAH</a></div>
        <a className="motul-nav-order" href="#tempah">BELI {money(variant.price)} <ArrowRight size={16} aria-hidden="true" /></a>
      </div>
    </nav>

    <section className="motul-hero motul-pattern">
      <div className="motul-shell motul-hero-grid">
        <div className="motul-hero-copy">
          <Link href={returnUrl} className="motul-back" aria-label="Back to catalog"><ArrowLeft size={16} aria-hidden="true" /> Kembali ke katalog</Link>
          <span className="motul-tag">MOTUL 5100 · 1 LITRE</span>
          <h1>PRESTASI MAX<br /><span>MOTUL 5100</span> <span className="motul-grade">10W-40</span></h1>
          <div className="motul-price"><span>Harga sebotol</span><strong>{money(variant.price)}</strong><small>1 Litre · Technosynthese</small></div>
          <p>Minyak enjin motosikal 4T Technosynthese berasaskan ester. Semak manual motosikal anda untuk memastikan gred 10W-40 dan piawaian JASO MA2 sesuai.</p>
          <div className="motul-hero-actions"><a className="motul-primary" href="#tempah"><ShoppingBag size={19} aria-hidden="true" /> TEMPAH SEKARANG <ArrowRight size={18} aria-hidden="true" /></a><a className="motul-secondary" href={business.whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle size={20} aria-hidden="true" /> Chat on WhatsApp</a></div>
          <div className="motul-hero-facts"><span><Check size={16} /> Technosynthese ester</span><span><Check size={16} /> SAE 10W-40</span><span><Check size={16} /> JASO MA2</span></div>
        </div>
        <BorderGlow className="motul-glow" backgroundColor="#181818" borderRadius={22} glowRadius={36} glowIntensity={.9} glowColor="356 91 57" colors={["#e30613", "#ff5b62", "#f18743"]}><div className="motul-display-card">
          <span className="motul-display-price">{money(variant.price)} / BTL</span>
           <div className="motul-photo-gallery" aria-label="Motul 5100 product photos">
             <div className="motul-photo"><img src={photos[photoIndex]} alt={`Motul 5100 ${photoLabels[photoIndex]} — 4L bottle shown`} /></div>
             <div className="motul-photo-controls"><button type="button" aria-label="Previous Motul photo" onClick={() => setPhotoIndex((index) => (index - 1 + photos.length) % photos.length)}><ArrowLeft size={19} aria-hidden="true" /></button><span aria-live="polite">{photoLabels[photoIndex]} · {photoIndex + 1} / {photos.length}</span><button type="button" aria-label="Next Motul photo" onClick={() => setPhotoIndex((index) => (index + 1) % photos.length)}><ArrowRight size={19} aria-hidden="true" /></button></div>
             <div className="motul-photo-thumbnails" role="group" aria-label="Choose Motul photo">{photos.map((photo, index) => <button key={photo} type="button" aria-label={`View ${photoLabels[index]} photo`} aria-pressed={photoIndex === index} onClick={() => setPhotoIndex(index)}><img src={photo} alt="" /></button>)}</div>
             <p className="motul-photo-note">Photos show 4L packaging. The listed {money(variant.price)} price and order are for 1 Litre; please confirm the bottle with our team.</p>
           </div>
          <div className="motul-display-name"><strong>MOTUL 5100 4T 10W-40</strong><span>1 Litre · Technosynthese ester</span></div>
          <div className="motul-display-facts"><span>JASO MA2</span><span>SAE 10W-40</span></div>
        </div></BorderGlow>
      </div>
    </section>

    <section id="kelebihan" className="motul-section motul-benefits"><div className="motul-shell"><div className="motul-section-title"><h2>KENAPA PILIH <span>MOTUL 5100</span>?</h2><p>Maklumat produk untuk membantu anda menyemak minyak yang sesuai bagi motosikal anda.</p></div><div className="motul-benefit-grid">{features.map(({ Icon, title, description }) => <article key={title} className="motul-benefit"><span className="motul-benefit-icon"><Icon size={24} aria-hidden="true" /></span><h3>{title}</h3><p>{description}</p></article>)}</div></div></section>

    <section id="spesifikasi" className="motul-section motul-specs"><div className="motul-shell motul-specs-grid"><div><div className="motul-section-title"><h2>SPESIFIKASI TEKNIKAL</h2><p>Gunakan spesifikasi ini bersama manual motosikal sebelum membuat pesanan.</p></div><dl><div><dt>Harga sebotol</dt><dd>{money(variant.price)}</dd></div>{product.specs.map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl></div><div className="motul-spec-showcase"><span className="motul-spec-type">4T / 10W-40</span><strong>MOTUL<br />5100</strong><span>TECHNOSYNTHESE ESTER</span><p>{product.note}</p><div>{money(variant.price)} / BOTOL</div></div></div></section>

    <section id="tempah" className="motul-section motul-order-section">
      <BorderGlow className="motul-order-glow" backgroundColor="#181818" borderRadius={22} glowRadius={38} glowIntensity={.8} glowColor="356 91 57" colors={["#e30613", "#ff5b62", "#f18743"]}>
        <div className="motul-order-panel">
          <header><h2>BORANG TEMPAHAN</h2><p>Motul 5100 4T 10W-40 · 1 Litre</p></header>
          <form onSubmit={sendOrder} noValidate>
            <label htmlFor="motul-name">Nama penuh</label>
            <input id="motul-name" name="name" required autoComplete="name" placeholder="Nama anda" aria-invalid={!!formErrors.name} aria-describedby={formErrors.name ? "motul-name-error" : undefined} onChange={() => clearFieldError("name")} />
            {formErrors.name && <p className="motul-form-error" id="motul-name-error" role="alert">{formErrors.name}</p>}
            <div className="motul-form-row">
              <div>
                <label htmlFor="motul-phone">No. WhatsApp</label>
                <input id="motul-phone" name="phone" type="tel" inputMode="tel" required autoComplete="tel" placeholder="01X XXXXXXX" aria-invalid={!!formErrors.phone} aria-describedby={`motul-phone-help${formErrors.phone ? " motul-phone-error" : ""}`} onChange={() => clearFieldError("phone")} />
                <p className="motul-field-help" id="motul-phone-help">7–15 digit. Kod negara, ruang dan tanda + dibenarkan.</p>
                {formErrors.phone && <p className="motul-form-error" id="motul-phone-error" role="alert">{formErrors.phone}</p>}
              </div>
              <div>
                <span className="motul-quantity-label" id="motul-quantity-label">Kuantiti botol</span>
                <div className="motul-qty" role="group" aria-labelledby="motul-quantity-label">
                  <button type="button" aria-label="Kurangkan kuantiti" disabled={quantity <= 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))}><Minus size={17} /></button>
                  <span aria-live="polite">{quantity}</span>
                  <button type="button" aria-label="Tambah kuantiti" disabled={quantity >= MAX_QUANTITY} onClick={() => setQuantity((value) => Math.min(MAX_QUANTITY, value + 1))}><Plus size={17} /></button>
                </div>
              </div>
            </div>
            <div className="motul-total"><span>Jumlah produk <small>Penghantaran disahkan dalam chat</small></span><strong aria-live="polite">{money(quantity * variant.price)}</strong></div>
            <label htmlFor="motul-location">Model motosikal &amp; lokasi penghantaran</label>
            <textarea id="motul-location" name="location" required rows={3} placeholder="Model motosikal dan kawasan anda" aria-invalid={!!formErrors.location} aria-describedby={formErrors.location ? "motul-location-error" : undefined} onChange={() => clearFieldError("location")} />
            {formErrors.location && <p className="motul-form-error" id="motul-location-error" role="alert">{formErrors.location}</p>}
            <button type="submit" className="motul-submit"><MessageCircle size={20} aria-hidden="true" /> HANTAR TEMPAHAN KE WHATSAPP</button>
            <button type="button" className="motul-add-cart" disabled={!ready || remaining < quantity} onClick={() => addMany(product.id, variant.id, quantity)}>Atau tambah {quantity} botol ke cart <ShoppingBag size={18} aria-hidden="true" /></button>
            <p className="motul-order-note">Mesej tidak dihantar secara automatik. Sila semak butiran dan tekan Send di WhatsApp. Stok dan kos penghantaran disahkan melalui chat.</p>
          </form>
        </div>
      </BorderGlow>
    </section>

    <footer className="motul-footer"><span className="motul-mark">MOTUL</span><p>Motul 5100 di Moon Store · Besut, Terengganu</p></footer>
  </div>;
}
