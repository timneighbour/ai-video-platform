/**
 * pricing.ts — Canonical per-video add-on pricing constants
 * ==========================================================
 * Single source of truth for all per-video add-on prices shown across
 * studio pages, the /subscribe page, and any pricing UI.
 *
 * ⚠️  When prices change, update ONLY this file.
 *     All studio pages and pricing surfaces import from here.
 */

// ── Render Quality Add-ons (Video Studios) ────────────────────────────────────
// Used by: MusicVideoAutopilot, TextToVideoCreator, KidsVideo, WizShorts, WizScore
export const RENDER_QUALITY = {
  /** Standard build — included in every plan, no add-on cost */
  HD:   { label: "HD",  res: "1080p", price: "Included",  priceAddon: null       } as const,
  /** 4K upgrade — most popular quality tier */
  UHD:  { label: "4K",  res: "2160p", price: "+£2.99",    priceAddon: 2.99       } as const,
  /** 8K master — highest quality tier */
  UHD8: { label: "8K",  res: "4320p", price: "+£4.99",    priceAddon: 4.99       } as const,
} as const;

/** Ordered array for rendering quality selector UIs */
export const RENDER_QUALITY_TIERS = [
  RENDER_QUALITY.HD,
  RENDER_QUALITY.UHD,
  RENDER_QUALITY.UHD8,
] as const;

// ── Render Quality Add-ons (Image Studio — WizImage) ─────────────────────────
// Different tier structure from video: Standard/HD/4K/8K
export const IMAGE_RENDER_QUALITY = {
  STANDARD: { label: "Standard",       desc: "1024×1024px · Fast",          price: "Included", priceAddon: null } as const,
  HD:        { label: "HD",             desc: "2048×2048px · Print ready",   price: "+£1.99",   priceAddon: 1.99 } as const,
  UHD:       { label: "4K Ultra",       desc: "3840×3840px · Billboard",     price: "+£3.99",   priceAddon: 3.99 } as const,
  UHD8:      { label: "8K WizLumina™", desc: "7680×7680px · Museum print",  price: "+£7.99",   priceAddon: 7.99 } as const,
} as const;

// ── WizSound™ Audio Enhancement Tiers ────────────────────────────────────────
// Used by: MusicCreator, MusicVideoAutopilot, TextToVideoCreator, WizShorts, WizScore, Subscribe
export const WIZSOUND_TIERS = {
  ORIGINAL:  { key: "original",  label: "Original",  price: "Included", priceAddon: null } as const,
  ENHANCED:  { key: "enhanced",  label: "Enhanced",  price: "+£2.99",   priceAddon: 2.99 } as const,
  CINEMATIC: { key: "cinematic", label: "Cinematic", price: "+£4.99",   priceAddon: 4.99 } as const,
} as const;

/** Ordered array for rendering WizSound tier selector UIs */
export const WIZSOUND_TIER_LIST = [
  WIZSOUND_TIERS.ORIGINAL,
  WIZSOUND_TIERS.ENHANCED,
  WIZSOUND_TIERS.CINEMATIC,
] as const;

export type WizSoundTierKey = "original" | "enhanced" | "cinematic";

// ── Pay-per-Video Render Prices (shown on /subscribe pricing overview) ────────
// These are the full per-video prices shown on the pricing/subscribe page
// (distinct from the in-studio add-on deltas above)
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

// ── WizSound™ Pay-per-Video Tiers (shown on /subscribe pricing overview) ──────
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

// ── Pre-purchase Build Credit Bundles (shown on /subscribe) ──────────────────
export const CREDIT_BUNDLES = [
  { label: "Starter Bundle",  builds: 6,  price: "£10", perRender: "£1.67", saving: null,      highlight: false, badge: null         },
  { label: "Creator Bundle",  builds: 15, price: "£20", perRender: "£1.33", saving: "Save 33%", highlight: true,  badge: "Best Value" },
  { label: "Studio Bundle",   builds: 40, price: "£50", perRender: "£1.25", saving: "Save 38%", highlight: false, badge: null         },
] as const;

// ── WizLumina™ Cinematic Add-on ────────────────────────────────────────────
// Used by: KidsVideo, TextToVideoCreator, WizScore, WizShorts
// Colour grade + film grain visual enhancement add-on
export const WIZLUMINA_CINEMATIC = { label: "WizLumina™ Cinematic", price: "+£3.99", priceAddon: 3.99 } as const;

// ── WizShorts / KidsVideo quality selector (2-tier: 1080p / 4K) ──────────────
// Some studios only offer 2 tiers (no 8K)
export const VIDEO_QUALITY_2TIER = [
  { label: "1080p", price: "Included" },
  { label: "4K",    price: "+£2.99"   },
] as const;
