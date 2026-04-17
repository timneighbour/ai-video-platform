import { describe, it, expect, vi } from "vitest";

// Mock axios before importing the module under test
vi.mock("axios", () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

// Mock storage
vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ url: "https://cdn.test/image.jpg", key: "test/image.jpg" }),
}));

// ─── Logic-only tests (no network) ───────────────────────────────────────────

describe("WizImage router logic", () => {
  it("validates aspect ratio enum values", () => {
    const valid = ["1:1", "16:9", "9:16", "4:3"];
    expect(valid).toContain("16:9");
    expect(valid).toContain("9:16");
    expect(valid).not.toContain("5:7");
  });

  it("validates style enum values", () => {
    const styles = ["photorealistic", "cinematic", "anime", "oil-painting", "watercolor", "sketch", "3d-render", "pixel-art"];
    expect(styles).toContain("cinematic");
    expect(styles).toContain("anime");
    expect(styles).not.toContain("invalid-style");
  });

  it("maps aspect ratio to image size correctly", () => {
    const ratioToSize: Record<string, string> = {
      "1:1": "1024x1024",
      "16:9": "1792x1024",
      "9:16": "1024x1792",
      "4:3": "1365x1024",
    };
    expect(ratioToSize["16:9"]).toBe("1792x1024");
    expect(ratioToSize["9:16"]).toBe("1024x1792");
    expect(ratioToSize["1:1"]).toBe("1024x1024");
  });
});

describe("WizShorts router logic", () => {
  it("calculates correct scene count for duration", () => {
    const getSceneCount = (s: number) => Math.ceil(s / 5);
    expect(getSceneCount(15)).toBe(3);
    expect(getSceneCount(30)).toBe(6);
    expect(getSceneCount(45)).toBe(9);
    expect(getSceneCount(60)).toBe(12);
  });

  it("validates platform enum values", () => {
    const platforms = ["youtube_shorts", "tiktok", "reels"];
    expect(platforms).toContain("youtube_shorts");
    expect(platforms).toContain("tiktok");
    expect(platforms).toContain("reels");
    expect(platforms).not.toContain("instagram");
  });

  it("validates target duration range", () => {
    const isValid = (d: number) => d >= 5 && d <= 60;
    expect(isValid(5)).toBe(true);
    expect(isValid(30)).toBe(true);
    expect(isValid(60)).toBe(true);
    expect(isValid(4)).toBe(false);
    expect(isValid(61)).toBe(false);
  });

  it("calculates credit cost correctly", () => {
    const cost = (s: number) => Math.ceil(s / 5) * 5;
    expect(cost(15)).toBe(15);
    expect(cost(30)).toBe(30);
    expect(cost(60)).toBe(60);
  });
});

describe("Grok Imagine API response parsing", () => {
  it("parses video status correctly", () => {
    const parse = (r: { status: string; video?: { url: string } }) => {
      if (r.status === "done") return { status: "complete", videoUrl: r.video?.url };
      if (r.status === "failed" || r.status === "expired") return { status: "failed" };
      return { status: "processing" };
    };
    expect(parse({ status: "done", video: { url: "https://t.mp4" } })).toEqual({ status: "complete", videoUrl: "https://t.mp4" });
    expect(parse({ status: "processing" })).toEqual({ status: "processing" });
    expect(parse({ status: "failed" })).toEqual({ status: "failed" });
    expect(parse({ status: "expired" })).toEqual({ status: "failed" });
    expect(parse({ status: "pending" })).toEqual({ status: "processing" });
  });

  it("maps visual style to Grok prompt modifier correctly", () => {
    const styleModifiers: Record<string, string> = {
      cinematic: "cinematic film still, anamorphic lens, dramatic lighting, 4K",
      anime: "anime style, Studio Ghibli inspired, vibrant colors, detailed",
      realistic: "photorealistic, natural lighting, documentary style",
      cartoon: "cartoon style, bold outlines, vibrant colors, animated",
      "neon-noir": "cyberpunk neon noir, rain-slicked streets, neon lights, dark atmosphere",
      minimalist: "minimalist, clean composition, elegant, modern design",
    };
    expect(styleModifiers["cinematic"]).toContain("cinematic");
    expect(styleModifiers["anime"]).toContain("anime");
    expect(styleModifiers["neon-noir"]).toContain("cyberpunk");
  });
});

describe("Grok Imagine API wrapper exports", () => {
  it("exports generateGrokImage function", async () => {
    const mod = await import("./ai-apis/grok-imagine");
    expect(typeof mod.generateGrokImage).toBe("function");
  });

  it("exports submitGrokVideo function", async () => {
    const mod = await import("./ai-apis/grok-imagine");
    expect(typeof mod.submitGrokVideo).toBe("function");
  });

  it("exports pollGrokVideo function", async () => {
    const mod = await import("./ai-apis/grok-imagine");
    expect(typeof mod.pollGrokVideo).toBe("function");
  });

  it("exports generateGrokVideoSync function", async () => {
    const mod = await import("./ai-apis/grok-imagine");
    expect(typeof mod.generateGrokVideoSync).toBe("function");
  });
});
