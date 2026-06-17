/**
 * plans.ts — Single source of truth for WIZ AI subscription plans and credit packs.
 *
 * ALL frontend pages that display pricing MUST import from here.
 * Do NOT hardcode plan prices, names, or feature lists in individual page files.
 *
 * Prices here must stay in sync with server/products.ts SUBSCRIPTION_PLANS.
 * When you update prices here, they propagate to /pricing and /subscribe automatically.
 *
 * Last updated: 2026-06-17
 */

// ── Plan IDs ─────────────────────────────────────────────────────────────────
export type PlanId = "free" | "starter" | "basic" | "creator" | "pro" | "studio";

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
  /** Number of Build Credits per month */
  buildsPerMonth: number;
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
      "2 free Build Credits to try the platform",
      "Free storyboard generation",
      "Access to all AI tools",
      "Standard quality (720p)",
      "Community support",
    ],
    features: [
      { text: "2 Build Credits (trial)", included: true },
      { text: "Standard 720p quality", included: true },
      { text: "Free storyboard generation", included: true },
      { text: "No watermark", included: false },
      { text: "HD & 4K quality", included: false },
      { text: "WizSync™ character lock", included: false },
    ],
    buildsPerMonth: 2,
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
    tagline: "Create up to 2 videos/month",
    bestFor: "Best for first-time creators",
    outcomes: [
      "2 videos per month",
      "Standard quality (720p)",
      "All 6 WIZ AI products",
      "Free storyboard generation",
      "WizVideo + WizAudio creation tools",
      "WizScript AI video creator",
      "Email support",
    ],
    features: [
      { text: "2 final videos per month", included: true },
      { text: "Up to 8 scenes per video", included: true },
      { text: "Around 64 seconds max", included: true },
      { text: "Standard 720p quality", included: true },
      { text: "No watermark", included: true },
      { text: "WizSound audio mastering", included: true },
      { text: "HD & 4K quality", included: false },
      { text: "WizSync™ character lock", included: false },
    ],
    buildsPerMonth: 2,
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
  /**
   * NOTE: "basic" tier (£19/mo) has no matching Stripe price ID in server/products.ts.
   * It is kept here for type completeness but is NOT shown on the /pricing page.
   * Do not add it to PRICING_PAGE_PLANS until a Stripe price ID is configured.
   */
  {
    id: "basic",
    name: "Basic",
    monthlyPrice: 19,
    annualTotal: 190,
    annualSaving: 38,
    tagline: "Create up to 5 videos/month in HD",
    bestFor: "Best for regular creators",
    outcomes: [
      "5 Build Credits per month",
      "HD quality (1080p)",
      "All 6 AI video styles",
      "Free storyboard generation",
      "WizVideo + WizScript + WizAudio included",
      "Standard build speed",
      "Email support",
    ],
    features: [
      { text: "5 final videos per month", included: true },
      { text: "Up to 8 scenes per video", included: true },
      { text: "HD quality (1080p)", included: true },
      { text: "No watermark", included: true },
      { text: "WizSound audio mastering", included: true },
      { text: "4K quality", included: false },
      { text: "WizSync™ character lock", included: false },
    ],
    buildsPerMonth: 5,
    scenesPerVideo: 8,
    outputQuality: "1080p HD",
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
    tagline: "Create up to 6 videos/month",
    bestFor: "Best for active creators",
    outcomes: [
      "6 videos per month",
      "Standard, HD & 4K quality",
      "WizSync™ character lock",
      "Priority build queue",
      "All 6 WIZ AI products",
      "Free storyboard generation",
      "No watermark on exports",
      "Priority email support",
    ],
    features: [
      { text: "6 final videos per month", included: true },
      { text: "Up to 11 scenes per video", included: true },
      { text: "Around 88 seconds max", included: true },
      { text: "4K 2160p output", included: true },
      { text: "No watermark", included: true },
      { text: "WizSound audio mastering", included: true },
      { text: "WizSync™ character lock", included: true },
      { text: "Priority video builds", included: true },
    ],
    buildsPerMonth: 6,
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
  /**
   * NOTE: "pro" tier has no matching Stripe price ID in server/products.ts.
   * It is kept here for type completeness but is NOT shown on the /pricing page.
   * Do not add it to PRICING_PAGE_PLANS until a Stripe price ID is configured.
   */
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 149,
    annualTotal: 1490,
    annualSaving: 298,
    tagline: "Create up to 12 videos/month in 4K",
    bestFor: "Best for professional creators",
    outcomes: [
      "12 videos per month",
      "Standard, HD & 4K quality",
      "WizSync™ character lock",
      "Priority build queue",
      "All 6 WIZ AI products",
      "Free storyboard generation",
      "No watermark on exports",
      "Priority support",
    ],
    features: [
      { text: "12 final videos per month", included: true },
      { text: "Up to 12 scenes per video", included: true },
      { text: "Around 96 seconds max", included: true },
      { text: "4K 2160p output", included: true },
      { text: "No watermark", included: true },
      { text: "WizSound audio mastering", included: true },
      { text: "WizSync™ character lock", included: true },
      { text: "Priority video builds", included: true },
    ],
    buildsPerMonth: 12,
    scenesPerVideo: 12,
    outputQuality: "4K 2160p",
    watermark: false,
    priorityBuilds: true,
    wizSyncLock: true,
    apiAccess: false,
    popular: false,
    badge: null,
    cta: "Upgrade Plan",
    highlight: false,
  },
  {
    id: "studio",
    name: "Studio",
    monthlyPrice: 149,
    annualTotal: 1490,
    annualSaving: 298,
    tagline: "Create up to 12 videos/month",
    bestFor: "Best for brands, agencies and high-volume creators",
    outcomes: [
      "12 videos per month",
      "Standard, HD & 4K quality",
      "Fastest build speed — top priority",
      "WizSync™ character lock",
      "Full API access for automation",
      "All 6 WIZ AI products",
      "No watermark on exports",
      "Dedicated support",
    ],
    features: [
      { text: "12 final videos per month", included: true },
      { text: "Up to 12 scenes per video", included: true },
      { text: "Around 96 seconds max", included: true },
      { text: "4K 2160p output", included: true },
      { text: "No watermark", included: true },
      { text: "WizSound audio mastering", included: true },
      { text: "WizSync™ character lock", included: true },
      { text: "API access for automation", included: true },
    ],
    buildsPerMonth: 12,
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

// ── Plans shown on the /pricing page ─────────────────────────────────────────
// Only includes tiers with valid Stripe price IDs in server/products.ts.
// "basic" and "pro" are hidden until Stripe price IDs are configured.
export const PRICING_PAGE_PLANS: PlanId[] = ["starter", "creator", "studio"];

// ── Comparison table rows (used by both /pricing and /subscribe) ──────────────
export const COMPARISON_ROWS: {
  feature: string;
  free: string | boolean;
  starter: string | boolean;
  basic: string | boolean;
  creator: string | boolean;
  pro: string | boolean;
  studio: string | boolean;
}[] = [
  { feature: "Videos/month", free: "1 (trial)", starter: "2", basic: "5", creator: "6", pro: "12", studio: "12" },
  { feature: "Max quality",         free: "720p",      starter: "720p", basic: "1080p", creator: "4K", pro: "4K", studio: "4K" },
  { feature: "Free storyboard",     free: true,        starter: true,   basic: true,    creator: true, pro: true,  studio: true  },
  { feature: "WizSound discount",   free: false,       starter: false,  basic: false,   creator: "20%", pro: "40%", studio: "60%" },
  { feature: "WizSync™ character lock", free: false,   starter: false,  basic: false,   creator: true, pro: true,  studio: true  },
  { feature: "Build speed",         free: "Standard",  starter: "Standard", basic: "Standard", creator: "Priority", pro: "Priority", studio: "Fastest" },
  { feature: "API access",          free: false,       starter: false,  basic: false,   creator: false, pro: false, studio: true  },
];

// ── Build Credit / Topup Packs ────────────────────────────────────────────────
export type TopupPackKey = "quick_boost" | "creator_boost" | "studio_boost" | "pro_bulk_boost";

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
    key: "quick_boost",
    credits: 3,
    price: 12,
    perCredit: "£4.00 per Build Credit",
    label: "Quick Boost",
    popular: false,
    bestValue: false,
    desc: "Perfect for one-off extras. 3 Build Credits — use them whenever you need a bit more.",
  },
  {
    key: "creator_boost",
    credits: 10,
    price: 35,
    perCredit: "£3.50 per Build Credit",
    label: "Creator Boost",
    popular: true,
    bestValue: false,
    desc: "Best for busy creator weeks. 10 Build Credits for extra campaigns, collabs or content batches.",
  },
  {
    key: "studio_boost",
    credits: 25,
    price: 89,
    perCredit: "£3.56 per Build Credit",
    label: "Studio Boost",
    popular: false,
    bestValue: false,
    desc: "For campaigns and content batches. 25 Build Credits to power a full production run.",
  },
  {
    key: "pro_bulk_boost",
    credits: 60,
    price: 199,
    perCredit: "£3.32 per Build Credit",
    label: "Pro Bulk Boost",
    popular: false,
    bestValue: true,
    desc: "Best value for high-volume creators. 60 Build Credits — the most credits per pound.",
  },
];
