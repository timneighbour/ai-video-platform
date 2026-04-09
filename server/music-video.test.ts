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

  it("musicVideoRouter has pollProgress procedure", () => {
    expect(musicVideoRouter._def.procedures.pollProgress).toBeDefined();
  });
});
