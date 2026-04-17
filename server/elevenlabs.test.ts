/**
 * Tests for ElevenLabs integration and provider routing logic
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Provider routing logic (extracted for unit testing) ───────────────────────

type GenerationMode = "score" | "song" | "suno";
type Provider = "suno" | "elevenlabs_sfx" | "elevenlabs_music";

function resolveProvider(mode: GenerationMode, durationSeconds?: number): Provider {
  if (mode === "suno") return "suno";
  if (mode === "song") return "elevenlabs_music";
  // mode === "score"
  if (durationSeconds && durationSeconds <= 30) return "elevenlabs_sfx";
  return "elevenlabs_music";
}

describe("resolveProvider", () => {
  it("returns suno for suno mode regardless of duration", () => {
    expect(resolveProvider("suno")).toBe("suno");
    expect(resolveProvider("suno", 8)).toBe("suno");
    expect(resolveProvider("suno", 300)).toBe("suno");
  });

  it("returns elevenlabs_music for song mode regardless of duration", () => {
    expect(resolveProvider("song")).toBe("elevenlabs_music");
    expect(resolveProvider("song", 10)).toBe("elevenlabs_music");
    expect(resolveProvider("song", 300)).toBe("elevenlabs_music");
  });

  it("returns elevenlabs_sfx for score mode with duration ≤30s", () => {
    expect(resolveProvider("score", 5)).toBe("elevenlabs_sfx");
    expect(resolveProvider("score", 15)).toBe("elevenlabs_sfx");
    expect(resolveProvider("score", 30)).toBe("elevenlabs_sfx");
  });

  it("returns elevenlabs_music for score mode with duration >30s", () => {
    expect(resolveProvider("score", 31)).toBe("elevenlabs_music");
    expect(resolveProvider("score", 60)).toBe("elevenlabs_music");
    expect(resolveProvider("score", 300)).toBe("elevenlabs_music");
  });

  it("returns elevenlabs_music for score mode with no duration", () => {
    expect(resolveProvider("score")).toBe("elevenlabs_music");
    expect(resolveProvider("score", undefined)).toBe("elevenlabs_music");
  });
});

// ── ElevenLabs prompt builder ─────────────────────────────────────────────────

function buildElevenLabsMusicPrompt(
  prompt: string,
  options: {
    style?: string;
    vocal?: string;
    mood?: string;
    targetDuration?: number;
    generationMode: "score" | "song";
  }
): string {
  const parts: string[] = [];

  if (options.targetDuration) {
    const mins = Math.floor(options.targetDuration / 60);
    const secs = options.targetDuration % 60;
    const durationStr = mins > 0
      ? `${mins} minute${mins > 1 ? "s" : ""}${secs > 0 ? ` ${secs} seconds` : ""}`
      : `${secs} seconds`;
    parts.push(`[${durationStr} track]`);
  }

  if (options.generationMode === "score") {
    parts.push("[instrumental, no vocals, background score]");
  }

  if (options.style) parts.push(`[${options.style}]`);
  if (options.mood) parts.push(`[${options.mood} mood]`);

  parts.push(prompt);

  return parts.join(" ").trim();
}

describe("buildElevenLabsMusicPrompt", () => {
  it("includes duration tag when targetDuration is set", () => {
    const result = buildElevenLabsMusicPrompt("cinematic score", {
      targetDuration: 30,
      generationMode: "score",
    });
    expect(result).toContain("[30 seconds track]");
  });

  it("formats minutes correctly", () => {
    const result = buildElevenLabsMusicPrompt("epic theme", {
      targetDuration: 150,
      generationMode: "song",
    });
    expect(result).toContain("[2 minutes 30 seconds track]");
  });

  it("formats whole minutes without seconds", () => {
    const result = buildElevenLabsMusicPrompt("ambient track", {
      targetDuration: 120,
      generationMode: "score",
    });
    expect(result).toContain("[2 minutes track]");
  });

  it("adds instrumental tag for score mode", () => {
    const result = buildElevenLabsMusicPrompt("background music", {
      generationMode: "score",
    });
    expect(result).toContain("[instrumental, no vocals, background score]");
  });

  it("does not add instrumental tag for song mode", () => {
    const result = buildElevenLabsMusicPrompt("pop song", {
      generationMode: "song",
    });
    expect(result).not.toContain("[instrumental");
  });

  it("includes style and mood when provided", () => {
    const result = buildElevenLabsMusicPrompt("jazz track", {
      style: "Jazz, Blues",
      mood: "Chill",
      generationMode: "song",
    });
    expect(result).toContain("[Jazz, Blues]");
    expect(result).toContain("[Chill mood]");
  });

  it("always ends with the original prompt", () => {
    const prompt = "A cinematic orchestral score";
    const result = buildElevenLabsMusicPrompt(prompt, {
      generationMode: "score",
      targetDuration: 60,
    });
    expect(result.endsWith(prompt)).toBe(true);
  });
});

// ── ElevenLabs API wrapper structure ─────────────────────────────────────────

describe("ElevenLabs API wrapper exports", () => {
  it("exports the required functions", async () => {
    const mod = await import("./ai-apis/elevenlabs");
    expect(typeof mod.generateSoundEffect).toBe("function");
    expect(typeof mod.generateMusic).toBe("function");
    expect(typeof mod.chooseElevenLabsProvider).toBe("function");
  });
});
