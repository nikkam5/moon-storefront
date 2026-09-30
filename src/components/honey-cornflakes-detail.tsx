"use client";

import { useState } from "react";
import { MAX_QUANTITY, Product } from "@/lib/product";
import { business } from "@/lib/business";
import { useStore } from "./store-provider";
import FooterSocial from "./footer-social";

export default function HoneyCornflakesDetail({ product }: { product: Product }) {
  const [selected, setSelected] = useState(1);
  const { addMany, items, update, ready } = useStore();
  const [cartOpen, setCartOpen] = useState(false);
  const variant = product.variants[0];
  const cartQty = items.find((item) => item.productId === product.id && item.variantId === variant.id)?.quantity ?? 0;
  const price = variant.price;
  const remaining = MAX_QUANTITY - cartQty;

  function addCart() {
    if (!ready || cartQty >= MAX_QUANTITY) return;
    addMany(product.id, variant.id, selected, false);
    setSelected(1);
    setCartOpen(true);
  }

  return <div className="honey-page">
    <div className="hex-float" aria-hidden="true" />
    <div className="hex-float" aria-hidden="true" />
    <div className="hex-float" aria-hidden="true" />
    <div className="hex-float" aria-hidden="true" />

    <main className="main">
      <a className="back-link" href="/#shop">← Back to catalog</a>

      <div className="product-layout">
        <div className="product-image-wrap">
          <div className="hex-deco d1" aria-hidden="true" />
          <div className="hex-deco d2" aria-hidden="true" />
          <div className="hex-deco d3" aria-hidden="true" />
          <div className="product-image">
            {product.image ? <img src={product.image} alt="Cornflakes Madu - Honey Coated Cornflakes in clear jars" /> : <div className="photo-placeholder" role="img" aria-label="Cornflakes Madu - product photo coming soon"><span>PRODUCT PHOTO COMING SOON</span></div>}
          </div>
          <span className="img-counter">01 / 01</span>
        </div>

        <div className="product-info">
          <div className="category-label">Snacks &amp; Treats</div>
          <h1 className="product-title">Cornflakes Madu</h1>
          <p className="product-subtitle">Crunchy cornflakes generously coated in pure, golden honey, sweet, crispy, and utterly addictive.</p>

          <div className="price-row">
            <span className="price">RM {price.toFixed(2)}</span>
            <span className="price-label">Standard Jar</span>
          </div>

          <p className="product-desc">Our homemade, small-batch treat. Freshly prepared and packed into an airtight tub, with zero added artificial preservatives and plenty of crunch in every bite.</p>

          <div className="variant-row">
            <span className="check">✓</span>
            <span>Standard Jar · Approx. 300g</span>
          </div>

          <div className="qty-row">
            <div className="qty" role="group" aria-label="Quantity">
              <button type="button" aria-label="Decrease quantity" disabled={selected <= 1} onClick={() => setSelected((quantity) => Math.max(1, quantity - 1))}>−</button>
              <span aria-live="polite">{selected}</span>
              <button type="button" aria-label="Increase quantity" disabled={selected >= remaining} onClick={() => setSelected((quantity) => Math.min(remaining, quantity + 1))}>+</button>
            </div>
            <button className="add-to-cart" type="button" disabled={!ready || cartQty >= MAX_QUANTITY || selected > remaining} onClick={addCart}>
              Add to cart
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" /></svg>
            </button>
          </div>

          <div className="details-section">
            <h2 className="details-title">Product details</h2>
            <table className="details-table">
              <tbody>
                <tr><td>Net weight</td><td>Approx. 300g per jar</td></tr>
                <tr><td>Made</td><td>Freshly prepared in small batches</td></tr>
                <tr><td>Packaging</td><td>Airtight seal tub</td></tr>
                <tr><td>Preservatives</td><td>Zero added artificial preservatives</td></tr>
              </tbody>
            </table>
            <p className="allergy-note">Please ask us about ingredients and allergens before ordering if you have a food allergy. Contains wheat and honey.</p>
          </div>
        </div>
      </div>
    </main>

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
            <a href="tel:+601161647061">+60 11-6164 7061</a>
          </div>
          <div className="footer-contact-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
            <a href="mailto:m00netor32026@gmail.com">m00netor32026@gmail.com</a>
          </div>
          <p className="footer-address">Jalan Taman Kepas Indah, Taman Kepas Indah, Kampong Raja, 22000 Jerteh, Besut, Terengganu, Malaysia</p>
          <div className="footer-hours">Open daily · 24 hours</div>
          <p className="footer-hours-note">WhatsApp inquiries always open. Availability and delivery confirmed via chat; replies may not be immediate.</p>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 Moon Store. All rights reserved.</span>
        <span>Good finds. A little closer to home.</span>
        <a href="#top" onClick={(event) => { event.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Back to top ↗</a>
      </div>
    </footer>

    <div className={`cart-overlay${cartOpen ? " open" : ""}`} onClick={(event) => { if (event.target === event.currentTarget) setCartOpen(false); }}>
      <aside className={`cart-drawer${cartOpen ? " open" : ""}`} role="dialog" aria-modal="true" aria-label="Your Cart">
        <div className="cart-drawer-header">
          <div>
            <div className="cart-drawer-label">Your Moon Store Finds</div>
            <div className="cart-drawer-title">Your cart <span>({cartQty})</span></div>
          </div>
          <button className="cart-close" type="button" aria-label="Close cart" onClick={() => setCartOpen(false)}>✕</button>
        </div>
        <div className="cart-divider" aria-hidden="true" />
        {!cartQty ? <div className="cart-empty">
          <div className="cart-empty-icon" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" /></svg>
          </div>
          <h3>Your next good find awaits.</h3>
          <p>Your cart is empty. Let&apos;s change that.</p>
          <button className="cart-explore-btn" type="button" onClick={() => setCartOpen(false)}>Explore Catalog</button>
        </div> : <>
          <div className="cart-line-item">
            <div className="cart-line-top"><div><b>Cornflakes Madu</b><div className="cart-meta">Standard Jar · Approx. 300g</div></div><b>RM{(cartQty * price).toFixed(2)}</b></div>
            <div className="cart-controls"><button type="button" aria-label="Decrease cart quantity" onClick={() => update(product.id, variant.id, cartQty - 1)}>−</button><span>{cartQty}</span><button type="button" aria-label="Increase cart quantity" disabled={cartQty >= MAX_QUANTITY} onClick={() => update(product.id, variant.id, cartQty + 1)}>+</button><button type="button" className="remove" onClick={() => update(product.id, variant.id, 0)}>Remove</button></div>
          </div>
          <div className="cart-total"><span>Total</span><b>RM{(cartQty * price).toFixed(2)}</b></div>
        </>}
      </aside>
    </div>
  </div>;
}
