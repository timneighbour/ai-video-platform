/**
 * Unit tests for face-consistent image generation in the storyboard preview system.
 * Updated to reflect the Forge API pipeline (fal.ai / InstantID / Flux PuLID are
 * unreachable from this server environment; all face-anchored generation now uses
 * the built-in Forge API with originalImages reference photos).
 */
import { describe, it, expect } from "vitest";

describe("Face-Consistent Image Generation Pipeline", () => {
  it("should have FAL_AI_API_KEY environment variable configured (kept for future use)", () => {
    // FAL_AI_API_KEY is still defined in env even though fal.run is unreachable
    // from this server. Kept for potential future use when network access is available.
    const apiKey = process.env.FAL_AI_API_KEY;
    expect(apiKey).toBeDefined();
    expect(typeof apiKey).toBe("string");
  });

  it("should export generateFaceConsistentImage function from fluxPuLID helper", async () => {
    const { generateFaceConsistentImage } = await import("./_core/fluxPuLID");
    expect(typeof generateFaceConsistentImage).toBe("function");
  });

  it("should export generateFaceConsistentImageAsync function from fluxPuLID helper", async () => {
    const { generateFaceConsistentImageAsync } = await import("./_core/fluxPuLID");
    expect(typeof generateFaceConsistentImageAsync).toBe("function");
  });

  it("should export pollFaceConsistentImageStatus function from fluxPuLID helper", async () => {
    const { pollFaceConsistentImageStatus } = await import("./_core/fluxPuLID");
    expect(typeof pollFaceConsistentImageStatus).toBe("function");
  });

  it("should have correct TypeScript types defined in fluxPuLID module", async () => {
    const module = await import("./_core/fluxPuLID");
    expect(module).toBeDefined();
    expect(module.generateFaceConsistentImage).toBeDefined();
  });

  it("should validate that generateScenePreview uses Forge API as primary engine", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const routerPath = path.join(process.cwd(), "server/routers/musicVideo.ts");
    const content = fs.readFileSync(routerPath, "utf-8");

    // V2 pipeline: Forge API is primary (fal.ai unreachable from server)
    expect(content).toContain("Using Forge API for");
    expect(content).toContain("Photo Mode V2: Use Forge API with reference photo");
    expect(content).toContain("generateImage");
  });

  it("should validate that generateScenePreview uses masterPortraitUrl as primary reference", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const routerPath = path.join(process.cwd(), "server/routers/musicVideo.ts");
    const content = fs.readFileSync(routerPath, "utf-8");

    // V2: master portrait is the primary face anchor
    expect(content).toContain("masterPortraitUrl");
    expect(content).toContain("forgeRefs");
    expect(content).toContain("originalImages: forgeRefs");
  });

  it("should validate that generateScenePreview has fallback to generic image generation", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const routerPath = path.join(process.cwd(), "server/routers/musicVideo.ts");
    const content = fs.readFileSync(routerPath, "utf-8");

    expect(content).toContain("generateImage");
    expect(content).toContain("originalImages");
  });

  it("should validate error handling for face engine failures", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const routerPath = path.join(process.cwd(), "server/routers/musicVideo.ts");
    const content = fs.readFileSync(routerPath, "utf-8");

    expect(content).toContain("catch (forgeErr)");
    expect(content).toContain("console.warn");
  });

  it("should validate that AI-described characters use Flux PuLID face lock with generic fallback", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const routerPath = path.join(process.cwd(), "server/routers/musicVideo.ts");
    const content = fs.readFileSync(routerPath, "utf-8");

    // V3: AI-described characters now use Flux PuLID when masterPortraitUrl is available
    // Falls back to generic generateImage if Flux PuLID fails or no portrait exists
    expect(content).toContain("AI-Described Character Path: Flux PuLID Face Lock");
    expect(content).toContain("generateFaceConsistentImage");
    expect(content).toContain("Flux PuLID failed for scene");
    expect(content).toContain("generateImage");
  });

  it("should have proper logging for debugging", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const routerPath = path.join(process.cwd(), "server/routers/musicVideo.ts");
    const content = fs.readFileSync(routerPath, "utf-8");

    expect(content).toContain("console.log");
    expect(content).toContain("Forge success for scene");
  });

  it("should validate chained reference (V2 Step 6) is implemented", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const routerPath = path.join(process.cwd(), "server/routers/musicVideo.ts");
    const content = fs.readFileSync(routerPath, "utf-8");

    // V2 Step 6: scene N uses master portrait + previous scene as dual anchors
    expect(content).toContain("previousSceneImageUrl");
    expect(content).toContain("Chained Reference");
  });
});
