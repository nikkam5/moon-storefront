"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import ProductImage from "../products/product-image";
import BorderGlow from "../motion/border-glow";
import TiltedCard from "../motion/tilted-card";
import ProductTicket from "./product-ticket";
import { Category, getProduct, MAX_QUANTITY, money, Product, products } from "@/lib/product";
import { useStore } from "../cart/store-provider";
import { readCatalogReturn, saveCatalogReturn } from "@/lib/catalog-return";
import { business } from "@/lib/business";

const filters: { id: "all" | Category; label: string }[] = [
  { id: "all", label: "All" }, { id: "tech", label: "Tech Storage" }, { id: "motor", label: "Motor Care" }, { id: "treats", label: "Sweet Treats" },
];
const homeProducts = [getProduct("popia-nestum"), getProduct("honey-cornflakes"), getProduct("kingston-dtxg2"), getProduct("motul-5100")];

function CatalogPhoto({ product, tilted = false }: { product: Product; tilted?: boolean }) {
  const [failedSource, setFailedSource] = useState<string>();
  return <div className={`catalog-card-image${tilted ? " catalog-card-image-tilted" : ""}`}>{tilted && product.image && failedSource !== product.image ? <TiltedCard imageSrc={product.image} altText={product.id === "motul-5100" ? `${product.name}, 4L bottle shown` : product.name} captionText={product.name} containerHeight="100%" containerWidth="100%" imageHeight="100%" imageWidth="100%" scaleOnHover={1.035} rotateAmplitude={8} showMobileWarning={false} showTooltip={false} onImageError={() => setFailedSource(product.image)} /> : <ProductImage product={failedSource === product.image ? { ...product, image: undefined } : product} />}{!tilted && <><span className="category-badge">{product.categoryLabel}</span>{product.id === "motul-5100" && <span className="catalog-photo-note">4L bottle shown · price is for 1L</span>}</>}</div>;
}

export default function ShopCatalog({ simple = false }: { simple?: boolean }) {
  const [filter, setFilter] = useState<"all" | Category>("all");
  useEffect(() => {
    const saved = readCatalogReturn();
    if (saved?.url === location.pathname + location.search + location.hash) {
      if (filters.some((entry) => entry.id === saved.filter)) setFilter(saved.filter as "all" | Category);
      requestAnimationFrame(() => window.scrollTo({ top: saved.scrollY, behavior: "instant" }));
      sessionStorage.removeItem("moonstore-catalog-return");
    }
  }, []);
  const count = products.filter((product) => filter === "all" || product.category === filter).length;
  return <div className={`shop-catalog ${simple ? "shop-catalog-preview shop-catalog-tickets" : ""}`} data-filter={filter}>
    <div className="catalog-toolbar"><div className="category-filters" role="group" aria-label="Filter products by category">{filters.map((entry) => <button key={entry.id} aria-pressed={filter === entry.id} onClick={() => setFilter(entry.id)}>{entry.label}{entry.id === "all" && <span>{products.length}</span>}</button>)}</div><span className="result-count" role="status">{count} {count === 1 ? "product" : "products"}</span></div>
    <div className="catalog-grid" id="catalog-products">{(simple ? homeProducts : products).map((product) => simple ? <ProductTicket key={product.id} product={product} hidden={filter !== "all" && product.category !== filter} onOpen={() => saveCatalogReturn(filter, "/#shop")} /> : <ProductCard key={product.id} product={product} hidden={filter !== "all" && product.category !== filter} onOpen={() => saveCatalogReturn(filter)} />)}</div>
    <div className="catalog-end"><span>Availability and delivery options are confirmed with our team.</span>{simple ? <Link href="/shop">Shop all products <ArrowUpRight size={16} aria-hidden="true" /></Link> : <a href={business.whatsapp} target="_blank" rel="noopener noreferrer">Chat on WhatsApp <ArrowUpRight size={16} aria-hidden="true" /></a>}</div>
  </div>;
}

function ProductCard({ product, hidden, onOpen }: { product: Product; hidden: boolean; onOpen: () => void }) {
  const [variantId, setVariantId] = useState(product.variants[0].id);
  const { add, ready, items } = useStore();
  const variant = product.variants.find((entry) => entry.id === variantId)!;
  const quantity = items.find((item) => item.productId === product.id && item.variantId === variantId)?.quantity ?? 0;
  return <BorderGlow as="article" className={`catalog-card category-${product.category}`} hidden={hidden} labelledBy={`${product.id}-name`}>
    <Link href={`/product/${product.id}`} onClick={onOpen} className="catalog-card-link"><CatalogPhoto product={product} tilted /><div className="catalog-card-body"><span className="product-kicker">{product.id === "kingston-dtxg2" ? "USB 3.2 GEN 1 · TYPE-A" : product.categoryLabel}</span><h3 id={`${product.id}-name`}>{product.name}</h3>{product.id === "motul-5100" && <span className="compact-photo-note">4L bottle shown · price is for 1L</span>}</div></Link>
    <div className="catalog-card-body catalog-card-controls">
      {product.variants.length > 1 && <div className="product-options"><div className="variant-heading"><span>{product.id === "kingston-dtxg2" ? "Choose capacity" : "Choose your jar"}</span><span>{variant.color && <i style={{ background: variant.color }} />}{variant.detail}</span></div><div className="variant-pills" role="group" aria-label={`${product.name} ${product.id === "kingston-dtxg2" ? "capacity" : "jar size"}`}>{product.variants.map((entry) => <button key={entry.id} aria-pressed={variantId === entry.id} onClick={() => setVariantId(entry.id)}>{entry.label}</button>)}</div></div>}
      <details className="product-details"><summary>Product details <Plus size={16} /></summary><p>{product.description}</p><dl>{product.specs.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>{product.note && <p className="product-note">{product.note}</p>}</details>
      <div className="product-purchase"><div><span className="price-label">{variant.label}</span><strong className="product-price" aria-live="polite">{money(variant.price)}</strong></div><button className="button button-dark add-button" disabled={!ready || quantity >= MAX_QUANTITY} onClick={() => add(product.id, variantId)} aria-label={`Add ${product.orderName} ${variant.label} to cart`}>{quantity >= MAX_QUANTITY ? "Limit reached" : "Add to cart"}<Plus size={17} /></button></div>
      <span className="cart-option-count" aria-live="polite">{quantity > 0 ? `${quantity} of this option in your cart` : ""}</span>
    </div>
  </BorderGlow>;
}
