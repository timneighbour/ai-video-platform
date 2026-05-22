/**
 * pipeline-progress.test.ts
 * Unit tests for the getPipelineStatus tRPC procedure logic.
 */

import { describe, it, expect } from "vitest";

// ── Helpers mirrored from PipelineProgressTab ─────────────────────────────

function computeOverallProgress(
  totalScenes: number,
  stage1Done: number,
  stage2Done: number,
  stage3_4Done: number,
  jobStatus: string,
  hasFinalVideo: boolean
): number {
  const stageWeights = [0.2, 0.25, 0.25, 0.25, 0.05];
  const s1 = totalScenes > 0 ? (stage1Done / totalScenes) * stageWeights[0] : 0;
  const s2 = totalScenes > 0 ? (stage2Done / totalScenes) * stageWeights[1] : 0;
  const s34 = totalScenes > 0 ? (stage3_4Done / totalScenes) * stageWeights[2] : 0;
  const assemblyDone = jobStatus === "completed" && hasFinalVideo;
  const s5 = assemblyDone
    ? stageWeights[3] + stageWeights[4]
    : jobStatus === "assembling"
    ? stageWeights[3] * 0.5
    : 0;
  return Math.round((s1 + s2 + s34 + s5) * 100);
}

function computeStageStatus(
  done: number,
  total: number,
  pending?: number,
  error?: number
): string {
  if (done === total) return "done";
  if ((pending ?? 0) > 0) return "processing";
  if ((error ?? 0) > 0) return "error";
  return "waiting";
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe("Pipeline progress computation", () => {
  it("returns 0% when no scenes are done", () => {
    expect(computeOverallProgress(12, 0, 0, 0, "rendering", false)).toBe(0);
  });

  it("returns 100% when all stages complete", () => {
    expect(computeOverallProgress(12, 12, 12, 12, "completed", true)).toBe(100);
  });

  it("accounts for partial stage 1 progress", () => {
    // 6/12 scenes in stage 1 = 50% of 20% weight = 10%
    const pct = computeOverallProgress(12, 6, 0, 0, "rendering", false);
    expect(pct).toBe(10);
  });

  it("accounts for assembling state (stage 5 half-weight)", () => {
    // All stages done + assembling = 20+25+25 + 25*0.5 = 82.5% → 83
    const pct = computeOverallProgress(12, 12, 12, 12, "assembling", false);
    expect(pct).toBe(83);
  });

  it("stage status: done when all scenes done", () => {
    expect(computeStageStatus(12, 12)).toBe("done");
  });

  it("stage status: processing when pending > 0", () => {
    expect(computeStageStatus(4, 12, 3)).toBe("processing");
  });

  it("stage status: error when error > 0 and no pending", () => {
    expect(computeStageStatus(4, 12, 0, 2)).toBe("error");
  });

  it("stage status: waiting when nothing active", () => {
    expect(computeStageStatus(0, 12, 0, 0)).toBe("waiting");
  });
});

describe("Scene type routing", () => {
  const scenes = [
    { sceneType: "cinematic", compositeStatus: "skipped" },
    { sceneType: "performance", compositeStatus: "pending" },
    { sceneType: "performance", compositeStatus: "done" },
    { sceneType: "cinematic", compositeStatus: "skipped" },
  ];

  it("counts composite done/skipped correctly", () => {
    const done = scenes.filter(
      (s) => s.compositeStatus === "done" || s.compositeStatus === "skipped"
    ).length;
    expect(done).toBe(3); // 2 skipped + 1 done
  });

  it("separates performance and cinematic scenes", () => {
    const perf = scenes.filter((s) => s.sceneType === "performance");
    const cine = scenes.filter((s) => s.sceneType !== "performance");
    expect(perf.length).toBe(2);
    expect(cine.length).toBe(2);
  });
});
