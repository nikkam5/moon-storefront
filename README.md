# Moon Store

A responsive Next.js / React / TypeScript storefront for Moon Store in Besut, Terengganu. Colourful light/dark themes, a filterable catalog, variant-aware cart, and click-to-chat WhatsApp checkout. No payment gateway, backend order submission, or 3D models.

## Run

```sh
npm install
npm run dev
```

Open http://localhost:3000. Development output uses `.next-dev`; production output uses `.next` so builds do not overwrite the dev server's chunks. Restart any dev server that was running before this configuration change.

## Catalog and business details

- `src/lib/product.ts` — five products, eight purchasable options, store-supplied specifications and RM prices.
- `src/lib/business.ts` — address, founders, phone, email, hours, maps and WhatsApp destination.
- `src/lib/whatsapp.ts` — URL-encoded order message with variants, quantities, line totals and delivery/pickup placeholders.
- `src/components/brand-logo.tsx` — SVG monogram; `src/app/icon.svg` — browser icon.
- `src/app/globals.css` — light/dark colour tokens and responsive styles.

The homepage contains `#home`, `#shop`, `#about` and `#contact`. `/shop` also serves the complete catalog and `/cart` provides a full cart review. Filtering, variants and product detail expansion do not navigate away.

### Photos

Put product JPGs in `public/products/`, then add `image: "/products/your-photo.jpg"` to the corresponding product. Photos are shared by the catalog and cart. Until then, cards explicitly show photo placeholders. Missing or broken images fall back to the placeholder.

### Ordering and storage

The checkout button opens `https://wa.me/601161647061` with a prefilled message. The customer reviews it, fills in their details and taps Send in WhatsApp. It does **not** send automatically, collect a payment or confirm an order. Cart totals exclude unconfirmed delivery fees; availability and delivery are agreed in chat. Opening WhatsApp does not clear the cart.

Cart data uses `moonstore-cart-v2` in browser storage; it is validated on load and synchronized across open tabs. Old demo-cart data is deliberately excluded. Theme preference uses `moonstore-theme`, otherwise following the system setting. Theme is applied before paint. Scroll effects respect reduced-motion preferences; content stays readable without JavaScript.

## Verify

```sh
npm run build
npx playwright install chromium
npm test
```

Windows PowerShell with installed Chrome:

```powershell
$env:PLAYWRIGHT_CHANNEL='chrome'; npm test
```

Tests cover category filters, every USB capacity/price, variant line separation, the exact RM 235.00 WhatsApp example, intercepted checkout navigation (no real message sent), persistence, invalid stored data, cross-tab cart updates, quantity limits, light/dark themes, system preferences, reduced motion, mobile navigation and short landscape screens.
