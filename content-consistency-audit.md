# WIZ AI — Content Consistency Audit Report
**Date:** April 2026  
**Scope:** Product copy sources, CTA text, plan/pricing data, and isolated hardcoded content across all product pages and components.

---

## Executive Summary

The routing constants cleanup confirmed that the codebase had a structural pattern of scattered, isolated definitions. This audit applies the same lens to content. The findings show that **plan/pricing data is well-centralised** in `plans.ts`, but **product copy, CTA text, and taglines are defined independently in at least four separate locations** with material inconsistencies between them. There are also two categories of hardcoded pricing that exist outside any shared constant: render quality add-on prices and WizSound audio tier prices, both of which appear in multiple studio pages with different values.

---

## 1. Product Copy Sources — Where Is Content Defined?

Product names, taglines, and descriptions are currently authored in four independent locations, with no single source of truth:

| Source File | What It Defines | Products Covered |
|---|---|---|
| `pages/products/index.tsx` | Full product pages: `name`, `tagline`, `headline`, `subheadline`, `whatItDoes`, feature lists, CTA label, CTA href | WizCreate, WizAnimate, WizSound, WizLumina, WizGenesis, WizBoost, WizScript, WizPilot, WizSync, WizScore, WizShorts, WizImage, WizVideo |
| `components/WizProductGrid.tsx` | Grid card copy: `name`, `tagline`, `desc`, `label` (CTA button text) | WizAudio, WizImage, WizVideo, WizShorts, WizAnimate, WizScript |
| `pages/Home.tsx` | Inline arrays for hero product cards, sidebar nav items, engine layer cards | WizVideo, WizAnimate, WizScript, WizImage, WizAudio, WizShorts, WizSound, WizLumina, WizBoost, WizGenesis, WizSync, WizScore, WizPilot |
| `pages/Create.tsx` | Studio tool card copy: `name`, `tagline`, `description` | WizVideo, WizScript, WizAnimate, WizImage, WizAudio, WizShorts |

None of these files import from a shared product registry. Every product's copy exists in isolation within each file.

---

## 2. Product Tagline Inconsistencies

The same product is described differently depending on which surface renders it. The following table shows confirmed divergences:

| Product | `WizProductGrid.tsx` | `products/index.tsx` | `Home.tsx` | `Create.tsx` |
|---|---|---|---|---|
| **WizVideo** | "Upload a song, get a full music video" | *(no tagline field — uses `headline`)* | "AI Music Video Generator" | "Turn your music into a full AI-generated music video, scene by scene." |
| **WizAnimate** | "AI character animation engine" | "Character Animation Engine" | "AI Character Animation" | "Bring characters and scenes to life with AI-powered animation." |
| **WizAudio / WizSound** | "AI music & audio production studio" | "Cinematic Audio Engine" | "AI Music & Audio Studio" | *(not in Create.tsx — uses WizAudio label in DashboardLayout)* |
| **WizImage** | "AI image & artwork creator" | *(no dedicated product page — routes to studio)* | "AI Image & Artwork Creator" | "Create cinematic AI images and visual assets from any idea, instantly." |
| **WizShorts** | "Short-form vertical video creator" | *(no dedicated product page)* | "AI Short-Form Video Creator" | *(not in Create.tsx)* |
| **WizScript** | "Scene-by-scene cinematic control" | "AI Script & Storyboard Engine" | "AI Script & Storyboard Builder" | "Describe your idea in plain text and let AI build the full video script and storyboard." |

The divergence is most pronounced for **WizAudio/WizSound**, which has a naming split across the codebase (see Section 4).

---

## 3. CTA Text Inconsistencies

Primary CTA labels for the same product differ across surfaces:

| Product | `products/index.tsx` ctaLabel | `WizProductGrid.tsx` label | `Create.tsx` (button text) |
|---|---|---|---|
| WizVideo | "Create Your Music Video" | "CREATE VIDEO" | *(uses card navigation)* |
| WizAnimate | "Animate Your Video" | "CREATE ANIMATION" | *(uses card navigation)* |
| WizAudio/WizSound | "Create Music Now" | "CREATE AUDIO" | *(not present)* |
| WizImage | "Generate an Image" | "CREATE IMAGES" | *(uses card navigation)* |
| WizShorts | "Create a Short" | "CREATE SHORTS" | *(not present)* |
| WizScript | "Write Your First Script" | "CREATE CINEMATIC" | *(uses card navigation)* |
| WizPilot | "Launch WizPilot™" | *(not in grid)* | *(uses card navigation)* |
| WizSync | "Try WizSync™" | *(not in grid)* | *(not present)* |
| WizScore | "Score Your Video" | *(not in grid)* | *(not present)* |

The `WizProductGrid.tsx` labels use an all-caps imperative format ("CREATE VIDEO") while `products/index.tsx` uses sentence-case action phrases ("Create Your Music Video"). Neither format is wrong in isolation, but they are inconsistent across the same user journey — a user can see both surfaces in the same session.

---

## 4. Product Naming Split: WizAudio vs WizSound

This is the most significant naming inconsistency in the codebase. The audio product has two different names used in different contexts:

**"WizAudio"** is used in:
- `WizProductGrid.tsx` — `name: "WizAudio"` (the grid card)
- `DashboardLayout.tsx` — `label: "WizAudio"` (sidebar nav)
- `lib/routes.ts` — `WIZAUDIO_STUDIO_PAGE`, `WIZAUDIO_PRODUCT_PAGE` (routing constants)

**"WizSound™"** is used in:
- `products/index.tsx` — `name: "WizSound™"` (the product page)
- `plans.ts` — `"WizSound audio mastering"` (plan features)
- `MusicCreator.tsx` — the studio page itself
- `WizSoundProductPage.tsx` — the dedicated product page
- `Home.tsx` — engine layer cards, feature comparisons
- `WizBrand.tsx` — brand component (`name: "WizSound™"`)

The product page route is `/products/wizsound` and the studio page is `/music-creator`. The canonical brand name is **WizSound™**, but the grid card and sidebar nav use "WizAudio" — meaning the two highest-traffic navigation surfaces show a different name than the product page itself.

---

## 5. Duplicated Plan/Pricing Data

### Plan Data — Well Centralised ✓

`lib/plans.ts` is the single source of truth for all subscription plan data. Both `Pricing.tsx` and `Subscribe.tsx` import from it correctly. `Home.tsx` does not render any plan pricing cards, so there is no duplication risk there.

**One exception:** `Pricing.tsx` contains three hardcoded price labels in the comparison table header (lines 666, 684, 696):

```
£19 / mo   (Starter)
£49 / mo   (Creator)
£149 / mo  (Studio)
```

These are visual labels in a static comparison table header, not used for checkout logic. They are not sourced from `plans.ts`. If prices change, these three labels will fall out of sync with the canonical data.

### Render Quality Add-on Prices — Not Centralised ⚠️

Render quality pricing (the per-video add-on cost for HD/4K/8K) is hardcoded independently in three separate studio pages with **different values**:

| File | Standard | HD | 4K | 8K | Cinematic Pack |
|---|---|---|---|---|---|
| `Subscribe.tsx` | £2 | £4 | £6 | — | £7 |
| `MusicVideoAutopilot.tsx` | — | Included | +£2.99 | +£4.99 | — |
| `TextToVideoCreator.tsx` | — | Included | +£2.99 | +£4.99 | — |

The values differ between `Subscribe.tsx` (which shows the pricing overview) and the actual studio pages (`MusicVideoAutopilot.tsx`, `TextToVideoCreator.tsx`). A user reading the pricing page sees different numbers than what appears inside the studio at checkout. This is a live content accuracy risk.

### WizSound Audio Tier Prices — Not Centralised ⚠️

WizSound audio enhancement tier pricing is hardcoded in two places with different values:

| File | Active/Enhanced | Spatial/Cinematic |
|---|---|---|
| `Subscribe.tsx` | £1/video | £3/video |
| `MusicCreator.tsx` | +£2.99 | +£4.99 |
| `TextToVideoCreator.tsx` | +£2.99 (Enhanced) | +£4.99 (Cinematic) |

Again, the pricing overview (`Subscribe.tsx`) and the in-studio experience show different numbers.

---

## 6. Product Pages Relying on Isolated Hardcoded Content

The following product pages have no shared data source and define all their copy inline:

| Page | Isolation Risk | Notes |
|---|---|---|
| `WizSoundProductPage.tsx` | Medium | Full product page with features, CTAs, and pricing references — all inline. No import from a shared product registry. |
| `pages/products/index.tsx` | High | Defines 13 product data objects inline. The largest single concentration of product copy in the codebase. No shared registry. |
| `pages/Home.tsx` | High | Defines 6+ separate inline product arrays for different sections (hero cards, sidebar nav, engine layers, feature comparison). None sourced from a shared registry. |
| `pages/Create.tsx` | Medium | Defines 8 studio tool cards inline. Two entries for "WizScript™" with different hrefs (one pointing to `WIZPILOT_STUDIO_PAGE`, one to `WIZSCRIPT_STUDIO_PAGE`) — a content duplication that also creates a routing ambiguity. |
| `lib/i18n.ts` | Low | Contains a full English translation file with product names, taglines, hero copy, and CTA text. **This file is not consumed by any page component** — only `LanguageSelector.tsx` imports it. The copy it contains is entirely disconnected from what is rendered on screen. It is effectively dead copy that will silently diverge from the live site. |

---

## 7. Summary of Risk Levels

| Issue | Risk | Recommended Action |
|---|---|---|
| WizAudio vs WizSound naming split | **High** | Standardise to WizSound™ in `WizProductGrid.tsx` and `DashboardLayout.tsx` |
| Render quality prices differ between pricing page and studio | **High** | Extract to a shared `lib/pricing.ts` constants file |
| WizSound audio tier prices differ between pricing page and studio | **High** | Add to the same `lib/pricing.ts` constants file |
| Duplicate "WizScript™" entry in `Create.tsx` pointing to two different routes | **Medium** | Remove the duplicate `id: "autopilot"` entry or rename it to "WizPilot™" |
| Product taglines defined independently in 4 files | **Medium** | Create `lib/products.ts` registry as the single source of truth |
| CTA text format inconsistency (sentence case vs ALL CAPS) | **Low** | Decide on one format; update `WizProductGrid.tsx` labels to match |
| Hardcoded plan prices in `Pricing.tsx` comparison table header | **Low** | Source from `plans.ts` using `getPlan("starter").monthlyPrice` etc. |
| `lib/i18n.ts` dead copy | **Low** | Either wire it to page components or remove it to prevent silent divergence |

---

## 8. Recommended Next Steps

The highest-leverage fix is creating **`lib/pricing.ts`** to centralise all render quality and audio add-on prices — this directly resolves the live content accuracy risk where the pricing page and studio show different numbers. The second priority is the WizAudio/WizSound naming split, which affects the two highest-traffic navigation surfaces. The product registry (`lib/products.ts`) is the longer-term structural fix that would eliminate the four-source problem for product copy.
