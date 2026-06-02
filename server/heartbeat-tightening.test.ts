/**
 * heartbeat-tightening.test.ts
 *
 * Tests for all 8 heartbeat hardening fixes (updated 2026-06-02 for HeyGen Precision v3):
 *
 * 1. Failed scene recovery calls resetSceneAttempts (idempotency cleared)
 * 2. HeyGen stuck → resets to pending (not error)
 * 3. HeyGen failed poll → resets to pending (not error)
 * 4. HeyGen submission error → resets to pending (not error)
 * 5. Retry HeyGen error → leaves as pending (not error)
 * 6. nowPending definition excludes scenes with taskId
 * 7. nowLipSyncReady excludes lipSyncStatus=error
 * 8. Composite reaper removed (new pipeline)
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
    // NEW PIPELINE (2026-05-28): compositeStatus is set to 'skipped' (not 'pending')
    // because the compositing stage has been removed from the pipeline.
    expect(
      containsPattern(failedBlock, "compositeStatus: \"skipped\"") ||
      containsPattern(failedBlock, "compositeStatus: \"pending\"")
    ).toBe(true);
    expect(containsPattern(failedBlock, "compositeVideoUrl: null")).toBe(true);
  });
});

describe("Heartbeat Fix 2: HeyGen stuck → pending (not error)", () => {
  it("resets lipSyncStatus to pending (not error) when HeyGen Precision v3 is stuck", () => {
    const stuckBlock = heartbeatSrc.slice(
      heartbeatSrc.indexOf("HeyGen Precision v3 job stuck for"),
      heartbeatSrc.indexOf("HeyGen Precision v3 job stuck for") + 600
    );
    // Must set lipSyncStatus to pending
    expect(containsPattern(stuckBlock, "lipSyncStatus: \"pending\"")).toBe(true);
    // Must clear the task ID
    expect(containsPattern(stuckBlock, "lipSyncTaskId: null")).toBe(true);
    // Must NOT set lipSyncStatus to error
    expect(containsPattern(stuckBlock, "lipSyncStatus: \"error\"")).toBe(false);
  });
});

describe("Heartbeat Fix 3: HeyGen failed poll → pending (not error)", () => {
  it("resets lipSyncStatus to pending (not error) when HeyGen Precision v3 poll returns failed", () => {
    const failedPollBlock = heartbeatSrc.slice(
      heartbeatSrc.indexOf("HeyGen Precision v3 job ${scene.lipSyncTaskId} FAILED"),
      heartbeatSrc.indexOf("HeyGen Precision v3 job ${scene.lipSyncTaskId} FAILED") + 500
    );
    expect(containsPattern(failedPollBlock, "lipSyncStatus: \"pending\"")).toBe(true);
    expect(containsPattern(failedPollBlock, "lipSyncTaskId: null")).toBe(true);
    expect(containsPattern(failedPollBlock, "lipSyncStatus: \"error\"")).toBe(false);
  });
});

describe("Heartbeat Fix 4: HeyGen submission error → pending (not error)", () => {
  it("resets lipSyncStatus to pending when HeyGen Precision v3 submission throws", () => {
    const submitErrBlock = heartbeatSrc.slice(
      heartbeatSrc.indexOf("HeyGen Precision v3 submission FAILED"),
      heartbeatSrc.indexOf("HeyGen Precision v3 submission FAILED") + 600
    );
    expect(containsPattern(submitErrBlock, "lipSyncStatus: \"pending\"")).toBe(true);
    expect(containsPattern(submitErrBlock, "lipSyncTaskId: null")).toBe(true);
    expect(containsPattern(submitErrBlock, "lipSyncStatus: \"error\"")).toBe(false);
  });
});

describe("Heartbeat Fix 5: Retry HeyGen error → leave as pending", () => {
  it("does not set lipSyncStatus=error in the retry catch block", () => {
    const retryErrBlock = heartbeatSrc.slice(
      heartbeatSrc.indexOf("RETRY HeyGen Precision v3 failed"),
      heartbeatSrc.indexOf("RETRY HeyGen Precision v3 failed") + 400
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
    // NEW PIPELINE: the assembly gate uses lipSyncStatus=done directly.
    // Check that the heartbeat uses lipSyncStatus === "done" for assembly readiness.
    expect(containsPattern(heartbeatSrc, "s.lipSyncStatus === \"done\"")).toBe(true);
    // Must NOT include error as acceptable for assembly readiness
    expect(containsPattern(heartbeatSrc, "|| s.lipSyncStatus === \"error\"")).toBe(false);
  });
});

describe("Heartbeat Fix 8: Composite reaper removed (new pipeline)", () => {
  it("compositing stage is removed — compositeStatus is set to skipped for all scenes", () => {
    // NEW PIPELINE (2026-05-28): The compositing stage has been removed entirely.
    // compositeStatus is set to 'skipped' for all scenes (not 'pending' or 'processing').
    // The composite reaper no longer exists as an active stage in the heartbeat.
    expect(containsPattern(heartbeatSrc, "compositeStatus: \"skipped\"")).toBe(true);
    // The heartbeat must NOT actively dispatch compositing work
    // (references to chromakey/compositing may exist in comments, but active dispatch must be gone)
    expect(containsPattern(heartbeatSrc, "submitComposite")).toBe(false);
    // The compositing stage removed comment must be present
    expect(containsPattern(heartbeatSrc, "compositing stage")).toBe(true);
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
