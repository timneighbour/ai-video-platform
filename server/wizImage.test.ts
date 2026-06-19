/**
 * WizImage router unit tests
 * Tests: getSettings, getDailyUsage, getHistory (empty state)
 * Note: generateImage and editImage are integration tests requiring live API keys — not tested here.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 9999,
    openId: "test-wizimage-user",
    email: "wizimage@test.com",
    name: "WizImage Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  const ctx: TrpcContext = {
    user,
    req: {
      headers: {},
      cookies: {},
    } as any,
    res: {
      cookie: vi.fn(),
      clearCookie: vi.fn(),
    } as any,
  };
  return { ctx };
}

describe("wizImage.getSettings", () => {
  it("returns credit costs for all quality tiers", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const settings = await caller.wizImage.getSettings();
    expect(settings).toHaveProperty("creditCosts");
    expect(settings.creditCosts).toHaveProperty("low");
    expect(settings.creditCosts).toHaveProperty("medium");
    expect(settings.creditCosts).toHaveProperty("high");
    expect(typeof settings.creditCosts.low).toBe("number");
    expect(typeof settings.creditCosts.medium).toBe("number");
    expect(typeof settings.creditCosts.high).toBe("number");
    // medium should cost more than low, high more than medium
    expect(settings.creditCosts.medium).toBeGreaterThanOrEqual(settings.creditCosts.low);
    expect(settings.creditCosts.high).toBeGreaterThanOrEqual(settings.creditCosts.medium);
  });

  it("returns styles array", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const settings = await caller.wizImage.getSettings();
    expect(settings).toHaveProperty("styles");
    expect(Array.isArray(settings.styles)).toBe(true);
    expect(settings.styles.length).toBeGreaterThan(0);
  });
});

describe("wizImage.getDailyUsage", () => {
  it("returns usage count and limit for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const usage = await caller.wizImage.getDailyUsage();
    expect(usage).toHaveProperty("count");
    expect(usage).toHaveProperty("limit");
    expect(typeof usage.count).toBe("number");
    expect(typeof usage.limit).toBe("number");
    expect(usage.count).toBeGreaterThanOrEqual(0);
    expect(usage.limit).toBeGreaterThan(0);
  });
});

describe("wizImage.getHistory", () => {
  it("returns paginated history with images array and total", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.wizImage.getHistory({ limit: 10, offset: 0 });
    expect(result).toHaveProperty("images");
    expect(result).toHaveProperty("total");
    expect(Array.isArray(result.images)).toBe(true);
    expect(typeof result.total).toBe("number");
  });

  it("respects limit parameter", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.wizImage.getHistory({ limit: 3, offset: 0 });
    expect(result.images.length).toBeLessThanOrEqual(3);
  });
});
