/**
 * Stripe Products & Pricing Configuration
 * WIZ AI GBP pricing (Apr 2026 — profitable rates):
 *   Free Trial: 30 credits, 1 video, 8 scenes, 30s, watermarked
 *   Starter:  £29/mo  — 2 videos, 8 scenes/video,  max 60s
 *   Creator:  £79/mo  — 6 videos, 11 scenes/video, max 90s  (Most Popular)
 *   Pro:      £149/mo — 12 videos, 12 scenes/video, max 120s
 *
 * Provider cost basis (Atlas Cloud Fast, Seedance 2.0, 720p):
 *   ~$0.101/sec × 8s/scene = ~$0.81/scene = ~£0.63/scene
 *
 * Profitability at these rates:
 *   Starter:  16 scenes × £0.63 = £10 cost → £19 profit (66% margin)
 *   Creator:  66 scenes × £0.63 = £41 cost → £38 profit (48% margin)
 *   Pro:     144 scenes × £0.63 = £91 cost → £58 profit (39% margin)
 */

/** Free trial credits granted to every new user on first sign-up (1 free render, 8 scenes, 30s, watermarked) */
export const FREE_TRIAL_CREDITS = 30;

/**
 * Scene limits per plan — enforced at render time.
 * 1 scene ≈ 8 seconds of video at 720p via Atlas Cloud Seedance 2.0.
 * A 3-minute music video = ~22 scenes; a 1-minute video = ~8 scenes.
 */
export const PLAN_SCENE_LIMITS: Record<string, number> = {
  free:    8,   // 1 video × 8 scenes = ~64s of video
  starter: 8,   // 2 videos × 8 scenes = ~64s each
  creator: 11,  // 6 videos × 11 scenes = ~88s each
  pro:     12,  // 12 videos × 12 scenes = ~96s each
};

/**
 * Credit costs for video generation (user-facing, not API cost).
 * These are the credits deducted from the user's balance.
 * Language rule: always say "credits", never "tokens", "cost", or "API".
 *
 * Credit allocation basis:
 *   Free (30 credits) = 1 video × 8 scenes × ~3.75 credits/scene
 *   Starter (240 credits) = 2 videos × 8 scenes × 15 credits/scene
 *   Creator (990 credits) = 6 videos × 11 scenes × 15 credits/scene
 *   Pro (2160 credits) = 12 videos × 12 scenes × 15 credits/scene
 *
 * 15 credits/scene is the standard rate. Each scene ≈ 8s video.
 */
export const CREDITS_PER_SCENE = 15;

export const VIDEO_CREDIT_COSTS = {
  /** Standard video credits by audio duration bucket */
  byDuration: {
    short:  { maxSeconds: 60,  credits: 30  }, // up to 60s  (~4 scenes)
    medium: { maxSeconds: 120, credits: 60  }, // up to 120s (~8 scenes)
    long:   { maxSeconds: 180, credits: 90  }, // up to 180s (~12 scenes)
  },
  /** Additional credits per premium (cinematic) scene */
  perCinematicScene: 20,
  /** Additional credits for lip sync / avatar */
  lipSync: 30,
} as const;

/**
 * Calculate the credit cost for a video based on duration and options.
 * Returns a breakdown for display on the creation screen.
 */
export function calculateVideoCreditCost(options: {
  audioDurationSeconds: number;
  cinematicSceneCount?: number;
  enableLipSync?: boolean;
}): { base: number; cinematic: number; lipSync: number; total: number } {
  const { audioDurationSeconds, cinematicSceneCount = 0, enableLipSync = false } = options;
  let base: number = VIDEO_CREDIT_COSTS.byDuration.long.credits; // default to long
  if (audioDurationSeconds <= VIDEO_CREDIT_COSTS.byDuration.short.maxSeconds) {
    base = VIDEO_CREDIT_COSTS.byDuration.short.credits;
  } else if (audioDurationSeconds <= VIDEO_CREDIT_COSTS.byDuration.medium.maxSeconds) {
    base = VIDEO_CREDIT_COSTS.byDuration.medium.credits;
  }
  const cinematic = cinematicSceneCount * VIDEO_CREDIT_COSTS.perCinematicScene;
  const lipSync = enableLipSync ? VIDEO_CREDIT_COSTS.lipSync : 0;
  return { base, cinematic, lipSync, total: base + cinematic + lipSync };
}

/** Low credit warning threshold — show warning UI when balance drops below this */
export const LOW_CREDIT_THRESHOLD = 20;

/**
 * Profitability Control System — Cost Targets (GBP)
 * Direct render cost targets per completed video.
 * Based on Atlas Cloud Fast tier: ~$0.101/sec × 8s/scene = ~$0.81/scene = ~£0.63/scene
 * If estimated cost exceeds the hard stop, generation is blocked.
 */
export const PLAN_COST_TARGETS = {
  free:    { targetGBP: 5.12,  hardStopGBP: 6.50  }, // 8 scenes × £0.64 = £5.12 (Atlas Cloud Fast)
  starter: { targetGBP: 5.12,  hardStopGBP: 6.50  }, // 8 scenes × £0.64 = £5.12 (Atlas Cloud Fast)
  creator: { targetGBP: 7.04,  hardStopGBP: 9.00  }, // 11 scenes × £0.64 = £7.04 (Atlas Cloud Fast)
  pro:     { targetGBP: 7.68,  hardStopGBP: 9.50  }, // 12 scenes × £0.64 = £7.68 (Atlas Cloud Fast)

  basic:   { targetGBP: 5.12,  hardStopGBP: 6.50  },
  studio:  { targetGBP: 7.68,  hardStopGBP: 9.50  },
} as const;

/**
 * Renderer cost estimates (GBP per 8-second scene at 720p)
 * Based on actual confirmed API pricing (Apr 2026, £1 = $1.27)
 * IMPORTANT: Keep these accurate — the profitability hard-stop system depends on them.
 *
 * Provider hierarchy (primary → fallback):
 *   1. Atlas Cloud Fast  — cheapest confirmed ($0.101/sec = £0.64/8s scene) ← PRIMARY
 *   2. fal.ai Fast       — 2.4× more expensive ($0.2419/sec = £1.52/8s scene) ← SECONDARY
 *   3. Hypereal          — estimated ($0.08–0.12/sec = £0.50–0.76/8s scene) ← TERTIARY
 *   4. WaveSpeed         — DISABLED (too expensive, unreliable)
 */
export const RENDERER_COSTS = {
  /** Atlas Cloud Fast — Seedance 2.0 Fast, 720p (~$0.101/sec × 8s = $0.81 = £0.64) ← PRIMARY */
  atlas_cloud_fast: 0.64,
  /** Atlas Cloud Standard — Seedance 2.0, 720p (~$0.127/sec × 8s = $1.02 = £0.80) */
  atlas_cloud: 0.80,
  /** fal.ai Fast — Seedance 2.0 Fast, 720p (~$0.2419/sec × 8s = $1.94 = £1.53) ← SECONDARY */
  fal_seedance_fast: 1.53,
  /** fal.ai Standard — Seedance 2.0, 720p (~$0.3034/sec × 8s = $2.43 = £1.91) */
  fal_seedance: 1.91,
  /** Hypereal — estimated (~$0.10/sec × 8s = $0.80 = £0.63) ← TERTIARY */
  hypereal: 0.63,
  /** WaveSpeed Seedance 2.0 — DISABLED. Too expensive ($0.15–0.24/sec) and unreliable. */
  wavespeed_seedance: 1.51,
  // Legacy key — maps to Atlas Cloud Fast (primary provider, cheapest)
  seedance: 0.64,
  /** Kling AI v3 Standard (720p) — premium renderer (~$0.67/scene = £0.53) */
  kling_standard: 0.53,
  /** Kling AI v3 Pro (1080p) — high-quality premium renderer (~$0.90/scene = £0.71) */
  kling_pro: 0.71,
  /** Runway ML gen4_turbo — alternative premium renderer (~$0.40/scene = £0.31) */
  runway: 0.31,
  /** Grok Imagine video (720p, 5s) — premium renderer ($0.35/scene = £0.28) */
  grok_imagine: 0.28,
} as const;

export type RendererType = keyof typeof RENDERER_COSTS;

/**
 * Scene importance tiers for the renderer router.
 * Hero and performance scenes may use premium renderers (within plan allocation).
 * Narrative and filler scenes always use the cheap renderer.
 */
export type SceneImportance = "hero" | "performance" | "narrative" | "filler";

export const SUBSCRIPTION_PLANS = {
  free: {
    name: "Free Trial",
    pricePerMonth: 0,
    pricePerYear: 0,
    credits: FREE_TRIAL_CREDITS,
    videosPerMonth: 1,
    maxVideosPerMonth: 1,
    maxVideoSeconds: 30,
    maxScenesPerVideo: 8,
    maxPremiumScenesPerVideo: 0,
    has4K: false,
    hasApiAccess: false,
    popular: false,
    features: [
      "1 free video (watermarked)",
      "Up to 8 scenes (~64s of video)",
      "1 scene ≈ 8 seconds of video",
      "All AI video styles",
      "WizVideo music video maker",
    ],
    stripePriceId: null,
    stripeAnnualPriceId: null,
  },
  starter: {
    name: "Starter",
    pricePerMonth: 29,
    pricePerYear: 290, // £29 × 10 = £290 (2 months free)
    credits: 240,      // 2 videos × 8 scenes × 15 credits/scene
    videosPerMonth: 2,
    maxVideosPerMonth: 2,
    maxVideoSeconds: 60,
    maxScenesPerVideo: 8,
    maxPremiumScenesPerVideo: 0,
    has4K: false,
    hasApiAccess: false,
    popular: false,
    features: [
      "2 videos per month",
      "Up to 8 scenes per video (~64s)",
      "1 scene ≈ 8 seconds of video",
      "Standard quality (720p)",
      "All AI video styles",
      "Free storyboard generation",
      "No watermark",
      "Email support",
      "Cancel anytime",
    ],
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID?.startsWith("price_1TSQ") ? process.env.STRIPE_STARTER_PRICE_ID : "price_1TSQxpIaMYB25uKKAojtuR64",
    stripeAnnualPriceId: process.env.STRIPE_STARTER_ANNUAL_PRICE_ID?.startsWith("price_1TSQ") ? process.env.STRIPE_STARTER_ANNUAL_PRICE_ID : "price_1TSQxrIaMYB25uKKrNqZVOc1",
  },
  creator: {
    name: "Creator",
    pricePerMonth: 79,
    pricePerYear: 790, // £79 × 10 = £790 (2 months free)
    credits: 990,      // 6 videos × 11 scenes × 15 credits/scene
    videosPerMonth: 6,
    maxVideosPerMonth: 6,
    maxVideoSeconds: 90,
    maxScenesPerVideo: 11,
    maxPremiumScenesPerVideo: 2,
    has4K: true,
    hasApiAccess: false,
    popular: true,
    wizSoundDiscount: 0.20,
    features: [
      "6 videos per month",
      "Up to 11 scenes per video (~88s)",
      "1 scene ≈ 8 seconds of video",
      "HD quality (720p + 4K upgrade)",
      "Faster rendering",
      "20% WizSound\u2122 discount",
      "No watermark",
      "Character consistency",
      "Priority support",
      "Cancel anytime",
    ],
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID?.startsWith("price_1TSQ") ? process.env.STRIPE_PRO_PRICE_ID : "price_1TSQxsIaMYB25uKKYpmhAx3J",
    stripeAnnualPriceId: process.env.STRIPE_PRO_ANNUAL_PRICE_ID?.startsWith("price_1TSQ") ? process.env.STRIPE_PRO_ANNUAL_PRICE_ID : "price_1TSQxtIaMYB25uKKdOSrkDuG",
  },
  pro: {
    name: "Pro",
    pricePerMonth: 149,
    pricePerYear: 1490, // £149 × 10 = £1,490 (2 months free)
    credits: 2160,      // 12 videos × 12 scenes × 15 credits/scene
    videosPerMonth: 12,
    maxVideosPerMonth: 12,
    maxVideoSeconds: 120,
    maxScenesPerVideo: 12,
    maxPremiumScenesPerVideo: 5,
    has4K: true,
    hasApiAccess: false,
    popular: false,
    wizSoundDiscount: 0.40,
    features: [
      "12 videos per month",
      "Up to 12 scenes per video (~96s)",
      "1 scene ≈ 8 seconds of video",
      "4K quality included",
      "Priority rendering",
      "40% WizSound\u2122 discount",
      "No watermark",
      "Full cinematic control",
      "Priority support",
      "Cancel anytime",
    ],
    stripePriceId: process.env.STRIPE_PRO_PLUS_PRICE_ID?.startsWith("price_1TSQ") ? process.env.STRIPE_PRO_PLUS_PRICE_ID : "price_1TSQxuIaMYB25uKK9BAlUxk0",
    stripeAnnualPriceId: process.env.STRIPE_PRO_PLUS_ANNUAL_PRICE_ID?.startsWith("price_1TSQ") ? process.env.STRIPE_PRO_PLUS_ANNUAL_PRICE_ID : "price_1TSQxwIaMYB25uKKm4inmBFO",
  },
  // Legacy plan aliases — kept for backward compat with existing subscribers
  basic: {
    name: "Basic",
    pricePerMonth: 29,
    pricePerYear: 290,
    credits: 240,
    videosPerMonth: 2,
    maxVideosPerMonth: 2,
    maxVideoSeconds: 60,
    maxScenesPerVideo: 8,
    maxPremiumScenesPerVideo: 0,
    has4K: false,
    hasApiAccess: false,
    popular: false,
    features: [
      "2 videos per month",
      "Up to 8 scenes per video (~64s)",
      "Standard quality (720p)",
      "No watermark",
      "Email support",
      "Cancel anytime",
    ],
    stripePriceId: process.env.STRIPE_BASIC_PRICE_ID?.startsWith("price_1TSQ") ? process.env.STRIPE_BASIC_PRICE_ID : "price_1TSQxxIaMYB25uKKDfzIR0aC",
    stripeAnnualPriceId: process.env.STRIPE_BASIC_ANNUAL_PRICE_ID?.startsWith("price_1TSQ") ? process.env.STRIPE_BASIC_ANNUAL_PRICE_ID : "price_1TSQxyIaMYB25uKKRRu0CoHn",
  },
  studio: {
    name: "Studio",
    pricePerMonth: 149,
    pricePerYear: 1490,
    credits: 2160,
    videosPerMonth: 12,
    maxVideosPerMonth: 12,
    maxVideoSeconds: 120,
    maxScenesPerVideo: 12,
    maxPremiumScenesPerVideo: 5,
    has4K: true,
    hasApiAccess: true,
    popular: false,
    wizSoundDiscount: 0.40,
    features: [
      "12 videos per month",
      "Up to 12 scenes per video (~96s)",
      "4K quality included",
      "Priority rendering",
      "40% WizSound\u2122 discount",
      "No watermark",
      "Full cinematic control",
      "API access for automation",
      "Dedicated account support",
      "Cancel anytime",
    ],
    stripePriceId: process.env.STRIPE_BUSINESS_PRICE_ID?.startsWith("price_1TSQ") ? process.env.STRIPE_BUSINESS_PRICE_ID : "price_1TSQy0IaMYB25uKKyUpZzrK2",
    stripeAnnualPriceId: process.env.STRIPE_BUSINESS_ANNUAL_PRICE_ID?.startsWith("price_1TSQ") ? process.env.STRIPE_BUSINESS_ANNUAL_PRICE_ID : "",
  },
} as const;

/**
 * Credit top-up packs — for when subscribers run out of their monthly allocation.
 * Priced at a premium over the subscription rate (convenience pricing).
 * Provider cost basis: ~£0.64/scene × 15 credits/scene = ~£0.043/credit
 */
export const CREDIT_PACKS = {
  starter: {
    name: "Starter Pack",
    description: "3 extra videos (8 scenes each)",
    tagline: "Top up when you need a bit more",
    price: 19,
    credits: 360,   // 3 videos × 8 scenes × 15 credits = 360 credits
    videos: 3,
    popular: false,
    stripePriceId: process.env.STRIPE_SMALL_PACK_PRICE_ID?.startsWith("price_1TSQ") ? process.env.STRIPE_SMALL_PACK_PRICE_ID : "price_1TSQy6IaMYB25uKKqcZU88QZ",
  },
  creator: {
    name: "Creator Pack",
    description: "8 extra videos (11 scenes each)",
    tagline: "Best value top-up for regular creators",
    price: 39,
    credits: 1320,  // 8 videos × 11 scenes × 15 credits = 1,320 credits
    videos: 8,
    popular: true,
    stripePriceId: process.env.STRIPE_MEDIUM_PACK_PRICE_ID?.startsWith("price_1TSQ") ? process.env.STRIPE_MEDIUM_PACK_PRICE_ID : "price_1TSQy7IaMYB25uKKkKDs8uYZ",
  },
  pro: {
    name: "Pro Pack",
    description: "20 extra videos (12 scenes each)",
    tagline: "High-volume creation at scale",
    price: 79,
    credits: 3600,  // 20 videos × 12 scenes × 15 credits = 3,600 credits
    videos: 20,
    popular: false,
    stripePriceId: process.env.STRIPE_LARGE_PACK_PRICE_ID?.startsWith("price_1TSQ") ? process.env.STRIPE_LARGE_PACK_PRICE_ID : "price_1TSQy9IaMYB25uKKdI8JqVyT",
  },
} as const;

/**
 * Cinematic upgrade packs — premium scene credits.
 * Each cinematic scene costs 20 credits (5 extra on top of standard 15).
 */
export const CINEMATIC_PACKS = {
  ten: {
    name: "10 Cinematic Scenes",
    description: "Apply premium rendering to 10 key scenes",
    price: 15,
    credits: 200,
    scenes: 10,
    stripePriceId: process.env.STRIPE_CINEMATIC_10_PRICE_ID?.startsWith("price_1TSQ") ? process.env.STRIPE_CINEMATIC_10_PRICE_ID : "price_1TSQyKIaMYB25uKKc3HakTOk",
  },
  twentyfive: {
    name: "25 Cinematic Scenes",
    description: "Apply premium rendering to 25 key scenes",
    price: 32,
    credits: 500,
    scenes: 25,
    stripePriceId: process.env.STRIPE_CINEMATIC_25_PRICE_ID?.startsWith("price_1TSQ") ? process.env.STRIPE_CINEMATIC_25_PRICE_ID : "price_1TSQyLIaMYB25uKKjXFJd5BE",
  },
  fifty: {
    name: "50 Cinematic Scenes",
    description: "Apply premium rendering to 50 key scenes",
    price: 58,
    credits: 1000,
    scenes: 50,
    stripePriceId: process.env.STRIPE_CINEMATIC_50_PRICE_ID?.startsWith("price_1TSQ") ? process.env.STRIPE_CINEMATIC_50_PRICE_ID : "price_1TSQyNIaMYB25uKKyR4EXLqX",
  },
} as const;

export type CinematicPack = keyof typeof CINEMATIC_PACKS;

export type SubscriptionPlan = keyof typeof SUBSCRIPTION_PLANS;

// Legacy aliases for backward compat
export const PLAN_ALIAS: Record<string, SubscriptionPlan> = {
  creator_plus: "studio",
  business: "studio",
};

export type CreditPack = keyof typeof CREDIT_PACKS;

export function getSubscriptionPlan(plan: SubscriptionPlan) {
  return SUBSCRIPTION_PLANS[plan];
}

export function getCreditPack(pack: CreditPack) {
  return CREDIT_PACKS[pack];
}

export function getAllSubscriptionPlans() {
  return Object.entries(SUBSCRIPTION_PLANS).map(([key, value]) => ({
    id: key,
    ...value,
  }));
}

export function getAllCreditPacks() {
  return Object.entries(CREDIT_PACKS).map(([key, value]) => ({
    id: key,
    ...value,
  }));
}

export function planHas4K(plan: SubscriptionPlan): boolean {
  return SUBSCRIPTION_PLANS[plan].has4K;
}

export function planHasApiAccess(plan: SubscriptionPlan): boolean {
  return SUBSCRIPTION_PLANS[plan].hasApiAccess;
}

export function planIsUnlimited(_plan: SubscriptionPlan): boolean {
  // All plans have explicit monthly video caps — none are truly unlimited.
  return false;
}

export function getPlanMaxVideoSeconds(plan: SubscriptionPlan): number {
  return SUBSCRIPTION_PLANS[plan].maxVideoSeconds;
}

export function getPlanMaxVideosPerMonth(plan: SubscriptionPlan): number {
  return SUBSCRIPTION_PLANS[plan].maxVideosPerMonth;
}

export function getPlanMaxPremiumScenes(plan: SubscriptionPlan): number {
  return SUBSCRIPTION_PLANS[plan].maxPremiumScenesPerVideo;
}

export function getPlanMaxScenesPerVideo(plan: SubscriptionPlan): number {
  return SUBSCRIPTION_PLANS[plan].maxScenesPerVideo;
}

export function getPlanCostTargets(plan: SubscriptionPlan) {
  return PLAN_COST_TARGETS[plan];
}

/**
 * Calculate the estimated credit cost for a render job.
 * Used by the hard credit gate before any provider is called.
 */
export function estimateRenderCreditCost(sceneCount: number): number {
  return sceneCount * CREDITS_PER_SCENE;
}

// ─── Video Credit Top-Up Packs ────────────────────────────────────────────────
// One-time purchases for active subscribers who need extra Video Credits.
// Credit consumption model: 720p = 1 credit, 1080p = 2 credits, 4K = 3 credits.
// Credits are only consumed on successful final video export.
export const TOPUP_PACKS = {
  quick_boost: {
    key: "quick_boost",
    name: "Quick Boost",
    credits: 3,
    priceGbp: 12,
    pricePence: 1200,
    bestFor: "One-off extras",
    cta: "Add 3 Credits",
    popular: false,
    stripePriceId: process.env.STRIPE_TOPUP_QUICK_BOOST_PRICE_ID?.startsWith("price_1TSQ") ? process.env.STRIPE_TOPUP_QUICK_BOOST_PRICE_ID : "price_1TSQy1IaMYB25uKKCgA48het",
  },
  creator_boost: {
    key: "creator_boost",
    name: "Creator Boost",
    credits: 10,
    priceGbp: 35,
    pricePence: 3500,
    bestFor: "Busy creator weeks",
    cta: "Add 10 Credits",
    popular: true,
    stripePriceId: process.env.STRIPE_TOPUP_CREATOR_BOOST_PRICE_ID?.startsWith("price_1TSQ") ? process.env.STRIPE_TOPUP_CREATOR_BOOST_PRICE_ID : "price_1TSQy2IaMYB25uKKjJVCfOx7",
  },
  studio_boost: {
    key: "studio_boost",
    name: "Studio Boost",
    credits: 25,
    priceGbp: 89,
    pricePence: 8900,
    bestFor: "Campaigns and content batches",
    cta: "Add 25 Credits",
    popular: false,
    stripePriceId: process.env.STRIPE_TOPUP_STUDIO_BOOST_PRICE_ID?.startsWith("price_1TSQ") ? process.env.STRIPE_TOPUP_STUDIO_BOOST_PRICE_ID : "price_1TSQy3IaMYB25uKKtrkCBHWo",
  },
  pro_bulk_boost: {
    key: "pro_bulk_boost",
    name: "Pro Bulk Boost",
    credits: 60,
    priceGbp: 199,
    pricePence: 19900,
    bestFor: "High-volume creators",
    cta: "Add 60 Credits",
    popular: false,
    stripePriceId: process.env.STRIPE_TOPUP_PRO_BULK_BOOST_PRICE_ID?.startsWith("price_1TSQ") ? process.env.STRIPE_TOPUP_PRO_BULK_BOOST_PRICE_ID : "price_1TSQy5IaMYB25uKKQcZLvER6",
  },
} as const;

export type TopupPackKey = keyof typeof TOPUP_PACKS;

// Quality-based Video Credit consumption model
export const VIDEO_CREDIT_COST_BY_QUALITY = {
  "720p": 1,
  "1080p": 2,
  "4k": 3,
} as const;
export type VideoExportQuality = keyof typeof VIDEO_CREDIT_COST_BY_QUALITY;

export function getAllTopupPacks() {
  return Object.values(TOPUP_PACKS);
}
