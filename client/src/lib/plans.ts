/**
 * plans.ts — Single source of truth for WIZ AI subscription plans and credit packs.
 *
 * ALL frontend pages that display pricing MUST import from here.
 * Do NOT hardcode plan prices, names, or feature lists in individual page files.
 *
 * Prices here must stay in sync with server/products.ts SUBSCRIPTION_PLANS.
 * When you update prices here, they propagate to /pricing and /subscribe automatically.
 *
 * CREDIT MODEL (weighted — each studio costs different credits):
 *   WizVideo:  20 credits/scene (28 for 4K)
 *   WizShorts: 30 credits (30s) / 60 credits (60s)
 *   WizAnimate: 4–5 credits/clip
 *   WizAudio:  2 credits/min music, 4 credits/min voice
 *   WizImage:  1 credit/image
 *   WizScore:  2 credits/soundtrack
 *   WizScript: 0 (free — script only, no render)
 *   WizSound:  0 (free — local ffmpeg mastering, no API)
 *
 * CREDIT ROLLOVER: Plan credits roll over for up to 6 months while subscribed.
 * If you cancel, credits remain until end of billing cycle.
 * Top-up credits never expire.
 *
 * Last updated: 2026-06-29
 */

// ── Plan IDs ─────────────────────────────────────────────────────────────────
export type PlanId = "free" | "starter" | "creator" | "studio";

// ── Subscription Plans ────────────────────────────────────────────────────────
export interface PlanData {
  id: PlanId;
  name: string;
  /** Monthly price in GBP (0 for free tier) */
  monthlyPrice: number;
  /** Annual total in GBP (0 for free tier). Equivalent to ~10 months. */
  annualTotal: number;
  /** Annual saving vs 12× monthly */
  annualSaving: number;
  tagline: string;
  /** Short "best for" description used on Pricing page */
  bestFor: string;
  /** Outcome bullets shown on Subscribe page */
  outcomes: string[];
  /** Feature checklist shown on Pricing page */
  features: Array<{ text: string; included: boolean }>;
  /** Monthly credits (reset each billing cycle — no rollover) */
  creditsPerMonth: number;
  /** Approximate WizVideo 8-scene videos per month at 160 credits each */
  approxVideosPerMonth: number;
  /** Max scenes per video */
  scenesPerVideo: number;
  /** Output quality label */
  outputQuality: string;
  watermark: boolean;
  priorityBuilds: boolean;
  wizSyncLock: boolean;
  apiAccess: boolean;
  popular: boolean;
  badge: string | null;
  /** CTA label on Subscribe page */
  cta: string;
  /** Highlight this plan on Subscribe page */
  highlight: boolean;
}

export const PLANS: PlanData[] = [
  {
    id: "free",
    name: "Free",
    monthlyPrice: 0,
    annualTotal: 0,
    annualSaving: 0,
    tagline: "Try every studio free — no card needed",
    bestFor: "First-time creators",
    outcomes: [
      "30 free credits to try the platform",
      "Access to all 7 WIZ AI studios",
      "Free storyboard generation",
      "Standard quality (720p)",
      "Community support",
    ],
    features: [
      { text: "30 trial credits", included: true },
      { text: "All 7 studios (WizVideo, WizImage, WizAudio…)", included: true },
      { text: "Free storyboard generation", included: true },
      { text: "Standard 720p quality", included: true },
      { text: "No watermark", included: false },
      { text: "HD & 4K quality", included: false },
      { text: "Character Lock™", included: false },
    ],
    creditsPerMonth: 30,
    approxVideosPerMonth: 0,
    scenesPerVideo: 8,
    outputQuality: "720p",
    watermark: true,
    priorityBuilds: false,
    wizSyncLock: false,
    apiAccess: false,
    popular: false,
    badge: null,
    cta: "Start Creating",
    highlight: false,
  },
  {
    id: "starter",
    name: "Starter",
    monthlyPrice: 35,
    annualTotal: 350,
    annualSaving: 70,
    tagline: "320 credits/month — ~2 WizVideos",
    bestFor: "Best for first-time creators",
    outcomes: [
      "320 credits per month (roll over up to 6 months)",
      "~2 WizVideo music videos (8 scenes each)",
      "Or mix across all 7 studios",
      "Standard quality (720p)",
      "No watermark",
      "Email support",
    ],
    features: [
      { text: "320 credits/month (rolls over up to 6 months)", included: true },
      { text: "All 7 WIZ AI studios", included: true },
      { text: "Up to 8 scenes per WizVideo", included: true },
      { text: "Standard 720p quality", included: true },
      { text: "No watermark", included: true },
      { text: "Cinematic Sound mastering (free)", included: true },
      { text: "HD & 4K quality", included: false },
      { text: "Character Lock™", included: false },
    ],
    creditsPerMonth: 320,
    approxVideosPerMonth: 2,
    scenesPerVideo: 8,
    outputQuality: "720p",
    watermark: false,
    priorityBuilds: false,
    wizSyncLock: false,
    apiAccess: false,
    popular: false,
    badge: null,
    cta: "Start Creating",
    highlight: false,
  },
  {
    id: "creator",
    name: "Creator",
    monthlyPrice: 79,
    annualTotal: 790,
    annualSaving: 158,
    tagline: "800 credits/month — ~5 WizVideos",
    bestFor: "Best for active creators",
    outcomes: [
      "800 credits per month (roll over up to 6 months)",
      "~5 WizVideo music videos (8 scenes each)",
      "Or mix across all 7 studios",
      "HD & 4K quality",
      "Character Lock™ for consistent faces",
      "Priority build queue",
      "No watermark",
      "Priority email support",
    ],
    features: [
      { text: "800 credits/month (rolls over up to 6 months)", included: true },
      { text: "All 7 WIZ AI studios", included: true },
      { text: "Up to 11 scenes per WizVideo", included: true },
      { text: "4K 2160p output", included: true },
      { text: "No watermark", included: true },
      { text: "Cinematic Sound mastering (free)", included: true },
      { text: "Character Lock™", included: true },
      { text: "Priority video builds", included: true },
    ],
    creditsPerMonth: 800,
    approxVideosPerMonth: 5,
    scenesPerVideo: 11,
    outputQuality: "4K 2160p",
    watermark: false,
    priorityBuilds: true,
    wizSyncLock: true,
    apiAccess: false,
    popular: true,
    badge: "Most Popular",
    cta: "Upgrade Plan",
    highlight: true,
  },
  {
    id: "studio",
    name: "Studio",
    monthlyPrice: 165,
    annualTotal: 1650,
    annualSaving: 330,
    tagline: "1,500 credits/month — ~9 WizVideos",
    bestFor: "Best for brands, agencies and high-volume creators",
    outcomes: [
      "1,500 credits per month (roll over up to 6 months)",
      "~9 WizVideo music videos (8 scenes each)",
      "Or mix across all 7 studios",
      "4K quality included",
      "Fastest build speed — top priority",
      "Character Lock™ for consistent faces",
      "Full API access for automation",
      "No watermark",
      "Dedicated support",
    ],
    features: [
      { text: "1,500 credits/month (rolls over up to 6 months)", included: true },
      { text: "All 7 WIZ AI studios", included: true },
      { text: "Up to 12 scenes per WizVideo", included: true },
      { text: "4K 2160p output", included: true },
      { text: "No watermark", included: true },
      { text: "Cinematic Sound mastering (free)", included: true },
      { text: "Character Lock™", included: true },
      { text: "API access for automation", included: true },
    ],
    creditsPerMonth: 1500,
    approxVideosPerMonth: 9,
    scenesPerVideo: 12,
    outputQuality: "4K 2160p",
    watermark: false,
    priorityBuilds: true,
    wizSyncLock: true,
    apiAccess: true,
    popular: false,
    badge: "Best Value",
    cta: "Upgrade Plan",
    highlight: false,
  },
];

// ── Helper: get plan by ID ────────────────────────────────────────────────────
export function getPlan(id: PlanId): PlanData | undefined {
  return PLANS.find((p) => p.id === id);
}

// ── Paid plans only (excludes free) ──────────────────────────────────────────
export const PAID_PLANS = PLANS.filter((p) => p.id !== "free");

// ── Plans shown on the /pricing page (3-tier simplified view) ────────────────
export const PRICING_PAGE_PLANS: PlanId[] = ["starter", "creator", "studio"];

// ── Comparison table rows (used by both /pricing and /subscribe) ──────────────
// Single source of truth — no hardcoded values in Pricing.tsx or Subscribe.tsx
export const COMPARISON_ROWS: {
  feature: string;
  free: string | boolean;
  starter: string | boolean;
  creator: string | boolean;
  studio: string | boolean;
}[] = [
  { feature: "Credits/month",           free: "30 (trial)",  starter: "320",        creator: "800",        studio: "1,500"    },
  { feature: "Approx. WizVideos/month", free: "~0",          starter: "~2",         creator: "~5",         studio: "~9"       },
  { feature: "Max scenes per WizVideo", free: "8",           starter: "8",          creator: "11",         studio: "12"       },
  { feature: "Max quality",             free: "720p",        starter: "720p",       creator: "4K",         studio: "4K"       },
  { feature: "All 7 studios",           free: true,          starter: true,         creator: true,         studio: true       },
  { feature: "Cinematic Sound (free)",  free: true,          starter: true,         creator: true,         studio: true       },
  { feature: "No watermark",            free: false,         starter: true,         creator: true,         studio: true       },
  { feature: "Character Lock™",         free: false,         starter: false,        creator: true,         studio: true       },
  { feature: "Build speed",             free: "Standard",    starter: "Standard",   creator: "Priority",   studio: "Fastest"  },
  { feature: "API access",              free: false,         starter: false,        creator: false,        studio: true       },
  { feature: "Credits roll over",        free: "Never",       starter: "6 months",   creator: "6 months",   studio: "6 months" },
];

// ── Weighted credit costs per studio (for display on pricing page) ────────────
export const STUDIO_CREDIT_COSTS = {
  wizVideo:   { label: "WizVideo (per scene)",          credits: 20, note: "28 credits for 4K" },
  wizShorts:  { label: "WizShorts (per 30s)",           credits: 30, note: "60 credits for 60s" },
  wizAnimate: { label: "WizAnimate (per video)",        credits: 5,  note: null },
  wizAudio:   { label: "WizAudio (per track)",          credits: 2,  note: "4 credits/min for cinematic" },
  wizImage:   { label: "WizImage (per image)",          credits: 1,  note: null },
  wizScore:   { label: "WizScore (per soundtrack)",     credits: 2,  note: null },
  wizScript:  { label: "WizScript (script only)",       credits: 0,  note: "Free — no render" },
  wizSound:   { label: "WizSound (audio mastering)",    credits: 0,  note: "Free — included always" },
} as const;

// ── Top-up credit packs ───────────────────────────────────────────────────────
// Top-up credits NEVER expire (unlike monthly plan credits which reset).
export type TopupPackKey = "spark" | "boost" | "boost_200" | "pro_pack" | "mega";

export interface TopupPack {
  key: TopupPackKey;
  credits: number;
  price: number;
  perCredit: string;
  label: string;
  popular: boolean;
  bestValue: boolean;
  desc: string;
}

export const TOPUP_PACKS: TopupPack[] = [
  {
    key: "spark",
    credits: 100,
    price: 12,
    perCredit: "12p per credit",
    label: "Spark",
    popular: false,
    bestValue: false,
    desc: "Quick top-up. 100 credits — ~5 WizVideo scenes or 100 WizImages. Never expire.",
  },
  {
    key: "boost",
    credits: 200,
    price: 23,
    perCredit: "11.5p per credit",
    label: "Boost",
    popular: false,
    bestValue: false,
    desc: "200 credits — ~1 full WizVideo (8 scenes) plus extras. Never expire.",
  },
  {
    key: "boost_200",
    credits: 400,
    price: 45,
    perCredit: "11.3p per credit",
    label: "Pro Pack",
    popular: true,
    bestValue: false,
    desc: "Most popular. 400 credits — ~2 full WizVideos. Never expire.",
  },
  {
    key: "pro_pack",
    credits: 700,
    price: 77,
    perCredit: "11p per credit",
    label: "Mega",
    popular: false,
    bestValue: false,
    desc: "700 credits — ~4 WizVideos. Never expire.",
  },
  {
    key: "mega",
    credits: 1000,
    price: 109,
    perCredit: "10.9p per credit",
    label: "Elite",
    popular: false,
    bestValue: true,
    desc: "Best value. 1,000 credits — ~6 WizVideos. Never expire.",
  },
];
