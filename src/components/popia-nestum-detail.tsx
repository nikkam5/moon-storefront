"use client";

import { useState } from "react";
import { MAX_QUANTITY, Product } from "@/lib/product";
import { useStore } from "./store-provider";

export default function PopiaNestumDetail({ product }: { product: Product }) {
  const [selected, setSelected] = useState(1);
  const { addMany, items, update, ready } = useStore();
  const [cartOpen, setCartOpen] = useState(false);
  const variant = product.variants[0];
  const cartQty = items.find((item) => item.productId === product.id && item.variantId === variant.id)?.quantity ?? 0;
  const price = variant.price;

  function addCart() {
    if (!ready || cartQty >= MAX_QUANTITY) return;
    addMany(product.id, variant.id, selected, false);
    setSelected(1);
    setCartOpen(true);
  }

  return <div className="popia-page" lang="ms">
    <div className="topbar">Popia Nestum rangup • 250g • RM10 sahaja</div>

    <section className="hero">
      <div>
        <div className="kicker">Kudapan Istimewa</div>
        <h1>Rangup.<br />Manis.<br />Nestum.</h1>
        <p className="lead">Popia rangup bersalut Nestum yang wangi dan manis. Sekali buka bekas, susah nak berhenti.</p>
        <div className="price-row"><div className="price">RM10.00</div><div className="size">250g / 1 bekas</div></div>
        <div className="actions"><button className="primary" onClick={() => document.getElementById("order")?.scrollIntoView({ behavior: "smooth" })}>Beli Sekarang →</button><button className="secondary" onClick={() => setCartOpen(true)}>Lihat Cart</button></div>
      </div>

      <div className="photo-wrap">
        <div className="photo"><img src={product.image} alt="Popia Nestum Rangup" /></div>
        <div className="sticker">250g<br /><b>RM10</b><br />per bekas</div>
      </div>
    </section>

    <section className="band" id="cerita"><div className="band-inner"><h2>Satu bekas, banyak kenangan.</h2><p>Dibuat untuk jadi kudapan yang mudah dinikmati bila-bila masa — waktu minum petang, tengok cerita, atau sekadar nak rasa sesuatu yang rangup.</p></div></section>

    <section className="features" id="kelebihan">
      <div className="card"><div className="num">01 — RANGUP</div><h3>Tekstur yang sedap</h3><p>Setiap gigitan memberikan rasa rangup yang membuatkan susah nak berhenti.</p></div>
      <div className="card"><div className="num">02 — NESTUM</div><h3>Salutan penuh rasa</h3><p>Nestum yang wangi dan manis menjadi sentuhan utama dalam setiap popia.</p></div>
      <div className="card"><div className="num">03 — 250G</div><h3>Sesuai untuk dikongsi</h3><p>Satu bekas 250g yang sesuai untuk kudapan sendiri atau dinikmati bersama keluarga.</p></div>
    </section>

    <section className="order" id="order">
      <div><div className="kicker">Pesanan Anda</div><h2>Jom rasa sendiri.</h2><p>Popia Nestum Rangup • 250g • RM10 setiap bekas</p></div>
      <div className="buybox"><div className="qty"><button aria-label="Decrease quantity" disabled={selected <= 1} onClick={() => setSelected((quantity) => Math.max(1, quantity - 1))}>−</button><span aria-live="polite">{selected}</span><button aria-label="Increase quantity" disabled={selected >= MAX_QUANTITY - cartQty} onClick={() => setSelected((quantity) => Math.min(MAX_QUANTITY - cartQty, quantity + 1))}>+</button></div><button className="primary" disabled={!ready || cartQty >= MAX_QUANTITY || selected > MAX_QUANTITY - cartQty} onClick={addCart}>Tambah ke Cart</button></div>
    </section>

    <footer><span>© 2026 Popia Nestum</span><span>Rangup sampai habis.</span></footer>

    <div className={`overlay${cartOpen ? " show" : ""}`} onClick={(event) => { if (event.target === event.currentTarget) setCartOpen(false); }}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="Your Cart">
        <div className="drawer-head"><h2>Your Cart</h2><button className="close" aria-label="Close cart" onClick={() => setCartOpen(false)}>×</button></div>
        {!cartQty ? <div className="empty">Cart masih kosong.<br />Tambah Popia Nestum untuk membuat pesanan.</div> : <>
          <div className="cart-item"><div className="cart-line"><div><b>Popia Nestum Rangup</b><div className="cart-meta">250g / 1 bekas</div></div><b>RM{(cartQty * price).toFixed(2)}</b></div><div className="cart-controls"><button aria-label="Decrease cart quantity" onClick={() => update(product.id, variant.id, cartQty - 1)}>−</button><span>{cartQty}</span><button aria-label="Increase cart quantity" disabled={cartQty >= MAX_QUANTITY} onClick={() => update(product.id, variant.id, cartQty + 1)}>+</button><button className="remove" onClick={() => update(product.id, variant.id, 0)}>Buang</button></div></div>
          <div className="total"><span>Total</span><b>RM{(cartQty * price).toFixed(2)}</b></div>
        </>}
      </aside>
    </div>
  </div>;
}
