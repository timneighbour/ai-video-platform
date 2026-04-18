/**
 * Stripe Products & Pricing Configuration
 * WIZ AI GBP pricing: Starter £9/mo | Basic £19/mo | Creator £35/mo (Most Popular) | Pro £59/mo | Studio £99/mo
 * Annual: 2 months free (£90/£190/£350/£590/£990). *
 * Profitability Control System integrated — see PLAN_COST_TARGETS and RENDERER_COSTS.
 */

/** Free trial credits granted to every new user on first sign-up (2 free renders × 30 credits each) */
export const FREE_TRIAL_CREDITS = 60;

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
  starter: { targetGBP: 0.60, hardStopGBP: 1.00 },
  basic:   { targetGBP: 0.75, hardStopGBP: 1.25 },
  creator: { targetGBP: 1.50, hardStopGBP: 2.50 },
  pro:     { targetGBP: 2.50, hardStopGBP: 4.00 },
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
  /** Grok Imagine video (720p, 5s) — premium renderer ($0.07/s × 5s = $0.35/scene) */
  grok_imagine: 0.35,
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
    credits: 60,
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
      "WizVideo music video maker",
      "WizScript AI video creator",
    ],
    stripePriceId: null,
    stripeAnnualPriceId: null,
  },
  starter: {
    name: "Starter",
    pricePerMonth: 9,
    pricePerYear: 90, // £9 × 10 = £90 (2 months free)
    credits: 60,
    videosPerMonth: 2,
    maxVideosPerMonth: 2,
    maxVideoSeconds: 60,
    maxPremiumScenesPerVideo: 0,
    has4K: false,
    hasApiAccess: false,
    popular: false,
    features: [
      "2 renders per month",
      "Standard quality (720p)",
      "All AI video styles",
      "Free storyboard generation",
      "Email support",
      "Cancel anytime",
    ],
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID || "price_starter_placeholder",
    stripeAnnualPriceId: process.env.STRIPE_STARTER_ANNUAL_PRICE_ID || "",
  },
  basic: {
    name: "Basic",
    pricePerMonth: 19,
    pricePerYear: 190, // £19 × 10 = £190 (2 months free)
    credits: 150,
    videosPerMonth: 5,
    maxVideosPerMonth: 5,
    maxVideoSeconds: 90,
    maxPremiumScenesPerVideo: 0,
    has4K: false,
    hasApiAccess: false,
    popular: false,
    features: [
      "5 renders per month",
      "HD quality (1080p)",
      "All AI video styles",
      "Standard rendering speed",
      "Email support",
      "Cancel anytime",
    ],
    stripePriceId: process.env.STRIPE_BASIC_PRICE_ID || "price_basic_placeholder",
    stripeAnnualPriceId: process.env.STRIPE_BASIC_ANNUAL_PRICE_ID || "",
  },
  creator: {
    name: "Creator",
    pricePerMonth: 35,
    pricePerYear: 350, // £35 × 10 = £350 (2 months free)
    credits: 180,
    videosPerMonth: 6,
    maxVideosPerMonth: 6,
    maxVideoSeconds: 120,
    maxPremiumScenesPerVideo: 2,
    has4K: true,
    hasApiAccess: false,
    popular: true,
    wizSoundDiscount: 0.20,
    features: [
      "6 renders per month",
      "HD + 4K access",
      "Faster rendering",
      "20% WizSound\u2122 discount",
      "No watermark",
      "Character consistency",
      "Priority support",
      "Cancel anytime",
    ],
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID || "price_creator_placeholder",
    stripeAnnualPriceId: process.env.STRIPE_PRO_ANNUAL_PRICE_ID || "",
  },
  pro: {
    name: "Pro",
    pricePerMonth: 59,
    pricePerYear: 590, // £59 × 10 = £590 (2 months free)
    credits: 360,
    videosPerMonth: 12,
    maxVideosPerMonth: 12,
    maxVideoSeconds: 150,
    maxPremiumScenesPerVideo: 5,
    has4K: true,
    hasApiAccess: false,
    popular: false,
    wizSoundDiscount: 0.40,
    features: [
      "12 renders per month",
      "4K quality included",
      "Priority rendering",
      "40% WizSound\u2122 discount",
      "No watermark",
      "Full cinematic control",
      "Priority support",
      "Cancel anytime",
    ],
    stripePriceId: process.env.STRIPE_PRO_PLUS_PRICE_ID || "price_pro_placeholder",
    stripeAnnualPriceId: process.env.STRIPE_PRO_PLUS_ANNUAL_PRICE_ID || "",
  },
  studio: {
    name: "Studio",
    pricePerMonth: 99,
    pricePerYear: 990, // £99 × 10 = £990 (2 months free)
    credits: 600,
    videosPerMonth: 20,
    maxVideosPerMonth: 20,
    maxVideoSeconds: 180,
    maxPremiumScenesPerVideo: 10,
    has4K: true,
    hasApiAccess: true,
    popular: false,
    wizSoundDiscount: 0.60,
    features: [
      "20 renders per month",
      "4K quality included",
      "Fastest rendering",
      "60% WizSound\u2122 discount",
      "No watermark",
      "Full cinematic control",
      "API access for automation",
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
    description: "~20 standard videos",
    tagline: "Best value for regular creators",
    price: 24,
    credits: 600,   // 600 credits ≈ 20 × 30-credit videos
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
    price: 15,
    credits: 200,   // 10 × 20 credits per cinematic scene
    scenes: 10,
    stripePriceId: process.env.STRIPE_CINEMATIC_10_PRICE_ID || "price_cinematic_10_placeholder",
  },
  twentyfive: {
    name: "25 Cinematic Scenes",
    description: "Apply premium rendering to 25 key scenes",
    price: 32,
    credits: 500,   // 25 × 20 credits
    scenes: 25,
    stripePriceId: process.env.STRIPE_CINEMATIC_25_PRICE_ID || "price_cinematic_25_placeholder",
  },
  fifty: {
    name: "50 Cinematic Scenes",
    description: "Apply premium rendering to 50 key scenes",
    price: 58,
    credits: 1000,  // 50 × 20 credits
    scenes: 50,
    stripePriceId: process.env.STRIPE_CINEMATIC_50_PRICE_ID || "price_cinematic_50_placeholder",
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
