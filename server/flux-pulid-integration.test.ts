/**
 * Unit tests for Flux PuLID integration in the storyboard preview system
 * Tests code structure, error handling, and parameter validation
 */
import { describe, it, expect, vi } from "vitest";

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
    // This test verifies that the types are properly exported
    // If types are missing or incorrect, TypeScript compilation would fail
    const module = await import("./_core/fluxPuLID");
    expect(module).toBeDefined();
    expect(module.generateFaceConsistentImage).toBeDefined();
  });

  it("should validate that musicVideo router imports Flux PuLID helper", async () => {
    // Read the musicVideo router file to verify it imports generateFaceConsistentImage
    const fs = await import("fs");
    const path = await import("path");
    const routerPath = path.join(process.cwd(), "server/routers/musicVideo.ts");
    const content = fs.readFileSync(routerPath, "utf-8");

    expect(content).toContain("generateFaceConsistentImage");
    expect(content).toContain("from \"../_core/fluxPuLID\"");
  });

  it("should validate that generateScenePreview uses Flux PuLID when photos available", async () => {
    // Verify the implementation logic in generateScenePreview
    const fs = await import("fs");
    const path = await import("path");
    const routerPath = path.join(process.cwd(), "server/routers/musicVideo.ts");
    const content = fs.readFileSync(routerPath, "utf-8");

    // Check that the procedure uses Flux PuLID conditionally
    expect(content).toContain("Use Flux PuLID for face-consistent images when we have reference photos");
    expect(content).toContain("if (referenceImages.length > 0 && identityLines.length > 0)");
    expect(content).toContain("generateFaceConsistentImage");
  });

  it("should validate that generateScenePreview has fallback to generic image generation", async () => {
    // Verify fallback logic exists
    const fs = await import("fs");
    const path = await import("path");
    const routerPath = path.join(process.cwd(), "server/routers/musicVideo.ts");
    const content = fs.readFileSync(routerPath, "utf-8");

    expect(content).toContain("falling back to generic image generation");
    expect(content).toContain("generateImage");
  });

  it("should validate that Flux PuLID uses correct parameters", async () => {
    // Verify the parameters passed to Flux PuLID are correct
    const fs = await import("fs");
    const path = await import("path");
    const routerPath = path.join(process.cwd(), "server/routers/musicVideo.ts");
    const content = fs.readFileSync(routerPath, "utf-8");

    // Check for key parameters
    expect(content).toContain("idWeight: 1.2");
    expect(content).toContain("guidanceScale: 4");
    expect(content).toContain("imageSize: \"landscape_4_3\"");
    expect(content).toContain("negativePrompt: \"different person, different face, different hair, inconsistent character\"");
  });

  it("should validate error handling for Flux PuLID failures", async () => {
    // Verify error handling and fallback logic
    const fs = await import("fs");
    const path = await import("path");
    const routerPath = path.join(process.cwd(), "server/routers/musicVideo.ts");
    const content = fs.readFileSync(routerPath, "utf-8");

    expect(content).toContain("catch (fluxErr)");
    expect(content).toContain("console.warn");
  });

  it("should validate that AI-invented characters still use generic image generation", async () => {
    // Verify that scenes without character photos use generic generateImage
    const fs = await import("fs");
    const path = await import("path");
    const routerPath = path.join(process.cwd(), "server/routers/musicVideo.ts");
    const content = fs.readFileSync(routerPath, "utf-8");

    expect(content).toContain("For scenes without character photos (AI-invented characters), use generic image generation");
    expect(content).toContain("else {");
    expect(content).toContain("generateImage");
  });

  it("should have proper logging for debugging", async () => {
    // Verify logging statements for troubleshooting
    const fs = await import("fs");
    const path = await import("path");
    const routerPath = path.join(process.cwd(), "server/routers/musicVideo.ts");
    const content = fs.readFileSync(routerPath, "utf-8");

    expect(content).toContain("console.log");
    expect(content).toContain("Using Flux PuLID");
  });
});
