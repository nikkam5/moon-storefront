# Moon Store

A responsive Next.js / React / TypeScript storefront for Moon Store in Besut, Terengganu. Ivory, charcoal and lavender light/dark themes, a filterable catalog, an interactive USB model, a variant-aware cart, and click-to-chat WhatsApp checkout. Ordering uses a reviewable WhatsApp draft.

## Run

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Development output uses `.next-dev`; production builds statically export to `out/` for Netlify. `npm run start` serves the exported site on port 3100.

## Catalog and business details

- `src/lib/product.ts` — four products, eight purchasable options, store-supplied specifications and RM prices.
- `src/lib/business.ts` — address, founders, phone, email, hours, maps and the Facebook, Instagram and WhatsApp destinations.
- `src/lib/whatsapp.ts` — URL-encoded order message with variants, quantities, line totals and delivery/pickup placeholders.
- `src/components/layout/brand-logo.tsx` — SVG monogram; `src/app/icon.svg` — browser icon.
- `src/styles/` — shared colour tokens, responsive layouts and storefront styles.
- `docs/design-source/` — original teammate design references, including the Motul design adapted at `/product/motul-5100`.
- `src/components/home/team-story.tsx` — the four members, their roles and short Malay messages. Supplied portraits for Nik Amir, Iman Asnawi, Luqman and Arish Haikal live in `public/team/`.

The homepage contains `#home`, `#shop`, `#about` and `#feedback`. The feedback form prepares a WhatsApp draft for the customer to review and send. `/shop` also serves the complete catalog and `/cart` provides a full cart review. Filtering, variants and product detail expansion do not navigate away.

The feedback heading uses TextType to type once when it enters view, with a blinking cursor. Reduced-motion and no-JavaScript visitors see the full heading. Every product's Back to catalog link restores the originating catalog and filter.

Above the feedback form, an animated React Bits Folder previews the first three customer screenshots. Opening it reveals the complete gallery in equal-sized frames, with the whole image fitted inside each frame. Select an image to enlarge it; the viewer supports Previous/Next and arrow keys. Escape returns to the gallery, then closes it and restores focus to the folder. Touch, light/dark themes, live reduced-motion changes and direct image links without JavaScript are supported. The gallery can contain more than three images: place additional screenshots in `public/feedback/` and add their paths, dimensions and descriptive alt text to `src/lib/customer-feedback.ts`. The three supplied WhatsApp screenshots are optimized WebP files at their original dimensions; their messages are preserved as images.

Cornflakes Madu retains the supplied green-and-gold honeycomb design, with the 5 October reference saved in `docs/design-source/cornflakes-madu-update-2026-10-05.html`. Mini Jar (approx. 150g, RM 10.00) and Standard Jar (approx. 250g, RM 15.00) are selectable on the product and shop pages, with separate cart rows, quantity limits and WhatsApp order details. Standard Jar remains the product page's initial selection. The reference contains inconsistent weight ranges; the displayed weights follow its explicit Mini/Standard labels. The existing ingredient/allergen note is retained rather than adding unconfirmed wheat or preservative claims. Its referenced `Sweet Pixel Paradise.jpg` background was not supplied, so the existing CSS honeycomb remains in place.

The hero's four product photos use a React Bits Stack: click or press Enter to cycle, or drag a card on desktop. The product name below links to its details. Touch devices use tap-to-cycle so vertical page scrolling stays usable. The hero scrolls naturally on screens too short for the full composition.

The USB detail page uses a coordinated title entrance, a moving light backdrop, animated capacity/price changes and the approved interactive Kingston 3D model. Drag horizontally to rotate, open the cap, or use the keyboard-accessible Rotate and Reset controls. Three.js loads only as the product stage approaches the viewport; rendering runs on demand, stops off-screen/in hidden tabs, and releases graphics resources when leaving the page. Touch gestures preserve vertical scrolling. Unsupported graphics, context loss and failed model loads show the original product photo. Its quantity selector respects the remaining cart limit for each capacity. On phones, a purchase bar appears after the main controls have been seen and scrolled away; its price reflects the selected quantity. The backdrop pauses off-screen and in hidden tabs, and motion respects live reduced-motion changes. The presentation is labelled as the blue 128GB model for every selection; capacity, colour, quantity and price in the buying panel determine the order. The 559 KiB GLB is served locally from public/models; its cap node is named Cap and its textures are embedded.

The homepage catalog previews use 380 × 240px TearTickets in two desktop columns, scaling down on phones. Click or tap a picture to open its product, or pull a price stub fully free and release. Short pulls spring back; Escape or pointer cancellation restores the ticket. Picture links also work without JavaScript. Category and scroll position are saved for the return to the homepage catalog.

MOONSTORE's idle sweep uses the display's animation-frame cadence. Its canvas clears and composites only the glyph/frame bounds, so the wide letter-drag field does not require a full-canvas repaint each frame. Rendering pauses off-screen or when the tab is hidden.

The `/shop` catalog uses compact four-column cards on wide screens, two columns on tablets, and one column on phones. React Bits TiltedCard adds a restrained desktop photo tilt; reduced-motion and touch visitors get static photos. Footer social links use SlingButton: tap or activate by keyboard to open a link, or pull and release the loaded pad.

### Photos

Put product photos in `public/products/`, then add `image: "/products/your-photo.jpg"` to the corresponding product. Photos are shared by the catalog and cart. The supplied Motul photos show **4L** bottles, but the listing is for **1 Litre at RM 55.00**; the catalog and product page state this difference until matching 1L photos are provided. Missing or broken catalog images fall back to labeled placeholders.

### Ordering and storage

The checkout button opens `https://wa.me/601161647061` with a prefilled message. The customer reviews it, fills in their details and taps Send in WhatsApp. It does **not** send automatically, collect a payment or confirm an order. Cart totals exclude unconfirmed delivery fees; availability and delivery are agreed in chat. Opening WhatsApp does not clear the cart.

All products use one accessible cart dialog with complete line items, subtotal and checkout. Cart data uses `moonstore-cart-v2` in browser storage; it is validated on load and synchronized across open tabs. Old demo-cart data is deliberately excluded. Theme preference uses `moonstore-theme` and defaults to dark for new visitors. Theme is applied before paint. Scroll effects respect reduced-motion preferences, including live preference changes; content stays readable without JavaScript.

## Project layout

```text
src/
  app/                  Next.js routes, metadata, sitemap and robots
  components/
    layout/             Header, footer, branding and theme controls
    home/               Hero, team and customer feedback
    catalog/            Filters, product cards and ticket integration
    products/           Product detail pages and shared photo rendering
    cart/               Shared cart state, dialog and review page
    motion/             Reusable interactive animation components
  lib/                  Catalog, business, checkout, return state and site URL
  styles/               Global theme and responsive storefront styles
public/products/        Product photographs
public/models/          Approved 3D product assets
public/team/            Optimized portraits for all four team members
public/feedback/        Customer feedback screenshots
tests/                  Playwright functional and animation regressions
docs/                   Design references, historical audit and maintenance notes
```

Component styles stay beside their component. The root contains only documentation and required build/test/deployment configuration. `.agents/` and `skills-lock.json` are maintained development instructions. Dependencies, build output, caches and browser test artifacts are ignored by Git.

### Store colors and team content

Every route uses warm ivory, charcoal and muted lavender for the shared store theme, including navigation, cart and the Moon Store footer. `src/styles/store-palette.css` contains this global palette. Product-specific styles remain scoped to their own components: Popia keeps its green and cream theme, Cornflakes keeps its dark green and honey-gold theme, and Motul keeps its black and red theme. The shared palette also works without JavaScript and stays consistent during client navigation.

All four team members have optimized WebP portraits. The message box keeps the same dimensions for every member at each responsive breakpoint; Malay messages use the available width and wrap as ordinary sentences. The original layouts, product colors, 3D model and interactions remain in place.

## Deployment and assets

The public site is `https://moonst0re.netlify.app`. Metadata uses `NEXT_PUBLIC_SITE_URL` when set, then Netlify's `URL`/`DEPLOY_PRIME_URL`, then that known public origin. Copy `.env.example` to `.env.local` to override it for a custom domain. Localhost metadata is rejected. `/shop` and each product have their own canonical URL, `/cart` is noindex, and the static export includes `/robots.txt` and `/sitemap.xml`.

Netlify builds with Node 22 and publishes `out/`. Fonts are downloaded at build time by `next/font` and served locally; the browser does not request Google Fonts. A fresh build therefore needs Internet access. Popia uses compressed WebP assets with 640px and 1080px alternatives. Keep `imageWidth`, `imageHeight` and `imageSrcSet` in the catalog aligned with replacement photos.

Next's bundled PostCSS is overridden to the patched root PostCSS dependency. Keep this override until a compatible Next release bundles a patched version, and validate dependency changes with `npm audit`, the build and browser tests.

## Verify

```sh
npm run typecheck
npm run build
npx playwright install chromium
npm test
```

Windows PowerShell with installed Chrome:

```powershell
$env:PLAYWRIGHT_CHANNEL='chrome'; npm test
```

Tests cover category filters, every USB capacity/price, variant line separation, the exact RM 135.00 WhatsApp example, intercepted checkout navigation (no real message sent), persistence, invalid stored data, cross-tab cart updates, mixed-product snack carts, quantity limits, field validation, light/dark themes, 320px layouts, metadata, live reduced motion, interrupted animation gestures, canvas pause/resume, mobile navigation and short landscape screens. Mobile tests use Chromium with an iPhone-sized viewport; native Safari and low-end physical devices still require device testing.
