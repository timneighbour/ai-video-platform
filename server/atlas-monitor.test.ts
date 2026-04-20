/**
 * Atlas Cloud Monitor — Unit Tests
 *
 * Tests the health report logic without making real API calls.
 * The AtlasHealthReport status thresholds and summary formatting are verified here.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock external dependencies ──────────────────────────────────────────────
vi.mock("axios");
vi.mock("./db", () => ({
  getDb: vi.fn(),
}));
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));
vi.mock("node-cron", () => ({
  default: { schedule: vi.fn() },
}));

import axios from "axios";
import { getDb } from "./db";
import { notifyOwner } from "./_core/notification";
import {
  runAtlasHealthCheck,
  runDailyAtlasMonitor,
  type AtlasHealthReport,
} from "./atlas-monitor";

const mockAxios = vi.mocked(axios.post);
const mockGetDb = vi.mocked(getDb);
const mockNotifyOwner = vi.mocked(notifyOwner);

// Helper: build a mock DB that returns providerJobLog rows
function buildMockDb(rows: Array<{ status: string; estimatedCostUsd: string | null; submittedAt: Date }>) {
  return {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(rows),
  } as unknown as ReturnType<typeof getDb> extends Promise<infer T> ? T : never;
}

// Helper: mock a successful Atlas API probe
function mockAtlasApiSuccess() {
  mockAxios.mockResolvedValueOnce({
    data: { data: { id: "test-prediction-id-123" } },
  });
}

// Helper: mock an Atlas API failure (e.g. 402 insufficient balance)
function mockAtlasApiFailure(message = "Request failed with status code 402") {
  mockAxios.mockRejectedValueOnce(new Error(message));
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── runAtlasHealthCheck ──────────────────────────────────────────────────────

describe("runAtlasHealthCheck", () => {
  it("returns healthy status when API is reachable and success rate is 100%", async () => {
    mockAtlasApiSuccess();
    const now = new Date();
    mockGetDb.mockResolvedValue(buildMockDb([
      { status: "completed", estimatedCostUsd: "0.6400", submittedAt: now },
      { status: "completed", estimatedCostUsd: "0.6400", submittedAt: now },
      { status: "completed", estimatedCostUsd: "0.6400", submittedAt: now },
    ]));

    const report = await runAtlasHealthCheck();

    expect(report.apiReachable).toBe(true);
    expect(report.last24hTotal).toBe(3);
    expect(report.last24hCompleted).toBe(3);
    expect(report.last24hFailed).toBe(0);
    expect(report.last24hSuccessRate).toBe(100);
    expect(report.last24hEstimatedCostUsd).toBeCloseTo(1.92, 2);
    expect(report.stuckJobs).toBe(0);
    expect(report.status).toBe("healthy");
    expect(report.summary).toContain("HEALTHY");
  });

  it("returns critical status when API is unreachable due to insufficient balance", async () => {
    mockAtlasApiFailure("Request failed with status code 402");
    mockGetDb.mockResolvedValue(buildMockDb([]));

    const report = await runAtlasHealthCheck();

    expect(report.apiReachable).toBe(false);
    expect(report.apiError).toContain("INSUFFICIENT BALANCE");
    expect(report.status).toBe("critical");
    expect(report.summary).toContain("CRITICAL");
    expect(report.summary).toContain("ACTION REQUIRED");
  });

  it("returns critical status when API is unreachable due to network error", async () => {
    mockAtlasApiFailure("ECONNREFUSED");
    mockGetDb.mockResolvedValue(buildMockDb([]));

    const report = await runAtlasHealthCheck();

    expect(report.apiReachable).toBe(false);
    expect(report.status).toBe("critical");
  });

  it("returns warning status when success rate is below 70%", async () => {
    mockAtlasApiSuccess();
    const now = new Date();
    mockGetDb.mockResolvedValue(buildMockDb([
      { status: "completed", estimatedCostUsd: "0.6400", submittedAt: now },
      { status: "failed", estimatedCostUsd: "0.0000", submittedAt: now },
      { status: "failed", estimatedCostUsd: "0.0000", submittedAt: now },
      { status: "failed", estimatedCostUsd: "0.0000", submittedAt: now },
    ]));

    const report = await runAtlasHealthCheck();

    expect(report.last24hSuccessRate).toBe(25);
    expect(report.status).toBe("warning");
    expect(report.summary).toContain("WARNING");
  });

  it("returns warning status when there are stuck jobs", async () => {
    mockAtlasApiSuccess();
    const stuckTime = new Date(Date.now() - 45 * 60 * 1000); // 45 min ago
    const recentTime = new Date(Date.now() - 5 * 60 * 1000);  // 5 min ago
    mockGetDb.mockResolvedValue(buildMockDb([
      { status: "submitted", estimatedCostUsd: "0.6400", submittedAt: stuckTime },
      { status: "completed", estimatedCostUsd: "0.6400", submittedAt: recentTime },
    ]));

    const report = await runAtlasHealthCheck();

    expect(report.stuckJobs).toBe(1);
    expect(report.status).toBe("warning");
    expect(report.summary).toContain("stuck");
  });

  it("returns healthy with 100% success rate when no jobs ran in last 24h", async () => {
    mockAtlasApiSuccess();
    mockGetDb.mockResolvedValue(buildMockDb([]));

    const report = await runAtlasHealthCheck();

    expect(report.last24hTotal).toBe(0);
    expect(report.last24hSuccessRate).toBe(100);
    expect(report.status).toBe("healthy");
  });

  it("handles null DB gracefully", async () => {
    mockAtlasApiSuccess();
    mockGetDb.mockResolvedValue(null);

    const report = await runAtlasHealthCheck();

    expect(report.last24hTotal).toBe(0);
    expect(report.status).toBe("healthy");
  });
});

// ─── runDailyAtlasMonitor ─────────────────────────────────────────────────────

describe("runDailyAtlasMonitor", () => {
  it("sends a healthy notification when all is well", async () => {
    mockAtlasApiSuccess();
    mockGetDb.mockResolvedValue(buildMockDb([
      { status: "completed", estimatedCostUsd: "0.6400", submittedAt: new Date() },
    ]));

    await runDailyAtlasMonitor();

    expect(mockNotifyOwner).toHaveBeenCalledOnce();
    const call = mockNotifyOwner.mock.calls[0][0];
    expect(call.title).toContain("All Good");
    expect(call.content).toContain("HEALTHY");
  });

  it("sends a critical notification when API is down", async () => {
    mockAtlasApiFailure("insufficient balance");
    mockGetDb.mockResolvedValue(buildMockDb([]));

    await runDailyAtlasMonitor();

    expect(mockNotifyOwner).toHaveBeenCalledOnce();
    const call = mockNotifyOwner.mock.calls[0][0];
    expect(call.title).toContain("CRITICAL");
  });

  it("sends a failure notification if the health check itself throws", async () => {
    mockAxios.mockRejectedValueOnce(new Error("Unexpected crash"));
    mockGetDb.mockRejectedValueOnce(new Error("DB down"));

    await runDailyAtlasMonitor();

    expect(mockNotifyOwner).toHaveBeenCalledOnce();
    const call = mockNotifyOwner.mock.calls[0][0];
    expect(call.title).toContain("Monitor Failed");
  });
});
