"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, MessageCircle, Minus, Plus, ShoppingBag, X } from "lucide-react";
import { CartItem, CART_STORAGE_KEY, cartKey, cartTotal, getProduct, getVariant, isProductId, itemTotal, MAX_QUANTITY, money, parseCart, ProductId } from "@/lib/product";
import { checkoutUrl } from "@/lib/whatsapp";
import ProductImage from "./product-image";
export { default as RevealRoot } from "./reveal-root";

type Store = {
  items: CartItem[];
  ready: boolean;
  count: number;
  total: number;
  add: (productId: ProductId, variantId: string) => void;
  addMany: (productId: ProductId, variantId: string, quantity: number, openDrawer?: boolean) => void;
  update: (productId: ProductId, variantId: string, quantity: number) => void;
  openCart: () => void;
};
const Context = createContext<Store | null>(null);
export function useStore() {
  const store = useContext(Context);
  if (!store) throw new Error("StoreProvider is required");
  return store;
}

export default function StoreProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const itemsRef = useRef<CartItem[]>([]);
  const storageWritable = useRef(true);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // A new versioned key deliberately excludes the previous example catalog.
    const restore = () => {
      try {
        const restored = parseCart(JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "[]"));
        itemsRef.current = restored;
        setItems(restored);
      } catch { /* In-memory cart still works. */ }
    };
    restore();
    setReady(true);
    const onStorage = (event: StorageEvent) => { if (event.key === CART_STORAGE_KEY || event.key === null) restore(); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  const commit = useCallback((mutate: (current: CartItem[]) => CartItem[]) => {
    let latest = itemsRef.current;
    if (storageWritable.current) try { latest = parseCart(JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "[]")); } catch { /* Fall back to memory. */ }
    const next = mutate(latest);
    itemsRef.current = next;
    setItems(next);
    try { localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(next)); storageWritable.current = true; } catch { storageWritable.current = false; }
  }, []);
  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement;
    const element = dialog.current;
    element?.showModal();
    closeButton.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { element?.close(); document.body.style.overflow = overflow; if (previousFocus.current?.isConnected) previousFocus.current.focus(); };
  }, [open]);

  const update = useCallback((productId: ProductId, variantId: string, quantity: number) => {
    if (!isProductId(productId) || !getVariant(productId, variantId) || !Number.isSafeInteger(quantity)) return;
    const key = cartKey({ productId, variantId });
    commit((current) => quantity <= 0 ? current.filter((item) => cartKey(item) !== key) : current.map((item) => cartKey(item) === key ? { ...item, quantity: Math.min(quantity, MAX_QUANTITY) } : item));
  }, [commit]);
  const addMany = useCallback((productId: ProductId, variantId: string, quantity: number, openDrawer = true) => {
    if (!isProductId(productId) || !getVariant(productId, variantId) || !Number.isSafeInteger(quantity) || quantity < 1) return;
    const key = cartKey({ productId, variantId });
    commit((current) => current.some((item) => cartKey(item) === key) ? current.map((item) => cartKey(item) === key ? { ...item, quantity: Math.min(item.quantity + quantity, MAX_QUANTITY) } : item) : [...current, { productId, variantId, quantity: Math.min(quantity, MAX_QUANTITY) }]);
    if (openDrawer) setOpen(true);
  }, [commit]);
  const add = useCallback((productId: ProductId, variantId: string) => addMany(productId, variantId, 1), [addMany]);
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const total = cartTotal(items);

  return <Context.Provider value={{ items, ready, count, total, add, addMany, update, openCart: () => setOpen(true) }}>
    {children}
    <dialog ref={dialog} className="cart-drawer" aria-labelledby="drawer-title" onCancel={() => setOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <div className="drawer-inner">
        <div className="drawer-heading"><div><span className="eyebrow">YOUR MOON STORE FINDS</span><h2 id="drawer-title">Your cart <span>({count})</span></h2></div><button ref={closeButton} className="icon-button" aria-label="Close cart" onClick={() => setOpen(false)}><X /></button></div>
        {count ? <>
          <div className="added-note"><Check size={16} /> Good choice. We saved it for you.</div>
          <div className="drawer-items">{items.map((item) => <CartRow key={cartKey(item)} item={item} />)}</div>
          <div className="drawer-bottom"><div className="subtotal"><span>Subtotal</span><strong aria-live="polite">{money(total)}</strong></div><p className="muted small">Delivery fees and availability confirmed in WhatsApp.</p><WhatsAppCheckout /><p className="checkout-note">Review the message, add your details, then tap Send. Your cart stays saved.</p><Link className="underlined-link cart-review-link" href="/cart" onClick={() => setOpen(false)}>Review full cart</Link></div>
        </> : <div className="empty-drawer"><ShoppingBag size={44} strokeWidth={1.2} /><h3>Your next good find awaits.</h3><p>Your cart is empty. Let’s change that.</p><Link href="/#shop" className="button button-dark" onClick={() => setOpen(false)}>Explore Catalog</Link></div>}
      </div>
    </dialog>
  </Context.Provider>;
}

export function WhatsAppCheckout() {
  const { items } = useStore();
  if (!items.length) return null;
  return <a className="button button-whatsapp full-width" href={checkoutUrl(items)} target="_blank" rel="noopener noreferrer">Order on WhatsApp <MessageCircle size={19} /></a>;
}

export function CartRow({ item }: { item: CartItem }) {
  const { update } = useStore();
  const product = getProduct(item.productId);
  const variant = getVariant(item.productId, item.variantId)!;
  const label = `${product.orderName} ${variant.label}`;
  return <div className="cart-row">
    <div className="cart-thumbnail"><ProductImage product={product} compact /></div>
    <div className="cart-row-info"><strong className="cart-product-name">{product.orderName}</strong><p>{variant.label}{product.variants.length > 1 && ` · ${variant.detail}`}</p><span className="unit-price">{money(variant.price)} each</span><div className="quantity-control"><button aria-label={`Decrease ${label} quantity`} onClick={() => update(item.productId, item.variantId, item.quantity - 1)}><Minus size={14} /></button><span aria-live="polite">{item.quantity}</span><button aria-label={`Increase ${label} quantity`} disabled={item.quantity >= MAX_QUANTITY} onClick={() => update(item.productId, item.variantId, item.quantity + 1)}><Plus size={14} /></button></div>{item.quantity === MAX_QUANTITY && <small className="quantity-limit">Limit {MAX_QUANTITY} per option</small>}</div>
    <div className="cart-row-price"><strong>{money(itemTotal(item))}</strong><button className="text-button small" onClick={() => update(item.productId, item.variantId, 0)} aria-label={`Remove ${label}`}>Remove</button></div>
  </div>;
}
