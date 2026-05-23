/**
 * Tests for the getScenePreviews tRPC procedure logic.
 * Validates the previewState derivation for performance and cinematic scenes.
 */

import { describe, it, expect } from "vitest";

// ── Mirror the previewState logic from the router ────────────────────────────
type PreviewState = "pending" | "waiting" | "compositing" | "ready";

function derivePreviewState(scene: {
  sceneType: string | null;
  status: string;
  lipSyncStatus: string | null;
  compositeStatus: string | null;
  compositeVideoUrl: string | null;
  videoUrl: string | null;
}): { previewState: PreviewState; previewUrl: string | null } {
  const isPerformance = scene.sceneType === "performance";
  const compositeDone = scene.compositeStatus === "done" && !!scene.compositeVideoUrl;
  const cinematicReady = !isPerformance && scene.status === "completed" && !!scene.videoUrl;

  let previewUrl: string | null = null;
  let previewState: PreviewState = "waiting";

  if (isPerformance) {
    if (compositeDone) {
      previewUrl = scene.compositeVideoUrl!;
      previewState = "ready";
    } else if (
      scene.status === "completed" ||
      scene.lipSyncStatus === "processing" ||
      scene.compositeStatus === "processing" ||
      scene.compositeStatus === "pending"
    ) {
      previewState = "compositing";
    } else if (scene.status === "pending") {
      previewState = "pending";
    }
  } else {
    if (cinematicReady) {
      previewUrl = scene.videoUrl!;
      previewState = "ready";
    } else if (scene.status === "pending") {
      previewState = "pending";
    } else if (scene.status === "generating") {
      previewState = "waiting";
    }
  }

  return { previewState, previewUrl };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("getScenePreviews — previewState derivation", () => {
  // Performance scenes
  describe("performance scenes", () => {
    it("returns ready when compositeStatus=done and compositeVideoUrl is set", () => {
      const result = derivePreviewState({
        sceneType: "performance",
        status: "completed",
        lipSyncStatus: "done",
        compositeStatus: "done",
        compositeVideoUrl: "https://cdn.example.com/composite.mp4",
        videoUrl: "https://cdn.example.com/raw.mp4",
      });
      expect(result.previewState).toBe("ready");
      expect(result.previewUrl).toBe("https://cdn.example.com/composite.mp4");
    });

    it("does NOT use videoUrl for performance scenes even when composite is done", () => {
      // previewUrl must be compositeVideoUrl, not videoUrl
      const result = derivePreviewState({
        sceneType: "performance",
        status: "completed",
        lipSyncStatus: "done",
        compositeStatus: "done",
        compositeVideoUrl: "https://cdn.example.com/composite.mp4",
        videoUrl: "https://cdn.example.com/raw.mp4",
      });
      expect(result.previewUrl).not.toBe("https://cdn.example.com/raw.mp4");
      expect(result.previewUrl).toBe("https://cdn.example.com/composite.mp4");
    });

    it("returns compositing when Seedance is done but InfiniteTalk is processing", () => {
      const result = derivePreviewState({
        sceneType: "performance",
        status: "completed",
        lipSyncStatus: "processing",
        compositeStatus: null,
        compositeVideoUrl: null,
        videoUrl: "https://cdn.example.com/raw.mp4",
      });
      expect(result.previewState).toBe("compositing");
      expect(result.previewUrl).toBeNull();
    });

    it("returns compositing when composite is processing", () => {
      const result = derivePreviewState({
        sceneType: "performance",
        status: "completed",
        lipSyncStatus: "done",
        compositeStatus: "processing",
        compositeVideoUrl: null,
        videoUrl: "https://cdn.example.com/raw.mp4",
      });
      expect(result.previewState).toBe("compositing");
    });

    it("returns pending when scene is queued but not yet dispatched", () => {
      const result = derivePreviewState({
        sceneType: "performance",
        status: "pending",
        lipSyncStatus: null,
        compositeStatus: null,
        compositeVideoUrl: null,
        videoUrl: null,
      });
      expect(result.previewState).toBe("pending");
      expect(result.previewUrl).toBeNull();
    });

    it("returns waiting when scene is generating Seedance clip", () => {
      const result = derivePreviewState({
        sceneType: "performance",
        status: "generating",
        lipSyncStatus: null,
        compositeStatus: null,
        compositeVideoUrl: null,
        videoUrl: null,
      });
      expect(result.previewState).toBe("waiting");
    });

    it("never returns ready without a compositeVideoUrl", () => {
      const result = derivePreviewState({
        sceneType: "performance",
        status: "completed",
        lipSyncStatus: "done",
        compositeStatus: "done",
        compositeVideoUrl: null, // missing URL
        videoUrl: "https://cdn.example.com/raw.mp4",
      });
      expect(result.previewState).not.toBe("ready");
      expect(result.previewUrl).toBeNull();
    });
  });

  // Cinematic scenes
  describe("cinematic scenes", () => {
    it("returns ready when status=completed and videoUrl is set", () => {
      const result = derivePreviewState({
        sceneType: "cinematic",
        status: "completed",
        lipSyncStatus: null,
        compositeStatus: "skipped",
        compositeVideoUrl: null,
        videoUrl: "https://cdn.example.com/cinematic.mp4",
      });
      expect(result.previewState).toBe("ready");
      expect(result.previewUrl).toBe("https://cdn.example.com/cinematic.mp4");
    });

    it("returns pending when status=pending", () => {
      const result = derivePreviewState({
        sceneType: "cinematic",
        status: "pending",
        lipSyncStatus: null,
        compositeStatus: null,
        compositeVideoUrl: null,
        videoUrl: null,
      });
      expect(result.previewState).toBe("pending");
    });

    it("returns waiting when status=generating", () => {
      const result = derivePreviewState({
        sceneType: "cinematic",
        status: "generating",
        lipSyncStatus: null,
        compositeStatus: null,
        compositeVideoUrl: null,
        videoUrl: null,
      });
      expect(result.previewState).toBe("waiting");
    });

    it("does not use compositeVideoUrl for cinematic scenes", () => {
      const result = derivePreviewState({
        sceneType: "cinematic",
        status: "completed",
        lipSyncStatus: null,
        compositeStatus: "done",
        compositeVideoUrl: "https://cdn.example.com/composite.mp4",
        videoUrl: "https://cdn.example.com/cinematic.mp4",
      });
      expect(result.previewUrl).toBe("https://cdn.example.com/cinematic.mp4");
    });
  });

  // Edge cases
  describe("edge cases", () => {
    it("handles null sceneType as cinematic", () => {
      const result = derivePreviewState({
        sceneType: null,
        status: "completed",
        lipSyncStatus: null,
        compositeStatus: null,
        compositeVideoUrl: null,
        videoUrl: "https://cdn.example.com/video.mp4",
      });
      expect(result.previewState).toBe("ready");
      expect(result.previewUrl).toBe("https://cdn.example.com/video.mp4");
    });

    it("returns waiting for unknown status on performance scene", () => {
      const result = derivePreviewState({
        sceneType: "performance",
        status: "unknown_state",
        lipSyncStatus: null,
        compositeStatus: null,
        compositeVideoUrl: null,
        videoUrl: null,
      });
      expect(result.previewState).toBe("waiting");
    });
  });
});
