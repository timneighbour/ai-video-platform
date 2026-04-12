import { describe, it, expect } from "vitest";
import Stripe from "stripe";

/**
 * Validates that all 8 render paywall price IDs are set and retrievable
 * from the Stripe test API. Covers quality tiers, audio add-ons, and bundles.
 */
describe("Stripe render paywall price IDs", () => {
  it("should have all 8 render price IDs set in env", () => {
    expect(process.env.STRIPE_RENDER_STANDARD_PRICE_ID).toBeTruthy();
    expect(process.env.STRIPE_RENDER_HD_PRICE_ID).toBeTruthy();
    expect(process.env.STRIPE_RENDER_4K_PRICE_ID).toBeTruthy();
    expect(process.env.STRIPE_AUDIO_ENHANCED_PRICE_ID).toBeTruthy();
    expect(process.env.STRIPE_AUDIO_CINEMATIC_PRICE_ID).toBeTruthy();
    expect(process.env.STRIPE_BUNDLE_6_PRICE_ID).toBeTruthy();
    expect(process.env.STRIPE_BUNDLE_15_PRICE_ID).toBeTruthy();
    expect(process.env.STRIPE_BUNDLE_40_PRICE_ID).toBeTruthy();
  });

  const priceTests = [
    { envKey: "STRIPE_RENDER_STANDARD_PRICE_ID", label: "Standard Render", amount: 200 },
    { envKey: "STRIPE_RENDER_HD_PRICE_ID", label: "HD Render", amount: 400 },
    { envKey: "STRIPE_RENDER_4K_PRICE_ID", label: "4K Render", amount: 600 },
    { envKey: "STRIPE_AUDIO_ENHANCED_PRICE_ID", label: "Enhanced Audio", amount: 100 },
    { envKey: "STRIPE_AUDIO_CINEMATIC_PRICE_ID", label: "Cinematic Audio", amount: 300 },
    { envKey: "STRIPE_BUNDLE_6_PRICE_ID", label: "Bundle 6", amount: 1000 },
    { envKey: "STRIPE_BUNDLE_15_PRICE_ID", label: "Bundle 15", amount: 2000 },
    { envKey: "STRIPE_BUNDLE_40_PRICE_ID", label: "Bundle 40", amount: 5000 },
  ];

  for (const { envKey, label, amount } of priceTests) {
    it(`should retrieve ${label} price (£${(amount / 100).toFixed(2)}) from Stripe`, async () => {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
        apiVersion: "2024-12-18.acacia",
      });
      const priceId = process.env[envKey] || "";
      expect(priceId).toBeTruthy();
      const price = await stripe.prices.retrieve(priceId);
      expect(price.id).toBe(priceId);
      expect(price.active).toBe(true);
      expect(price.currency).toBe("gbp");
      expect(price.unit_amount).toBe(amount);
      // These are one-time prices, not recurring
      expect(price.recurring).toBeNull();
    }, 10000);
  }
});
