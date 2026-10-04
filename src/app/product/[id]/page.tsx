import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import ProductDetail from "@/components/products/product-detail";
import PopiaNestumDetail from "@/components/products/popia-nestum-detail";
import HoneyCornflakesDetail from "@/components/products/honey-cornflakes-detail";
import Motul5100Detail from "@/components/products/motul-5100-detail";
import { getProduct, isProductId, products } from "@/lib/product";
import { publicUrl, siteUrl } from "@/lib/site";
import "@/components/products/popia-nestum-detail.css";
import "@/components/products/honey-cornflakes-detail.css";

export function generateStaticParams() { return products.map((product) => ({ id: product.id })); }
export async function generateViewport({ params }: { params: Promise<{ id: string }> }): Promise<Viewport> {
  const { id } = await params;
  const teammate = id !== "kingston-dtxg2";
  return { themeColor: [
    { media: "(prefers-color-scheme: light)", color: teammate ? "#faf7f0" : "#f5f1e8" },
    { media: "(prefers-color-scheme: dark)", color: teammate ? "#0c1729" : "#15161a" },
  ] };
}
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  if (!isProductId(id)) return { title: "Product not found" };
  const product = getProduct(id);
  const title = id === "popia-nestum" ? "Popia Nestum - Rangup Sampai Habis" : id === "honey-cornflakes" ? "Cornflakes Madu" : product.name;
  const image = product.image ? publicUrl(product.image) : undefined;
  return {
    title,
    description: `${product.tagline} ${product.description}`,
    alternates: siteUrl ? { canonical: `/product/${product.id}` } : undefined,
    openGraph: {
      title: `${title} | Moon Store`,
      description: product.tagline,
      type: "website",
      images: image ? [{ url: image, alt: product.name }] : undefined,
    },
    twitter: { card: image ? "summary_large_image" : "summary", title: `${title} | Moon Store`, description: product.tagline, images: image ? [image] : undefined },
  };
}
export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isProductId(id)) notFound();
  const product = getProduct(id);
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    category: product.categoryLabel,
    image: siteUrl ? (product.images?.length ? product.images : product.image ? [product.image] : []).map((image) => publicUrl(image)) : undefined,
    url: publicUrl(`/product/${product.id}`),
    offers: product.variants.map((variant) => ({
      "@type": "Offer",
      name: `${product.orderName} (${variant.label})`,
      price: variant.price,
      priceCurrency: "MYR",
    })),
  };
  return <>{id !== "kingston-dtxg2" && <span hidden className="teammate-palette" aria-hidden="true" />}<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />{id === "popia-nestum" ? <PopiaNestumDetail product={product} /> : id === "honey-cornflakes" ? <HoneyCornflakesDetail product={product} /> : id === "motul-5100" ? <Motul5100Detail product={product} /> : <ProductDetail product={product} />}</>;
}
