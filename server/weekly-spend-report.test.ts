/**
 * Tests for ISS-041: Weekly Spend Efficiency Report
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("./db", () => ({ getDb: vi.fn() }));
vi.mock("./_core/notification", () => ({ notifyOwner: vi.fn().mockResolvedValue(true) }));
vi.mock("../drizzle/schema", () => ({
  providerJobLogs: {},
  musicVideoJobs: {},
  musicVideoScenes: {},
  users: {},
}));
vi.mock("drizzle-orm", () => ({
  sql: vi.fn((strings: TemplateStringsArray, ...values: any[]) => strings.join("")),
  gte: vi.fn(),
  and: vi.fn(),
  eq: vi.fn(),
  lt: vi.fn(),
}));

// ── Helper: build a mock DB that returns sequential results ───────────────────

function buildMockDb(sequentialResults: any[][]) {
  let callIndex = 0;

  const makeChain = (): any => ({
    select: vi.fn().mockImplementation(() => makeChain()),
    from: vi.fn().mockImplementation(() => makeChain()),
    where: vi.fn().mockImplementation(() => makeChain()),
    groupBy: vi.fn().mockImplementation(() => {
      const result = sequentialResults[callIndex++] ?? [];
      return Promise.resolve(result);
    }),
    // Allow array destructuring by making the chain itself a thenable
    then: (resolve: any, reject: any) => {
      const result = sequentialResults[callIndex++] ?? [];
      return Promise.resolve(result).then(resolve, reject);
    },
  });

  return {
    select: vi.fn().mockImplementation(() => makeChain()),
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("weekly-spend-report", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe("generateWeeklySpendReport", () => {
    it("returns a report with the correct structure when DB is empty", async () => {
      const { getDb } = await import("./db");
      // 6 queries: spendRows, sceneStats, retryStats, videoStats, newUserStats, activeUserStats
      (getDb as any).mockResolvedValue(buildMockDb([[], [], [], [], [], []]));

      const { generateWeeklySpendReport } = await import("./weekly-spend-report");
      const report = await generateWeeklySpendReport();

      expect(report).toMatchObject({
        totalSpendUsd: 0,
        byProvider: {},
        scenesRendered: 0,
        scenesFailed: 0,
        videosCompleted: 0,
        newUsers: 0,
        activeUsers: 0,
        avgCostPerScene: 0,
        avgCostPerVideo: 0,
      });
      expect(report.weekStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(report.weekEnd).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("weekStart is 7 days before weekEnd", async () => {
      const { getDb } = await import("./db");
      (getDb as any).mockResolvedValue(buildMockDb([[], [], [], [], [], []]));

      const { generateWeeklySpendReport } = await import("./weekly-spend-report");
      const report = await generateWeeklySpendReport();

      const start = new Date(report.weekStart);
      const end = new Date(report.weekEnd);
      const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

      expect(diffDays).toBeGreaterThanOrEqual(6);
      expect(diffDays).toBeLessThanOrEqual(8);
    });

    it("throws when DB is unavailable", async () => {
      const { getDb } = await import("./db");
      (getDb as any).mockResolvedValue(null);

      const { generateWeeklySpendReport } = await import("./weekly-spend-report");
      await expect(generateWeeklySpendReport()).rejects.toThrow("Database unavailable");
    });
  });

  describe("sendWeeklySpendReport", () => {
    it("calls notifyOwner with a structured report containing all sections", async () => {
      const { getDb } = await import("./db");
      (getDb as any).mockResolvedValue(buildMockDb([[], [], [], [], [], []]));

      const { notifyOwner } = await import("./_core/notification");
      const { sendWeeklySpendReport } = await import("./weekly-spend-report");

      await sendWeeklySpendReport();

      expect(notifyOwner).toHaveBeenCalledOnce();
      const call = (notifyOwner as any).mock.calls[0][0];
      expect(call.title).toContain("Weekly Spend Report");
      expect(call.content).toContain("SPEND");
      expect(call.content).toContain("RENDER PERFORMANCE");
      expect(call.content).toContain("EFFICIENCY");
      expect(call.content).toContain("USERS");
    });
  });
});
