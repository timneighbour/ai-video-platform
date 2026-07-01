/**
 * performanceStyle.test.ts
 * Unit tests for chord key detection additions and musician performance style.
 */

import { describe, it, expect } from "vitest";
import { normaliseBpm } from "./instrument-analysis";
import type { InstrumentAnalysis } from "./instrument-analysis";

// ─── 1. InstrumentAnalysis interface — mode & chordMood fields ────────────────

describe("InstrumentAnalysis — chord key detection fields", () => {
  it("accepts a valid analysis object with mode and chordMood", () => {
    const analysis: InstrumentAnalysis = {
      instruments: [
        { instrument: "lead_vocals", label: "Lead Vocalist", prominence: "lead", isVocal: true, performanceNotes: "expressive", audioTrackId: "vocals_lead" },
        { instrument: "piano", label: "Pianist", prominence: "supporting", isVocal: false, performanceNotes: "sparse chords", audioTrackId: "piano" },
      ],
      tempo: 72,
      timeSignature: "4/4",
      musicalKey: "E minor",
      mode: "minor",
      chordMood: "melancholic",
      energyLevel: "low",
      analysedAt: new Date().toISOString(),
    };
    expect(analysis.musicalKey).toBe("E minor");
    expect(analysis.mode).toBe("minor");
    expect(analysis.chordMood).toBe("melancholic");
  });

  it("accepts an analysis object without optional mode and chordMood (backward compat)", () => {
    const analysis: InstrumentAnalysis = {
      instruments: [],
      tempo: 120,
      timeSignature: "4/4",
      musicalKey: "Unknown",
      energyLevel: "medium",
      analysedAt: new Date().toISOString(),
    };
    expect(analysis.mode).toBeUndefined();
    expect(analysis.chordMood).toBeUndefined();
  });

  it("supports all expected chordMood values", () => {
    const validMoods = ["melancholic", "uplifting", "tense", "romantic", "triumphant", "dark", "neutral"];
    for (const mood of validMoods) {
      const analysis: InstrumentAnalysis = {
        instruments: [],
        tempo: 100,
        timeSignature: "4/4",
        musicalKey: "C major",
        mode: "major",
        chordMood: mood,
        energyLevel: "medium",
        analysedAt: new Date().toISOString(),
      };
      expect(analysis.chordMood).toBe(mood);
    }
  });
});

// ─── 2. normaliseBpm ──────────────────────────────────────────────────────────

describe("normaliseBpm", () => {
  it("halves double-time BPM for non-dance genres", () => {
    expect(normaliseBpm(152, "orchestral")).toBe(76);
    expect(normaliseBpm(160, "ballad")).toBe(80);
  });

  it("preserves BPM for dance genres", () => {
    expect(normaliseBpm(128, "edm")).toBe(128);
    expect(normaliseBpm(140, "house")).toBe(140);
  });

  it("returns 0 for invalid input", () => {
    expect(normaliseBpm(0, null)).toBe(0);
  });
});

// ─── 3. KEY & MOOD block builder ──────────────────────────────────────────────

describe("KEY & MOOD block builder", () => {
  function buildKeyMoodBlock(ia: Partial<InstrumentAnalysis>): string {
    const key = ia.musicalKey && ia.musicalKey !== "Unknown" ? ia.musicalKey : null;
    const mode = ia.mode && ia.mode !== "unknown" ? ia.mode : null;
    const chordMood = ia.chordMood && ia.chordMood !== "neutral" ? ia.chordMood : null;
    const parts: string[] = [];
    if (key) parts.push(`Musical key: ${key}${mode ? ` (${mode})` : ""}`);
    if (chordMood) parts.push(`Chord mood: ${chordMood}. Let this emotional quality inform the visual atmosphere, lighting, and character expression.`);
    return parts.length > 0 ? `KEY & MOOD:\n${parts.join("\n")}` : "";
  }

  it("builds a full KEY & MOOD block with key, mode, and chordMood", () => {
    const block = buildKeyMoodBlock({ musicalKey: "E minor", mode: "minor", chordMood: "melancholic" });
    expect(block).toContain("Musical key: E minor (minor)");
    expect(block).toContain("Chord mood: melancholic");
    expect(block).toContain("visual atmosphere");
  });

  it("omits mode when not present", () => {
    const block = buildKeyMoodBlock({ musicalKey: "C major" });
    expect(block).toContain("Musical key: C major");
    expect(block).not.toContain("(");
  });

  it("returns empty string when musicalKey is Unknown and chordMood is neutral", () => {
    const block = buildKeyMoodBlock({ musicalKey: "Unknown", chordMood: "neutral" });
    expect(block).toBe("");
  });

  it("includes chordMood even when key is Unknown", () => {
    const block = buildKeyMoodBlock({ musicalKey: "Unknown", chordMood: "uplifting" });
    expect(block).toContain("uplifting");
  });
});

// ─── 4. Performance Style prompt injection ────────────────────────────────────

describe("Performance Style prompt injection", () => {
  function buildPerformanceStyleBlock(performanceStyle: string | null | undefined): string {
    return performanceStyle
      ? `MUSICIAN PERFORMANCE STYLE (MANDATORY): ${performanceStyle}`
      : "";
  }

  it("builds a performance style block when style is provided", () => {
    const block = buildPerformanceStyleBlock("Pianist seated at a grand piano, playing with a light, delicate touch.");
    expect(block).toContain("MUSICIAN PERFORMANCE STYLE (MANDATORY)");
    expect(block).toContain("Pianist seated");
  });

  it("returns empty string when performanceStyle is null", () => {
    expect(buildPerformanceStyleBlock(null)).toBe("");
  });

  it("returns empty string when performanceStyle is undefined", () => {
    expect(buildPerformanceStyleBlock(undefined)).toBe("");
  });

  it("returns empty string when performanceStyle is empty string", () => {
    expect(buildPerformanceStyleBlock("")).toBe("");
  });

  it("injects style into scene prompt augmentation pattern", () => {
    const scenePrompt = "Slow push-in on Zara singing inside Lyndhurst Hall.";
    const style = "Cellist bowing slowly with eyes closed.";
    const augmented = style
      ? `${scenePrompt}\n\nMUSICIAN PERFORMANCE STYLE (MANDATORY): ${style}`
      : scenePrompt;
    expect(augmented).toContain(scenePrompt);
    expect(augmented).toContain("MUSICIAN PERFORMANCE STYLE");
    expect(augmented).toContain("Cellist bowing");
  });
});
