import type { Metadata } from 'next';
import CartPage from '@/components/cart/cart-page';

export const metadata: Metadata = {
  title: 'Your cart',
  robots: { index: false, follow: true },
  alternates: { canonical: '/cart' },
};

export default function Cart() {
  return <CartPage />;
}
