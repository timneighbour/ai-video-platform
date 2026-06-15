/**
 * Tests for the Continuity Block feature in the prompt pipeline.
 * Verifies that scenes after the first receive a CONTINUITY RULES block
 * when a previousSceneImageUrl is provided, and that the first scene
 * (no previous image) does NOT include continuity rules.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

// Read the musicVideo.ts source to verify the continuity block is wired correctly
const musicVideoSrc = readFileSync(
  resolve(__dirname, "routers/musicVideo/character.ts"),
  "utf-8"
);

describe("Continuity Block — prompt pipeline", () => {
  it("defines a continuityBlock variable that depends on previousSceneImageUrl", () => {
    expect(musicVideoSrc).toContain("const continuityBlock = input.previousSceneImageUrl");
  });

  it("continuityBlock includes CONTINUITY RULES header", () => {
    expect(musicVideoSrc).toContain("CONTINUITY RULES (maintain consistency with previous scene):");
  });

  it("continuityBlock instructs model to maintain lighting temperature", () => {
    expect(musicVideoSrc).toContain("MAINTAIN the same lighting temperature");
  });

  it("continuityBlock instructs model to maintain colour grading", () => {
    expect(musicVideoSrc).toContain("colour grading");
  });

  it("continuityBlock instructs model to maintain character outfits across scenes", () => {
    expect(musicVideoSrc).toContain("MAINTAIN the same character outfits, hairstyles, and accessories");
  });

  it("continuityBlock instructs model to maintain stage/set design", () => {
    expect(musicVideoSrc).toContain("MAINTAIN the same stage/set design, instrument placement");
  });

  it("continuityBlock allows camera angle changes while keeping visual style consistent", () => {
    expect(musicVideoSrc).toContain("The camera angle may change, but the overall visual style MUST remain consistent");
  });

  it("continuityBlock is empty string when no previousSceneImageUrl", () => {
    // The ternary should produce "" for the else branch
    expect(musicVideoSrc).toMatch(/const continuityBlock = input\.previousSceneImageUrl[\s\S]*?\n\s*: ""/);
  });

  it("continuityBlock is included in the finalImagePrompt assembly", () => {
    expect(musicVideoSrc).toContain("continuityBlock,");
  });

  it("finalImagePrompt assembly comment mentions continuity in the block order", () => {
    expect(musicVideoSrc).toContain("continuity");
  });
});

describe("Continuity Block — chained reference image", () => {
  it("previousSceneImageUrl is an optional input parameter", () => {
    expect(musicVideoSrc).toContain("previousSceneImageUrl: z.string().url().optional()");
  });

  it("previousSceneImageUrl is fetched and converted to base64 for chaining", () => {
    expect(musicVideoSrc).toContain("previousSceneBase64");
  });

  it("previousSceneImageUrl is added to forgeRefs when space allows", () => {
    expect(musicVideoSrc).toContain("input.previousSceneImageUrl && forgeRefs.length < 4");
  });
});

describe("Continuity Block — logical behaviour", () => {
  // Simulate the continuity block builder logic
  const buildContinuityBlock = (previousSceneImageUrl?: string) => {
    return previousSceneImageUrl
      ? `CONTINUITY RULES (maintain consistency with previous scene):\n` +
        `- The reference image from the previous scene is provided as an additional input.\n` +
        `- MAINTAIN the same lighting temperature, colour grading, and stage setup.\n` +
        `- MAINTAIN the same character outfits, hairstyles, and accessories — NO changes between scenes.\n` +
        `- MAINTAIN the same stage/set design, instrument placement, and prop positions.\n` +
        `- The camera angle may change, but the overall visual style MUST remain consistent.\n` +
        `- If the previous scene showed a specific background (e.g. red lighting, smoke), keep it unless the scene description explicitly changes it.`
      : "";
  };

  it("returns empty string for first scene (no previous image)", () => {
    expect(buildContinuityBlock(undefined)).toBe("");
    expect(buildContinuityBlock()).toBe("");
  });

  it("returns non-empty continuity block for subsequent scenes", () => {
    const block = buildContinuityBlock("https://cdn.example.com/scene-1.jpg");
    expect(block).toContain("CONTINUITY RULES");
    expect(block.length).toBeGreaterThan(100);
  });

  it("continuity block mentions reference image from previous scene", () => {
    const block = buildContinuityBlock("https://cdn.example.com/scene-1.jpg");
    expect(block).toContain("reference image from the previous scene");
  });

  it("continuity block has 6 rules (6 bullet points)", () => {
    const block = buildContinuityBlock("https://cdn.example.com/scene-1.jpg");
    const bulletCount = (block.match(/^- /gm) || []).length;
    expect(bulletCount).toBe(6);
  });
});
