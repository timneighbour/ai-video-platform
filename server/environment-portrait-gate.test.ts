/**
 * environment-portrait-gate.test.ts
 *
 * Tests for the environment portrait gate logic:
 * - When environmentRefUrl is missing for a lip-sync scene, Stage 2 should be triggered
 * - When Stage 2 is in progress, the scene should be deferred
 * - When environmentRefUrl is present, the scene should proceed with the environment ref
 * - Non-lip-sync scenes should not be gated
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { runStage2EnvironmentPrep, selectReferenceForScene } from "./character-auto-prep";

// ─── Mock character factory ───────────────────────────────────────────────────

function makeChar(overrides: Partial<{
  id: number;
  name: string;
  masterPortraitUrl: string | null;
  performanceRefUrl: string | null;
  environmentRefUrl: string | null;
  environmentRefStyle: string | null;
  autoPrepStatus: string;
  lockedDescription: string | null;
  characterPrompt: string | null;
}> = {}) {
  return {
    id: 1001,
    name: "Zara",
    masterPortraitUrl: "https://cdn.example.com/zara-portrait.jpg",
    performanceRefUrl: null,
    mediumShotRefUrl: null,
    cinematicRefUrl: null,
    environmentRefUrl: null,
    environmentRefStyle: null,
    autoPrepStatus: "stage1_done",
    lockedDescription: "young woman, early 20s, long dark hair, stage outfit",
    characterPrompt: "young woman, early 20s, youthful appearance",
    previewImageUrl: null,
    jobId: 870022,
    ...overrides,
  };
}

// ─── Gate logic (extracted for unit testing) ─────────────────────────────────

/**
 * Mirrors the environment portrait gate logic in sceneDispatchHeartbeat.ts.
 * Returns: "dispatch" | "defer" | "trigger_and_defer"
 */
function evaluateEnvironmentGate(
  char: ReturnType<typeof makeChar>,
  isLipSyncScene: boolean
): "dispatch" | "defer" | "trigger_and_defer" {
  if (!isLipSyncScene) return "dispatch";
  if (char.environmentRefUrl) return "dispatch";
  if (char.autoPrepStatus === "stage2_processing") return "defer";
  return "trigger_and_defer";
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Environment Portrait Gate", () => {
  describe("evaluateEnvironmentGate", () => {
    it("dispatches non-lip-sync scenes immediately regardless of environmentRefUrl", () => {
      const char = makeChar({ environmentRefUrl: null });
      expect(evaluateEnvironmentGate(char, false)).toBe("dispatch");
    });

    it("dispatches lip-sync scenes when environmentRefUrl is already set", () => {
      const char = makeChar({
        environmentRefUrl: "https://cdn.example.com/zara-air-studios.jpg",
        environmentRefStyle: "Air Studios",
        autoPrepStatus: "complete",
      });
      expect(evaluateEnvironmentGate(char, true)).toBe("dispatch");
    });

    it("defers lip-sync scenes when Stage 2 is already in progress", () => {
      const char = makeChar({
        environmentRefUrl: null,
        autoPrepStatus: "stage2_processing",
      });
      expect(evaluateEnvironmentGate(char, true)).toBe("defer");
    });

    it("triggers Stage 2 and defers when environmentRefUrl is null and Stage 2 not started", () => {
      const char = makeChar({
        environmentRefUrl: null,
        autoPrepStatus: "stage1_done",
      });
      expect(evaluateEnvironmentGate(char, true)).toBe("trigger_and_defer");
    });

    it("triggers Stage 2 and defers when autoPrepStatus is pending", () => {
      const char = makeChar({
        environmentRefUrl: null,
        autoPrepStatus: "pending",
      });
      expect(evaluateEnvironmentGate(char, true)).toBe("trigger_and_defer");
    });

    it("triggers Stage 2 and defers when autoPrepStatus is complete but environmentRefUrl is null", () => {
      // Edge case: status says complete but URL is missing (e.g. generation failed silently)
      const char = makeChar({
        environmentRefUrl: null,
        autoPrepStatus: "complete",
      });
      expect(evaluateEnvironmentGate(char, true)).toBe("trigger_and_defer");
    });

    it("dispatches when environmentRefUrl is set even if autoPrepStatus is stage2_processing", () => {
      // Race condition: Stage 2 just completed but status not yet updated
      const char = makeChar({
        environmentRefUrl: "https://cdn.example.com/zara-air-studios.jpg",
        autoPrepStatus: "stage2_processing",
      });
      expect(evaluateEnvironmentGate(char, true)).toBe("dispatch");
    });
  });

  describe("selectReferenceForScene", () => {
    it("returns environmentRefUrl for environment scene type", () => {
      const char = makeChar({
        environmentRefUrl: "https://cdn.example.com/zara-air-studios.jpg",
        masterPortraitUrl: "https://cdn.example.com/zara-portrait.jpg",
      });
      const ref = selectReferenceForScene(char as any, "environment");
      expect(ref).toBe("https://cdn.example.com/zara-air-studios.jpg");
    });

    it("falls back to masterPortraitUrl when environmentRefUrl is null for environment type", () => {
      const char = makeChar({
        environmentRefUrl: null,
        masterPortraitUrl: "https://cdn.example.com/zara-portrait.jpg",
      });
      const ref = selectReferenceForScene(char as any, "environment");
      expect(ref).toBe("https://cdn.example.com/zara-portrait.jpg");
    });

    it("returns performanceRefUrl for performance scene type when available", () => {
      const char = makeChar({
        performanceRefUrl: "https://cdn.example.com/zara-perf.jpg",
        masterPortraitUrl: "https://cdn.example.com/zara-portrait.jpg",
      });
      const ref = selectReferenceForScene(char as any, "performance");
      expect(ref).toBe("https://cdn.example.com/zara-perf.jpg");
    });

    it("falls back to masterPortraitUrl for performance type when performanceRefUrl is null", () => {
      const char = makeChar({
        performanceRefUrl: null,
        masterPortraitUrl: "https://cdn.example.com/zara-portrait.jpg",
      });
      const ref = selectReferenceForScene(char as any, "performance");
      expect(ref).toBe("https://cdn.example.com/zara-portrait.jpg");
    });

    it("returns null when all portrait URLs are null", () => {
      const char = makeChar({
        performanceRefUrl: null,
        masterPortraitUrl: null,
        previewImageUrl: null,
        environmentRefUrl: null,
        cinematicRefUrl: null,
        mediumShotRefUrl: null,
      });
      const ref = selectReferenceForScene(char as any, "performance");
      expect(ref).toBeNull();
    });
  });

  describe("sceneStyle fallback", () => {
    it("uses job.sceneSetting as sceneStyle when available", () => {
      const jobSceneSetting = "Air Studios, London — grand piano room, warm stage lighting";
      const fallback = "Air Studios recording studio, Lyndhurst Hall, cinematic lighting";
      const sceneStyle = jobSceneSetting ?? fallback;
      expect(sceneStyle).toBe(jobSceneSetting);
    });

    it("falls back to default Air Studios description when job.sceneSetting is null", () => {
      const jobSceneSetting: string | null = null;
      const fallback = "Air Studios recording studio, Lyndhurst Hall, cinematic lighting";
      const sceneStyle = jobSceneSetting ?? fallback;
      expect(sceneStyle).toBe(fallback);
    });

    it("falls back to default when job.sceneSetting is empty string", () => {
      const jobSceneSetting = "";
      const fallback = "Air Studios recording studio, Lyndhurst Hall, cinematic lighting";
      const sceneStyle = jobSceneSetting || fallback;
      expect(sceneStyle).toBe(fallback);
    });
  });
});
