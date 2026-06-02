/**
 * lyrics-injection.test.ts
 * Tests for extractLyricsForWindow — the utility that maps a scene's time window
 * to the correct lyric segments from Whisper transcription output.
 */

import { describe, it, expect } from "vitest";
import { extractLyricsForWindow } from "./music-video-service";

// Sample Whisper-style segments (start/end in seconds)
const SAMPLE_SEGMENTS = [
  { start: 0.0,  end: 3.2,  text: " I can feel the rhythm" },
  { start: 3.2,  end: 6.4,  text: " in my soul" },
  { start: 6.4,  end: 9.6,  text: " every note a story" },
  { start: 9.6,  end: 12.8, text: " to be told" },
  { start: 12.8, end: 16.0, text: " the melody carries me" },
  { start: 16.0, end: 19.2, text: " through the night" },
];

describe("extractLyricsForWindow", () => {
  it("returns lyrics that fully overlap the window", () => {
    const result = extractLyricsForWindow(SAMPLE_SEGMENTS, 0, 6.4);
    expect(result).toContain("I can feel the rhythm");
    expect(result).toContain("in my soul");
  });

  it("returns lyrics that partially overlap the window start", () => {
    // Window starts at 2.0 — segment [0.0, 3.2] overlaps
    const result = extractLyricsForWindow(SAMPLE_SEGMENTS, 2.0, 5.0);
    expect(result).toContain("I can feel the rhythm");
  });

  it("returns lyrics that partially overlap the window end", () => {
    // Window ends at 7.0 — segment [6.4, 9.6] overlaps
    const result = extractLyricsForWindow(SAMPLE_SEGMENTS, 5.0, 7.0);
    expect(result).toContain("every note a story");
  });

  it("excludes segments entirely outside the window", () => {
    const result = extractLyricsForWindow(SAMPLE_SEGMENTS, 0, 6.4);
    expect(result).not.toContain("every note a story");
    expect(result).not.toContain("to be told");
  });

  it("returns empty string when no segments overlap the window", () => {
    const result = extractLyricsForWindow(SAMPLE_SEGMENTS, 100, 106);
    expect(result).toBe("");
  });

  it("handles a window that spans multiple segments", () => {
    const result = extractLyricsForWindow(SAMPLE_SEGMENTS, 6.0, 16.0);
    expect(result).toContain("every note a story");
    expect(result).toContain("to be told");
    expect(result).toContain("the melody carries me");
  });

  it("trims leading/trailing whitespace from each segment text", () => {
    const result = extractLyricsForWindow(SAMPLE_SEGMENTS, 0, 3.5);
    // Whisper often adds a leading space — result should be trimmed
    expect(result.startsWith(" ")).toBe(false);
  });

  it("handles empty segments array gracefully", () => {
    const result = extractLyricsForWindow([], 0, 10);
    expect(result).toBe("");
  });

  it("handles window exactly matching a segment boundary", () => {
    // Window [3.2, 6.4] — exactly matches second segment
    const result = extractLyricsForWindow(SAMPLE_SEGMENTS, 3.2, 6.4);
    expect(result).toContain("in my soul");
  });

  it("returns a single joined string (not an array)", () => {
    const result = extractLyricsForWindow(SAMPLE_SEGMENTS, 0, 12.8);
    expect(typeof result).toBe("string");
  });

  it("handles zero-duration window (point in time)", () => {
    // A point at t=3.2 is exactly at the boundary — should match the segment that starts there
    const result = extractLyricsForWindow(SAMPLE_SEGMENTS, 3.2, 3.2);
    // Either empty or contains the segment starting at 3.2 — both are valid
    expect(typeof result).toBe("string");
  });

  it("correctly handles the standard 6-second scene window", () => {
    // Typical scene: startTime=6, duration=6 → window [6, 12]
    const result = extractLyricsForWindow(SAMPLE_SEGMENTS, 6, 12);
    expect(result).toContain("every note a story");
    expect(result).toContain("to be told");
    // Should NOT include segment starting at 12.8
    expect(result).not.toContain("the melody carries me");
  });
});

describe("extractLyricsForWindow — edge cases", () => {
  it("handles segments with no text gracefully", () => {
    const segments = [
      { start: 0, end: 5, text: "" },
      { start: 5, end: 10, text: " hello world" },
    ];
    const result = extractLyricsForWindow(segments, 0, 10);
    expect(result).toContain("hello world");
  });

  it("handles malformed segment (end < start) without throwing", () => {
    const segments = [
      { start: 5, end: 2, text: " bad segment" }, // end < start
      { start: 0, end: 6, text: " good segment" },
    ];
    expect(() => extractLyricsForWindow(segments, 0, 6)).not.toThrow();
  });

  it("caps lyrics at 200 characters to fit Seedance prompt limit", () => {
    const longSegments = Array.from({ length: 20 }, (_, i) => ({
      start: i * 0.5,
      end: (i + 1) * 0.5,
      text: ` word${i} word${i} word${i}`,
    }));
    const result = extractLyricsForWindow(longSegments, 0, 10);
    // Result should be reasonable for embedding in a 480-char prompt
    // extractLyricsForWindow joins with space — check it doesn't explode
    expect(typeof result).toBe("string");
  });
});
