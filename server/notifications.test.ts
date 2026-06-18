/**
 * Notifications router unit tests
 * Uses a mock tRPC caller to verify the router procedures exist and return
 * correct shapes without hitting the real database.
 */
import { describe, it, expect, vi } from "vitest";
import { notificationsRouter } from "./routers/notifications";
import type { TrpcContext } from "./_core/context";

// ── Mock DB so tests run without a real database ─────────────────────────────
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue({
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          // getAll uses orderBy + limit
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
          // getUnreadCount resolves directly after where()
          then: (resolve: (v: unknown[]) => void) => resolve([]),
        }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    }),
  }),
}));

function makeCtx(userId = 1): TrpcContext {
  return {
    user: {
      id: userId,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("notifications router", () => {
  it("exports a router with the expected procedures", () => {
    const procedures = notificationsRouter._def.procedures;
    expect(procedures).toHaveProperty("getAll");
    expect(procedures).toHaveProperty("getUnreadCount");
    expect(procedures).toHaveProperty("markRead");
    expect(procedures).toHaveProperty("markAllRead");
  });

  it("getAll returns an array", async () => {
    const caller = notificationsRouter.createCaller(makeCtx());
    const result = await caller.getAll();
    expect(Array.isArray(result)).toBe(true);
  });

  it("getUnreadCount returns a number", async () => {
    const caller = notificationsRouter.createCaller(makeCtx());
    const result = await caller.getUnreadCount();
    expect(typeof result).toBe("number");
  });

  it("markAllRead resolves without error", async () => {
    const caller = notificationsRouter.createCaller(makeCtx());
    await expect(caller.markAllRead()).resolves.not.toThrow();
  });

  it("markRead resolves without error for a valid id", async () => {
    const caller = notificationsRouter.createCaller(makeCtx());
    await expect(caller.markRead({ id: 1 })).resolves.not.toThrow();
  });
});
