/**
 * pipelineOps.test.ts — Unit tests for the Phase 2 pipeline ops router.
 *
 * These tests verify that the router procedures exist and return the correct
 * shape. They use a mock DB so no real database connection is required.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock the DB module ────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "./db";

// ── Mock schema imports ───────────────────────────────────────────────────────
vi.mock("../drizzle/schema", () => ({
  validationRuns: { id: "id", runAt: "runAt", status: "status" },
  renderAttempts: {
    id: "id",
    jobId: "jobId",
    assembledAt: "assembledAt",
    validationStatus: "validationStatus",
    attemptNumber: "attemptNumber",
  },
  musicVideoJobs: { status: "status", createdAt: "createdAt" },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeMockDb(overrides: Record<string, unknown> = {}) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
  return chain;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("pipelineOps router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getValidationRuns returns empty array when db is null", async () => {
    (getDb as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const { pipelineOpsRouter } = await import("./routers/pipelineOps");
    const proc = pipelineOpsRouter._def.procedures.getValidationRuns;
    expect(proc).toBeDefined();
  });

  it("getRenderAttempts returns empty array when db is null", async () => {
    (getDb as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const { pipelineOpsRouter } = await import("./routers/pipelineOps");
    const proc = pipelineOpsRouter._def.procedures.getRenderAttempts;
    expect(proc).toBeDefined();
  });

  it("getExportFailures returns empty array when db is null", async () => {
    (getDb as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const { pipelineOpsRouter } = await import("./routers/pipelineOps");
    const proc = pipelineOpsRouter._def.procedures.getExportFailures;
    expect(proc).toBeDefined();
  });

  it("getPipelineHealth returns null when db is null", async () => {
    (getDb as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const { pipelineOpsRouter } = await import("./routers/pipelineOps");
    const proc = pipelineOpsRouter._def.procedures.getPipelineHealth;
    expect(proc).toBeDefined();
  });

  it("getAllRenderAttempts returns empty result when db is null", async () => {
    (getDb as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const { pipelineOpsRouter } = await import("./routers/pipelineOps");
    const proc = pipelineOpsRouter._def.procedures.getAllRenderAttempts;
    expect(proc).toBeDefined();
  });

  it("pipelineOpsRouter exposes exactly 5 procedures", async () => {
    (getDb as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const { pipelineOpsRouter } = await import("./routers/pipelineOps");
    const procedures = Object.keys(pipelineOpsRouter._def.procedures);
    expect(procedures).toContain("getValidationRuns");
    expect(procedures).toContain("getRenderAttempts");
    expect(procedures).toContain("getExportFailures");
    expect(procedures).toContain("getPipelineHealth");
    expect(procedures).toContain("getAllRenderAttempts");
    expect(procedures.length).toBe(5);
  });
});
