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

Above the feedback form, a React Bits BounceCards preview shows the first three customer screenshots as overlapping photos with ivory borders. The cards bounce into view once and spread on hover or keyboard focus. Selecting a card opens that screenshot directly; “View all screenshots” opens the complete gallery. Preview cards and gallery frames have equal dimensions, with the whole image fitted inside each frame. The enlarged viewer supports Previous/Next and arrow keys. Escape returns to the gallery, then closes it and restores focus to the opening control. Touch, light/dark themes, live reduced-motion changes and direct image links without JavaScript are supported. Motion pauses when hidden, off-screen or covered by the gallery, and cleans up when leaving the page. The gallery can contain more than three images: place additional screenshots in `public/feedback/` and add their paths, dimensions and descriptive alt text to `src/lib/customer-feedback.ts`. The three supplied WhatsApp screenshots are optimized WebP files at their original dimensions; their messages are preserved as images.

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

### Ember theme

The round blood-drop button beside the light/dark control enables the optional Ember theme: obsidian black with blood and lava red. Headings use Oswald, interface text (buttons, labels, prices, the cart badge) uses Rajdhani, body copy keeps DM Sans, and the MOONSTORE wordmark uses Cinzel as the logo. These three fonts load only for Ember. Buttons, the selected filter and the cart badge use dark blood fills with vibrant red edges. The Popia, Cornflakes and Motul product designs keep their own palettes and type.

Hovering or focusing the drop button: after 0.1 s one drop forms under the rim and falls halfway while the button still looks normal. At 0.66 s the drop breaks into red and black slices and freezes like crashed code, and the whole button starts looping the theme switch's corruption (bands, blocks, static and scanlines on its face, a jittering red/black split and a torn rim). Leaving clears it. Reduced motion shows no drip or corruption.

Switching to or from Ember plays a 600 ms crimson data corruption in four phases. First the header and on-screen headings tear sideways through an SVG displacement filter with a red ghost, while sections jump sideways in steps. Then come glitch bands, dark red blocks, static, corrupted strings and small ring sigils, then crimson/black overload frames that cover the screen while the theme swaps (at 52%). Finally the glitch decays as the headings on screen decode back into their real text. The tear filter is limited to small areas because Chrome renders it on the CPU. Both controls are locked until it ends, the scroll position is kept, hidden tabs finish immediately and reduced motion uses a short fade. `moonstore-theme` also accepts `ember`; `moonstore-standard-theme` remembers the appearance to restore. The saved appearance applies before hydration without replaying the switch.

The Ember MOONSTORE wordmark is blood red. Blood pours into the letters once per visit (`moonstore-bleed` in session storage), then drips keep forming and releasing drops that fall behind the hero copy, stopping when you scroll away from Home and resuming when you return. The letter-drag glitch, sweep, hover reveal and spring return remain. Three small obsidian ring sigils behind the hero glitch crimson now and then. Reduced motion shows still blood and no falling drops.

Each section has its own Ember background, painted on a canvas behind the content:

- Hero, `/shop` and `/cart`: lava. Red-orange haze, dark land with lava flowing through its cracks, dark cubes with neon-red edges and rising embers.
- Home catalog: a tilted neon grid of thin red seams, dust, sparks and faint ring glyphs.
- Our story: a calmer grid, red and orange ember particles, and a dark lava mosaic when a team photo is hovered.
- Feedback and footer: a dark void with a low crimson horizon glow and dark stone blocks with red-lit edges.
- USB product page: the neon grid over lava.

Seams and edges near a fine pointer brighten smoothly, scenes shift slightly with scroll and fade at section edges, and static layers are cached so the backgrounds paint at the display's frame rate. Drawing pauses when a scene is offscreen, covered, in a hidden tab or outside Ember. Reduced motion shows still scenes.

In the Ember footer, the social sling buttons corrupt while dragged. After a 0.9 s hold a soft glitch appears, and past the arm point (where the band glows) it gets heavier the further you pull. An armed release plays a 0.35 s crimson burst, then opens the link. Back in its socket the button is "deleted": it thrashes, collapses to a line, leaves the socket empty and reboots. If the link took you to another tab, this plays when you return. A quick tap still opens immediately. The Cornflakes page's social buttons, the light/dark themes and reduced motion keep the original behaviour. The delayed link opening is allowed by Chrome, Edge and Firefox; older Safari may block a new tab opened after a delay, so test on Safari before relying on it.

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
