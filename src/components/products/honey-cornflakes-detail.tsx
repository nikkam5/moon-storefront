"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, ShoppingBag } from "lucide-react";
import { MAX_QUANTITY, money, type Product } from "@/lib/product";
import { business } from "@/lib/business";
import { readCatalogReturn } from "@/lib/catalog-return";
import { useStore } from "../cart/store-provider";
import FooterSocial from "../layout/footer-social";

export default function HoneyCornflakesDetail({ product }: { product: Product }) {
  const [selected, setSelected] = useState(1);
  const [variantId, setVariantId] = useState("standard-jar");
  const [motionActive, setMotionActive] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const { addMany, items, ready } = useStore();
  const [returnUrl, setReturnUrl] = useState("/#shop");
  const variant = product.variants.find(item => item.id === variantId) ?? product.variants[0];
  const cartQty = items.find((item) => item.productId === product.id && item.variantId === variant.id)?.quantity ?? 0;
  const price = variant.price;
  const remaining = Math.max(0, MAX_QUANTITY - cartQty);
  const selectedQuantity = Math.min(selected, Math.max(1, remaining));
  useEffect(() => { setReturnUrl(readCatalogReturn()?.url || "/#shop"); }, []);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    const sync = () => setMotionActive(visible && !document.hidden && !media.matches);
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    if (root.current) observer.observe(root.current);
    sync();
    media.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    return () => { observer.disconnect(); media.removeEventListener("change", sync); document.removeEventListener("visibilitychange", sync); };
  }, []);

  function addCart() {
    if (!ready || cartQty >= MAX_QUANTITY) return;
    addMany(product.id, variant.id, selectedQuantity);
    setSelected(1);
  }

  return <div ref={root} className="honey-page" data-motion={motionActive ? "active" : "paused"}>
    <div className="hex-float" aria-hidden="true" />
    <div className="hex-float" aria-hidden="true" />
    <div className="hex-float" aria-hidden="true" />
    <div className="hex-float" aria-hidden="true" />

    <div className="main">
      <Link className="back-link" href={returnUrl}><span aria-hidden="true">←</span> Back to catalog</Link>

      <div className="product-layout">
        <div className="product-image-wrap">
          <div className="hex-deco d1" aria-hidden="true" />
          <div className="hex-deco d2" aria-hidden="true" />
          <div className="hex-deco d3" aria-hidden="true" />
          <div className="product-image">
            {product.image ? <img src={product.image} alt="Cornflakes Madu - Honey Coated Cornflakes in clear jars" width={product.imageWidth} height={product.imageHeight} srcSet={product.imageSrcSet} sizes="(max-width: 600px) 88vw, 48vw" /> : <div className="photo-placeholder" role="img" aria-label="Cornflakes Madu - product photo coming soon"><span>PRODUCT PHOTO COMING SOON</span></div>}
          </div>
          <span className="img-counter">01 / 01</span>
        </div>

        <div className="product-info">
          <div className="category-label">{product.categoryLabel}</div>
          <h1 className="product-title">Cornflakes Madu</h1>
          <p className="product-subtitle">{product.tagline}</p>

          <div className="price-row">
            <span className="price" aria-live="polite">{money(price)}</span>
            <span className="price-label">{variant.label}</span>
          </div>

          <p className="product-desc">{product.description}</p>

          <fieldset className="honey-variants">
            <legend>Choose your jar</legend>
            <div className="honey-variant-options">{product.variants.map(option => <label key={option.id} className="honey-variant" data-selected={option.id === variant.id}>
              <input type="radio" name="cornflakes-jar" value={option.id} checked={option.id === variant.id} onChange={() => { setVariantId(option.id); setSelected(1); }} />
              <span><strong>{option.label}</strong><small>{option.detail}</small></span><span>{money(option.price)}</span>
            </label>)}</div>
          </fieldset>
          <div className="variant-row" aria-live="polite"><Check className="check" size={17} aria-hidden="true" /><span>{variant.label} · {variant.detail}</span></div>

          <div className="qty-row">
            <div className="qty" role="group" aria-label="Quantity">
              <button type="button" aria-label="Decrease quantity" disabled={selectedQuantity <= 1} onClick={() => setSelected(Math.max(1, selectedQuantity - 1))}>−</button>
              <span aria-live="polite">{selectedQuantity}</span>
              <button type="button" aria-label="Increase quantity" disabled={selectedQuantity >= remaining} onClick={() => setSelected(selectedQuantity + 1)}>+</button>
            </div>
            <button className="add-to-cart" type="button" disabled={!ready || remaining === 0} onClick={addCart}>
              Add to cart
              <ShoppingBag size={20} aria-hidden="true" />
            </button>
          </div>
          {cartQty >= MAX_QUANTITY && <p className="allergy-note" role="status">Limit {MAX_QUANTITY} per option. Reduce the quantity in your cart to add more.</p>}

          <div className="details-section">
            <h2 className="details-title">Product details</h2>
            <table className="details-table">
              <tbody>
                {product.specs.map(([label, value]) => <tr key={label}><th scope="row">{label}</th><td>{value}</td></tr>)}
              </tbody>
            </table>
            {product.note && <p className="allergy-note">{product.note}</p>}
          </div>
        </div>
      </div>
    </div>

    <section className="cta-banner">
      <div className="cta-inner">
        <div>
          <div className="cta-label">✦ Your everyday, with a little extra</div>
          <h2 className="cta-heading">See something you like?<br />Let&apos;s make it a conversation.</h2>
        </div>
        <a className="cta-btn" href={business.whatsapp} target="_blank" rel="noopener noreferrer">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" /></svg>
          Chat on WhatsApp ↗<span className="sr-only"> (opens in a new tab)</span>
        </a>
      </div>
    </section>

    <footer className="footer">
      <div className="footer-grid">
        <div>
          <div className="footer-logo">
            <div className="logo-icon">MS</div>
            <span>MOON STORE</span>
          </div>
          <FooterSocial />
          <p className="footer-tagline">Tech for your day. Care for your ride.<br />Treats for your happy little moments.</p>
          <div className="footer-location">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
            Locally fulfilled in Kampong Raja, Besut.
          </div>
        </div>
        <div className="footer-col">
          <h4>Take a look around</h4>
          <ul className="footer-links">
            <li><a href="/#home">Home <span>↗</span></a></li>
            <li><a href="/#shop">Explore catalog <span>↗</span></a></li>
            <li><a href="/#about">Our story <span>↗</span></a></li>
             <li><a href="/#feedback">Customer feedback <span></span></a></li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>Keep in touch</h4>
          <div className="footer-contact-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" /></svg>
            <a href={`tel:+${business.phoneDigits}`}>{business.phone}</a>
          </div>
          <div className="footer-contact-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
            <a href={`mailto:${business.email}`}>{business.email}</a>
          </div>
          <p className="footer-address">{business.address}</p>
          <div className="footer-hours">{business.hours}</div>
          <p className="footer-hours-note">WhatsApp inquiries always open. Availability and delivery confirmed via chat; replies may not be immediate.</p>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 Moon Store. All rights reserved.</span>
        <span>Good finds. A little closer to home.</span>
        <a href="#top" onClick={(event) => { event.preventDefault(); window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); }}>Back to top ↗</a>
      </div>
    </footer>
  </div>;
}
