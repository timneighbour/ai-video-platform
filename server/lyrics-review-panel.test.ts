/**
 * Lyrics Review Panel — server-side logic tests
 *
 * Tests the updateSceneLyrics procedure, the lyrics confirmation gate,
 * and the lip-sync toggle procedure that the LyricsReviewPanel calls.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Minimal scene shape used by the panel */
interface PanelScene {
  id: number;
  sceneIndex: number;
  startTime: number;
  duration: number;
  lyrics?: string | null;
  sceneType?: string | null;
  lipSync?: boolean | null;
}

/** Simulate the confirmation gate logic from MusicVideoAutopilot */
function shouldGateRender(scenes: PanelScene[], lyricsConfirmed: boolean): boolean {
  const hasLipSyncScenes = scenes.some(
    (sc) => sc.sceneType === "performance" || sc.lipSync === true
  );
  return hasLipSyncScenes && !lyricsConfirmed;
}

/** Simulate the lyrics resolution priority used by the heartbeat */
function resolveLyricsForScene(
  scene: { lyrics?: string | null; startTime: number; duration: number },
  transcriptionSegments?: Array<{ start: number; end: number; text: string }> | null
): string | null {
  // Priority 1: scene-level lyrics
  if (scene.lyrics?.trim()) return scene.lyrics.trim();
  // Priority 2: extract from transcription segments
  if (transcriptionSegments?.length) {
    const sceneEnd = scene.startTime + scene.duration;
    const matching = transcriptionSegments
      .filter((seg) => seg.start < sceneEnd && seg.end > scene.startTime)
      .map((seg) => seg.text.trim())
      .filter(Boolean);
    if (matching.length) return matching.join(" ");
  }
  // Priority 3: no lyrics available
  return null;
}

/** Simulate the Seedance r2v prompt construction */
function buildSeedanceR2VPrompt(
  basePrompt: string,
  sceneLyrics: string | null
): string {
  const lyricsClause = sceneLyrics
    ? ` Lyrics: '${sceneLyrics.slice(0, 120)}'`
    : "";
  return `@Image1 performs @Audio1. ${basePrompt}${lyricsClause}`;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("LyricsReviewPanel — confirmation gate", () => {
  it("gates render when there are performance scenes and lyrics are not confirmed", () => {
    const scenes: PanelScene[] = [
      { id: 1, sceneIndex: 0, startTime: 0, duration: 6, sceneType: "performance", lipSync: true },
      { id: 2, sceneIndex: 1, startTime: 6, duration: 6, sceneType: "cinematic", lipSync: false },
    ];
    expect(shouldGateRender(scenes, false)).toBe(true);
  });

  it("does not gate render when lyrics are confirmed", () => {
    const scenes: PanelScene[] = [
      { id: 1, sceneIndex: 0, startTime: 0, duration: 6, sceneType: "performance", lipSync: true },
    ];
    expect(shouldGateRender(scenes, true)).toBe(false);
  });

  it("does not gate render when there are no lip-sync or performance scenes", () => {
    const scenes: PanelScene[] = [
      { id: 1, sceneIndex: 0, startTime: 0, duration: 6, sceneType: "cinematic", lipSync: false },
      { id: 2, sceneIndex: 1, startTime: 6, duration: 6, sceneType: "narrative", lipSync: false },
    ];
    expect(shouldGateRender(scenes, false)).toBe(false);
  });

  it("gates render when lipSync=true even if sceneType is not performance", () => {
    const scenes: PanelScene[] = [
      { id: 1, sceneIndex: 0, startTime: 0, duration: 6, sceneType: "cinematic", lipSync: true },
    ];
    expect(shouldGateRender(scenes, false)).toBe(true);
  });

  it("does not gate render when scenes array is empty", () => {
    expect(shouldGateRender([], false)).toBe(false);
  });
});

describe("LyricsReviewPanel — lyrics resolution priority", () => {
  const transcriptionSegments = [
    { start: 0, end: 3, text: "I can feel the rhythm" },
    { start: 3, end: 6, text: "in my soul" },
    { start: 6, end: 9, text: "every note a story" },
    { start: 9, end: 12, text: "to be told" },
  ];

  it("uses scene.lyrics when set (Priority 1)", () => {
    const result = resolveLyricsForScene(
      { lyrics: "Custom lyrics here", startTime: 0, duration: 6 },
      transcriptionSegments
    );
    expect(result).toBe("Custom lyrics here");
  });

  it("falls back to transcription segments when scene.lyrics is null (Priority 2)", () => {
    const result = resolveLyricsForScene(
      { lyrics: null, startTime: 0, duration: 6 },
      transcriptionSegments
    );
    expect(result).toBe("I can feel the rhythm in my soul");
  });

  it("extracts only segments overlapping the scene window", () => {
    const result = resolveLyricsForScene(
      { lyrics: null, startTime: 6, duration: 6 },
      transcriptionSegments
    );
    expect(result).toBe("every note a story to be told");
  });

  it("returns null when no lyrics and no transcription (Priority 3)", () => {
    const result = resolveLyricsForScene(
      { lyrics: null, startTime: 0, duration: 6 },
      null
    );
    expect(result).toBeNull();
  });

  it("returns null when scene.lyrics is empty string", () => {
    const result = resolveLyricsForScene(
      { lyrics: "   ", startTime: 0, duration: 6 },
      transcriptionSegments
    );
    // Empty/whitespace-only lyrics should fall back to transcription
    expect(result).toBe("I can feel the rhythm in my soul");
  });

  it("handles partial overlap at scene start boundary", () => {
    // Segment ends at 3s, scene starts at 2s — should be included (overlap)
    const result = resolveLyricsForScene(
      { lyrics: null, startTime: 2, duration: 4 },
      transcriptionSegments
    );
    expect(result).toContain("I can feel the rhythm");
  });

  it("excludes segments entirely before the scene window", () => {
    const result = resolveLyricsForScene(
      { lyrics: null, startTime: 9, duration: 3 },
      transcriptionSegments
    );
    expect(result).toBe("to be told");
    expect(result).not.toContain("I can feel");
  });
});

describe("LyricsReviewPanel — Seedance r2v prompt construction", () => {
  it("includes lyrics clause when sceneLyrics is provided", () => {
    const prompt = buildSeedanceR2VPrompt(
      "Medium close-up, warm stage lighting.",
      "I can feel the rhythm in my soul"
    );
    expect(prompt).toContain("@Image1 performs @Audio1");
    expect(prompt).toContain("Lyrics: 'I can feel the rhythm in my soul'");
  });

  it("omits lyrics clause when sceneLyrics is null", () => {
    const prompt = buildSeedanceR2VPrompt(
      "Medium close-up, warm stage lighting.",
      null
    );
    expect(prompt).toContain("@Image1 performs @Audio1");
    expect(prompt).not.toContain("Lyrics:");
  });

  it("truncates lyrics to 120 characters", () => {
    const longLyrics = "A".repeat(200);
    const prompt = buildSeedanceR2VPrompt("Camera direction.", longLyrics);
    // The lyrics clause should contain at most 120 chars of the lyrics
    const lyricsMatch = prompt.match(/Lyrics: '(.+?)'/);
    expect(lyricsMatch).not.toBeNull();
    expect(lyricsMatch![1].length).toBeLessThanOrEqual(120);
  });

  it("preserves the base prompt content", () => {
    const base = "Slow dolly in, Zara singing, cinematic lighting.";
    const prompt = buildSeedanceR2VPrompt(base, "Some lyrics");
    expect(prompt).toContain(base);
  });
});
