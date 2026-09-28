"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Check, ShoppingBag } from "lucide-react";
import Link from "next/link";
import ProductImage from "./product-image";
import { money, Product } from "@/lib/product";
import { useStore } from "./store-provider";
import { readCatalogReturn } from "@/lib/catalog-return";

export default function ProductDetail({ product }: { product: Product }) {
  const [variantId, setVariantId] = useState(product.variants[0].id);
  const { add, ready } = useStore();
  const variant = product.variants.find((item) => item.id === variantId)!;
  const photos = product.images?.length ? product.images : [product.image || ""];
  const [returnUrl, setReturnUrl] = useState("/#shop");
  useEffect(() => { setReturnUrl(readCatalogReturn()?.url || "/#shop"); }, []);
  return <div className="product-detail-page">
    <Link href={returnUrl} className="back-link"><ArrowLeft size={15} /> Back to catalog</Link>
    <div className="product-detail-grid">
      <div className="product-gallery">{photos.map((photo, index) => <div className="product-gallery-frame" key={`${photo}-${index}`}><ProductImage product={{ ...product, image: photo || undefined }} eager={index === 0} /><span>{String(index + 1).padStart(2, "0")} / {String(photos.length).padStart(2, "0")}</span></div>)}</div>
      <div className="product-detail-copy"><span className="eyebrow">{product.categoryLabel}</span><h1>{product.name}</h1><p className="product-detail-tagline">{product.tagline}</p><div className="detail-price">{money(variant.price)} <span>{variant.label}</span></div><p className="product-description">{product.description}</p>{product.variants.length > 1 ? <div className="detail-variants"><strong>Choose capacity</strong><div>{product.variants.map((item) => <button key={item.id} aria-pressed={item.id === variantId} onClick={() => setVariantId(item.id)}>{item.label}<small>{money(item.price)}</small></button>)}</div></div> : <div className="detail-single"><Check size={16} /> {variant.label} · {variant.detail}</div>}<button className="button button-dark detail-add" disabled={!ready} onClick={() => add(product.id, variant.id)}>Add to cart <ShoppingBag size={18} /></button><div className="detail-specs"><h2>Product details</h2><dl>{product.specs.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>{product.note && <p className="product-note">{product.note}</p>}</div></div>
    </div>
  </div>;
}
