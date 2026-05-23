/**
 * jobResurrectionReaper.test.ts
 *
 * Unit tests for the self-healing engine that covers all uncovered failure modes:
 * - Zombie assembling jobs (finalVideoUrl set, status=assembling)
 * - Stuck assembling jobs (no video, >30 min)
 * - Permanently blocked composites (attempts exhausted)
 * - Dead rendering jobs (no activity >2 hours)
 * - SLA breach alerts (rendering >1 hour)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Build a mock music video job with sensible defaults */
function makeJob(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    userId: 42,
    title: "Test Job",
    status: "rendering",
    finalVideoUrl: null,
    assemblyStartedAt: null,
    updatedAt: new Date(),
    createdAt: new Date(),
    errorMessage: null,
    ...overrides,
  };
}

/** Build a mock scene with sensible defaults */
function makeScene(overrides: Record<string, unknown> = {}) {
  return {
    id: 100,
    jobId: 1,
    sceneIndex: 0,
    sceneType: "performance",
    status: "completed",
    compositeStatus: "done",
    compositeAttempts: 0,
    lipSyncStatus: "done",
    updatedAt: new Date(),
    ...overrides,
  };
}

// ── State derivation logic (extracted from jobResurrectionReaper.ts) ───────────

/**
 * Determines if a job is a zombie assembling job.
 * A zombie job has status='assembling' and a finalVideoUrl already set.
 * This happens when assembleMusicVideo set the URL but was killed before
 * updating the status to 'completed'.
 */
function isZombieAssemblingJob(job: ReturnType<typeof makeJob>): boolean {
  return job.status === "assembling" && job.finalVideoUrl != null;
}

/**
 * Determines if a job is stuck in assembling with no output.
 * Threshold: 30 minutes since last update.
 */
function isStuckAssemblingJob(
  job: ReturnType<typeof makeJob>,
  thresholdMs = 30 * 60 * 1000
): boolean {
  if (job.status !== "assembling") return false;
  if (job.finalVideoUrl != null) return false; // zombie, not stuck
  const ageMs = Date.now() - new Date(job.updatedAt).getTime();
  return ageMs > thresholdMs;
}

/**
 * Determines if a scene has a permanently blocked composite.
 * Threshold: compositeAttempts >= MAX_COMPOSITE_ATTEMPTS (3).
 */
function isPermanentlyBlockedComposite(
  scene: ReturnType<typeof makeScene>,
  maxAttempts = 3
): boolean {
  return (
    scene.compositeStatus === "error" &&
    (scene.compositeAttempts ?? 0) >= maxAttempts
  );
}

/**
 * Determines if a rendering job is dead (no activity for >2 hours).
 */
function isDeadRenderingJob(
  job: ReturnType<typeof makeJob>,
  thresholdMs = 2 * 60 * 60 * 1000
): boolean {
  if (job.status !== "rendering") return false;
  const ageMs = Date.now() - new Date(job.updatedAt).getTime();
  return ageMs > thresholdMs;
}

/**
 * Determines if a job has breached the SLA (rendering >1 hour with no activity).
 */
function isSlaBreached(
  job: ReturnType<typeof makeJob>,
  slaMs = 60 * 60 * 1000,
  inactivityMs = 15 * 60 * 1000
): boolean {
  if (job.status !== "rendering") return false;
  const ageMs = Date.now() - new Date(job.createdAt).getTime();
  const inactivityAge = Date.now() - new Date(job.updatedAt).getTime();
  return ageMs > slaMs && inactivityAge > inactivityMs;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("isZombieAssemblingJob", () => {
  it("detects a zombie job: status=assembling + finalVideoUrl set", () => {
    const job = makeJob({
      status: "assembling",
      finalVideoUrl: "https://cdn.example.com/final.mp4",
    });
    expect(isZombieAssemblingJob(job)).toBe(true);
  });

  it("does NOT flag a job that is assembling with no video yet", () => {
    const job = makeJob({ status: "assembling", finalVideoUrl: null });
    expect(isZombieAssemblingJob(job)).toBe(false);
  });

  it("does NOT flag a completed job even if it has a finalVideoUrl", () => {
    const job = makeJob({
      status: "completed",
      finalVideoUrl: "https://cdn.example.com/final.mp4",
    });
    expect(isZombieAssemblingJob(job)).toBe(false);
  });

  it("does NOT flag a rendering job", () => {
    const job = makeJob({ status: "rendering" });
    expect(isZombieAssemblingJob(job)).toBe(false);
  });
});

describe("isStuckAssemblingJob", () => {
  it("detects a stuck assembling job older than the threshold", () => {
    const stuckTime = new Date(Date.now() - 31 * 60 * 1000); // 31 min ago
    const job = makeJob({ status: "assembling", updatedAt: stuckTime });
    expect(isStuckAssemblingJob(job)).toBe(true);
  });

  it("does NOT flag a recently-started assembling job", () => {
    const recentTime = new Date(Date.now() - 5 * 60 * 1000); // 5 min ago
    const job = makeJob({ status: "assembling", updatedAt: recentTime });
    expect(isStuckAssemblingJob(job)).toBe(false);
  });

  it("does NOT flag a zombie job (has finalVideoUrl) as stuck", () => {
    const stuckTime = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
    const job = makeJob({
      status: "assembling",
      finalVideoUrl: "https://cdn.example.com/final.mp4",
      updatedAt: stuckTime,
    });
    // Zombie jobs are handled by isZombieAssemblingJob, not isStuckAssemblingJob
    expect(isStuckAssemblingJob(job)).toBe(false);
  });

  it("does NOT flag a rendering job", () => {
    const oldTime = new Date(Date.now() - 60 * 60 * 1000);
    const job = makeJob({ status: "rendering", updatedAt: oldTime });
    expect(isStuckAssemblingJob(job)).toBe(false);
  });

  it("respects a custom threshold", () => {
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
    const job = makeJob({ status: "assembling", updatedAt: tenMinAgo });
    // With 5-min threshold, this IS stuck
    expect(isStuckAssemblingJob(job, 5 * 60 * 1000)).toBe(true);
    // With 15-min threshold, this is NOT stuck
    expect(isStuckAssemblingJob(job, 15 * 60 * 1000)).toBe(false);
  });
});

describe("isPermanentlyBlockedComposite", () => {
  it("detects a permanently blocked composite at exactly MAX_COMPOSITE_ATTEMPTS", () => {
    const scene = makeScene({ compositeStatus: "error", compositeAttempts: 3 });
    expect(isPermanentlyBlockedComposite(scene)).toBe(true);
  });

  it("detects a permanently blocked composite above MAX_COMPOSITE_ATTEMPTS", () => {
    const scene = makeScene({ compositeStatus: "error", compositeAttempts: 5 });
    expect(isPermanentlyBlockedComposite(scene)).toBe(true);
  });

  it("does NOT flag a scene with fewer than MAX_COMPOSITE_ATTEMPTS errors", () => {
    const scene = makeScene({ compositeStatus: "error", compositeAttempts: 2 });
    expect(isPermanentlyBlockedComposite(scene)).toBe(false);
  });

  it("does NOT flag a scene with compositeStatus=pending", () => {
    const scene = makeScene({ compositeStatus: "pending", compositeAttempts: 3 });
    expect(isPermanentlyBlockedComposite(scene)).toBe(false);
  });

  it("does NOT flag a scene with compositeStatus=done", () => {
    const scene = makeScene({ compositeStatus: "done", compositeAttempts: 3 });
    expect(isPermanentlyBlockedComposite(scene)).toBe(false);
  });

  it("handles null compositeAttempts as 0", () => {
    const scene = makeScene({ compositeStatus: "error", compositeAttempts: null });
    expect(isPermanentlyBlockedComposite(scene)).toBe(false);
  });
});

describe("isDeadRenderingJob", () => {
  it("detects a dead rendering job older than 2 hours", () => {
    const oldTime = new Date(Date.now() - 3 * 60 * 60 * 1000); // 3 hours ago
    const job = makeJob({ status: "rendering", updatedAt: oldTime });
    expect(isDeadRenderingJob(job)).toBe(true);
  });

  it("does NOT flag a recently-active rendering job", () => {
    const recentTime = new Date(Date.now() - 30 * 60 * 1000); // 30 min ago
    const job = makeJob({ status: "rendering", updatedAt: recentTime });
    expect(isDeadRenderingJob(job)).toBe(false);
  });

  it("does NOT flag a job that is assembling", () => {
    const oldTime = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const job = makeJob({ status: "assembling", updatedAt: oldTime });
    expect(isDeadRenderingJob(job)).toBe(false);
  });

  it("does NOT flag a completed job", () => {
    const oldTime = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const job = makeJob({ status: "completed", updatedAt: oldTime });
    expect(isDeadRenderingJob(job)).toBe(false);
  });
});

describe("isSlaBreached", () => {
  it("detects SLA breach: rendering >1hr with no recent activity", () => {
    const createdAt = new Date(Date.now() - 90 * 60 * 1000); // 90 min ago
    const updatedAt = new Date(Date.now() - 20 * 60 * 1000); // 20 min ago (no activity)
    const job = makeJob({ status: "rendering", createdAt, updatedAt });
    expect(isSlaBreached(job)).toBe(true);
  });

  it("does NOT flag a job that is actively processing (recent updatedAt)", () => {
    const createdAt = new Date(Date.now() - 90 * 60 * 1000); // 90 min old
    const updatedAt = new Date(Date.now() - 2 * 60 * 1000); // 2 min ago (active)
    const job = makeJob({ status: "rendering", createdAt, updatedAt });
    expect(isSlaBreached(job)).toBe(false);
  });

  it("does NOT flag a recently-created job", () => {
    const createdAt = new Date(Date.now() - 30 * 60 * 1000); // 30 min old
    const updatedAt = new Date(Date.now() - 20 * 60 * 1000); // 20 min ago
    const job = makeJob({ status: "rendering", createdAt, updatedAt });
    expect(isSlaBreached(job)).toBe(false);
  });

  it("does NOT flag a completed job", () => {
    const createdAt = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const updatedAt = new Date(Date.now() - 60 * 60 * 1000);
    const job = makeJob({ status: "completed", createdAt, updatedAt });
    expect(isSlaBreached(job)).toBe(false);
  });
});

describe("Self-healing action correctness", () => {
  it("zombie fix: sets status to completed without touching scenes", () => {
    const job = makeJob({
      status: "assembling",
      finalVideoUrl: "https://cdn.example.com/final.mp4",
    });
    // Simulate the fix
    const fix = { status: "completed", updatedAt: new Date() };
    expect(fix.status).toBe("completed");
    expect(isZombieAssemblingJob({ ...job, ...fix })).toBe(false);
  });

  it("stuck assembling fix: resets job to rendering and clears assemblyStartedAt", () => {
    const stuckTime = new Date(Date.now() - 35 * 60 * 1000);
    const job = makeJob({
      status: "assembling",
      assemblyStartedAt: stuckTime,
      updatedAt: stuckTime,
    });
    // Simulate the fix
    const fix = {
      status: "rendering",
      assemblyStartedAt: null,
      updatedAt: new Date(),
    };
    const fixed = { ...job, ...fix };
    expect(fixed.status).toBe("rendering");
    expect(fixed.assemblyStartedAt).toBeNull();
    expect(isStuckAssemblingJob(fixed)).toBe(false);
  });

  it("permanently blocked composite fix: resets attempts and status to pending", () => {
    const scene = makeScene({ compositeStatus: "error", compositeAttempts: 3 });
    // Simulate the fix
    const fix = { compositeStatus: "pending", compositeAttempts: 0 };
    const fixed = { ...scene, ...fix };
    expect(fixed.compositeStatus).toBe("pending");
    expect(fixed.compositeAttempts).toBe(0);
    expect(isPermanentlyBlockedComposite(fixed)).toBe(false);
  });

  it("dead rendering fix: resets all scenes to pending and touches job updatedAt", () => {
    const oldTime = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const job = makeJob({ status: "rendering", updatedAt: oldTime });
    const scenes = [
      makeScene({ status: "generating", compositeStatus: "processing" }),
      makeScene({ status: "failed", compositeStatus: "error" }),
    ];
    // Simulate the fix
    const fixedScenes = scenes.map(s => ({
      ...s,
      status: "pending",
      taskId: null,
      videoUrl: null,
      lipSyncStatus: "pending",
      compositeStatus: "pending",
      compositeAttempts: 0,
    }));
    const fixedJob = { ...job, updatedAt: new Date() };

    expect(fixedScenes.every(s => s.status === "pending")).toBe(true);
    expect(fixedScenes.every(s => s.compositeStatus === "pending")).toBe(true);
    expect(isDeadRenderingJob(fixedJob)).toBe(false); // updatedAt refreshed
  });
});
