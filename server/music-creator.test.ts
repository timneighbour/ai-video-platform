/**
 * Music Creator Backend Tests
 * Tests for the WizAudio music generation system:
 * - Provider routing logic (resolveProvider)
 * - Input validation via Zod schemas
 * - ElevenLabs provider selection
 * - Suno API client availability
 */
import { describe, it, expect } from "vitest";
import { z } from "zod";

// ── resolveProvider logic (extracted for unit testing) ─────────────────────
type GenerationMode = "score" | "song" | "suno";
type Provider = "suno" | "elevenlabs_sfx" | "elevenlabs_music";

function resolveProvider(mode: GenerationMode, durationSeconds?: number): Provider {
  if (mode === "suno") return "suno";
  if (mode === "song") return "elevenlabs_music";
  // mode === "score"
  if (durationSeconds && durationSeconds <= 30) return "elevenlabs_sfx";
  return "elevenlabs_music";
}

// ── Input schema (mirrors server/routers/suno.ts) ─────────────────────────
const generateInputSchema = z.object({
  prompt: z.string().min(1).max(400),
  lyrics: z.string().max(3000).optional(),
  style: z.string().max(200).optional(),
  title: z.string().max(80).optional(),
  instrumental: z.boolean().default(false),
  model: z.enum(["V3_5", "V4"]).default("V4"),
  origin: z.string().url().optional(),
  targetDuration: z.number().int().min(5).max(600).optional(),
  generationMode: z.enum(["score", "song", "suno"]).default("suno"),
});

// ── Provider routing tests ─────────────────────────────────────────────────
describe("resolveProvider", () => {
  it("always returns suno for mode=suno regardless of duration", () => {
    expect(resolveProvider("suno")).toBe("suno");
    expect(resolveProvider("suno", 10)).toBe("suno");
    expect(resolveProvider("suno", 300)).toBe("suno");
  });

  it("always returns elevenlabs_music for mode=song", () => {
    expect(resolveProvider("song")).toBe("elevenlabs_music");
    expect(resolveProvider("song", 15)).toBe("elevenlabs_music");
    expect(resolveProvider("song", 600)).toBe("elevenlabs_music");
  });

  it("returns elevenlabs_sfx for mode=score with duration ≤30s", () => {
    expect(resolveProvider("score", 5)).toBe("elevenlabs_sfx");
    expect(resolveProvider("score", 15)).toBe("elevenlabs_sfx");
    expect(resolveProvider("score", 30)).toBe("elevenlabs_sfx");
  });

  it("returns elevenlabs_music for mode=score with duration >30s", () => {
    expect(resolveProvider("score", 31)).toBe("elevenlabs_music");
    expect(resolveProvider("score", 120)).toBe("elevenlabs_music");
    expect(resolveProvider("score", 600)).toBe("elevenlabs_music");
  });

  it("returns elevenlabs_music for mode=score with no duration specified", () => {
    expect(resolveProvider("score")).toBe("elevenlabs_music");
    expect(resolveProvider("score", undefined)).toBe("elevenlabs_music");
  });
});

// ── Input validation tests ─────────────────────────────────────────────────
describe("generateInputSchema validation", () => {
  it("accepts a minimal valid input", () => {
    const result = generateInputSchema.safeParse({ prompt: "A cinematic orchestral piece" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.instrumental).toBe(false);
      expect(result.data.model).toBe("V4");
      expect(result.data.generationMode).toBe("suno");
    }
  });

  it("accepts a fully specified input", () => {
    const result = generateInputSchema.safeParse({
      prompt: "Epic battle theme",
      lyrics: "Rise up, fight on\nNever back down",
      style: "Orchestral, cinematic, dramatic",
      title: "Battle Hymn",
      instrumental: false,
      model: "V3_5",
      targetDuration: 120,
      generationMode: "suno",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty prompt", () => {
    const result = generateInputSchema.safeParse({ prompt: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a prompt exceeding 400 characters", () => {
    const result = generateInputSchema.safeParse({ prompt: "a".repeat(401) });
    expect(result.success).toBe(false);
  });

  it("rejects lyrics exceeding 3000 characters", () => {
    const result = generateInputSchema.safeParse({
      prompt: "Test song",
      lyrics: "x".repeat(3001),
    });
    expect(result.success).toBe(false);
  });

  it("rejects targetDuration below 5 seconds", () => {
    const result = generateInputSchema.safeParse({
      prompt: "Test",
      targetDuration: 4,
    });
    expect(result.success).toBe(false);
  });

  it("rejects targetDuration above 600 seconds", () => {
    const result = generateInputSchema.safeParse({
      prompt: "Test",
      targetDuration: 601,
    });
    expect(result.success).toBe(false);
  });

  it("accepts targetDuration at boundary values (5 and 600)", () => {
    const min = generateInputSchema.safeParse({ prompt: "Test", targetDuration: 5 });
    const max = generateInputSchema.safeParse({ prompt: "Test", targetDuration: 600 });
    expect(min.success).toBe(true);
    expect(max.success).toBe(true);
  });

  it("rejects invalid generationMode", () => {
    const result = generateInputSchema.safeParse({
      prompt: "Test",
      generationMode: "invalid_mode",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid model value", () => {
    const result = generateInputSchema.safeParse({
      prompt: "Test",
      model: "V5",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer targetDuration", () => {
    const result = generateInputSchema.safeParse({
      prompt: "Test",
      targetDuration: 30.5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid URL for origin", () => {
    const result = generateInputSchema.safeParse({
      prompt: "Test",
      origin: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid URL for origin", () => {
    const result = generateInputSchema.safeParse({
      prompt: "Test",
      origin: "https://wiz-ai.io",
    });
    expect(result.success).toBe(true);
  });
});

// ── ElevenLabs provider selection helper tests ─────────────────────────────
describe("chooseElevenLabsProvider helper logic", () => {
  // Mirrors the logic in server/ai-apis/elevenlabs.ts
  function chooseElevenLabsProvider(durationSeconds?: number): "sfx" | "music" {
    if (durationSeconds !== undefined && durationSeconds <= 30) return "sfx";
    return "music";
  }

  it("chooses sfx for durations ≤30s", () => {
    expect(chooseElevenLabsProvider(5)).toBe("sfx");
    expect(chooseElevenLabsProvider(30)).toBe("sfx");
  });

  it("chooses music for durations >30s", () => {
    expect(chooseElevenLabsProvider(31)).toBe("music");
    expect(chooseElevenLabsProvider(300)).toBe("music");
  });

  it("defaults to music when no duration given", () => {
    expect(chooseElevenLabsProvider()).toBe("music");
    expect(chooseElevenLabsProvider(undefined)).toBe("music");
  });
});

// ── Environment variable checks ────────────────────────────────────────────
describe("Music generation environment configuration", () => {
  it("SUNO_API_KEY is configured", () => {
    expect(process.env.SUNO_API_KEY).toBeDefined();
    expect(process.env.SUNO_API_KEY!.length).toBeGreaterThan(0);
  });

  it("ELEVENLABS_API_KEY is configured", () => {
    expect(process.env.ELEVENLABS_API_KEY).toBeDefined();
    expect(process.env.ELEVENLABS_API_KEY!.length).toBeGreaterThan(0);
  });
});

// ── Genre/mood/style preset validation ────────────────────────────────────
describe("Music style input constraints", () => {
  const VALID_GENRES = [
    "Pop", "Hip-Hop", "R&B", "Rock", "Electronic", "Country",
    "Jazz", "Classical", "Folk", "Reggae", "Metal", "Indie",
  ];

  const VALID_MOODS = [
    "Upbeat", "Chill", "Romantic", "Epic", "Sad",
    "Energetic", "Dark", "Happy", "Mysterious", "Motivational",
  ];

  it("all genre presets are non-empty strings", () => {
    for (const genre of VALID_GENRES) {
      expect(typeof genre).toBe("string");
      expect(genre.length).toBeGreaterThan(0);
    }
  });

  it("all mood presets are non-empty strings", () => {
    for (const mood of VALID_MOODS) {
      expect(typeof mood).toBe("string");
      expect(mood.length).toBeGreaterThan(0);
    }
  });

  it("style field accepts comma-separated genre+mood combination", () => {
    const style = VALID_GENRES.slice(0, 3).join(", ") + ", " + VALID_MOODS[0];
    const result = generateInputSchema.safeParse({ prompt: "Test", style });
    expect(result.success).toBe(true);
  });

  it("style field rejects strings over 200 characters", () => {
    const result = generateInputSchema.safeParse({
      prompt: "Test",
      style: "a".repeat(201),
    });
    expect(result.success).toBe(false);
  });
});
