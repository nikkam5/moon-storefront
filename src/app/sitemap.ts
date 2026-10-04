import type { MetadataRoute } from 'next';
import { products } from '@/lib/product';
import { publicUrl } from '@/lib/site';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  return ['/', '/shop', ...products.map((product) => `/product/${product.id}`)].map((path) => ({ url: publicUrl(path) }));
}
