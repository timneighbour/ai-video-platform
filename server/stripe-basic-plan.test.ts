/**
 * Validates that STRIPE_BASIC_PRICE_ID is configured and the price exists in Stripe test mode.
 */
import { describe, expect, it } from "vitest";
import Stripe from "stripe";

describe("Stripe Basic Plan Configuration", () => {
  it("STRIPE_BASIC_PRICE_ID env var is set", () => {
    const priceId = process.env.STRIPE_BASIC_PRICE_ID;
    expect(priceId).toBeTruthy();
    expect(typeof priceId).toBe("string");
    expect(priceId!.startsWith("price_")).toBe(true);
  });

  it("STRIPE_BASIC_ANNUAL_PRICE_ID env var is set", () => {
    const priceId = process.env.STRIPE_BASIC_ANNUAL_PRICE_ID;
    expect(priceId).toBeTruthy();
    expect(typeof priceId).toBe("string");
    expect(priceId!.startsWith("price_")).toBe(true);
  });

  it("Basic plan price exists in Stripe and has correct amount", async () => {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      console.warn("STRIPE_SECRET_KEY not set, skipping Stripe API test");
      return;
    }
    const stripe = new Stripe(stripeKey);
    const priceId = process.env.STRIPE_BASIC_PRICE_ID!;
    const price = await stripe.prices.retrieve(priceId);
    expect(price.id).toBe(priceId);
    expect(price.unit_amount).toBe(1900); // £19.00 in pence
    expect(price.currency).toBe("gbp");
    expect(price.recurring?.interval).toBe("month");
    expect(price.active).toBe(true);
  });
});
