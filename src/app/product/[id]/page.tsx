import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductDetail from "@/components/product-detail";
import PopiaNestumDetail from "@/components/popia-nestum-detail";
import HoneyCornflakesDetail from "@/components/honey-cornflakes-detail";
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
  const image = product.image || "/products/usb.png";
  return {
    title: product.name,
    description: `${product.tagline} ${product.description}`,
    alternates: { canonical: `/product/${product.id}` },
    openGraph: {
      title: `${product.name} | Moon Store`,
      description: product.tagline,
      type: "website",
      images: [{ url: image, alt: product.name }],
    },
    twitter: { card: "summary_large_image", title: `${product.name} | Moon Store`, description: product.tagline, images: [image] },
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
    image: product.image ? [product.image] : undefined,
    offers: product.variants.map((variant) => ({
      "@type": "Offer",
      name: `${product.orderName} (${variant.label})`,
      price: variant.price,
      priceCurrency: "MYR",
      availability: "https://schema.org/InStock",
    })),
  };
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />{id === "popia-nestum" ? <PopiaNestumDetail product={product} /> : id === "honey-cornflakes" ? <HoneyCornflakesDetail product={product} /> : <section className="section-wrap product-page"><ProductDetail product={product} /></section>}</>;
}
