import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductDetail from "@/components/product-detail";
import PopiaNestumDetail from "@/components/popia-nestum-detail";
import HoneyCornflakesDetail from "@/components/honey-cornflakes-detail";
import Motul5100Detail from "@/components/motul-5100-detail";
import { getProduct, isProductId, products } from "@/lib/product";
import "@/components/popia-nestum-detail.css";
import "@/components/honey-cornflakes-detail.css";

export function generateStaticParams() { return products.map((product) => ({ id: product.id })); }
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  if (!isProductId(id)) return { title: "Product not found" };
  const product = getProduct(id);
  if (id === "popia-nestum") return { title: "Popia Nestum - Rangup Sampai Habis", description: product.description, alternates: { canonical: `/product/${id}` } };
  if (id === "honey-cornflakes") return { title: "Cornflakes Madu - Moon Store", description: product.description, alternates: { canonical: `/product/${id}` } };
  return {
    title: product.name,
    description: `${product.tagline} ${product.description}`,
    alternates: { canonical: `/product/${product.id}` },
    openGraph: {
      title: `${product.name} | Moon Store`,
      description: product.tagline,
      type: "website",
      images: product.image ? [{ url: product.image, alt: product.name }] : undefined,
    },
    twitter: { card: product.image ? "summary_large_image" : "summary", title: `${product.name} | Moon Store`, description: product.tagline, images: product.image ? [product.image] : undefined },
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
    image: product.images?.length ? product.images : product.image ? [product.image] : undefined,
    offers: product.variants.map((variant) => ({
      "@type": "Offer",
      name: `${product.orderName} (${variant.label})`,
      price: variant.price,
      priceCurrency: "MYR",
    })),
  };
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />{id === "popia-nestum" ? <PopiaNestumDetail product={product} /> : id === "honey-cornflakes" ? <HoneyCornflakesDetail product={product} /> : id === "motul-5100" ? <Motul5100Detail product={product} /> : <section className="section-wrap product-page"><ProductDetail product={product} /></section>}</>;
}
