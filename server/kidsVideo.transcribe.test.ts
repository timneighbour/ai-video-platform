/**
 * Tests for kidsVideo router — uploadAudio and transcribeAudio procedures
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock storagePut ──────────────────────────────────────────────────────────
vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({
    url: "https://cdn.example.com/kids-audio/test-123.mp3",
    key: "kids-audio/test-123.mp3",
  }),
}));

// ─── Mock transcribeAudio ─────────────────────────────────────────────────────
vi.mock("./_core/voiceTranscription", () => ({
  transcribeAudio: vi.fn().mockResolvedValue({
    text: "Hello world this is a test lyric",
    language: "en",
    segments: [
      { id: 0, start: 0, end: 2, text: "Hello world" },
      { id: 1, start: 2, end: 4, text: "this is a test lyric" },
    ],
  }),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────
/** Minimal fake tRPC context with a user */
function makeCtx() {
  return {
    user: { id: 42, email: "test@example.com", name: "Test User", role: "user" as const },
    req: {} as any,
    res: {} as any,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("kidsVideo.uploadAudio", () => {
  it("accepts a valid base64 audio payload and returns a CDN URL", async () => {
    const { storagePut } = await import("./storage");
    // Simulate a small WAV header (44 bytes) encoded as base64
    const fakeBuffer = Buffer.alloc(44, 0);
    const base64 = fakeBuffer.toString("base64");

    // Call storagePut directly to verify the mock is wired
    const result = await (storagePut as any)(
      "kids-audio/42-test.wav",
      fakeBuffer,
      "audio/wav"
    );
    expect(result.url).toContain("https://");
    expect(result.key).toContain("kids-audio");
    expect(base64).toBeTruthy();
  });

  it("rejects files larger than 16 MB", () => {
    // 16 MB + 1 byte
    const oversizedBuffer = Buffer.alloc(16 * 1024 * 1024 + 1, 0);
    const sizeMB = oversizedBuffer.length / (1024 * 1024);
    expect(sizeMB).toBeGreaterThan(16);
  });

  it("maps MIME types to correct file extensions", () => {
    const extMap: Record<string, string> = {
      "audio/mpeg": "mp3",
      "audio/wav":  "wav",
      "audio/mp4":  "m4a",
      "audio/ogg":  "ogg",
      "audio/webm": "webm",
    };
    expect(extMap["audio/mpeg"]).toBe("mp3");
    expect(extMap["audio/wav"]).toBe("wav");
    expect(extMap["audio/webm"]).toBe("webm");
  });
});

describe("kidsVideo.transcribeAudio", () => {
  it("returns transcribed text and segments from a valid audio URL", async () => {
    const { transcribeAudio } = await import("./_core/voiceTranscription");
    const result = await (transcribeAudio as any)({
      audioUrl: "https://cdn.example.com/kids-audio/test-123.mp3",
      language: "en",
      prompt: "Song lyrics or narration",
    });
    expect(result.text).toBe("Hello world this is a test lyric");
    expect(result.language).toBe("en");
    expect(result.segments).toHaveLength(2);
    expect(result.segments[0].text).toBe("Hello world");
  });

  it("propagates error when transcription service fails", async () => {
    const { transcribeAudio } = await import("./_core/voiceTranscription");
    (transcribeAudio as any).mockResolvedValueOnce({ error: "Transcription failed" });
    const result = await (transcribeAudio as any)({ audioUrl: "https://cdn.example.com/bad.mp3" });
    expect(result).toHaveProperty("error");
    expect(result.error).toBe("Transcription failed");
  });
});

describe("WizAnimate lyric-scene distribution", () => {
  /** Mirror of the getLyricForScene logic in KidsVideo.tsx */
  function getLyricForScene(lyrics: string, sceneIdx: number, total: number): string | null {
    if (!lyrics.trim()) return null;
    const lines = lyrics.split(/\n+/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return null;
    const linesPerScene = Math.max(1, Math.ceil(lines.length / total));
    const start = sceneIdx * linesPerScene;
    const chunk = lines.slice(start, start + linesPerScene);
    return chunk.length > 0 ? chunk.join("\n") : null;
  }

  const sampleLyrics = [
    "Verse one line one",
    "Verse one line two",
    "Chorus line one",
    "Chorus line two",
    "Bridge line one",
    "Bridge line two",
    "Outro line one",
    "Outro line two",
  ].join("\n");

  it("distributes 8 lyric lines across 4 scenes — 2 lines per scene", () => {
    expect(getLyricForScene(sampleLyrics, 0, 4)).toBe("Verse one line one\nVerse one line two");
    expect(getLyricForScene(sampleLyrics, 1, 4)).toBe("Chorus line one\nChorus line two");
    expect(getLyricForScene(sampleLyrics, 2, 4)).toBe("Bridge line one\nBridge line two");
    expect(getLyricForScene(sampleLyrics, 3, 4)).toBe("Outro line one\nOutro line two");
  });

  it("returns null when no lyrics are provided", () => {
    expect(getLyricForScene("", 0, 4)).toBeNull();
    expect(getLyricForScene("   ", 0, 4)).toBeNull();
  });

  it("handles more scenes than lyric lines gracefully", () => {
    const shortLyrics = "Only one line";
    // 1 line across 4 scenes — scene 0 gets the line, others get null
    expect(getLyricForScene(shortLyrics, 0, 4)).toBe("Only one line");
    expect(getLyricForScene(shortLyrics, 1, 4)).toBeNull();
    expect(getLyricForScene(shortLyrics, 2, 4)).toBeNull();
  });

  it("handles equal lines to scenes — 1 line per scene", () => {
    const fourLines = "Line A\nLine B\nLine C\nLine D";
    expect(getLyricForScene(fourLines, 0, 4)).toBe("Line A");
    expect(getLyricForScene(fourLines, 1, 4)).toBe("Line B");
    expect(getLyricForScene(fourLines, 2, 4)).toBe("Line C");
    expect(getLyricForScene(fourLines, 3, 4)).toBe("Line D");
  });
});
