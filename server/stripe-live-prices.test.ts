import { describe, it, expect } from "vitest";

describe("Stripe live price IDs", () => {
  const expectedPrices: Record<string, string> = {
    STRIPE_TOPUP_SPARK_PRICE_ID: "price_1TTtsxI3gJ5F0DKDr2osAQtH",
    STRIPE_TOPUP_BOOST_PRICE_ID: "price_1TTtsyI3gJ5F0DKDz1mhvia0",
    STRIPE_TOPUP_CREATOR_PRICE_ID: "price_1TTtt0I3gJ5F0DKDboiU1Qlf",
    STRIPE_TOPUP_STUDIO_PRICE_ID: "price_1TTtt1I3gJ5F0DKDc7JukwIv",
    STRIPE_TOPUP_PRO_PRICE_ID: "price_1TTtt3I3gJ5F0DKDxaBysFnT",
    STRIPE_TOPUP_ELITE_PRICE_ID: "price_1TTtt4I3gJ5F0DKDWi3TgiVd",
  };

  it("all 6 live price IDs are set in environment", () => {
    for (const [key, expectedId] of Object.entries(expectedPrices)) {
      const val = process.env[key];
      expect(val, `${key} should be set`).toBeTruthy();
      expect(val, `${key} should be a live price ID`).toBe(expectedId);
    }
  });

  it("all price IDs start with price_", () => {
    for (const [key] of Object.entries(expectedPrices)) {
      const val = process.env[key] ?? "";
      expect(val.startsWith("price_"), `${key} should start with price_`).toBe(true);
    }
  });

  it("billing.ts fallback IDs match live prices", async () => {
    // Verify the fallback IDs in billing.ts are the live ones
    const billingContent = await import("fs").then(fs =>
      fs.readFileSync("server/routers/billing.ts", "utf-8")
    );
    expect(billingContent).toContain("price_1TTtsxI3gJ5F0DKDr2osAQtH"); // spark
    expect(billingContent).toContain("price_1TTtsyI3gJ5F0DKDz1mhvia0"); // boost
    expect(billingContent).toContain("price_1TTtt0I3gJ5F0DKDboiU1Qlf"); // creator
    expect(billingContent).toContain("price_1TTtt1I3gJ5F0DKDc7JukwIv"); // studio
    expect(billingContent).toContain("price_1TTtt3I3gJ5F0DKDxaBysFnT"); // pro
    expect(billingContent).toContain("price_1TTtt4I3gJ5F0DKDWi3TgiVd"); // elite
  });
});
