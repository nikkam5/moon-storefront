"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, Plus } from "lucide-react";
import ProductImage from "./product-image";
import BorderGlow from "./border-glow";
import { Category, getProduct, MAX_QUANTITY, money, Product, products } from "@/lib/product";
import { useStore } from "./store-provider";
import { readCatalogReturn, saveCatalogReturn } from "@/lib/catalog-return";
import { business } from "@/lib/business";

const filters: { id: "all" | Category; label: string }[] = [
  { id: "all", label: "All" }, { id: "tech", label: "Tech Storage" }, { id: "motor", label: "Motor Care" }, { id: "treats", label: "Sweet Treats" },
];
const homeProducts = [getProduct("popia-nestum"), getProduct("honey-cornflakes"), getProduct("kingston-dtxg2"), getProduct("motul-5100")];

function CatalogPhoto({ product }: { product: Product }) {
  return <div className="catalog-card-image"><ProductImage product={product} /><span className="category-badge">{product.categoryLabel}</span>{product.id === "motul-5100" && <span className="catalog-photo-note">4L bottle shown · price is for 1L</span>}</div>;
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
  return <div className={`shop-catalog ${simple ? "shop-catalog-preview" : ""}`} data-filter={filter}>
    <div className="catalog-toolbar"><div className="category-filters" role="group" aria-label="Filter products by category">{filters.map((entry) => <button key={entry.id} aria-pressed={filter === entry.id} onClick={() => setFilter(entry.id)}>{entry.label}{entry.id === "all" && <span>{products.length}</span>}</button>)}</div><span className="result-count" role="status">{count} {count === 1 ? "product" : "products"}</span></div>
    <div className="catalog-grid" id="catalog-products">{(simple ? homeProducts : products).map((product) => simple ? <BorderGlow as="article" key={product.id} className={`catalog-card category-${product.category}`} hidden={filter !== "all" && product.category !== filter} labelledBy={`${product.id}-name`}><Link href={`/product/${product.id}`} onClick={() => saveCatalogReturn(filter)} className="catalog-card-link"><CatalogPhoto product={product} /><div className="catalog-card-body"><span className="home-card-detail">{product.variants[0].detail}</span><h3 id={`${product.id}-name`}>{product.name}</h3><p className="home-card-tagline">{product.tagline}</p><div className="home-card-bottom"><strong className="product-price">{product.variants.length > 1 ? "From " : ""}{money(product.variants[0].price)}</strong><span className="home-card-action">View product <ArrowUpRight size={17} aria-hidden="true" /></span></div></div></Link></BorderGlow> : <ProductCard key={product.id} product={product} hidden={filter !== "all" && product.category !== filter} onOpen={() => saveCatalogReturn(filter)} />)}</div>
    <div className="catalog-end"><span>Availability and delivery options are confirmed with our team.</span>{simple ? <Link href="/shop">Shop all products <ArrowUpRight size={16} aria-hidden="true" /></Link> : <a href={business.whatsapp} target="_blank" rel="noopener noreferrer">Chat on WhatsApp <ArrowUpRight size={16} aria-hidden="true" /></a>}</div>
  </div>;
}

function ProductCard({ product, hidden, onOpen }: { product: Product; hidden: boolean; onOpen: () => void }) {
  const [variantId, setVariantId] = useState(product.variants[0].id);
  const { add, ready, items } = useStore();
  const variant = product.variants.find((entry) => entry.id === variantId)!;
  const quantity = items.find((item) => item.productId === product.id && item.variantId === variantId)?.quantity ?? 0;
  return <BorderGlow as="article" className={`catalog-card category-${product.category}`} hidden={hidden} labelledBy={`${product.id}-name`}>
    <Link href={`/product/${product.id}`} onClick={onOpen} className="catalog-card-link"><CatalogPhoto product={product} /><div className="catalog-card-body"><span className="product-kicker">{product.id === "kingston-dtxg2" ? "USB 3.2 GEN 1 · TYPE-A" : product.variants[0].detail}</span><h3 id={`${product.id}-name`}>{product.name}</h3><p className="product-tagline">{product.tagline}</p></div></Link>
    <div className="catalog-card-body catalog-card-controls">
      {product.variants.length > 1 ? <div className="product-options"><div className="variant-heading"><span>Choose capacity</span><span><i style={{ background: variant.color }} />{variant.detail}</span></div><div className="variant-pills" role="group" aria-label={`${product.name} capacity`}>{product.variants.map((entry) => <button key={entry.id} aria-pressed={variantId === entry.id} onClick={() => setVariantId(entry.id)}>{entry.label}</button>)}</div></div> : <div className="single-variant"><Check size={14} /><span>{variant.label} · {variant.detail}</span></div>}
      <details className="product-details"><summary>Product details <Plus size={16} /></summary><p>{product.description}</p><dl>{product.specs.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>{product.note && <p className="product-note">{product.note}</p>}</details>
      <div className="product-purchase"><div><span className="price-label">{variant.label}</span><strong className="product-price" aria-live="polite">{money(variant.price)}</strong></div><button className="button button-dark add-button" disabled={!ready || quantity >= MAX_QUANTITY} onClick={() => add(product.id, variantId)} aria-label={`Add ${product.orderName} ${variant.label} to cart`}>{quantity >= MAX_QUANTITY ? "Limit reached" : "Add to cart"}<Plus size={17} /></button></div>
      <span className="cart-option-count" aria-live="polite">{quantity > 0 ? `${quantity} of this option in your cart` : "Order directly with our team on WhatsApp"}</span>
    </div>
  </BorderGlow>;
}
