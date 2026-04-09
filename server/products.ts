/**
 * Stripe Products & Pricing Configuration
 * WizVid GBP pricing: Starter £19 | Pro £49 (Most Popular) | Creator+ £99
 */

/** Free trial credits granted to every new user on first sign-up */
export const FREE_TRIAL_CREDITS = 50;

export const SUBSCRIPTION_PLANS = {
  free: {
    name: "Free Trial",
    pricePerMonth: 0,
    pricePerYear: 0,
    credits: 50,
    videosPerMonth: 2,
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
    pricePerMonth: 19,
    pricePerYear: 152, // £19 × 8 = £152/yr (save 33%)
    credits: 600,
    videosPerMonth: 20,
    has4K: false,
    hasApiAccess: false,
    popular: false,
    features: [
      "Up to 20 videos per month",
      "All 6 AI video styles",
      "WizBeat music video maker",
      "WizPilot AI video creator",
      "Standard generation speed",
      "Watermark on videos",
      "Cancel anytime",
    ],
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID || "price_starter_placeholder",
    stripeAnnualPriceId: process.env.STRIPE_STARTER_ANNUAL_PRICE_ID || "price_starter_annual_placeholder",
  },
  pro: {
    name: "Pro",
    pricePerMonth: 49,
    pricePerYear: 392, // £49 × 8 = £392/yr (save 33%)
    credits: 99999,
    videosPerMonth: -1, // unlimited
    has4K: true,
    hasApiAccess: false,
    popular: true,
    features: [
      "Unlimited videos per month",
      "No watermark",
      "Faster generation speed",
      "4K quality export",
      "All 6 AI video styles + premium styles",
      "MuseTalk lip-sync for characters",
      "Priority support",
      "Cancel anytime",
    ],
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID || "price_pro_placeholder",
    stripeAnnualPriceId: process.env.STRIPE_PRO_ANNUAL_PRICE_ID || "price_pro_annual_placeholder",
  },
  creator_plus: {
    name: "Creator+",
    pricePerMonth: 99,
    pricePerYear: 792, // £99 × 8 = £792/yr (save 33%)
    credits: 99999,
    videosPerMonth: -1, // unlimited
    has4K: true,
    hasApiAccess: true,
    popular: false,
    features: [
      "Everything in Pro",
      "Priority rendering (2× faster)",
      "Premium exclusive styles",
      "Early access to new features",
      "Highest quality output",
      "API access for automation",
      "Dedicated account support",
      "Cancel anytime",
    ],
    stripePriceId: process.env.STRIPE_CREATOR_PLUS_PRICE_ID || "price_creator_plus_placeholder",
    stripeAnnualPriceId: process.env.STRIPE_CREATOR_PLUS_ANNUAL_PRICE_ID || "price_creator_plus_annual_placeholder",
  },
} as const;

export const CREDIT_PACKS = {
  small: {
    name: "Video Boost Pack",
    description: "5 extra videos",
    price: 5,
    credits: 150,
    costPerCredit: 0.033,
    stripePriceId: process.env.STRIPE_SMALL_PACK_PRICE_ID || "price_small_pack_placeholder",
  },
  medium: {
    name: "Creator Pack",
    description: "15 extra videos",
    price: 10,
    credits: 450,
    costPerCredit: 0.022,
    stripePriceId: process.env.STRIPE_MEDIUM_PACK_PRICE_ID || "price_medium_pack_placeholder",
  },
  large: {
    name: "Pro Pack",
    description: "40 extra videos",
    price: 20,
    credits: 1200,
    costPerCredit: 0.017,
    stripePriceId: process.env.STRIPE_LARGE_PACK_PRICE_ID || "price_large_pack_placeholder",
  },
} as const;

export type SubscriptionPlan = keyof typeof SUBSCRIPTION_PLANS;
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

export function planIsUnlimited(plan: SubscriptionPlan): boolean {
  return SUBSCRIPTION_PLANS[plan].videosPerMonth === -1;
}
