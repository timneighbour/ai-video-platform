/**
 * heartbeat-tightening.test.ts
 *
 * Tests for all 8 heartbeat hardening fixes (2026-05-23):
 *
 * 1. Failed scene recovery calls resetSceneAttempts (idempotency cleared)
 * 2. InfiniteTalk stuck → resets to pending (not error)
 * 3. InfiniteTalk failed → resets to pending (not error)
 * 4. InfiniteTalk submission error → resets to pending (not error)
 * 5. Retry InfiniteTalk error → leaves as pending (not error)
 * 6. nowPending definition excludes scenes with taskId
 * 7. nowLipSyncReady excludes lipSyncStatus=error
 * 8. Composite reaper resets error scenes (not just processing)
 * 9. stuckSceneReaper does full pipeline reset (all fields cleared)
 * 10. stuckSceneReaper does NOT call startSceneRender directly
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs";
import path from "path";

// ── Read source files for static analysis ────────────────────────────────────
const heartbeatSrc = fs.readFileSync(
  path.resolve(__dirname, "../server/scheduled/sceneDispatchHeartbeat.ts"),
  "utf8"
);
const reaperSrc = fs.readFileSync(
  path.resolve(__dirname, "../server/scheduled/stuckSceneReaper.ts"),
  "utf8"
);

// ── Helper: extract the text of a named section ───────────────────────────────
function containsPattern(src: string, pattern: string | RegExp): boolean {
  if (typeof pattern === "string") return src.includes(pattern);
  return pattern.test(src);
}

describe("Heartbeat Fix 1: Failed scene recovery clears idempotency", () => {
  it("calls resetSceneAttempts before resetting failed scenes to pending", () => {
    // The import must be present
    expect(containsPattern(heartbeatSrc, "import { resetSceneAttempts } from \"../spend-protection\";")).toBe(true);
    // resetSceneAttempts must be called in the failed scene recovery block
    const failedBlock = heartbeatSrc.slice(
      heartbeatSrc.indexOf("Auto-recover failed scenes back to pending"),
      heartbeatSrc.indexOf("CONTROLLED VALIDATION: Probe gate")
    );
    expect(containsPattern(failedBlock, "resetSceneAttempts(fs.id)")).toBe(true);
  });

  it("resets all pipeline fields when recovering a failed scene", () => {
    const failedBlock = heartbeatSrc.slice(
      heartbeatSrc.indexOf("Auto-recover failed scenes back to pending"),
      heartbeatSrc.indexOf("CONTROLLED VALIDATION: Probe gate")
    );
    expect(containsPattern(failedBlock, "lipSyncStatus: \"pending\"")).toBe(true);
    expect(containsPattern(failedBlock, "lipSyncTaskId: null")).toBe(true);
    expect(containsPattern(failedBlock, "lipSyncVideoUrl: null")).toBe(true);
    expect(containsPattern(failedBlock, "compositeStatus: \"pending\"")).toBe(true);
    expect(containsPattern(failedBlock, "compositeVideoUrl: null")).toBe(true);
  });
});

describe("Heartbeat Fix 2: InfiniteTalk stuck → pending (not error)", () => {
  it("resets lipSyncStatus to pending (not error) when InfiniteTalk is stuck", () => {
    const stuckBlock = heartbeatSrc.slice(
      heartbeatSrc.indexOf("InfiniteTalk job stuck for"),
      heartbeatSrc.indexOf("InfiniteTalk job stuck for") + 600
    );
    // Must set lipSyncStatus to pending
    expect(containsPattern(stuckBlock, "lipSyncStatus: \"pending\"")).toBe(true);
    // Must clear the task ID
    expect(containsPattern(stuckBlock, "lipSyncTaskId: null")).toBe(true);
    // Must NOT set lipSyncStatus to error
    expect(containsPattern(stuckBlock, "lipSyncStatus: \"error\"")).toBe(false);
  });
});

describe("Heartbeat Fix 3: InfiniteTalk failed poll → pending (not error)", () => {
  it("resets lipSyncStatus to pending (not error) when InfiniteTalk poll returns failed", () => {
    const failedPollBlock = heartbeatSrc.slice(
      heartbeatSrc.indexOf("InfiniteTalk job ${scene.lipSyncTaskId} FAILED"),
      heartbeatSrc.indexOf("InfiniteTalk job ${scene.lipSyncTaskId} FAILED") + 500
    );
    expect(containsPattern(failedPollBlock, "lipSyncStatus: \"pending\"")).toBe(true);
    expect(containsPattern(failedPollBlock, "lipSyncTaskId: null")).toBe(true);
    expect(containsPattern(failedPollBlock, "lipSyncStatus: \"error\"")).toBe(false);
  });
});

describe("Heartbeat Fix 4: InfiniteTalk submission error → pending (not error)", () => {
  it("resets lipSyncStatus to pending when InfiniteTalk submission throws", () => {
    const submitErrBlock = heartbeatSrc.slice(
      heartbeatSrc.indexOf("InfiniteTalk submission FAILED"),
      heartbeatSrc.indexOf("InfiniteTalk submission FAILED") + 600
    );
    expect(containsPattern(submitErrBlock, "lipSyncStatus: \"pending\"")).toBe(true);
    expect(containsPattern(submitErrBlock, "lipSyncTaskId: null")).toBe(true);
    expect(containsPattern(submitErrBlock, "lipSyncStatus: \"error\"")).toBe(false);
  });
});

describe("Heartbeat Fix 5: Retry InfiniteTalk error → leave as pending", () => {
  it("does not set lipSyncStatus=error in the retry catch block", () => {
    const retryErrBlock = heartbeatSrc.slice(
      heartbeatSrc.indexOf("RETRY InfiniteTalk failed"),
      heartbeatSrc.indexOf("RETRY InfiniteTalk failed") + 400
    );
    expect(containsPattern(retryErrBlock, "lipSyncStatus: \"error\"")).toBe(false);
    expect(containsPattern(retryErrBlock, "will retry next tick")).toBe(true);
  });
});

describe("Heartbeat Fix 6: nowPending excludes scenes with taskId", () => {
  it("nowPending filter only includes status=pending AND !taskId", () => {
    const pendingDef = heartbeatSrc.slice(
      heartbeatSrc.indexOf("A scene is \"pending\" if status=pending"),
      heartbeatSrc.indexOf("A scene is \"pending\" if status=pending") + 300
    );
    expect(containsPattern(pendingDef, "s.status === \"pending\" && !s.taskId")).toBe(true);
    // Must NOT include the old incorrect OR condition
    expect(containsPattern(pendingDef, "lipSyncStatus === \"pending\"")).toBe(false);
  });
});

describe("Heartbeat Fix 7: nowLipSyncReady excludes error", () => {
  it("nowLipSyncReady only includes lipSyncStatus=done (not error)", () => {
    const lipSyncReadyDef = heartbeatSrc.slice(
      heartbeatSrc.indexOf("Lip sync readiness: a scene is"),
      heartbeatSrc.indexOf("Lip sync readiness: a scene is") + 400
    );
    expect(containsPattern(lipSyncReadyDef, "s.lipSyncStatus === \"done\"")).toBe(true);
    // Must NOT include error as acceptable
    expect(containsPattern(lipSyncReadyDef, "|| s.lipSyncStatus === \"error\"")).toBe(false);
  });
});

describe("Heartbeat Fix 8: Composite reaper resets error scenes too", () => {
  it("stuckCompositeScenes filter includes compositeStatus=error scenes under attempt limit", () => {
    const reaperDef = heartbeatSrc.slice(
      heartbeatSrc.indexOf("Resets scenes stuck in 'processing'"),
      heartbeatSrc.indexOf("Resets scenes stuck in 'processing'") + 600
    );
    expect(containsPattern(reaperDef, "compositeStatus === \"error\"")).toBe(true);
    expect(containsPattern(reaperDef, "compositeAttempts ?? 0) < MAX_COMPOSITE_ATTEMPTS")).toBe(true);
  });
});

describe("StuckSceneReaper Fix: Full pipeline reset, no direct dispatch", () => {
  it("does not import or call startSceneRender", () => {
    // startSceneRender must not be imported
    expect(containsPattern(reaperSrc, "import { startSceneRender }")).toBe(false);
    // startSceneRender must not be called
    expect(containsPattern(reaperSrc, "startSceneRender(")).toBe(false);
  });

  it("resets all pipeline fields in the auto-retry reset block", () => {
    const resetBlock = reaperSrc.slice(
      reaperSrc.indexOf("Full pipeline reset"),
      reaperSrc.indexOf("Full pipeline reset") + 600
    );
    expect(containsPattern(resetBlock, "lipSyncStatus: \"pending\"")).toBe(true);
    expect(containsPattern(resetBlock, "lipSyncTaskId: null")).toBe(true);
    expect(containsPattern(resetBlock, "lipSyncVideoUrl: null")).toBe(true);
    expect(containsPattern(resetBlock, "compositeStatus: \"pending\"")).toBe(true);
    expect(containsPattern(resetBlock, "compositeVideoUrl: null")).toBe(true);
  });

  it("logs that the heartbeat will dispatch on next tick", () => {
    expect(containsPattern(reaperSrc, "heartbeat will dispatch on next tick")).toBe(true);
  });
});
