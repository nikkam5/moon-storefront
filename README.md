# Moon Store

A responsive Next.js / React / TypeScript storefront for Moon Store in Besut, Terengganu. Colourful light/dark themes, a filterable catalog, variant-aware cart, and click-to-chat WhatsApp checkout. No payment gateway, backend order submission, or 3D models.

## Run

```sh
npm install
npm run dev
```

Open http://localhost:3000. Development output uses `.next-dev`; production builds statically export to `out/` for Netlify. `npm run start` serves the exported site on port 3100.

## Catalog and business details

- `src/lib/product.ts` — four products, seven purchasable options, store-supplied specifications and RM prices.
- `src/lib/business.ts` — address, founders, phone, email, hours, maps and the Facebook, Instagram and WhatsApp destinations.
- `src/lib/whatsapp.ts` — URL-encoded order message with variants, quantities, line totals and delivery/pickup placeholders.
- `src/components/brand-logo.tsx` — SVG monogram; `src/app/icon.svg` — browser icon.
- `src/app/globals.css` — light/dark colour tokens and responsive styles.
- `landing_page_motul_5100.html` — teammate's Motul 5100 design source, adapted at `/product/motul-5100` with the catalog's RM 55.00 price and Moon Store's WhatsApp number. The detail page has a two-photo gallery.
- `src/components/team-story.tsx` — the four members and their 4:3 portrait slots. Add image URLs and personal messages here when available.

The homepage contains `#home`, `#shop`, `#about` and `#feedback`. The feedback form prepares a WhatsApp draft for the customer to review and send. `/shop` also serves the complete catalog and `/cart` provides a full cart review. Filtering, variants and product detail expansion do not navigate away.

The hero's four product photos use a React Bits Stack: click or press Enter to cycle, or drag a card on desktop. The product name below links to its details. Touch devices use tap-to-cycle so vertical page scrolling stays usable. The hero scrolls naturally on screens too short for the full composition.

The homepage catalog previews use 380 × 240px TearTickets in two desktop columns, scaling down on phones. Click or tap a picture to open its product, or pull a price stub fully free and release. Short pulls spring back; Escape or pointer cancellation restores the ticket. Picture links also work without JavaScript. Category and scroll position are saved for the return to the homepage catalog.

MOONSTORE's idle sweep uses the display's animation-frame cadence. Its canvas clears and composites only the glyph/frame bounds, so the wide letter-drag field does not require a full-canvas repaint each frame. Rendering pauses off-screen or when the tab is hidden.

The `/shop` catalog uses compact four-column cards on wide screens, two columns on tablets, and one column on phones. React Bits TiltedCard adds a restrained desktop photo tilt; reduced-motion and touch visitors get static photos. Footer social links use SlingButton: tap or activate by keyboard to open a link, or pull and release the loaded pad.

### Photos

Put product photos in `public/products/`, then add `image: "/products/your-photo.jpg"` to the corresponding product. Photos are shared by the catalog and cart. The supplied Motul photos show **4L** bottles, but the listing is for **1 Litre at RM 55.00**; the catalog and product page state this difference until matching 1L photos are provided. Missing or broken catalog images fall back to labeled placeholders.

### Ordering and storage

The checkout button opens `https://wa.me/601161647061` with a prefilled message. The customer reviews it, fills in their details and taps Send in WhatsApp. It does **not** send automatically, collect a payment or confirm an order. Cart totals exclude unconfirmed delivery fees; availability and delivery are agreed in chat. Opening WhatsApp does not clear the cart.

Cart data uses `moonstore-cart-v2` in browser storage; it is validated on load and synchronized across open tabs. Old demo-cart data is deliberately excluded. Theme preference uses `moonstore-theme` and defaults to dark for new visitors. Theme is applied before paint. Scroll effects respect reduced-motion preferences; content stays readable without JavaScript.

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

Tests cover category filters, every USB capacity/price, variant line separation, the exact RM 130.00 WhatsApp example, intercepted checkout navigation (no real message sent), persistence, invalid stored data, cross-tab cart updates, quantity limits, light/dark themes, reduced motion, mobile navigation and short landscape screens.
