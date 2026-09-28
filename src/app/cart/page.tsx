"use client";

import Link from "next/link";
import { ArrowLeft, MessageCircle, ShoppingBag } from "lucide-react";
import { CartRow, useStore, WhatsAppCheckout } from "@/components/store-provider";
import { cartKey, money } from "@/lib/product";

export default function Cart() {
  const { items, count, total, ready } = useStore();
  if (!ready) return <div className="section-wrap empty-cart" role="status">Getting your cart ready…</div>;
  if (!count) return <div className="section-wrap empty-cart"><ShoppingBag size={45} strokeWidth={1.2} /><div className="eyebrow">ROOM FOR SOMETHING GOOD</div><h1>Your next good find awaits.</h1><p>Your cart is empty. Explore the collection to get started.</p><Link href="/#shop" className="button button-dark">Explore Catalog</Link></div>;
  return <div className="section-wrap cart-page"><Link href="/#shop" className="back-link"><ArrowLeft size={15} /> Keep exploring</Link><div className="eyebrow">YOUR MOON STORE FINDS</div><h1>Good finds, in the cart.</h1><div className="cart-page-grid"><div><div className="cart-list-heading"><span>YOUR PICKS ({count})</span><span>LINE TOTAL</span></div>{items.map((item) => <CartRow key={cartKey(item)} item={item} />)}</div><aside className="order-summary"><span className="summary-icon"><MessageCircle size={25} /></span><h2>A little chat. All sorted.</h2><p>We’ll prepare your order message. Add your name and delivery or pickup details in WhatsApp.</p><div className="summary-total"><span>Subtotal</span><strong>{money(total)}</strong></div><WhatsAppCheckout /><p className="checkout-note">Delivery charges and stock are confirmed with the team. Opening WhatsApp doesn’t place or pay for an order. Your cart stays saved until you edit it.</p></aside></div></div>;
}
