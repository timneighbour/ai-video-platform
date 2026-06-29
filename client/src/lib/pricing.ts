/**
 * pricing.ts — Canonical quality-tier constants for studio pages
 * ==============================================================
 * Single source of truth for all quality tiers shown across studio pages.
 * Quality choices feed the Credit Cost Estimator — no standalone £ charges
 * appear inside any studio. £ pricing lives only on /pricing.
 *
 * ⚠️  When credit weights change, update ONLY this file.
 *     All studio pages import from here.
 */

// ── Render Quality Tiers (Video Studios) ─────────────────────────────────────
// Used by: MusicVideoAutopilot, TextToVideoCreator, KidsVideo, WizShorts, WizScore
// Credit weight: selecting a higher tier increases the credit estimate shown
// by the Credit Cost Estimator. No standalone £ charge inside the studio.
export const RENDER_QUALITY = {
  /** Standard build — base credit cost, no additional credits */
  HD:   { label: "HD",  res: "1080p", price: "Included",  priceAddon: null, creditAddon: 0  } as const,
  /** 4K upgrade — +5 credits per render */
  UHD:  { label: "4K",  res: "2160p", price: "+5 cr",     priceAddon: null, creditAddon: 5  } as const,
  /** 8K master — +10 credits per render */
  UHD8: { label: "8K",  res: "4320p", price: "+10 cr",    priceAddon: null, creditAddon: 10 } as const,
} as const;

/** Ordered array for rendering quality selector UIs */
export const RENDER_QUALITY_TIERS = [
  RENDER_QUALITY.HD,
  RENDER_QUALITY.UHD,
  RENDER_QUALITY.UHD8,
] as const;

// ── Render Quality Tiers (Image Studio — WizImage) ───────────────────────────
// Different tier structure from video: Standard/HD/4K/8K
// Credit weight: 1 credit base + addon per tier
export const IMAGE_RENDER_QUALITY = {
  STANDARD: { label: "Standard",       desc: "1024×1024px · Fast",          price: "1 cr",    priceAddon: null, creditAddon: 0  } as const,
  HD:        { label: "HD",             desc: "2048×2048px · Print ready",   price: "+1 cr",   priceAddon: null, creditAddon: 1  } as const,
  UHD:       { label: "4K Ultra",       desc: "3840×3840px · Billboard",     price: "+2 cr",   priceAddon: null, creditAddon: 2  } as const,
  UHD8:      { label: "8K WizLumina™", desc: "7680×7680px · Museum print",  price: "+4 cr",   priceAddon: null, creditAddon: 4  } as const,
} as const;

// ── WizSound™ Audio Enhancement Tiers ────────────────────────────────────────
// Used by: MusicCreator, MusicVideoAutopilot, TextToVideoCreator, WizShorts, WizScore, Subscribe
// Credit weight: selecting Enhanced/Cinematic adds credits to the estimator
export const WIZSOUND_TIERS = {
  ORIGINAL:  { key: "original",  label: "Original",  price: "Included", priceAddon: null, creditAddon: 0 } as const,
  ENHANCED:  { key: "enhanced",  label: "Enhanced",  price: "+2 cr",    priceAddon: null, creditAddon: 2 } as const,
  CINEMATIC: { key: "cinematic", label: "Cinematic", price: "+4 cr",    priceAddon: null, creditAddon: 4 } as const,
} as const;

/** Ordered array for rendering WizSound tier selector UIs */
export const WIZSOUND_TIER_LIST = [
  WIZSOUND_TIERS.ORIGINAL,
  WIZSOUND_TIERS.ENHANCED,
  WIZSOUND_TIERS.CINEMATIC,
] as const;

export type WizSoundTierKey = "original" | "enhanced" | "cinematic";

// ── Pay-per-Video Reference Prices (shown on /pricing only) ──────────────────
// These are the full per-video one-off prices shown on the /pricing page.
// They are NOT shown inside studios — studios use credits only.
export const PAY_PER_VIDEO = {
  STANDARD:  { label: "Standard Build",  res: "720p",                         price: "£2",  highlight: false, badge: null        } as const,
  HD:        { label: "HD Build",        res: "1080p",                        price: "£4",  highlight: false, badge: null        } as const,
  UHD:       { label: "4K Build",        res: "2160p",                        price: "£6",  highlight: false, badge: null        } as const,
  CINEMATIC: { label: "Cinematic Pack",  res: "4K + WizSound™ + Priority",   price: "£7",  highlight: true,  badge: "Best Value"} as const,
} as const;

export const PAY_PER_VIDEO_TIERS = [
  PAY_PER_VIDEO.STANDARD,
  PAY_PER_VIDEO.HD,
  PAY_PER_VIDEO.UHD,
  PAY_PER_VIDEO.CINEMATIC,
] as const;

// ── WizSound™ Pay-per-Video Reference Tiers (shown on /pricing only) ─────────
export const WIZSOUND_PAY_PER_VIDEO = {
  STANDARD: { tier: "Standard",         desc: "Original audio, no processing",                                              price: "Free",      highlight: false, badge: null          } as const,
  ACTIVE:   { tier: "WizSound Active",  desc: "Stereo widening + EQ boost",                                                 price: "£1/video",  highlight: false, badge: null          } as const,
  SPATIAL:  { tier: "WizSound Spatial", desc: "Full spatial mix — immersive depth, dynamic range, cinema-grade stereo",     price: "£3/video",  highlight: true,  badge: "Recommended" } as const,
} as const;

export const WIZSOUND_PAY_PER_VIDEO_TIERS = [
  WIZSOUND_PAY_PER_VIDEO.STANDARD,
  WIZSOUND_PAY_PER_VIDEO.ACTIVE,
  WIZSOUND_PAY_PER_VIDEO.SPATIAL,
] as const;

// ── Top-up Credit Packs (shown on /pricing and /subscribe) ───────────────────
// These are the canonical top-up pack definitions.
// VAT-inclusive prices. "Most popular" = 400-credit pack.
export const CREDIT_BUNDLES = [
  { label: "Spark",    credits: 100,  price: "£12",  perCredit: "£0.12", saving: null,       highlight: false, badge: null           },
  { label: "Boost",    credits: 200,  price: "£23",  perCredit: "£0.115","saving": "Save 4%", highlight: false, badge: null           },
  { label: "Pro Pack", credits: 400,  price: "£45",  perCredit: "£0.113","saving": "Save 6%", highlight: true,  badge: "Most popular" },
  { label: "Mega",     credits: 700,  price: "£77",  perCredit: "£0.11", saving: "Save 8%",  highlight: false, badge: null           },
  { label: "Elite",    credits: 1000, price: "£109", perCredit: "£0.109","saving": "Save 9%", highlight: false, badge: "Best value"   },
] as const;

// ── WizLumina™ Visual Enhancement Add-on ─────────────────────────────────────
// Used by: KidsVideo, TextToVideoCreator, WizScore, WizShorts
// Credit weight: adds credits to the estimator — no standalone £ charge in studio
export const WIZLUMINA_CINEMATIC = { label: "WizLumina™ Cinematic", price: "+3 cr", priceAddon: null, creditAddon: 3 } as const;

// ── WizShorts / KidsVideo quality selector (2-tier: 1080p / 4K) ──────────────
// Some studios only offer 2 tiers (no 8K)
export const VIDEO_QUALITY_2TIER = [
  { label: "1080p", price: "Included", creditAddon: 0 },
  { label: "4K",    price: "+5 cr",    creditAddon: 5 },
] as const;
