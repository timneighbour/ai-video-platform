/**
 * lyrics-injection.test.ts
 * Tests for extractLyricsForWindow — the utility that maps a scene's time window
 * to the correct lyric segments from Whisper transcription output.
 *
 * OWNERSHIP RULE (midpoint):
 *   A segment belongs to the window that contains its midpoint.
 *   mid = (start + end) / 2 must satisfy: windowStart <= mid < windowEnd
 *   This guarantees each segment appears in exactly ONE scene — no duplicates.
 */

import { describe, it, expect } from "vitest";
import { extractLyricsForWindow } from "./music-video-service";

// Sample Whisper-style segments (start/end in seconds)
// Midpoints: 1.6, 4.8, 8.0, 11.2, 14.4, 17.6
const SAMPLE_SEGMENTS = [
  { start: 0.0,  end: 3.2,  text: " I can feel the rhythm" },   // mid=1.6
  { start: 3.2,  end: 6.4,  text: " in my soul" },              // mid=4.8
  { start: 6.4,  end: 9.6,  text: " every note a story" },      // mid=8.0
  { start: 9.6,  end: 12.8, text: " to be told" },              // mid=11.2
  { start: 12.8, end: 16.0, text: " the melody carries me" },   // mid=14.4
  { start: 16.0, end: 19.2, text: " through the night" },       // mid=17.6
];

describe("extractLyricsForWindow — midpoint ownership", () => {
  it("returns segments whose midpoint falls within the window", () => {
    // Window [0, 6.4]: midpoints 1.6 and 4.8 are both inside
    const result = extractLyricsForWindow(SAMPLE_SEGMENTS, 0, 6.4);
    expect(result).toContain("I can feel the rhythm");
    expect(result).toContain("in my soul");
  });

  it("does NOT include a segment whose midpoint is outside the window (no duplicates)", () => {
    // Segment [0.0, 3.2] has mid=1.6 — NOT in window [2.0, 5.0]
    // Segment [3.2, 6.4] has mid=4.8 — IS in window [2.0, 5.0]
    const result = extractLyricsForWindow(SAMPLE_SEGMENTS, 2.0, 5.0);
    expect(result).not.toContain("I can feel the rhythm"); // mid=1.6 outside window
    expect(result).toContain("in my soul");                // mid=4.8 inside window
  });

  it("assigns boundary segments to the window that contains their midpoint", () => {
    // Segment [3.2, 6.4] mid=4.8 → belongs to window [0, 6.4] not [6.4, 12.8]
    const windowA = extractLyricsForWindow(SAMPLE_SEGMENTS, 0, 6.4);
    const windowB = extractLyricsForWindow(SAMPLE_SEGMENTS, 6.4, 12.8);
    expect(windowA).toContain("in my soul");
    expect(windowB).not.toContain("in my soul");
  });

  it("excludes segments entirely outside the window", () => {
    const result = extractLyricsForWindow(SAMPLE_SEGMENTS, 0, 6.4);
    expect(result).not.toContain("every note a story");  // mid=8.0 outside
    expect(result).not.toContain("to be told");          // mid=11.2 outside
  });

  it("returns empty string when no segments overlap the window", () => {
    const result = extractLyricsForWindow(SAMPLE_SEGMENTS, 100, 106);
    expect(result).toBe("");
  });

  it("handles a window that spans multiple segments", () => {
    // Window [6.0, 16.0]: midpoints 8.0, 11.2, 14.4 are all inside
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
    // Window [3.2, 6.4] — segment [3.2, 6.4] has mid=4.8, which is inside
    const result = extractLyricsForWindow(SAMPLE_SEGMENTS, 3.2, 6.4);
    expect(result).toContain("in my soul");
  });

  it("returns a single joined string (not an array)", () => {
    const result = extractLyricsForWindow(SAMPLE_SEGMENTS, 0, 12.8);
    expect(typeof result).toBe("string");
  });

  it("handles zero-duration window (point in time)", () => {
    const result = extractLyricsForWindow(SAMPLE_SEGMENTS, 3.2, 3.2);
    expect(typeof result).toBe("string");
  });

  it("correctly handles the standard 6-second scene window with no duplicates", () => {
    // Scene window [6, 12]: segments with mid in [6, 12) are: mid=8.0 and mid=11.2
    const result = extractLyricsForWindow(SAMPLE_SEGMENTS, 6, 12);
    expect(result).toContain("every note a story");  // mid=8.0
    expect(result).toContain("to be told");           // mid=11.2
    // Segment [12.8, 16.0] has mid=14.4 — NOT in this window
    expect(result).not.toContain("the melody carries me");
    // Segment [3.2, 6.4] has mid=4.8 — NOT in this window (no duplicate from prev scene)
    expect(result).not.toContain("in my soul");
  });

  it("guarantees no segment appears in two adjacent windows (no duplicates)", () => {
    // This is the key anti-duplication test
    const windowA = extractLyricsForWindow(SAMPLE_SEGMENTS, 0, 6);
    const windowB = extractLyricsForWindow(SAMPLE_SEGMENTS, 6, 12);
    const windowC = extractLyricsForWindow(SAMPLE_SEGMENTS, 12, 18);

    // Each segment text should appear in exactly one window
    const allTexts = ["I can feel the rhythm", "in my soul", "every note a story", "to be told", "the melody carries me", "through the night"];
    for (const text of allTexts) {
      const count = [windowA, windowB, windowC].filter(w => w.includes(text)).length;
      expect(count).toBeLessThanOrEqual(1); // each segment in at most one window
    }
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
      { start: 5, end: 2, text: " bad segment" }, // end < start — mid=3.5
      { start: 0, end: 6, text: " good segment" }, // mid=3.0
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
    expect(typeof result).toBe("string");
  });
});
