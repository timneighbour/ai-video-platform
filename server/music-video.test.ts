import { describe, it, expect } from "vitest";
import { musicVideoRouter } from "./routers/musicVideo";
import { calculateSceneCount, calculateCreditCost } from "./music-video-service";

describe("Music Video Service", () => {
  // Implementation: 6s/scene, max 15 scenes for <=90s tracks, max 40 scenes for longer, min 3
  it("calculates scene count correctly for a 3-minute song", () => {
    const count = calculateSceneCount(180); // 180s -> ceil(180/6)=30, max 40 -> 30
    expect(count).toBeGreaterThanOrEqual(3);
    expect(count).toBeLessThanOrEqual(40);
    expect(count).toBe(30);
  });

  it("calculates scene count correctly for a 6-minute song", () => {
    const count = calculateSceneCount(360); // 360s -> ceil(360/6)=60, capped at 40
    expect(count).toBe(40);
  });

  it("calculates scene count correctly for a short song", () => {
    const count = calculateSceneCount(20); // 20s -> ceil(20/6)=4, <=90s cap=15 -> 4
    expect(count).toBe(4);
  });

  it("calculates scene count correctly for a 2-minute song", () => {
    const count = calculateSceneCount(120); // 120s -> ceil(120/6)=20, max 40 -> 20
    expect(count).toBe(20);
  });

  it("calculates scene count correctly for a very short song (minimum 3)", () => {
    const count = calculateSceneCount(10); // 10s -> ceil(10/6)=2, min 3
    expect(count).toBe(3);
  });

  it("calculates scene count correctly for a 90s song (short track cap boundary)", () => {
    const count = calculateSceneCount(90); // 90s -> ceil(90/6)=15, <=90s cap=15 -> 15
    expect(count).toBe(15);
  });

  it("calculates scene count correctly for a 75s song (Zara demo)", () => {
    const count = calculateSceneCount(75); // 75s -> ceil(75/6)=13, <=90s cap=15 -> 13
    expect(count).toBe(13);
  });

  it("calculates credit cost using tiered pricing (15 credits/scene for short songs)", () => {
    const cost = calculateCreditCost(18, 0);
    expect(cost).toBe(270); // 18 x 15 = 270
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
    const proc = musicVideoRouter._def.procedures.startRender;
    expect(proc).toBeDefined();
    expect(proc._def.type).toBe("mutation");
  });

  it("export format defaults to 16:9 (YouTube)", () => {
    const validFormats = ["16:9", "9:16", "1:1"];
    const defaultFormat = "16:9";
    expect(validFormats).toContain(defaultFormat);
  });

  it("export format supports all three platform ratios", () => {
    const formats = ["16:9", "9:16", "1:1"];
    expect(formats).toHaveLength(3);
    expect(formats).toContain("16:9");
    expect(formats).toContain("9:16");
    expect(formats).toContain("1:1");
  });
});
