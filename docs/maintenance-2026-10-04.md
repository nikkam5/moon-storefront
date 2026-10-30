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

## Optional Obsidian & Ember experiment — 21 October 2026

Added a chamfered, solid-droplet control beside the existing light/dark toggle. Its visual face has a restrained intermittent glitch; pointer hover and keyboard focus reveal lower-edge crimson trails that retract on exit. Ember mode adds obsidian/burgundy surfaces, warm ivory text, sparse embers, edge-framed red aura and angular fractures. Glow is restricted to the requested aura and bleed. The user's full experiment-specific design restrictions are recorded in README.md.

Activation uses a roughly 700 ms full-screen snapshot glitch, with a shorter exit and a reduced-motion fade. A guarded fallback handles unsupported/skipped snapshots; controls lock until completion, and timers and listeners clean up. Saved Ember selection applies before hydration; turning it off restores the previous normal theme. Hidden tabs pause ambience and settle pending transitions. Galaxy rendering pauses while its background is hidden by Ember mode. The three teammate product components and styles remain unchanged.

Type checking and the production build passed. The final complete desktop/mobile suite recorded **265 passed, 11 intentional platform skips, 0 failed and 0 flaky**, including 18 new Ember cases. The focused palette/Ember run passed all 40 checks. Screenshot and JSON evidence is stored outside the repository in `ember-preview-2026-10-21`. No push or deployment was performed.

## Ember wordmark interaction — 24 October 2026

Updated only the homepage MOONSTORE wordmark for Ember mode with chamfered ivory letters and small crimson fractures. Dragged letters show red horizontal signal slices and sparse interference pixels that change rapidly and strengthen with displacement. The effect composites only the selected letter; the existing sweep, hover reveal, frame, tether and spring return remain in place. Normal light/dark wordmarks retain their original appearance. The broader environment and typography redesign remains pending.

Release fades the signal promptly while the letter springs home. Cancellation, lost pointer capture and blur clear the signal and release capture. Reduced motion keeps a static red offset while held, returns immediately, and responds to live preference changes.

Type checking and the production build passed. The final focused desktop/mobile browser run recorded **34 passed, 2 intentional desktop exclusions for touch-only cases, 0 failed and 0 flaky**. Checks cover actual changing red canvas pixels, clean spring return, touch release/cancellation, lost capture, blur, reduced motion, normal-theme dragging, rendering cadence and existing animation regressions. JSON results and preview screenshots are saved outside the repository in `wordmark-preview-2026-10-24`. The production preview is available locally on port 3100. No push or deployment was performed.

## Completed Ember environment — 24 October 2026

Completed the wider atmosphere plan after the isolated wordmark update. A shared canvas renderer paints distinct threshold, fault, suspended and quiet compositions beneath the existing sections. Angular obsidian planes, broken crimson edges, branching seams and sparse flat fragments share the same visual vocabulary. Slow autonomous drift, shallow scroll displacement and restrained nearby pointer response add movement without moving content or controls. Perimeter flame aura supplies the requested burning red light. Dark reading areas protect text contrast.

The environment also appears on the standalone shop, cart, USB product page and shared footer. The three teammate product components and styles remain untouched. Ember-only type scale and spacing retain the existing Manrope/DM Sans families, with system monospace labels. The MOONSTORE drag glitch, theme control, full-screen switch, model and shopping functions remain.

Scenes limit raster area to about two million pixels and painting to roughly 30 fps. Intersection, tab visibility, theme and curtain observers stop drawing when inactive or covered. Reduced motion paints a static scene without pointer or scroll movement and responds to live preference changes. All observers, subscriptions and handlers clean up on unmount. No dependencies, stock images or decorative 3D assets were introduced.

The full desktop/mobile run recorded **289 passed, 13 intentional platform skips and 2 failures**, exposing a small scroll-anchor shift when Ember's type metrics changed. The final transition disables scroll anchoring while active and preserves the current viewport during the swap. The subsequent environment/wordmark/theme run passed 42 cases with 2 platform skips; its two exit assertions required the same actual-pointerdown baseline already used on entry. The final theme suite, with that baseline on both directions, passed **18 of 18 cases**. Final type checking and the production build also passed.

Reconciliation by file, suite title, test title and project confirms **291 distinct applicable cases passed across these runs, 13 intentional skips, 0 unresolved failures and 0 flaky cases**. The full run preceded the localized transition fix; affected Ember, environment and wordmark coverage ran afterward. JSON evidence (`full-results.json`, `focused-results.json`, `browser-results.json`) and desktop/mobile screenshots are stored in the chat's `ember-environment-2026-10-24` artifact directory. No push or deployment was performed.

## Ember redesign: blood, lava and corruption — 30–31 October 2026

Reworked Ember around the Genshin Impact abyss references (neon red grid, dark void, lava field) and a "Blackwall" crimson data corruption. Ember now uses Oswald headings, Rajdhani interface text and a Cinzel MOONSTORE logo, loaded only for Ember. Body copy stays DM Sans. Buttons, filters, prices and the cart badge use dark blood fills with vibrant red edges. Teammate product pages keep their own designs.

- **Wordmark:** blood pours into the letters once per visit, then drips keep releasing drops that fall behind the hero copy. They stop when Home scrolls out of view.
- **Section looks:** each Ember section now has its own background:
  - lava for the hero, shop and cart (haze, lava cracks, neon-edged cubes, embers);
  - a neon grid for the home catalog;
  - a calmer grid with red ember particles and a lava pixel mosaic for Our story;
  - a dark void with lit stone blocks for feedback and the footer;
  - the grid over lava for the USB page.
- **Backgrounds:** static layers are cached, so they paint at the display rate instead of the previous ~30 fps cap. They also fade at section edges.
- **Theme switch:** a 600 ms corruption in both directions (tear, datamosh, crimson/black overload during the swap, heading decode), replacing the snapshot glitch. Its painter is shared with the controls below.
- **Drop button:** round, with a single drop that falls halfway and freezes broken. The whole button then loops the switch's corruption.
- **Footer social buttons:** they corrupt while dragged, softly after a long hold and harder past the arm point. They burst before the link opens, then are "deleted" and reboot. A tap still opens immediately.
- **Home:** three small ring sigils behind the hero glitch occasionally.

Reduced motion keeps every effect still or off, and hidden tabs pause or finish them. `.claude/launch.json` (local preview config) is now ignored by git.

Type checking and the production build passed. The complete desktop/mobile suite, run before the last two changes, recorded **299 passed, 13 intentional platform skips and 2 failures**. Neither failure comes from this work:

- "normal light and dark wordmarks retain their original dragging" times out in this environment with or without the Ember changes, checked by swapping the wordmark file back.
- "live reduced motion stops hero canvases" polls a canvas while the default theme's WebGL galaxy renders at about 364 ms per frame in headless Chromium (17 ms with the galaxy hidden).

After the final two changes (button corruption delay and footer social corruption), the Ember theme, social-button and new Ember sling specs passed **33 of 33 with 5 platform skips**. A cinematic-transition test assumed the switch outlasted its checks; it now reads the in-flight state at the click and passed 8 of 8 repeats.

Not yet verified: native Safari (the social link opens 0.35 s after release, which older Safari may treat as a blocked popup) and real-device frame rates. No push or deployment was performed.
