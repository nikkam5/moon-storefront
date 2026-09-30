"use client";

import { useState } from "react";
import { Cookie, Droplet, Usb, Wheat } from "lucide-react";
import { Product } from "@/lib/product";

export default function ProductImage({ product, compact = false, eager = false }: { product: Product; compact?: boolean; eager?: boolean }) {
  const [failedSource, setFailedSource] = useState<string | undefined>();
  const Icon = product.category === "tech" ? Usb : product.category === "motor" ? Droplet : product.id === "popia-nestum" ? Wheat : Cookie;
  const showPhoto = product.image && product.image !== failedSource;
  return <div className={`product-image-art art-${product.category} ${compact ? "compact-art" : ""}`}>
    {showPhoto ? <><img src={product.image} alt={product.name} loading={eager ? "eager" : "lazy"} fetchPriority={eager ? "high" : "auto"} decoding="async" sizes="(max-width: 600px) 100vw, (max-width: 1100px) 50vw, 33vw" draggable={false} onError={() => setFailedSource(product.image)} /></> : <div className="product-placeholder" role="img" aria-label={`${product.name} photo unavailable`}>
      {compact ? <span className="placeholder-icon"><Icon size={32} strokeWidth={1.5} aria-hidden="true" /></span> : <><span className="placeholder-category">{product.category === "motor" ? "4T motorcycle oil" : product.categoryLabel}</span><strong className="placeholder-name">{product.category === "motor" ? product.name.split(" ").pop() : product.name}</strong><span className="placeholder-spec">{product.variants[0].label} · {product.variants[0].detail}</span><span className="placeholder-bottom">Product photo pending</span></>}
    </div>}
  </div>;
}
