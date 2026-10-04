# Moon Store website audit — 2 October 2026

This is the historical audit of the project before the 4 October fixes. See [the maintenance record](../maintenance-2026-10-04.md) for the current implementation and verification. Source paths and screenshots below describe that earlier snapshot.

Moon Store builds successfully and its shared cart works in the tested flows, but the snack product pages introduce inconsistent cart behavior, accessibility failures, incorrect content and metadata. Address the cart and contact/ingredient issues first.

This review covers the current working tree, including the changes already present when the audit began. No application fixes or dependency upgrades were made. The report, screenshots and JSON evidence were added under this directory.

**Scope and validation**

- Reviewed the application structure, catalog data, shared cart, custom product pages, navigation, forms, themes, motion components, metadata, images, static export and deployment configuration.
- Built the production static export successfully with `npm run build`.
- Ran the existing browser suite against the production export: **112 cases; 100 passed, 9 skipped, 3 failed initially**. All three failed cases passed in a focused rerun of four tests. The failures involved blocked external font requests and an immediate color assertion during a theme transition.
- Manually exercised mixed-product carts, the snack drawers, keyboard focus and Escape behavior, the USB quantity limit, catalog return navigation and product form fields.
- Checked all seven public routes at 320 × 568, 768 × 1024 and 1280 × 720: 21 route/viewport combinations. Also inspected phone and landscape drawer layouts.
- Inspected the generated HTML for titles, canonical URLs, sharing previews, robots metadata and landmarks; measured the Popia image and a specific text contrast ratio.
- Ran a standalone TypeScript check and npm dependency audits. The build passed; the standalone check found a test-file type error. The dependency audit reported two affected packages.

Priorities below describe the impact on this storefront. A dependency advisory's published severity is reported separately from demonstrated exploitability.

**Problems affecting customers**

**1. High — Snack carts show incomplete items and misleading totals, with no checkout action.**

Both Popia and Cornflakes drawers read only their own product's quantity from the shared cart, but present themselves as “Your Cart.” With one RM40 USB in the cart, opening Popia's drawer showed “Cart masih kosong” while the header showed one item. After adding Popia, the drawer showed only RM10 even though the shared total was RM50. Cornflakes behaved the same way: its drawer showed RM15 for an order whose shared total was RM65.

These drawers have no WhatsApp checkout or full-cart review link. A customer must close the overlay and discover the header cart to finish a mixed order. The underlying shared cart data and full-cart total remain correct; the defect is the competing cart interface.

Sources: [Popia drawer](<C:/Users/ASUS TUF/Documents/Perniagaan/src/components/popia-nestum-detail.tsx:61>), [Cornflakes drawer](<C:/Users/ASUS TUF/Documents/Perniagaan/src/components/honey-cornflakes-detail.tsx:148>). Evidence: [empty-cart mismatch](<C:/Users/ASUS TUF/Documents/Perniagaan/docs/audit-2026-10-02/popia-empty-cart-mismatch.png>), [Popia partial total](<C:/Users/ASUS TUF/Documents/Perniagaan/docs/audit-2026-10-02/popia-partial-total.png>), [Cornflakes partial total](<C:/Users/ASUS TUF/Documents/Perniagaan/docs/audit-2026-10-02/cornflakes-partial-total.png>).

Recommended correction: use the existing shared cart dialog for every product, or make these drawers display every cart item, the full subtotal and a clear checkout/review action.

**2. Medium — Snack drawers fail keyboard and modal behavior.**

Both custom drawers declare `role="dialog"` and `aria-modal="true"`, but opening one leaves focus on the underlying page. Tab can move to a background WhatsApp link; Escape does not close the drawer; background scrolling is not locked. This makes the overlay confusing for keyboard and assistive-technology users. The shared native dialog already handles these behaviors.

Sources: the drawer locations in finding 1. Recommended correction: reuse the shared dialog, including focus entry, focus containment, Escape handling and focus restoration.

**3. Medium — USB Add to cart remains active at the quantity limit.**

With 10 units of the selected USB capacity already in the cart, its detail-page Add to cart button remains enabled. Clicking it reopens the cart with the same quantity and “Good choice. We saved it for you.” The quantity cap works, but the interface implies another unit was added. Catalog cards correctly disable their add button at the limit.

Source: [ProductDetail](<C:/Users/ASUS TUF/Documents/Perniagaan/src/components/product-detail.tsx:22>). Recommended correction: check the selected variant's cart quantity, disable adding at the limit and give accurate feedback.

**4. Medium — Cornflakes Back to catalog loses the customer's browsing location.**

Reproduction: open `/shop`, select Sweet Treats, open Cornflakes, then choose Back to catalog. Its hardcoded `/#shop` link sends the customer to the homepage catalog and loses the selected filter. Other product pages use the saved catalog return location.

Source: [Cornflakes back link](<C:/Users/ASUS TUF/Documents/Perniagaan/src/components/honey-cornflakes-detail.tsx:32>). Recommended correction: use the same catalog-return helper as the other product pages.

**5. Medium — The shared footer causes horizontal overflow on small phones.**

At 320 pixels wide, the homepage, shop, cart and USB page produce a 326-pixel-wide document. The footer navigation extends beyond the viewport. The other three product pages use different footers and did not show this issue. All seven routes fit at the tested tablet and laptop sizes.

Source: [mobile footer grid](<C:/Users/ASUS TUF/Documents/Perniagaan/src/app/globals.css:363>). Evidence: [footer screenshot](<C:/Users/ASUS TUF/Documents/Perniagaan/docs/audit-2026-10-02/footer-320px.png>) and [viewport measurements](<C:/Users/ASUS TUF/Documents/Perniagaan/docs/audit-2026-10-02/responsive-checks.json>). Recommended correction: allow the grid columns to shrink and wrap navigation labels, or stack the columns at this width.

**6. Medium — Cornflakes has a different contact email.**

The footer uses `m00netor32026@gmail.com`; the shared business data uses `m00nstor32026@gmail.com`. Clicking the Cornflakes email therefore drafts a message to a different address. Mailbox ownership or deliverability was not tested.

Sources: [Cornflakes email](<C:/Users/ASUS TUF/Documents/Perniagaan/src/components/honey-cornflakes-detail.tsx:134>), [shared business details](<C:/Users/ASUS TUF/Documents/Perniagaan/src/lib/business.ts>). Recommended correction: render the email from the shared business data after confirming the intended address.

**7. Medium — Cornflakes ingredient information conflicts across pages.**

The shared catalog explicitly says “Contains butter” and describes a honey-and-butter glaze. The detail page's ingredient/allergen note says “Contains wheat and honey” and omits butter. Its independently maintained copy also includes a preservative claim. These separate sources can give customers inconsistent product information.

Sources: [catalog ingredient note](<C:/Users/ASUS TUF/Documents/Perniagaan/src/lib/product.ts:74>), [detail-page note](<C:/Users/ASUS TUF/Documents/Perniagaan/src/components/honey-cornflakes-detail.tsx:84>). Recommended correction: confirm the actual ingredients and claims with the store, then keep one shared source of product information. This audit does not establish a complete ingredient or allergen list.

**8. Medium — Cornflakes footer text has insufficient contrast.**

The dark page uses `#6b7068` text on `#111a14`, giving approximately **3.51:1** contrast. Footer address and notes use this color at 12–13 pixels. Normal-size text needs at least 4.5:1 under WCAG AA. [W3C contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

Sources: [color token](<C:/Users/ASUS TUF/Documents/Perniagaan/src/components/honey-cornflakes-detail.css:11>), [footer text](<C:/Users/ASUS TUF/Documents/Perniagaan/src/components/honey-cornflakes-detail.css:303>). Evidence: [calculated result](<C:/Users/ASUS TUF/Documents/Perniagaan/docs/audit-2026-10-02/export-checks.json>). Recommended correction: lighten the dim-text token and check each affected background.

**9. Low — Motul form validation gives weak feedback.**

The phone field uses `type="tel"` with no format validation, and the submit handler accepts any nonempty text as a phone number. Required fields containing only spaces are trimmed to empty and then cause an unexplained return. The quantity label also references a nonexistent `motul-quantity` ID, although its group has an accessible name.

Source: [submit handler](<C:/Users/ASUS TUF/Documents/Perniagaan/src/components/motul-5100-detail.tsx:37>) and [form](<C:/Users/ASUS TUF/Documents/Perniagaan/src/components/motul-5100-detail.tsx:96>). Recommended correction: provide clear field-level validation that permits legitimate local and international numbers; report whitespace-only values to the customer. No real order was submitted during the audit.

**10. Low — Cornflakes creates nested main landmarks.**

The root layout wraps every route in `<main id="main">`; the Cornflakes component adds another `<main>`. Its generated page consequently contains two main landmarks, which makes screen-reader landmark navigation less clear.

Sources: [root layout](<C:/Users/ASUS TUF/Documents/Perniagaan/src/app/layout.tsx:66>), [inner main](<C:/Users/ASUS TUF/Documents/Perniagaan/src/components/honey-cornflakes-detail.tsx:31>). Recommended correction: use a section or div for the inner container.

**Search, sharing and performance problems**

**11. Medium, dependent on deployment settings — The current production export points metadata to localhost.**

The fresh export uses `http://localhost:3000` in canonical URLs and sharing-image URLs because `NEXT_PUBLIC_SITE_URL` is unset in this build and the layout falls back to localhost. Those URLs would be wrong if these exact files were published. Netlify's remote environment settings were not available, so this is confirmed in the local export, not independently confirmed on a live deployment.

Source: [metadata base](<C:/Users/ASUS TUF/Documents/Perniagaan/src/app/layout.tsx:14>). Evidence: [exported metadata](<C:/Users/ASUS TUF/Documents/Perniagaan/docs/audit-2026-10-02/export-checks.json>). Recommended correction: configure the real public site URL at build time and verify the resulting export.

**12. Medium — Shop inherits the homepage canonical URL.**

`/shop` has its own title but inherits the root canonical `/`. Correcting the hostname alone will still leave the shop page pointing at the homepage as its canonical. This sends an inappropriate duplicate-page signal if the shop should appear independently in search.

Sources: [root canonical](<C:/Users/ASUS TUF/Documents/Perniagaan/src/app/layout.tsx:21>), [shop page](<C:/Users/ASUS TUF/Documents/Perniagaan/src/app/shop/page.tsx>). Recommended correction: give `/shop` its own canonical URL.

**13. Medium — Snack links share a USB photo and a generic store title.**

Popia and Cornflakes metadata return early without product-specific Open Graph or Twitter overrides. Both exported pages inherit the Kingston USB image and generic Moon Store sharing title. Cornflakes' browser title also repeats the brand: `Cornflakes Madu - Moon Store | Moon Store`.

Source: [product metadata](<C:/Users/ASUS TUF/Documents/Perniagaan/src/app/product/[id]/page.tsx:16>). Recommended correction: generate complete metadata consistently for all four products and let the root title template add the brand once.

**14. Medium — Popia loads an unnecessarily large product image.**

`public/products/popia-nestum.png` is **2,158,257 bytes**, 1080 × 1083 pixels. The detail page loads it directly as the initial hero image; there are no smaller responsive alternatives. The shared image component also sets `sizes` without `srcset`, which does not reduce the downloaded image size. This is an avoidable mobile bandwidth cost. Actual loading times and Core Web Vitals were not measured.

Sources: [Popia image](<C:/Users/ASUS TUF/Documents/Perniagaan/src/components/popia-nestum-detail.tsx:41>), [shared image component](<C:/Users/ASUS TUF/Documents/Perniagaan/src/components/product-image.tsx:12>). Recommended correction: export an appropriately compressed WebP/AVIF asset and responsive sizes suited to the static site.

**15. Low — Search housekeeping is unfinished.**

The static output contains no sitemap or robots.txt. Their absence does not itself prevent indexing. The cart page also inherits `index, follow`, the generic homepage title and the homepage canonical; a personal cart page generally benefits from explicit noindex metadata.

Sources: [root robots metadata](<C:/Users/ASUS TUF/Documents/Perniagaan/src/app/layout.tsx:22>), [cart route](<C:/Users/ASUS TUF/Documents/Perniagaan/src/app/cart/page.tsx>). Recommended correction: make the indexing policy explicit and add a sitemap when the public domain is configured.

**Dependencies and development workflow**

**16. Medium remediation priority — The installed dependency tree has known PostCSS advisories.**

The audit reports **two affected packages: one high and one moderate**. Next 15.5.26 bundles a vulnerable PostCSS 8.4.31 under `node_modules/next/node_modules/postcss`; the separate root PostCSS 8.5.28 is newer. The Next entry is an indirect report through PostCSS, so this is not evidence of two independent live-site attacks.

The file-disclosure advisory requires processing attacker-controlled CSS/source-map references. The reviewed static storefront has no customer CSS-upload or compilation feature, and no exploit against the live website was demonstrated. The issue still warrants dependency maintenance. [PostCSS maintainer advisory](https://github.com/postcss/postcss/security/advisories/GHSA-r28c-9q8g-f849).

Evidence: [dependency audit](<C:/Users/ASUS TUF/Documents/Perniagaan/docs/audit-2026-10-02/dependency-audit.json>). Recommended correction: select a supported Next/dependency update or tested override that resolves every listed advisory, then rebuild and run the relevant tests. The audit's automatic suggestion is a major Next upgrade and should be reviewed before applying it.

**17. Low — Standalone TypeScript checking fails in a test file.**

`tsc --noEmit --incremental false` fails at `tests/storefront.spec.ts:229`: `offsetHeight` is read from a value typed as `SVGElement | HTMLElement`. The production build succeeds and the browser tests can run, so this is a test-code typing problem rather than a confirmed deployment blocker.

Source: [test callback](<C:/Users/ASUS TUF/Documents/Perniagaan/tests/storefront.spec.ts:229>). Recommended correction: narrow the element to the appropriate HTML element type before reading `offsetHeight`.

**18. Low — External font loading and test timing reduce reliability.**

Popia's stylesheet imports Google Fonts at runtime, including DM Sans even though the root already supplies DM Sans through Next's font handling. In the restricted first run, this request failed with `net::ERR_NETWORK_ACCESS_DENIED` and produced an `Event` page error. The same tests passed when network access was available. This is an external-resource dependency and an offline/restricted-network issue; the evidence does not establish a normal live-site crash.

The theme test reads the computed background immediately after toggling while the page animates colors for 0.28 seconds. It failed once and passed on rerun. The initial suite also finished its cases but hung during Windows web-server cleanup until the audit-owned server was stopped.

Sources: [font import](<C:/Users/ASUS TUF/Documents/Perniagaan/src/components/popia-nestum-detail.css:1>), [theme assertion](<C:/Users/ASUS TUF/Documents/Perniagaan/tests/storefront.spec.ts:560>), [theme transition](<C:/Users/ASUS TUF/Documents/Perniagaan/src/app/globals.css:377>), [test server configuration](<C:/Users/ASUS TUF/Documents/Perniagaan/playwright.config.ts>). Recommended correction: serve fonts locally, wait for stable computed styles in the test and make Windows helper cleanup reliable.

The existing suite also misses the mixed-product snack drawers, their focus behavior, 320-pixel footer layout and exported metadata defects described above.

**Unfinished content and presentation**

**19. Low — The team section still exposes placeholders.**

All four team members lack portraits and personal messages. Customers see “PORTRAIT COMING SOON” and “A personal message from … will appear here.” This makes a public-facing section look unfinished.

Source: [team data and placeholders](<C:/Users/ASUS TUF/Documents/Perniagaan/src/components/team-story.tsx:14>). Recommended correction: supply the approved content, or simplify the section until it is ready.

**20. Low — Motul photography shows different packaging from the sold variant.**

The photographs show 4L bottles while the selected price/order is for 1 Litre. The site already discloses this clearly, so it is not an undisclosed pricing defect, but the mismatch still creates avoidable visual ambiguity.

Source: [Motul photo disclosure](<C:/Users/ASUS TUF/Documents/Perniagaan/src/components/motul-5100-detail.tsx:84>). Recommended correction: replace the supplied images with the actual 1L packaging when available.

**What worked, and what remains unverified**

The production build passed. Tested shared-cart operations, persistence, input sanitization, variant prices, category filtering and the full-cart WhatsApp draft flow behaved as expected. The checks did not find broken loaded product images in the 21 route/viewport samples. The dependency alerts and initial test failures are qualified above rather than presented as proven live-site exploits or persistent crashes.

The mobile test project uses Chromium with iPhone-style device settings; it is not a native Safari test. No deployed URL was provided. Live Netlify environment variables, domain/TLS settings, server response headers, actual external-account ownership, real-device behavior and field Core Web Vitals remain unverified. No messages, orders or payments were sent. This is a broad local audit of the available project, not a guarantee that every possible defect has been found.

**Suggested order of work:** shared snack cart and modal behavior; correct email and verified ingredient copy; navigation and quantity feedback; mobile footer and contrast; deployment/search metadata; image/font delivery; dependency and test maintenance; remaining content.

**Saved evidence**

- [Initial browser-test report](<C:/Users/ASUS TUF/Documents/Perniagaan/docs/audit-2026-10-02/e2e-initial.json>)
- [Focused browser-test rerun](<C:/Users/ASUS TUF/Documents/Perniagaan/docs/audit-2026-10-02/e2e-recheck.json>)
- [Route and viewport checks](<C:/Users/ASUS TUF/Documents/Perniagaan/docs/audit-2026-10-02/responsive-checks.json>)
- [Exported metadata, image and contrast checks](<C:/Users/ASUS TUF/Documents/Perniagaan/docs/audit-2026-10-02/export-checks.json>)
- [Dependency audit](<C:/Users/ASUS TUF/Documents/Perniagaan/docs/audit-2026-10-02/dependency-audit.json>)
