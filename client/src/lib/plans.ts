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
 *   WizShorts: 5 credits/scene (30 for 30s, 60 for 60s)
 *   WizAnimate: 5 credits/video
 *   WizAudio:  2 credits (Suno default), 4 credits/min (ElevenLabs/cinematic)
 *   WizImage:  1 credit/image
 *   WizScore:  2 credits/soundtrack
 *   WizScript: 0 (free — script only, no render)
 *   WizSound:  0 (free — local ffmpeg mastering, no API)
 *
 * MONTHLY RESET: Plan credits expire at each billing cycle (no rollover).
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
    tagline: "Try WIZ AI with no commitment",
    bestFor: "First-time creators",
    outcomes: [
      "40 free credits to try the platform",
      "Access to all 7 WIZ AI studios",
      "Free storyboard generation",
      "Standard quality (720p)",
      "Community support",
    ],
    features: [
      { text: "40 trial credits", included: true },
      { text: "All 7 studios (WizVideo, WizImage, WizAudio…)", included: true },
      { text: "Free storyboard generation", included: true },
      { text: "Standard 720p quality", included: true },
      { text: "No watermark", included: false },
      { text: "HD & 4K quality", included: false },
      { text: "Character Lock™", included: false },
    ],
    creditsPerMonth: 40,
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
    monthlyPrice: 29,
    annualTotal: 290,
    annualSaving: 58,
    tagline: "320 credits/month — ~2 WizVideos",
    bestFor: "Best for first-time creators",
    outcomes: [
      "320 credits per month (reset monthly)",
      "~2 WizVideo music videos (8 scenes each)",
      "Or mix across all 7 studios",
      "Standard quality (720p)",
      "No watermark",
      "Email support",
    ],
    features: [
      { text: "320 credits/month (no rollover)", included: true },
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
    monthlyPrice: 99,
    annualTotal: 990,
    annualSaving: 198,
    tagline: "1,000 credits/month — ~6 WizVideos",
    bestFor: "Best for active creators",
    outcomes: [
      "1,000 credits per month (reset monthly)",
      "~6 WizVideo music videos (8 scenes each)",
      "Or mix across all 7 studios",
      "HD & 4K quality",
      "Character Lock™ for consistent faces",
      "Priority build queue",
      "No watermark",
      "Priority email support",
    ],
    features: [
      { text: "1,000 credits/month (no rollover)", included: true },
      { text: "All 7 WIZ AI studios", included: true },
      { text: "Up to 11 scenes per WizVideo", included: true },
      { text: "4K 2160p output", included: true },
      { text: "No watermark", included: true },
      { text: "Cinematic Sound mastering (free)", included: true },
      { text: "Character Lock™", included: true },
      { text: "Priority video builds", included: true },
    ],
    creditsPerMonth: 1000,
    approxVideosPerMonth: 6,
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
    monthlyPrice: 199,
    annualTotal: 1990,
    annualSaving: 398,
    tagline: "2,000 credits/month — ~12 WizVideos",
    bestFor: "Best for brands, agencies and high-volume creators",
    outcomes: [
      "2,000 credits per month (reset monthly)",
      "~12 WizVideo music videos (8 scenes each)",
      "Or mix across all 7 studios",
      "4K quality included",
      "Fastest build speed — top priority",
      "Character Lock™ for consistent faces",
      "Full API access for automation",
      "No watermark",
      "Dedicated support",
    ],
    features: [
      { text: "2,000 credits/month (no rollover)", included: true },
      { text: "All 7 WIZ AI studios", included: true },
      { text: "Up to 12 scenes per WizVideo", included: true },
      { text: "4K 2160p output", included: true },
      { text: "No watermark", included: true },
      { text: "Cinematic Sound mastering (free)", included: true },
      { text: "Character Lock™", included: true },
      { text: "API access for automation", included: true },
    ],
    creditsPerMonth: 2000,
    approxVideosPerMonth: 12,
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
  { feature: "Credits/month",           free: "40 (trial)",  starter: "320",        creator: "1,000",      studio: "2,000"    },
  { feature: "Approx. WizVideos/month", free: "~0",          starter: "~2",         creator: "~6",         studio: "~12"      },
  { feature: "Max scenes per WizVideo", free: "8",           starter: "8",          creator: "11",         studio: "12"       },
  { feature: "Max quality",             free: "720p",        starter: "720p",       creator: "4K",         studio: "4K"       },
  { feature: "All 7 studios",           free: true,          starter: true,         creator: true,         studio: true       },
  { feature: "Cinematic Sound (free)",  free: true,          starter: true,         creator: true,         studio: true       },
  { feature: "No watermark",            free: false,         starter: true,         creator: true,         studio: true       },
  { feature: "Character Lock™",         free: false,         starter: false,        creator: true,         studio: true       },
  { feature: "Build speed",             free: "Standard",    starter: "Standard",   creator: "Priority",   studio: "Fastest"  },
  { feature: "API access",              free: false,         starter: false,        creator: false,        studio: true       },
  { feature: "Credits expire",          free: "Never",       starter: "Monthly",    creator: "Monthly",    studio: "Monthly"  },
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
export type TopupPackKey = "spark" | "boost" | "pro_pack" | "mega";

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
    credits: 300,
    price: 32,
    perCredit: "10.7p per credit",
    label: "Boost",
    popular: true,
    bestValue: false,
    desc: "1 full WizVideo (8 scenes) plus extras. 300 credits that never expire.",
  },
  {
    key: "pro_pack",
    credits: 700,
    price: 69,
    perCredit: "9.9p per credit",
    label: "Pro Pack",
    popular: false,
    bestValue: false,
    desc: "~4 WizVideos worth of credits. 700 credits that never expire.",
  },
  {
    key: "mega",
    credits: 1500,
    price: 139,
    perCredit: "9.3p per credit",
    label: "Mega",
    popular: false,
    bestValue: true,
    desc: "Best value. ~9 WizVideos worth of credits. 1,500 credits that never expire.",
  },
];
