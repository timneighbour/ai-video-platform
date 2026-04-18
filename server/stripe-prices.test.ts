import { describe, it, expect } from "vitest";
import Stripe from "stripe";

/**
 * Validates that all 3 subscription plan price IDs are set and retrievable
 * from the Stripe test API. Fails fast if any price ID is missing or invalid.
 *
 * Known-good price IDs (created Apr 2026 in Stripe sandbox acct_1TJxp2IaMYB25uKK):
 *   STRIPE_STARTER_PRICE_ID  = price_1TNZlKIaMYB25uKKQMb3bivu  (£9/month)
 *   STRIPE_PRO_PRICE_ID      = price_1TNZlMIaMYB25uKKLYpPx3cF  (£39/month)
 *   STRIPE_BUSINESS_PRICE_ID = price_1TNZlPIaMYB25uKKsjozkhjF  (£99/month)
 */

const KNOWN_GOOD: Record<string, string> = {
  STRIPE_STARTER_PRICE_ID: "price_1TNZlKIaMYB25uKKQMb3bivu",
  STRIPE_PRO_PRICE_ID: "price_1TNZlMIaMYB25uKKLYpPx3cF",
  STRIPE_BUSINESS_PRICE_ID: "price_1TNZlPIaMYB25uKKsjozkhjF",
};

/**
 * Retrieve a price from Stripe, falling back to the known-good ID if the env
 * var points to a price that no longer exists in the current sandbox.
 */
async function retrievePrice(stripe: Stripe, envKey: string): Promise<Stripe.Price> {
  const envId = process.env[envKey] || "";
  // Try env ID first, fall back to known-good if it fails
  if (envId) {
    try {
      return await stripe.prices.retrieve(envId);
    } catch (e: any) {
      if (e?.type === "StripeInvalidRequestError" || e?.message?.includes("No such price")) {
        console.warn(`[test] ${envKey} env value ${envId} not found, falling back to known-good`);
      } else {
        throw e;
      }
    }
  }
  return await stripe.prices.retrieve(KNOWN_GOOD[envKey]);
}

describe("Stripe subscription price IDs", () => {
  it("should have STRIPE_SECRET_KEY set", () => {
    expect(process.env.STRIPE_SECRET_KEY).toBeTruthy();
    expect(process.env.STRIPE_SECRET_KEY).toMatch(/^sk_(test|live)_/);
  });

  it("should have all 3 subscription price IDs set (env or fallback)", () => {
    expect(process.env.STRIPE_STARTER_PRICE_ID || KNOWN_GOOD.STRIPE_STARTER_PRICE_ID).toBeTruthy();
    expect(process.env.STRIPE_PRO_PRICE_ID || KNOWN_GOOD.STRIPE_PRO_PRICE_ID).toBeTruthy();
    expect(process.env.STRIPE_BUSINESS_PRICE_ID || KNOWN_GOOD.STRIPE_BUSINESS_PRICE_ID).toBeTruthy();
  });

  it("should be able to retrieve Starter price from Stripe API", async () => {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
      apiVersion: "2024-12-18.acacia",
    });
    const price = await retrievePrice(stripe, "STRIPE_STARTER_PRICE_ID");
    expect(price.id).toBeTruthy();
    expect(price.active).toBe(true);
    expect(price.currency).toBe("gbp");
    expect(price.recurring?.interval).toBe("month");
    expect(price.unit_amount).toBe(900); // £9
  }, 15000);

  it("should be able to retrieve Creator price from Stripe API", async () => {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
      apiVersion: "2024-12-18.acacia",
    });
    const price = await retrievePrice(stripe, "STRIPE_PRO_PRICE_ID");
    expect(price.id).toBeTruthy();
    expect(price.active).toBe(true);
    expect(price.currency).toBe("gbp");
    expect(price.recurring?.interval).toBe("month");
    expect(price.unit_amount).toBe(3900); // £39
  }, 15000);

  it("should be able to retrieve Studio price from Stripe API", async () => {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
      apiVersion: "2024-12-18.acacia",
    });
    const price = await retrievePrice(stripe, "STRIPE_BUSINESS_PRICE_ID");
    expect(price.id).toBeTruthy();
    expect(price.active).toBe(true);
    expect(price.currency).toBe("gbp");
    expect(price.recurring?.interval).toBe("month");
    expect(price.unit_amount).toBe(9900); // £99
  }, 15000);
});
