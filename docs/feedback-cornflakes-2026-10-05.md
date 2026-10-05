# Customer feedback and Cornflakes update, 5 October 2026

## Changes

- Added the customer screenshot folder above the existing feedback form, with English headings and labels. The folder follows the supplied React Bits front tilt and three-paper fan animation. A short opening transition leads to the full gallery; reduced-motion visitors open it immediately.
- Imported all three supplied WhatsApp screenshots as optimized WebP images at their original dimensions. Each gallery frame has the same 3:4 aspect ratio and dimensions within a breakpoint. Images use `object-fit: contain`, so the landscape screenshot has padding and no image is stretched or cropped.
- Added an enlarged image view, Previous/Next buttons and left/right arrow keys. Escape returns from an image to the gallery, then closes the gallery. A native modal dialog locks background scrolling, keeps focus inside, and restores focus on return and close. No-JavaScript visitors have direct links to every screenshot.
- The screenshot collection lives in `src/lib/customer-feedback.ts`. It has no three-image limit; only the animated folder previews the first three. Empty collections omit the section, and failed images show an explanatory fallback.
- Saved the supplied Cornflakes HTML unchanged under `docs/design-source/cornflakes-madu-update-2026-10-05.html`. Preserved its green/gold styling, hexagonal product frame, existing site navigation, footer, cart and catalog return links.
- Added Mini Jar (approx. 150g / RM 10.00) and Standard Jar (approx. 250g / RM 15.00) from the reference. The reference's table also mentions a 270g maximum; the implementation uses the explicit jar labels consistently. Standard Jar remains the initial selection on the product page; the catalog starts at RM 10.00.
- Both jar sizes use the shared catalog, separate cart items and limits, persistence and WhatsApp order draft. The selected quantity clamps to the remaining cart allowance if another tab changes it.
- Preserved the existing butter/ingredient note. The new reference's wheat and preservative statements have not been added as confirmed product facts. Its referenced `Sweet Pixel Paradise.jpg` file was not supplied; the existing CSS honeycomb background is retained.
- Cornflakes decorative animations pause when hidden/off-screen and follow live reduced-motion changes. New listeners, observers and the folder opening timer clean up on unmount.

## Scope

The working tree already contained changes to README, the previous maintenance record, the product route, shared palette and palette tests at the start of this task. They were preserved. No changes were pushed or deployed.

## Verification

- Type checking: passed.
- Production build and static export: passed.
- Complete desktop browser run: 124 passed, 3 intentionally skipped, zero failures or flaky results.
- Complete mobile browser run: 119 passed, 8 intentionally skipped, zero failures or flaky results.
- Combined final coverage: **243 passed, 11 intentionally skipped**, with zero failures or flaky results. The two complete projects ran separately with two workers each and no retries, against the final production export.
- Added 16 desktop/mobile checks for folder placement, equal image frames, enlarged viewing, keyboard focus and Escape behavior, 320px layouts in both themes, reduced motion, no-JavaScript links, jar prices, separate cart entries, checkout details, persistence and cross-tab limits.
- Updated existing price/weight expectations to match the supplied jar choices. Heading and wordmark checks wait for initialization; the USB confirmation check observes its 2.5-second message before inspecting the cart. The cross-tab check waits for the second tab to be ready and verifies its quantity before testing synchronization.
- Earlier combined runs encountered timing-sensitive failures. The final complete desktop and mobile runs above were clean. This verification does not establish a guaranteed frame rate, native Safari support, or performance on lower-powered physical devices.
- Final `git diff --check`: passed.
