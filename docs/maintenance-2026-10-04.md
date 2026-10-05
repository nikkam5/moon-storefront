# Moon Store maintenance — 4 October 2026

The changes address the local audit dated 2 October and prepare the existing project for a repository push. The older deployed site was not used as the implementation baseline, and no push or deployment was performed.

## Customer-facing fixes

- All products now use the same complete cart dialog: mixed items, correct subtotal, full review and WhatsApp checkout. Native modal behavior is supplemented with explicit forward/reverse keyboard focus cycling. Escape closes it, focus returns to the initiating control, and the background stays locked.
- The USB detail page disables additions at the selected capacity's 10-unit limit and explains the limit.
- Cornflakes restores the originating catalog/filter, uses shared business details and product data, and has a single main landmark. Its dim text contrast increased from approximately 3.51:1 to 7.30:1 on the base background.
- Motul validation identifies empty/whitespace fields and invalid phone values, focuses the first invalid field and associates the quantity group's label correctly. Checkout remains a reviewable draft; it sends nothing automatically.
- The shared footer stacks on the smallest phones to prevent horizontal overflow.
- The team section intentionally presents initials, names and roles. Missing personal messages are hidden, and no invented portraits or quotes were added.

## Search and asset delivery

- Public origin: `https://moonst0re.netlify.app`. Explicit `NEXT_PUBLIC_SITE_URL` or Netlify deployment variables can override it; development origins are rejected.
- Shop and every product have their own canonical URL. Snack Open Graph/Twitter previews use their actual product photos; the Cornflakes title includes the store brand once.
- Cart has noindex metadata. Static robots.txt and sitemap.xml are exported with the public domain and appropriate routes.
- Google Fonts are served locally through Next's build-time font pipeline. The runtime Popia stylesheet import was removed. The hero canvas inherits the actual registered heading font.
- Popia's original 2,158,257-byte PNG was replaced by 121,120-byte WebP and 59,848-byte 640px WebP assets. Responsive alternatives and known image dimensions are supplied to the applicable image elements. The original is preserved outside the repository in the chat's local artifact directory.

## Animation fixes

- Galaxy keeps its WebGL context across visibility pauses, cancels paused/hidden frames, freezes elapsed time while paused, handles context restoration and guards invalid shader division.
- Galaxy, wordmark, particles and shiny heading respond to live reduced-motion and tab-visibility changes. Background work stops when its content is hidden or covered.
- Interrupted pixel transitions clear their overlays. Hidden carousel cards are excluded from keyboard focus.
- Stack, tilted cards, ticket simulations, social pulls and rating effects clean up springs, timers, animation handles and pointer captures. Interrupted gestures reset safely.
- The featured Stack exposes its photo's keyboard activation only after initialization. It preserves an accepted first input when initialization runs, preventing a delayed-hydration race from returning the customer to the original product.
- The catalog curtain handles live motion changes and short viewports; pending animation frames are cancelled during cleanup.

These changes fix identified lifecycle and interaction problems. Canvas paint counts demonstrate pause/resume behavior; they are not real-device FPS measurements.

## Repository organization and cleanup

- Components are grouped by `layout`, `home`, `catalog`, `products`, `cart` and `motion`; component styles remain beside their source. Reusable motion filenames use consistent kebab case. Shared styles live in `src/styles`.
- Removed three SHA256-identical root JPEG copies while retaining the public product assets.
- Removed orphan `src/lib/utils.ts`, obsolete shadcn configuration and compatibility Tailwind configuration, unused font/CSS imports and unused legacy theme tokens.
- Removed unused `cn`, `autoprefixer`, `shadcn` and `tw-animate-css`, reducing the lockfile by 298 package entries without changing surviving package versions.
- Next's nested PostCSS now resolves to patched root PostCSS 8.5.28 via a targeted override.
- Original teammate HTML designs are consolidated in `docs/design-source`; linked historical audit records remain in `docs/audit-2026-10-02`. Unreferenced generated audit probes were removed. `.agents` and its skill lock remain as development configuration.
- Build caches, dependencies and browser test outputs are ignored. Required Next, TypeScript, PostCSS, Playwright and Netlify configuration remains at the root.
- Removed the disposable `.next-dev`, `.npm-cache`, `tsconfig.tsbuildinfo` and `test-results` artifacts after verification. Installed dependencies and the current production export remain available locally and are excluded from Git.
- Type checking generates Next route types first, so it works without an existing build cache. The test server launches Node directly and does not make an update-check request.

## Verification and remaining limits

Run `npm run typecheck`, `npm run build`, `npm test -- --workers=2` and `npm audit` before publishing additional changes. On Windows with installed Chrome, set `PLAYWRIGHT_CHANNEL=chrome` for the test command.

`npm run typecheck` passed, the production build passed after the final Stack fix, and `npm audit` reported **0 vulnerabilities**.

The full browser run before that localized fix recorded **176 passed, 9 skipped and 1 failed**. Its failure exposed the featured Stack's keyboard initialization race. After fixing it and rebuilding, the focused regression run recorded **25 passed and 1 skipped**, including the previously failing keyboard case and new delayed-hydration checks on desktop and mobile.

Reconciliation by test file, suite, test title and project confirms **179 distinct applicable browser cases passed across the two runs**. The full suite preceded the final localized Stack change; the affected Stack coverage was rerun afterward. The nine distinct skips are intentional platform-specific cases: two touch-only checks excluded from desktop, and seven desktop pointer/layout checks excluded from mobile. The focused run's one skip repeats one of those mobile exclusions.

The browser suite covers existing flows plus cart, metadata, narrow-layout, reduced-motion and animation lifecycle regressions. External messages/orders are intercepted in tests. The full and focused JSON results are preserved in the chat's local artifact directory as `verification-final-2026-10-04.json` and `verification-focused-2026-10-04.json`.

A manual browser check verified the rebuilt homepage, saved catalog return, a mixed USB/Popia cart with an RM 70.00 subtotal, and team navigation/portrait interaction. No warning or error console entries were reported during that check. Screenshots are preserved outside the repository with the verification artifacts.

The only unresolved source-asset issue from the audit is the supplied Motul photography: genuine 1L photographs were not available. The site continues to clearly identify the photographed 4L packaging and the sold 1L variant. Confirmed catalog ingredient wording is reused; a complete ingredient list still needs the store's own information.

Native Safari, low-end physical devices, field Core Web Vitals and the eventual deployed hosting settings require verification on those systems. The current local source is newer than the live deployment.

## Approved palette and team update

The later approved color sample is now applied to the main website and Kingston USB page: warm ivory, charcoal and muted lavender. The existing layouts and interactive model remain in place. Scoped CSS and a server-rendered route marker preserve the original Popia, Cornflakes and Motul palettes, including their shared header, footer and cart, with and without JavaScript.

All four supplied portraits are now optimized WebP assets in `public/team`, including Luqman's new photo. The team message panel has identical dimensions for each member at a given responsive breakpoint. Malay messages use the available width and natural sentence wrapping.

The final type check and production build passed. The complete desktop/mobile browser run recorded **227 passed, 11 intentionally skipped, 0 failed and 0 flaky**. It includes light/dark route switching, protected teammate colors, team panel dimensions and photo loading, cart flows, the USB model, reduced motion and animation lifecycle coverage. Results and screenshots are stored outside the repository in the chat's `verification-palette` artifacts.

An import and asset audit found no unused source modules, public assets or declared dependencies. After verification, cleanup removed `.next/cache` (614,394,061 bytes) and `test-results` (900,274 bytes), about 587 MiB combined. The active development output, Next route types, installed dependencies and current production export remain available locally; all are excluded from Git. No push or deployment was performed.

## Shared theme clarification — 5 October 2026

The shared ivory, charcoal and lavender store theme now applies to every route. The earlier exemption for teammate product routes and their blue browser theme-color overrides have been removed. Headers, announcement bars and cart dialogs use the same store palette throughout. Pages that use the shared Moon Store footer inherit that palette; product-specific footers and content keep their original styling.

Popia retains its green and cream colors, Cornflakes its dark green and honey-gold colors, and Motul its black and red colors. Their component and stylesheet files were not changed. The product routes now inherit browser theme colors from the root layout.

Type checking and the final production build passed. The focused desktop/mobile run recorded **36 passed, 0 failed**, covering every route's shared palette in both themes, the original product colors, no-JavaScript rendering, client navigation, team portraits and dimensions, and product cart regressions. JSON results and preview screenshots are preserved outside the repository in `verification-palette-2026-10-05`. No push or deployment was performed.
