import { describe, it, expect } from "vitest";

describe("STRIPE_BUSINESS_ANNUAL_PRICE_ID", () => {
  it("should be set and match the expected price ID format", () => {
    const priceId = process.env.STRIPE_BUSINESS_ANNUAL_PRICE_ID;
    expect(priceId).toBeTruthy();
    expect(priceId).toMatch(/^price_/);
    expect(priceId).toBe("price_1TnhdaI3gJ5F0DKDSivLQhIf");
  });

  it("should resolve to WIZ AI Business Plan annual price in live Stripe (skipped if key expired)", async () => {
    const sk = process.env.STRIPE_SECRET_KEY ?? "";
    if (!sk || sk.startsWith("sk_test_")) {
      console.log("Skipping live Stripe check — sandbox uses test key");
      return;
    }
    const priceId = process.env.STRIPE_BUSINESS_ANNUAL_PRICE_ID!;
    const creds = Buffer.from(`${sk}:`).toString("base64");
    const resp = await fetch(`https://api.stripe.com/v1/prices/${priceId}`, {
      headers: { Authorization: `Basic ${creds}` },
    });
    expect(resp.ok).toBe(true);
    const data = (await resp.json()) as any;
    expect(data.active).toBe(true);
    expect(data.currency).toBe("gbp");
    expect(data.unit_amount).toBe(95040); // £950.40
    expect(data.recurring?.interval).toBe("year");
  });
});
