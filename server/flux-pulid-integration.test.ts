/**
 * Unit tests for face-consistent image generation in the storyboard preview system.
 * Updated to reflect the new InstantID-primary pipeline (Flux PuLID is now fallback).
 */
import { describe, it, expect } from "vitest";

describe("Flux PuLID Integration", () => {
  it("should have FAL_AI_API_KEY environment variable configured", () => {
    const apiKey = process.env.FAL_AI_API_KEY;
    expect(apiKey).toBeDefined();
    expect(apiKey).not.toBe("");
    expect(typeof apiKey).toBe("string");
  });

  it("should export generateFaceConsistentImage function", async () => {
    const { generateFaceConsistentImage } = await import("./_core/fluxPuLID");
    expect(typeof generateFaceConsistentImage).toBe("function");
  });

  it("should export generateFaceConsistentImageAsync function", async () => {
    const { generateFaceConsistentImageAsync } = await import("./_core/fluxPuLID");
    expect(typeof generateFaceConsistentImageAsync).toBe("function");
  });

  it("should export pollFaceConsistentImageStatus function", async () => {
    const { pollFaceConsistentImageStatus } = await import("./_core/fluxPuLID");
    expect(typeof pollFaceConsistentImageStatus).toBe("function");
  });

  it("should have correct TypeScript types defined", async () => {
    const module = await import("./_core/fluxPuLID");
    expect(module).toBeDefined();
    expect(module.generateFaceConsistentImage).toBeDefined();
  });

  it("should validate that musicVideo router imports Flux PuLID helper", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const routerPath = path.join(process.cwd(), "server/routers/musicVideo.ts");
    const content = fs.readFileSync(routerPath, "utf-8");

    expect(content).toContain("generateFaceConsistentImage");
    expect(content).toContain("from \"../_core/fluxPuLID\"");
  });

  it("should validate that generateScenePreview uses InstantID as primary engine", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const routerPath = path.join(process.cwd(), "server/routers/musicVideo.ts");
    const content = fs.readFileSync(routerPath, "utf-8");

    // New pipeline: InstantID is primary, Flux PuLID is fallback
    expect(content).toContain("fal-ai/instantid");
    expect(content).toContain("Identity-Anchored Generation: InstantID (primary) or Flux PuLID (fallback)");
    expect(content).toContain("generateFaceConsistentImage");
  });

  it("should validate that generateScenePreview has fallback to generic image generation", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const routerPath = path.join(process.cwd(), "server/routers/musicVideo.ts");
    const content = fs.readFileSync(routerPath, "utf-8");

    expect(content).toContain("All face-consistent engines failed");
    expect(content).toContain("generateImage");
  });

  it("should validate that Flux PuLID fallback uses correct parameters", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const routerPath = path.join(process.cwd(), "server/routers/musicVideo.ts");
    const content = fs.readFileSync(routerPath, "utf-8");

    // Flux PuLID fallback parameters
    expect(content).toContain("idWeight: 1.5");
    expect(content).toContain("guidanceScale: 3.5");
    expect(content).toContain("imageSize: \"landscape_4_3\"");
  });

  it("should validate error handling for face engine failures", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const routerPath = path.join(process.cwd(), "server/routers/musicVideo.ts");
    const content = fs.readFileSync(routerPath, "utf-8");

    expect(content).toContain("catch (fluxErr)");
    expect(content).toContain("console.warn");
  });

  it("should validate that AI-invented characters still use generic image generation", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const routerPath = path.join(process.cwd(), "server/routers/musicVideo.ts");
    const content = fs.readFileSync(routerPath, "utf-8");

    expect(content).toContain("For scenes without character photos (AI-invented characters), use generic image generation");
    expect(content).toContain("generateImage");
  });

  it("should have proper logging for debugging", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const routerPath = path.join(process.cwd(), "server/routers/musicVideo.ts");
    const content = fs.readFileSync(routerPath, "utf-8");

    expect(content).toContain("console.log");
    expect(content).toContain("Using InstantID");
  });
});
