/**
 * Stripe Products & Pricing Configuration
 * Centralized definitions for subscription plans and credit packs
 */

export const SUBSCRIPTION_PLANS = {
  starter: {
    name: "Starter",
    pricePerMonth: 19,
    credits: 1000,
    features: ["1,000 credits/month", "Standard quality", "Watermark-free", "Priority queue"],
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID || "price_starter_placeholder",
  },
  pro: {
    name: "Pro",
    pricePerMonth: 49,
    credits: 3000,
    features: ["3,000 credits/month", "4K upscaling", "Commercial license", "Early access to new models"],
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID || "price_pro_placeholder",
  },
  business: {
    name: "Business",
    pricePerMonth: 149,
    credits: 10000,
    features: ["10,000 credits/month", "API access", "Team collaboration", "Dedicated support"],
    stripePriceId: process.env.STRIPE_BUSINESS_PRICE_ID || "price_business_placeholder",
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
 * Get all subscription plans as array
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
