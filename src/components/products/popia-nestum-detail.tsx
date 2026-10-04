"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MAX_QUANTITY, Product } from "@/lib/product";
import { readCatalogReturn } from "@/lib/catalog-return";
import { useStore } from "../cart/store-provider";

export default function PopiaNestumDetail({ product }: { product: Product }) {
  const [selected, setSelected] = useState(1);
  const { addMany, items, openCart, ready } = useStore();
  const [returnUrl, setReturnUrl] = useState("/#shop");
  const variant = product.variants[0];
  const cartQty = items.find((item) => item.productId === product.id && item.variantId === variant.id)?.quantity ?? 0;
  useEffect(() => { setReturnUrl(readCatalogReturn()?.url || "/#shop"); }, []);

  function addCart() {
    if (!ready || cartQty >= MAX_QUANTITY) return;
    addMany(product.id, variant.id, selected);
    setSelected(1);
  }

  return <div className="popia-page" lang="ms">
    <div className="topbar">Popia Nestum rangup • 250g • RM10 sahaja</div>
    <nav className="popia-catalog-nav" aria-label="Product navigation" lang="en"><Link href={returnUrl} className="popia-catalog-back"><ArrowLeft size={16} aria-hidden="true" /> Back to catalog</Link></nav>

    <section className="hero">
      <div>
        <div className="kicker">Kudapan Istimewa</div>
        <h1>Rangup.<br />Manis.<br />Nestum.</h1>
        <p className="lead">Popia rangup bersalut Nestum yang wangi dan manis. Sekali buka bekas, susah nak berhenti.</p>
        <div className="price-row"><div className="price">RM10.00</div><div className="size">250g / 1 bekas</div></div>
        <div className="actions"><button className="primary" onClick={() => document.getElementById("order")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}>Beli Sekarang →</button><button className="secondary" onClick={openCart}>Lihat Cart</button></div>
      </div>

      <div className="photo-wrap">
        <div className="photo"><img src={product.image} alt="Popia Nestum Rangup" width={product.imageWidth} height={product.imageHeight} srcSet={product.imageSrcSet} sizes="(max-width: 600px) 88vw, 48vw" /></div>
        <div className="sticker">250g<br /><b>RM10</b><br />per bekas</div>
      </div>
    </section>

    <section className="band" id="cerita"><div className="band-inner"><h2>Satu bekas, banyak kenangan.</h2><p>Dibuat untuk jadi kudapan yang mudah dinikmati bila-bila masa, waktu minum petang, tengok cerita, atau sekadar nak rasa sesuatu yang rangup.</p></div></section>

    <section className="features" id="kelebihan">
      <div className="card"><div className="num">01 - RANGUP</div><h3>Tekstur yang sedap</h3><p>Setiap gigitan memberikan rasa rangup yang membuatkan susah nak berhenti.</p></div>
      <div className="card"><div className="num">02 - NESTUM</div><h3>Salutan penuh rasa</h3><p>Nestum yang wangi dan manis menjadi sentuhan utama dalam setiap popia.</p></div>
      <div className="card"><div className="num">03 - 250G</div><h3>Sesuai untuk dikongsi</h3><p>Satu bekas 250g yang sesuai untuk kudapan sendiri atau dinikmati bersama keluarga.</p></div>
    </section>

    <section className="order" id="order">
      <div><div className="kicker">Pesanan Anda</div><h2>Jom rasa sendiri.</h2><p>Popia Nestum Rangup • 250g • RM10 setiap bekas</p></div>
      <div className="buybox"><div className="qty" role="group" aria-label="Quantity"><button aria-label="Decrease quantity" disabled={selected <= 1} onClick={() => setSelected((quantity) => Math.max(1, quantity - 1))}>−</button><span aria-live="polite">{selected}</span><button aria-label="Increase quantity" disabled={selected >= MAX_QUANTITY - cartQty} onClick={() => setSelected((quantity) => Math.min(MAX_QUANTITY - cartQty, quantity + 1))}>+</button></div><button className="primary" disabled={!ready || cartQty >= MAX_QUANTITY || selected > MAX_QUANTITY - cartQty} onClick={addCart}>Tambah ke Cart</button>{cartQty >= MAX_QUANTITY && <p role="status">Had {MAX_QUANTITY} bekas dalam cart. Kurangkan kuantiti dalam cart untuk tambah lagi.</p>}</div>
    </section>

    <footer><span>© 2026 Popia Nestum</span><span>Rangup sampai habis.</span></footer>
  </div>;
}
