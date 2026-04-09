/**
 * Stripe Products & Pricing Configuration
 * Centralized definitions for subscription plans and credit packs
 */

/** Free trial credits granted to every new user on first sign-up */
export const FREE_TRIAL_CREDITS = 50;

export const SUBSCRIPTION_PLANS = {
  free: {
    name: "Free",
    pricePerMonth: 0,
    pricePerYear: 0,
    credits: 50,
    has4K: false,
    hasApiAccess: false,
    features: ["50 trial credits", "All AI tools", "Standard quality", "Watermarked output"],
    stripePriceId: null,
    stripeAnnualPriceId: null,
  },
  starter: {
    name: "Starter",
    pricePerMonth: 19,
    pricePerYear: 153, // 19 * 12 * 0.67 = ~$153/yr (33% off)
    credits: 1000,
    has4K: false,
    hasApiAccess: false,
    features: ["1,000 credits/month", "Standard quality", "Watermark-free", "Priority queue", "Free storyboard generation"],
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID || "price_starter_placeholder",
    stripeAnnualPriceId: process.env.STRIPE_STARTER_ANNUAL_PRICE_ID || "price_starter_annual_placeholder",
  },
  pro: {
    name: "Pro",
    pricePerMonth: 49,
    pricePerYear: 394, // 49 * 12 * 0.67 = ~$394/yr (33% off)
    credits: 3000,
    has4K: true,
    hasApiAccess: false,
    features: ["3,000 credits/month", "4K upscaling included", "Commercial license", "Early access to new models", "Free storyboard generation"],
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID || "price_pro_placeholder",
    stripeAnnualPriceId: process.env.STRIPE_PRO_ANNUAL_PRICE_ID || "price_pro_annual_placeholder",
  },
  business: {
    name: "Business",
    pricePerMonth: 149,
    pricePerYear: 1198, // 149 * 12 * 0.67 = ~$1198/yr (33% off)
    credits: 10000,
    has4K: true,
    hasApiAccess: true,
    features: ["10,000 credits/month", "4K upscaling included", "API access", "Team collaboration", "Dedicated support", "Free storyboard generation"],
    stripePriceId: process.env.STRIPE_BUSINESS_PRICE_ID || "price_business_placeholder",
    stripeAnnualPriceId: process.env.STRIPE_BUSINESS_ANNUAL_PRICE_ID || "price_business_annual_placeholder",
  },
} as const;

export const CREDIT_PACKS = {
  small: {
    name: "Small",
    price: 10,
    credits: 500,
    costPerCredit: 0.02,
    stripePriceId: process.env.STRIPE_SMALL_PACK_PRICE_ID || "price_small_pack_placeholder",
  },
  medium: {
    name: "Medium",
    price: 25,
    credits: 1500,
    costPerCredit: 0.0167,
    stripePriceId: process.env.STRIPE_MEDIUM_PACK_PRICE_ID || "price_medium_pack_placeholder",
  },
  large: {
    name: "Large",
    price: 60,
    credits: 4000,
    costPerCredit: 0.015,
    stripePriceId: process.env.STRIPE_LARGE_PACK_PRICE_ID || "price_large_pack_placeholder",
  },
} as const;

export type SubscriptionPlan = keyof typeof SUBSCRIPTION_PLANS;
export type CreditPack = keyof typeof CREDIT_PACKS;

/**
 * Get subscription plan details by key
 */
export function getSubscriptionPlan(plan: SubscriptionPlan) {
  return SUBSCRIPTION_PLANS[plan];
}

/**
 * Get credit pack details by key
 */
export function getCreditPack(pack: CreditPack) {
  return CREDIT_PACKS[pack];
}

/**
 * Get all paid subscription plans as array (excludes free)
 */
export function getAllSubscriptionPlans() {
  return Object.entries(SUBSCRIPTION_PLANS).map(([key, value]) => ({
    id: key,
    ...value,
  }));
}

/**
 * Get all credit packs as array
 */
export function getAllCreditPacks() {
  return Object.entries(CREDIT_PACKS).map(([key, value]) => ({
    id: key,
    ...value,
  }));
}

/**
 * Check if a plan includes 4K export
 */
export function planHas4K(plan: SubscriptionPlan): boolean {
  return SUBSCRIPTION_PLANS[plan].has4K;
}

/**
 * Check if a plan includes API access
 */
export function planHasApiAccess(plan: SubscriptionPlan): boolean {
  return SUBSCRIPTION_PLANS[plan].hasApiAccess;
}
