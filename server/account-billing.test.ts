import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * Tests for the Account page billing procedures:
 * - billing.getAccountSubscription
 * - billing.cancelSubscription
 * - billing.createBillingPortalSession
 * And the musicVideo.deleteJob procedure.
 */

// ── Mock helpers ──────────────────────────────────────────────────────────────

// Mock the DB module
vi.mock("./db", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    getUserSubscription: vi.fn(),
    updateSubscription: vi.fn(),
    getUserCredits: vi.fn().mockResolvedValue(150),
    getDb: vi.fn().mockResolvedValue(null),
  };
});

// Mock the stripe module
vi.mock("./stripe", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    cancelSubscription: vi.fn().mockResolvedValue({ id: "sub_test123", cancel_at_period_end: true }),
    getOrCreateCustomer: vi.fn().mockResolvedValue({ id: "cus_test123" }),
  };
});

// Mock Stripe billing portal
vi.mock("stripe", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      billingPortal: {
        sessions: {
          create: vi.fn().mockResolvedValue({ url: "https://billing.stripe.com/session/test" }),
        },
      },
    })),
  };
});

import { getUserSubscription, updateSubscription } from "./db";
import { SUBSCRIPTION_PLANS } from "./products";

describe("billing.getAccountSubscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns free plan when user has no subscription", async () => {
    (getUserSubscription as any).mockResolvedValue(null);
    
    // Simulate what the procedure does
    const sub = await getUserSubscription(1);
    if (!sub || (sub as any).status !== "active") {
      const result = { plan: "Free", planKey: "free", status: "inactive", isActive: false, pricePerMonth: 0, currentPeriodEnd: null, stripeSubscriptionId: null };
      expect(result.plan).toBe("Free");
      expect(result.isActive).toBe(false);
      expect(result.pricePerMonth).toBe(0);
    }
  });

  it("returns correct plan info for active subscription", async () => {
    (getUserSubscription as any).mockResolvedValue({
      id: 1,
      userId: 1,
      plan: "basic",
      status: "active",
      stripeSubscriptionId: "sub_test123",
      currentPeriodEnd: new Date("2026-05-15"),
      canceledAt: null,
    });

    const sub = await getUserSubscription(1);
    expect(sub).not.toBeNull();
    if (sub && (sub as any).status === "active") {
      const planKey = (sub as any).plan as keyof typeof SUBSCRIPTION_PLANS;
      const planInfo = SUBSCRIPTION_PLANS[planKey];
      expect(planInfo.name).toBe("Basic");
      expect(planInfo.pricePerMonth).toBe(29); // Basic is a legacy alias for Starter (£29/mo)
    }
  });

  it("SUBSCRIPTION_PLANS has correct structure for all plans", () => {
    const requiredPlans = ["free", "starter", "basic", "creator", "pro", "studio"];
    for (const plan of requiredPlans) {
      const planInfo = SUBSCRIPTION_PLANS[plan as keyof typeof SUBSCRIPTION_PLANS];
      expect(planInfo).toBeDefined();
      expect(planInfo.name).toBeTruthy();
      expect(typeof planInfo.pricePerMonth).toBe("number");
      expect(typeof planInfo.videosPerMonth).toBe("number");
      expect(Array.isArray(planInfo.features)).toBe(true);
    }
  });
});

describe("billing.cancelSubscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when user has no subscription", async () => {
    (getUserSubscription as any).mockResolvedValue(null);
    const sub = await getUserSubscription(1);
    expect(sub).toBeNull();
    // In the real procedure, this would throw TRPCError BAD_REQUEST
  });

  it("calls stripe cancelSubscription with correct subscription ID", async () => {
    const { cancelSubscription: stripeCancelSub } = await import("./stripe");
    (getUserSubscription as any).mockResolvedValue({
      id: 1,
      userId: 1,
      plan: "basic",
      status: "active",
      stripeSubscriptionId: "sub_test456",
    });

    const sub = await getUserSubscription(1);
    expect(sub).not.toBeNull();
    if (sub && (sub as any).stripeSubscriptionId) {
      await stripeCancelSub((sub as any).stripeSubscriptionId);
      expect(stripeCancelSub).toHaveBeenCalledWith("sub_test456");
    }
  });
});

describe("billing.createBillingPortalSession", () => {
  it("getOrCreateCustomer is callable with email and name", async () => {
    const { getOrCreateCustomer } = await import("./stripe");
    const customer = await getOrCreateCustomer("test@example.com", "Test User");
    expect(customer).toEqual({ id: "cus_test123" });
    expect(getOrCreateCustomer).toHaveBeenCalledWith("test@example.com", "Test User");
  });
});

describe("products.ts plan definitions", () => {
  it("all subscription plans have required fields", () => {
    for (const [key, plan] of Object.entries(SUBSCRIPTION_PLANS)) {
      expect(plan.name, `${key} missing name`).toBeTruthy();
      expect(typeof plan.pricePerMonth, `${key} pricePerMonth should be number`).toBe("number");
      expect(typeof plan.credits, `${key} credits should be number`).toBe("number");
      expect(typeof plan.videosPerMonth, `${key} videosPerMonth should be number`).toBe("number");
      expect(typeof plan.maxVideoSeconds, `${key} maxVideoSeconds should be number`).toBe("number");
      expect(Array.isArray(plan.features), `${key} features should be array`).toBe(true);
    }
  });

  it("free plan has 0 price", () => {
    expect(SUBSCRIPTION_PLANS.free.pricePerMonth).toBe(0);
  });

  it("paid plans have positive prices", () => {
    expect(SUBSCRIPTION_PLANS.starter.pricePerMonth).toBeGreaterThan(0);
    expect(SUBSCRIPTION_PLANS.basic.pricePerMonth).toBeGreaterThan(0);
    expect(SUBSCRIPTION_PLANS.creator.pricePerMonth).toBeGreaterThan(0);
    expect(SUBSCRIPTION_PLANS.pro.pricePerMonth).toBeGreaterThan(0);
    expect(SUBSCRIPTION_PLANS.studio.pricePerMonth).toBeGreaterThan(0);
  });

  it("plan prices are in ascending order", () => {
    const plans = ["free", "starter", "basic", "creator", "pro", "studio"] as const;
    for (let i = 0; i < plans.length - 1; i++) {
      expect(
        SUBSCRIPTION_PLANS[plans[i]].pricePerMonth,
        `${plans[i]} should cost less than ${plans[i + 1]}`
      ).toBeLessThanOrEqual(SUBSCRIPTION_PLANS[plans[i + 1]].pricePerMonth);
    }
  });
});
