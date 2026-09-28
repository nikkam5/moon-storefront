"use client";

import { useState } from "react";
import { Cookie, Droplet, Usb, Wheat } from "lucide-react";
import { Product } from "@/lib/product";

export default function ProductImage({ product, compact = false, eager = false }: { product: Product; compact?: boolean; eager?: boolean }) {
  const [failedSource, setFailedSource] = useState<string | undefined>();
  const Icon = product.category === "tech" ? Usb : product.category === "motor" ? Droplet : product.id === "popia-nestum" ? Wheat : Cookie;
  const showPhoto = product.image && product.image !== failedSource;
  return <div className={`product-image-art art-${product.category} ${compact ? "compact-art" : ""}`}>
    {showPhoto ? <>{product.id === "kingston-dtxg2" && !compact && <div className="usb-studio-copy" aria-hidden="true"><span>EVERYDAY STORAGE / 001</span><strong>DATA<br />IN MOTION.</strong><small>USB 3.2 GEN 1 · TYPE-A</small></div>}<img src={product.image} alt={product.name} loading={eager ? "eager" : "lazy"} fetchPriority={eager ? "high" : "auto"} decoding="async" sizes="(max-width: 600px) 100vw, (max-width: 1100px) 50vw, 33vw" draggable={false} onError={() => setFailedSource(product.image)} />{product.id === "kingston-dtxg2" && !compact && <span className="usb-studio-mark" aria-hidden="true">MS / TECH</span>}</> : <div className="product-placeholder" role="img" aria-label={`${product.name} — product photo coming soon`}>
      <div className="placeholder-decoration" aria-hidden="true" /><span className="placeholder-icon"><Icon size={76} strokeWidth={1.25} aria-hidden="true" /></span>
      {!compact && <><span className="placeholder-name">{product.category === "tech" ? "Save the good stuff." : product.category === "motor" ? "Ready for the next ride." : "One more bite?"}</span><span className="placeholder-bottom">PRODUCT PHOTO COMING SOON</span></>}
    </div>}
  </div>;
}
