import { describe, it, expect } from "vitest";
import Stripe from "stripe";

/**
 * Validates that all 3 subscription plan price IDs are set and retrievable
 * from the Stripe test API. Fails fast if any price ID is missing or invalid.
 */
describe("Stripe subscription price IDs", () => {
  it("should have STRIPE_SECRET_KEY set", () => {
    expect(process.env.STRIPE_SECRET_KEY).toBeTruthy();
    expect(process.env.STRIPE_SECRET_KEY).toMatch(/^sk_(test|live)_/);
  });

  it("should have all 3 subscription price IDs set", () => {
    expect(process.env.STRIPE_STARTER_PRICE_ID).toBeTruthy();
    expect(process.env.STRIPE_PRO_PRICE_ID).toBeTruthy();
    expect(process.env.STRIPE_BUSINESS_PRICE_ID).toBeTruthy();
  });

  it("should be able to retrieve Starter price from Stripe API", async () => {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
      apiVersion: "2024-12-18.acacia",
    });
    const price = await stripe.prices.retrieve(
      process.env.STRIPE_STARTER_PRICE_ID || ""
    );
    expect(price.id).toBeTruthy();
    expect(price.active).toBe(true);
    expect(price.currency).toBe("gbp");
    expect(price.recurring?.interval).toBe("month");
    expect(price.unit_amount).toBe(1900); // £19
  }, 10000);

  it("should be able to retrieve Creator price from Stripe API", async () => {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
      apiVersion: "2024-12-18.acacia",
    });
    const price = await stripe.prices.retrieve(
      process.env.STRIPE_PRO_PRICE_ID || ""
    );
    expect(price.id).toBeTruthy();
    expect(price.active).toBe(true);
    expect(price.currency).toBe("gbp");
    expect(price.recurring?.interval).toBe("month");
    expect(price.unit_amount).toBe(3900); // £39
  }, 10000);

  it("should be able to retrieve Studio price from Stripe API", async () => {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
      apiVersion: "2024-12-18.acacia",
    });
    const price = await stripe.prices.retrieve(
      process.env.STRIPE_BUSINESS_PRICE_ID || ""
    );
    expect(price.id).toBeTruthy();
    expect(price.active).toBe(true);
    expect(price.currency).toBe("gbp");
    expect(price.recurring?.interval).toBe("month");
    expect(price.unit_amount).toBe(9900); // £99
  }, 10000);
});
