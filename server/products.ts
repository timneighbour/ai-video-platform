/**
 * Stripe Products & Pricing Configuration
 * WizVid GBP pricing: Starter £9/mo £79/yr | Creator £29/mo £232/yr (Most Popular) | Studio £99/mo £792/yr
 *
 * Profitability Control System integrated — see PLAN_COST_TARGETS and RENDERER_COSTS.
 */

/** Free trial credits granted to every new user on first sign-up */
export const FREE_TRIAL_CREDITS = 50;

/**
 * Credit costs for video generation (user-facing, not API cost).
 * These are the credits deducted from the user's balance.
 * Language rule: always say "credits", never "tokens", "cost", or "API".
 */
export const VIDEO_CREDIT_COSTS = {
  /** Standard video credits by audio duration bucket */
  byDuration: {
    short:  { maxSeconds: 60,  credits: 30  }, // up to 60s
    medium: { maxSeconds: 120, credits: 60  }, // up to 120s
    long:   { maxSeconds: 180, credits: 90  }, // up to 180s
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
 * If estimated cost exceeds the hard stop, generation is blocked and scenes are downgraded.
 */
export const PLAN_COST_TARGETS = {
  free:    { targetGBP: 0.50, hardStopGBP: 0.75 },
  starter: { targetGBP: 0.75, hardStopGBP: 1.25 },
  creator: { targetGBP: 2.00, hardStopGBP: 3.50 },
  studio:  { targetGBP: 4.50, hardStopGBP: 7.00 },
} as const;

/**
 * Renderer cost estimates (GBP per 8-second scene)
 * Based on current API pricing (Apr 2026, £1 = $1.27)
 */
export const RENDERER_COSTS = {
  /** Seedance 2.0 via fal.ai — primary cheap renderer (~$0.05-0.10/scene, best margin) */
  fal_seedance: 0.06,
  /** Seedance 2.0 via Volcengine — legacy fallback renderer (~$0.15/scene) */
  seedance: 0.12,
  /** Kling AI v3 Standard (720p) via official API — premium renderer (~$0.67/scene) */
  kling_standard: 0.53,
  /** Kling AI v3 Pro (1080p) — high-quality premium renderer (~$0.90/scene) */
  kling_pro: 0.71,
  /** Runway ML gen4_turbo — alternative premium renderer (~$0.40/scene) */
  runway: 0.31,
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
    credits: 50,
    videosPerMonth: 2,
    maxVideosPerMonth: 2,
    maxVideoSeconds: 30,
    maxPremiumScenesPerVideo: 0, // Standard renderer only
    has4K: false,
    hasApiAccess: false,
    popular: false,
    features: [
      "2 free videos (watermarked)",
      "All AI tools",
      "Standard quality",
      "WizBeat music video maker",
      "WizPilot AI video creator",
    ],
    stripePriceId: null,
    stripeAnnualPriceId: null,
  },
  starter: {
    name: "Starter",
    pricePerMonth: 9,
    pricePerYear: 79, // £9 × 12 = £108 → save £29 (2+ months free)
    credits: 300,
    videosPerMonth: 5,         // ~5 min total video at 1 min each
    maxVideosPerMonth: 5,
    maxVideoSeconds: 60,       // 1-minute max per video
    maxPremiumScenesPerVideo: 0, // Seedance only — no Kling/Runway
    has4K: false,
    hasApiAccess: false,
    popular: false,
    features: [
      "5 minutes of video per month",
      "Up to 60 seconds per video",
      "720p quality",
      "All AI video styles",
      "WizBeat music video maker",
      "WizPilot AI video creator",
      "Watermark on videos",
      "Cancel anytime",
    ],
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID || "price_starter_placeholder",
    stripeAnnualPriceId: process.env.STRIPE_STARTER_ANNUAL_PRICE_ID || "",
  },
  creator: {
    name: "Creator",
    pricePerMonth: 29,
    pricePerYear: 232, // £29 × 12 = £348 → save £116 (2 months free)
    credits: 1200,
    videosPerMonth: 20,        // ~20 min total video
    maxVideosPerMonth: 20,
    maxVideoSeconds: 120,      // 2-minute max per video
    maxPremiumScenesPerVideo: 2, // 2 cinematic scenes included
    has4K: false,
    hasApiAccess: false,
    popular: true,
    features: [
      "20 minutes of video per month",
      "Up to 2 minutes per video",
      "1080p quality",
      "Lyric-aware scene generation",
      "Character consistency across scenes",
      "2 cinematic scenes included",
      "No watermark",
      "Priority support",
      "Cancel anytime",
    ],
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID || "price_creator_placeholder",
    stripeAnnualPriceId: process.env.STRIPE_PRO_ANNUAL_PRICE_ID || "",
  },
  studio: {
    name: "Studio",
    pricePerMonth: 99,
    pricePerYear: 792, // £99 × 12 = £1188 → save £396 (4 months free)
    credits: 99999,
    videosPerMonth: 60,        // ~60 min total video
    maxVideosPerMonth: 60,
    maxVideoSeconds: 180,      // 3-minute max per video
    maxPremiumScenesPerVideo: 10, // Full cinematic control
    has4K: true,
    hasApiAccess: true,
    popular: false,
    features: [
      "60 minutes of video per month",
      "Up to 3 minutes per video",
      "4K quality",
      "Full cinematic control",
      "Priority rendering (2× faster)",
      "All premium styles",
      "API access for automation",
      "Early access to new features",
      "Dedicated account support",
      "Cancel anytime",
    ],
    stripePriceId: process.env.STRIPE_BUSINESS_PRICE_ID || "price_studio_placeholder",
    stripeAnnualPriceId: process.env.STRIPE_BUSINESS_ANNUAL_PRICE_ID || "",
  },
} as const;

export const CREDIT_PACKS = {
  starter: {
    name: "Starter Pack",
    description: "~10 standard videos",
    tagline: "Ideal for short creations",
    price: 9,
    credits: 300,   // 300 credits ≈ 10 × 30-credit videos
    popular: false,
    stripePriceId: process.env.STRIPE_SMALL_PACK_PRICE_ID || "price_small_pack_placeholder",
  },
  creator: {
    name: "Creator Pack",
    description: "~30 standard videos",
    tagline: "Best value for regular creators",
    price: 24,
    credits: 900,   // 900 credits ≈ 30 × 30-credit videos
    popular: true,
    stripePriceId: process.env.STRIPE_MEDIUM_PACK_PRICE_ID || "price_medium_pack_placeholder",
  },
  pro: {
    name: "Pro Pack",
    description: "~80 standard videos",
    tagline: "Built for high-volume creation",
    price: 59,
    credits: 2400,  // 2400 credits ≈ 80 × 30-credit videos
    popular: false,
    stripePriceId: process.env.STRIPE_LARGE_PACK_PRICE_ID || "price_large_pack_placeholder",
  },
} as const;

/**
 * Cinematic upgrade packs — premium scene credits.
 * Each cinematic scene costs 20 credits.
 * These packs let users top up cinematic scene credits specifically.
 */
export const CINEMATIC_PACKS = {
  ten: {
    name: "10 Cinematic Scenes",
    description: "Apply premium rendering to 10 key scenes",
    price: 12,
    credits: 200,   // 10 × 20 credits per cinematic scene
    scenes: 10,
    stripePriceId: process.env.STRIPE_CINEMATIC_10_PRICE_ID || "price_cinematic_10_placeholder",
  },
  twentyfive: {
    name: "25 Cinematic Scenes",
    description: "Apply premium rendering to 25 key scenes",
    price: 25,
    credits: 500,   // 25 × 20 credits
    scenes: 25,
    stripePriceId: process.env.STRIPE_CINEMATIC_25_PRICE_ID || "price_cinematic_25_placeholder",
  },
  fifty: {
    name: "50 Cinematic Scenes",
    description: "Apply premium rendering to 50 key scenes",
    price: 45,
    credits: 1000,  // 50 × 20 credits
    scenes: 50,
    stripePriceId: process.env.STRIPE_CINEMATIC_50_PRICE_ID || "price_cinematic_50_placeholder",
  },
} as const;

export type CinematicPack = keyof typeof CINEMATIC_PACKS;

export type SubscriptionPlan = keyof typeof SUBSCRIPTION_PLANS;
// Legacy aliases for backward compat
export const PLAN_ALIAS: Record<string, SubscriptionPlan> = {
  pro: "creator",
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
  // All plans now have explicit monthly video caps — none are truly unlimited.
  // This function is kept for backward compatibility but always returns false.
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

export function getPlanCostTargets(plan: SubscriptionPlan) {
  return PLAN_COST_TARGETS[plan];
}
