"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useInView } from "motion/react";
import { ArrowLeft, ArrowUpRight, Check, Minus, Plus, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { MAX_QUANTITY, money, type Product } from "@/lib/product";
import { readCatalogReturn } from "@/lib/catalog-return";
import { useStore } from "../cart/store-provider";
import UsbModelViewer from "./usb-model-viewer";
import "./product-detail.css";

const settleEase = [.22, 1, .36, 1] as const;

export default function ProductDetail({ product }: { product: Product }) {
  const [variantId, setVariantId] = useState(product.variants[0].id);
  const [quantity, setQuantity] = useState(1);
  const [returnUrl, setReturnUrl] = useState("/#shop");
  const [tabVisible, setTabVisible] = useState(false);
  const [reduce, setReduce] = useState(true);
  const [hasSeenPurchase, setHasSeenPurchase] = useState(false);
  const [added, setAdded] = useState(false);
  const { addMany, items, ready } = useStore();
  const scene = useRef<HTMLDivElement>(null);
  const purchase = useRef<HTMLDivElement>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sceneVisible = useInView(scene, { amount: .05 });
  const purchaseVisible = useInView(purchase, { amount: .15 });
  const variant = product.variants.find((item) => item.id === variantId)!;
  const inCart = items.find((item) => item.productId === product.id && item.variantId === variant.id)?.quantity ?? 0;
  const remaining = Math.max(0, MAX_QUANTITY - inCart);
  const selectedQuantity = Math.min(quantity, Math.max(1, remaining));
  const atLimit = remaining === 0;
  const motionActive = sceneVisible && tabVisible && !reduce;
  const duration = reduce ? 0 : .32;

  useEffect(() => {
    setReturnUrl(readCatalogReturn()?.url || "/#shop");
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotionPreference = () => setReduce(motionPreference.matches);
    const visibility = () => setTabVisible(!document.hidden);
    syncMotionPreference();
    visibility();
    motionPreference.addEventListener("change", syncMotionPreference);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      motionPreference.removeEventListener("change", syncMotionPreference);
      document.removeEventListener("visibilitychange", visibility);
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    };
  }, []);

  useEffect(() => { if (purchaseVisible) setHasSeenPurchase(true); }, [purchaseVisible]);

  function selectCapacity(id: string) {
    setVariantId(id);
    setQuantity(1);
    setAdded(false);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
  }

  function addToCart() {
    if (!ready || atLimit) return;
    addMany(product.id, variant.id, selectedQuantity);
    setAdded(true);
    setQuantity(1);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => { setAdded(false); feedbackTimer.current = null; }, 2500);
  }

  return <article className="usb-page product-detail-page" aria-labelledby="usb-title">
    <div className="usb-page-inner">
      <Link href={returnUrl} className="usb-back back-link"><ArrowLeft size={16} aria-hidden="true" /> Back to catalog</Link>
      <div className="usb-hero">
        <div ref={scene} className="usb-scene" data-motion={motionActive ? "running" : "paused"}>
          <div className="usb-ambient" aria-hidden="true"><span className="usb-ambient-sweep" /><span className="usb-ambient-halo" /></div>
          <div className="usb-stage-capacity" aria-hidden="true">
            <div className="usb-capacity-value"><AnimatePresence initial={false} mode="popLayout">
              <motion.span key={variant.id} initial={{ opacity: 0, y: reduce ? 0 : 28 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduce ? 0 : -28 }} transition={{ duration, ease: settleEase }}>{variant.label.replace("GB", "")}</motion.span>
            </AnimatePresence></div><span className="usb-capacity-unit">GB</span>
          </div>
          <UsbModelViewer product={product} visible={sceneVisible && tabVisible} reduced={reduce} />
        </div>

        <div className="usb-buying-panel">
          <h1 id="usb-title" aria-label={product.name}><span className="usb-title-brand">Kingston DataTraveler</span>{" "}<span className="usb-title-model">Exodia G2</span></h1>
          <p className="usb-intro">Everyday files. One pocket-sized drive.</p>
          <div className="usb-selection-summary">
            <div className="usb-selected-option"><span className="usb-colour-dot" style={{ "--option-colour": variant.color } as CSSProperties} aria-hidden="true" /><span>{variant.label} / {variant.detail}</span></div>
            <div className="detail-price usb-price" aria-hidden="true"><AnimatePresence initial={false} mode="popLayout"><motion.strong key={variant.id} initial={{ opacity: 0, y: reduce ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduce ? 0 : -12 }} transition={{ duration: reduce ? 0 : .22 }}>{money(variant.price)}</motion.strong></AnimatePresence><span>per drive</span></div>
            <span className="usb-sr-only" role="status" aria-live="polite" aria-atomic="true">{variant.label}, {variant.detail}, {money(variant.price)} per drive.</span>
          </div>
          <fieldset className="usb-capacities detail-variants"><legend>Choose capacity</legend><div className="usb-capacity-options">
            {product.variants.map((option) => <button type="button" key={option.id} disabled={!ready} aria-label={option.label + " " + money(option.price)} aria-pressed={option.id === variantId} onClick={() => selectCapacity(option.id)}>
              {option.id === variantId && <motion.span className="usb-capacity-highlight" layoutId="usb-capacity-highlight" transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 460, damping: 38 }} />}
              <strong>{option.label}</strong><small>{money(option.price)}</small>
            </button>)}
          </div></fieldset>
          <div ref={purchase} className="usb-purchase">
            <div className="usb-quantity" role="group" aria-label="Quantity">
              <button type="button" aria-label="Decrease USB quantity" disabled={!ready || atLimit || selectedQuantity <= 1} onClick={() => setQuantity(Math.max(1, selectedQuantity - 1))}><Minus size={16} aria-hidden="true" /></button>
              <span aria-live="polite">{selectedQuantity}</span>
              <button type="button" aria-label="Increase USB quantity" disabled={!ready || atLimit || selectedQuantity >= remaining} onClick={() => setQuantity(Math.min(remaining, selectedQuantity + 1))}><Plus size={16} aria-hidden="true" /></button>
            </div>
            <motion.button className="usb-add detail-add" type="button" aria-label="Add to cart" aria-describedby={atLimit ? "detail-quantity-limit" : undefined} disabled={!ready || atLimit} whileTap={reduce ? undefined : { scale: .98 }} onClick={addToCart} data-added={added}>
              <span>{added ? "Added to cart" : "Add to cart"}</span>{added ? <Check size={19} aria-hidden="true" /> : <ShoppingBag size={19} aria-hidden="true" />}
            </motion.button>
          </div>
          {atLimit ? <p id="detail-quantity-limit" className="usb-order-note" role="status">Limit {MAX_QUANTITY} per capacity. Reduce the quantity in your cart to add more.</p> : <p className="usb-order-note">Delivery and availability confirmed in WhatsApp.</p>}
          <a className="usb-details-link" href="#usb-details">Explore the details <ArrowUpRight size={16} aria-hidden="true" /></a>
        </div>
      </div>

      <section id="usb-details" className="usb-details" aria-labelledby="usb-details-title">
        <div className="usb-details-heading" data-reveal><h2 id="usb-details-title">Small drive.<br />Everyday essentials.</h2><p>{product.description}</p></div>
        <div className="usb-detail-columns">
          <dl className="usb-specifications">{product.specs.slice(0, 3).map(([label, value]) => <div key={label} data-reveal><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
          <div className="usb-warranty" data-reveal><span className="usb-warranty-number">5<span>years</span></span><div><h3>Official warranty.</h3><p>{product.specs.find(([label]) => label === "Warranty")?.[1]}</p></div></div>
        </div>
        {product.note && <p className="usb-order-note">{product.note}</p>}
      </section>
    </div>
    {hasSeenPurchase && !purchaseVisible && <div className="usb-mobile-purchase"><div><strong>{money(variant.price * selectedQuantity)}</strong><span>{selectedQuantity > 1 ? selectedQuantity + " × " : ""}{variant.label} · {variant.detail}</span></div><button type="button" className="usb-add" aria-label="Add selected USB to cart" aria-describedby={atLimit ? "detail-quantity-limit" : undefined} disabled={!ready || atLimit} onClick={addToCart}>{atLimit ? "Limit reached" : "Add to cart"}<ShoppingBag size={17} aria-hidden="true" /></button></div>}
  </article>;
}
