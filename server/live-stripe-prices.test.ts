/**
 * Validates that all live Stripe price IDs are set and retrievable
 * from the live Stripe API using the live secret key.
 * Created May 2026 after switching to live mode.
 *
 * Note: This test only runs the API retrieval check when a live key is present.
 * In local dev (test key), it validates env var format only.
 */
import { describe, it, expect } from "vitest";
import Stripe from "stripe";

// These are the env var keys that must be set to live price IDs
const REQUIRED_PRICE_ENV_KEYS = [
  "STRIPE_STARTER_PRICE_ID",
  "STRIPE_PRO_PRICE_ID",
  "STRIPE_PRO_PLUS_PRICE_ID",
  "STRIPE_TOPUP_QUICK_BOOST_PRICE_ID",
  "STRIPE_TOPUP_CREATOR_BOOST_PRICE_ID",
  "STRIPE_TOPUP_STUDIO_BOOST_PRICE_ID",
  "STRIPE_TOPUP_PRO_BULK_BOOST_PRICE_ID",
];

describe("Live Stripe price IDs", () => {
  it("should have STRIPE_SECRET_KEY set to a live or test key", () => {
    expect(process.env.STRIPE_SECRET_KEY).toBeTruthy();
    expect(process.env.STRIPE_SECRET_KEY).toMatch(/^sk_(test|live)_/);
  });

  it("should have all core price IDs set in environment", () => {
    for (const key of REQUIRED_PRICE_ENV_KEYS) {
      const val = process.env[key];
      expect(val, `${key} should be set`).toBeTruthy();
      expect(val, `${key} should start with price_`).toMatch(/^price_/);
    }
  });

  it("should retrieve all 7 core prices from Stripe API (live key only)", async () => {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      console.warn("STRIPE_SECRET_KEY not set, skipping API retrieval test");
      return;
    }

    // Skip API retrieval test when running with test key in local dev
    if (secretKey.startsWith("sk_test_")) {
      console.log("Running with test key — skipping live price retrieval (prices are live-mode only)");
      console.log("Live prices are validated on the deployed site at wiz-ai.io");
      return;
    }

    const stripe = new Stripe(secretKey, { apiVersion: "2024-06-20" });

    for (const envKey of REQUIRED_PRICE_ENV_KEYS) {
      const priceId = process.env[envKey];
      if (!priceId) {
        throw new Error(`${envKey} is not set in environment`);
      }
      try {
        const price = await stripe.prices.retrieve(priceId);
        expect(price.id).toBe(priceId);
        expect(price.active).toBe(true);
        console.log(`  ✓ ${envKey}: ${priceId} (${price.currency?.toUpperCase()} ${(price.unit_amount ?? 0) / 100})`);
      } catch (e: any) {
        throw new Error(`Failed to retrieve ${envKey} (${priceId}): ${e.message}`);
      }
    }
  }, 30000);
});
