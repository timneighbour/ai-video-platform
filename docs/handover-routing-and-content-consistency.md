# Handover Note — Routing Constants & Content Consistency

**Date completed:** 24 April 2026
**Status:** Both phases formally complete. No further changes in this workstream unless explicitly requested.

---

## Phase 1 — Routing Constants

### Problem resolved
WizAnimate's product page CTA was routing to a non-existent path (`/products/wizanimate`) instead of the correct studio path (`/kids-video`). The root cause was hardcoded href strings scattered across 16+ files with no shared source of truth. A route rename in one place would silently break all other references.

### What was delivered

**File created:** `client/src/lib/routes.ts`

Contains 18 constants covering all 9 products — one `_PRODUCT_PAGE` and one `_STUDIO_PAGE` constant per product:

| Product | Product Page Constant | Studio Page Constant |
|---|---|---|
| WizAnimate | `WIZANIMATE_PRODUCT_PAGE` `/products/wizanimate` | `WIZANIMATE_STUDIO_PAGE` `/kids-video` |
| WizVideo | `WIZVIDEO_PRODUCT_PAGE` `/music-video` | `WIZVIDEO_STUDIO_PAGE` `/music-video/create` |
| WizAudio/WizSound | `WIZAUDIO_PRODUCT_PAGE` `/products/wizsound` | `WIZAUDIO_STUDIO_PAGE` `/music-creator` |
| WizImage | `WIZIMAGE_PRODUCT_PAGE` `/products/wizimage` | `WIZIMAGE_STUDIO_PAGE` `/wiz-image` |
| WizShorts | `WIZSHORTS_PRODUCT_PAGE` `/products/wizshorts` | `WIZSHORTS_STUDIO_PAGE` `/wiz-shorts` |
| WizScript | `WIZSCRIPT_PRODUCT_PAGE` `/products/wizscript` | `WIZSCRIPT_STUDIO_PAGE` `/text-to-video` |
| WizPilot | `WIZPILOT_PRODUCT_PAGE` `/products/wizpilot` | `WIZPILOT_STUDIO_PAGE` `/wizpilot` |
| WizScore | `WIZSCORE_PRODUCT_PAGE` `/products/wizscore` | `WIZSCORE_STUDIO_PAGE` `/wizscore` |
| WizSync | `WIZSYNC_PRODUCT_PAGE` `/products/wizsync-info` | `WIZSYNC_STUDIO_PAGE` `/wizsync` |

**Files updated (16):**
`WizProductGrid.tsx`, `products/index.tsx`, `WizSoundProductPage.tsx`, `Dashboard.tsx`, `Blog.tsx`, `BlogPost.tsx`, `Discover.tsx`, `Create.tsx`, `Home.tsx`, `MusicVideosLanding.tsx`, `Projects.tsx`, `RenderHistory.tsx`, `Pricing.tsx`, `SeoLandingPage.tsx`

**Verification:** Zero hardcoded navigation hrefs remain in any `.tsx`/`.ts` file outside `routes.ts`. TypeScript clean.

### Rule going forward
Any route change requires updating **one line** in `client/src/lib/routes.ts` only. Do not hardcode product or studio paths in any page or component file.

---

## Phase 2 — Content Consistency

### Problems resolved
1. Render quality add-on prices differed between studio pages and the Subscribe/Pricing pages (£2/£4/£6 vs £2.99/£4.99).
2. WizSound audio tier prices differed between MusicCreator and Subscribe.
3. "WizAudio" appeared in high-traffic navigation surfaces while the product itself was branded "WizSound™".
4. A duplicate/conflicting WizScript entry in `Create.tsx` pointed to the WizPilot route.
5. Plan prices in the Pricing.tsx comparison table header were hardcoded inline.
6. Product names, taglines, and CTA labels were defined independently in 4 separate files.

### What was delivered

**File created:** `client/src/lib/pricing.ts`

Single source of truth for all per-video add-on pricing:

| Constant | Values |
|---|---|
| `RENDER_QUALITY_TIERS` | Standard (Included), HD (+£2.99), 4K (+£4.99) |
| `IMAGE_RENDER_QUALITY` | Standard (Included), HD (+£1.99), 4K Ultra (+£3.99), 8K (+£7.99) |
| `WIZSOUND_TIERS` | Original (Included), Enhanced (+£2.99), Cinematic (+£4.99) |
| `WIZLUMINAR_CINEMATIC` | +£3.99 (WizLuminar™ add-on used by WizScore, WizShorts, KidsVideo, TextToVideoCreator, WizImage) |
| `VIDEO_QUALITY_2TIER` | 1080p (Included), 4K (+£3.99) |
| `PAY_PER_VIDEO` | Standard £2, HD £4, 4K £6, Cinematic £7 |
| `CREDIT_BUNDLES` | Starter £10, Creator £20, Studio £50 |

**Studio pages migrated:** `MusicVideoAutopilot.tsx`, `TextToVideoCreator.tsx`, `MusicCreator.tsx`, `KidsVideo.tsx`, `WizShorts.tsx`, `WizScore.tsx`, `WizImage.tsx`, `Subscribe.tsx`

---

**File created:** `client/src/lib/products.ts`

Canonical product registry with name, tagline, shortDesc, ctaLabel, productPage, studioPage for all 9 products plus `ALL_PRODUCTS` array and `getProduct(id)` lookup helper.

**Surfaces migrated:**
- `WizProductGrid.tsx` — card names, taglines, descriptions, hrefs
- `Home.tsx` — `PRODUCTS_CREATE` names, taglines, hrefs
- `Create.tsx` — tool card names, taglines, descriptions
- `products/index.tsx` — all 9 `ctaLabel` values

---

**Naming standardised:** WizSound™ is now the canonical user-facing name across all navigation, product cards, and studio pages. Zero `"WizAudio"` string literals remain in user-facing code.

**Duplicate entry fixed:** `Create.tsx` previously had two entries both named "WizScript™" pointing to different routes. The autopilot entry is now correctly named "WizPilot™" and routes to `WIZPILOT_STUDIO_PAGE`.

**Plan prices fixed:** Pricing.tsx comparison table header now reads from `PLANS` array in `plans.ts` rather than hardcoded £19/£49/£149 strings.

**Verification:** Zero hardcoded add-on prices outside `pricing.ts`. Zero `"WizAudio"` strings in user-facing files. TypeScript clean (exit 0) throughout.

---

## Intentionally Left Inline

The following content was reviewed and accepted as intentionally page-specific. It does not need centralisation at this time:

- `products/index.tsx` — rich product-page copy: taglines, headlines, `whatItDoes`, capabilities, `howItWorks` arrays
- `Create.tsx` — studio-specific tool taglines for WizImage, WizShorts, WizSync (intentionally differ from product page copy)

---

## Deferred Items (Logged for Future Work)

These are known, documented, and accepted as low-priority. Do not action without explicit request.

| # | Item | File | Notes |
|---|---|---|---|
| 1 | Wire or remove `lib/i18n.ts` | `client/src/lib/i18n.ts` | Dead copy — contains full product names, hero copy, and CTA text but no page component consumes it. Will silently diverge from live site. |
| 2 | Derive annual overlay prices from `plans.ts` | `client/src/pages/Pricing.tsx` | `PLAN_UI_OVERLAY` annual prices (£79/£350/£990) are still inline. Could be derived from `monthlyPrice × 12 × 0.8`. |
| 3 | Structured storage for rich product-page copy | `client/src/pages/products/index.tsx` | If product copy needs reuse across email, app store listings, or other channels, consider a CMS or structured JSON/TS data file. |

---

*This handover note covers checkpoint `d18b0108`. No further changes in this workstream unless explicitly requested.*
