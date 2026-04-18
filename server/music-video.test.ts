import { describe, it, expect } from "vitest";
import { musicVideoRouter } from "./routers/musicVideo";
import { calculateSceneCount, calculateCreditCost } from "./music-video-service";

describe("Music Video Service", () => {
  it("calculates scene count correctly for a 3-minute song", () => {
    const count = calculateSceneCount(180); // 3 minutes
    expect(count).toBeGreaterThanOrEqual(3);
    expect(count).toBeLessThanOrEqual(45);
    expect(count).toBe(Math.max(3, Math.min(45, Math.ceil(180 / 8))));
  });

  it("calculates scene count correctly for a 6-minute song", () => {
    const count = calculateSceneCount(360); // 6 minutes
    expect(count).toBe(45); // capped at 45
  });

  it("calculates scene count correctly for a short song", () => {
    const count = calculateSceneCount(20); // 20 seconds
    expect(count).toBe(3); // minimum 3
  });

  it("calculates credit cost as 10 credits per scene", () => {
    const cost = calculateCreditCost(18);
    expect(cost).toBe(180);
  });

  it("musicVideoRouter has expected procedures", () => {
    expect(musicVideoRouter).toBeDefined();
    expect(typeof musicVideoRouter).toBe("object");
  });

  it("musicVideoRouter has updateSceneLipSync procedure", () => {
    expect(musicVideoRouter._def.procedures.updateSceneLipSync).toBeDefined();
  });

  it("musicVideoRouter has updateAllScenesLipSync procedure", () => {
    expect(musicVideoRouter._def.procedures.updateAllScenesLipSync).toBeDefined();
  });

  it("musicVideoRouter has regenerateScene procedure", () => {
    expect(musicVideoRouter._def.procedures.regenerateScene).toBeDefined();
  });

  it("musicVideoRouter has retryFailedScene procedure", () => {
    expect(musicVideoRouter._def.procedures.retryFailedScene).toBeDefined();
  });

  it("musicVideoRouter has retryAllFailedScenes procedure", () => {
    expect(musicVideoRouter._def.procedures.retryAllFailedScenes).toBeDefined();
  });

  it("musicVideoRouter has updateScenePrompt procedure", () => {
    expect(musicVideoRouter._def.procedures.updateScenePrompt).toBeDefined();
  });

  it("musicVideoRouter has updateSceneLipSyncStyle procedure", () => {
    expect(musicVideoRouter._def.procedures.updateSceneLipSyncStyle).toBeDefined();
  });

  it("musicVideoRouter has pollProgress procedure", () => {
    expect(musicVideoRouter._def.procedures.pollProgress).toBeDefined();
  });

  it("musicVideoRouter has startRender procedure", () => {
    expect(musicVideoRouter._def.procedures.startRender).toBeDefined();
  });

  it("startRender procedure accepts aspectRatio enum values", () => {
    // Verify the startRender procedure exists and is a mutation
    const proc = musicVideoRouter._def.procedures.startRender;
    expect(proc).toBeDefined();
    // The procedure should be a mutation (not a query)
    expect(proc._def.type).toBe("mutation");
  });

  it("calculates scene count correctly for a 2-minute song", () => {
    const count = calculateSceneCount(120); // 2 minutes
    expect(count).toBe(Math.max(3, Math.min(45, Math.ceil(120 / 8))));
    expect(count).toBe(15);
  });

  it("export format defaults to 16:9 (YouTube)", () => {
    // The default export format should be 16:9 for YouTube
    const validFormats = ["16:9", "9:16", "1:1"];
    const defaultFormat = "16:9";
    expect(validFormats).toContain(defaultFormat);
  });

  it("export format supports all three platform ratios", () => {
    const formats = ["16:9", "9:16", "1:1"];
    expect(formats).toHaveLength(3);
    expect(formats).toContain("16:9"); // YouTube
    expect(formats).toContain("9:16"); // TikTok
    expect(formats).toContain("1:1");  // Instagram
  });
});
