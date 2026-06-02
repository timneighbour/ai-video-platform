/**
 * Tests for character-auto-prep.ts
 * Validates selectReferenceForScene, sceneTypeToRefType, and module exports.
 */
import { describe, it, expect } from "vitest";
import { selectReferenceForScene, sceneTypeToRefType } from "./character-auto-prep";

// ── sceneTypeToRefType ────────────────────────────────────────────────────────
// Signature: sceneTypeToRefType(lipSyncEnabled: boolean, sceneTypeHint?: string)

describe("sceneTypeToRefType", () => {
  it("returns 'performance' when lipSync is enabled regardless of hint", () => {
    expect(sceneTypeToRefType(true, "cinematic")).toBe("performance");
    expect(sceneTypeToRefType(true, undefined)).toBe("performance");
  });

  it("returns 'cinematic' for wide/cinematic/emotional hints without lipSync", () => {
    expect(sceneTypeToRefType(false, "cinematic")).toBe("cinematic");
    expect(sceneTypeToRefType(false, "wide shot")).toBe("cinematic");
    expect(sceneTypeToRefType(false, "emotional close-up")).toBe("cinematic");
  });

  it("returns 'environment' for environment/world/establishing hints without lipSync", () => {
    expect(sceneTypeToRefType(false, "environment")).toBe("environment");
    expect(sceneTypeToRefType(false, "world building")).toBe("environment");
    expect(sceneTypeToRefType(false, "establishing shot")).toBe("environment");
  });

  it("defaults to 'mediumshot' for standard non-lipSync scenes", () => {
    expect(sceneTypeToRefType(false, undefined)).toBe("mediumshot");
    expect(sceneTypeToRefType(false, "")).toBe("mediumshot");
  });
});

// ── selectReferenceForScene ───────────────────────────────────────────────────
// Fallback chains:
//   performance  → performanceRefUrl ?? masterPortraitUrl ?? null
//   mediumshot   → mediumShotRefUrl ?? masterPortraitUrl ?? null
//   cinematic    → cinematicRefUrl ?? mediumShotRefUrl ?? masterPortraitUrl ?? null
//   environment  → environmentRefUrl ?? cinematicRefUrl ?? masterPortraitUrl ?? null

describe("selectReferenceForScene", () => {
  const noRefs = {
    masterPortraitUrl: null,
    performanceRefUrl: null,
    mediumShotRefUrl: null,
    cinematicRefUrl: null,
    environmentRefUrl: null,
  };

  const withMaster = { ...noRefs, masterPortraitUrl: "https://s3.example.com/master.jpg" };

  it("returns null when all refs are null", () => {
    expect(selectReferenceForScene(noRefs as any, "performance")).toBeNull();
    expect(selectReferenceForScene(noRefs as any, "cinematic")).toBeNull();
    expect(selectReferenceForScene(noRefs as any, "mediumshot")).toBeNull();
    expect(selectReferenceForScene(noRefs as any, "environment")).toBeNull();
  });

  it("falls back to masterPortraitUrl when specific ref is null", () => {
    expect(selectReferenceForScene(withMaster as any, "performance")).toBe("https://s3.example.com/master.jpg");
    expect(selectReferenceForScene(withMaster as any, "cinematic")).toBe("https://s3.example.com/master.jpg");
    expect(selectReferenceForScene(withMaster as any, "mediumshot")).toBe("https://s3.example.com/master.jpg");
    expect(selectReferenceForScene(withMaster as any, "environment")).toBe("https://s3.example.com/master.jpg");
  });

  it("prefers performanceRefUrl over masterPortraitUrl for performance scenes", () => {
    const char = { ...withMaster, performanceRefUrl: "https://s3.example.com/perf.jpg" };
    expect(selectReferenceForScene(char as any, "performance")).toBe("https://s3.example.com/perf.jpg");
  });

  it("prefers mediumShotRefUrl over masterPortraitUrl for mediumshot scenes", () => {
    const char = { ...withMaster, mediumShotRefUrl: "https://s3.example.com/med.jpg" };
    expect(selectReferenceForScene(char as any, "mediumshot")).toBe("https://s3.example.com/med.jpg");
  });

  it("prefers cinematicRefUrl over mediumShotRefUrl for cinematic scenes", () => {
    const char = {
      ...withMaster,
      mediumShotRefUrl: "https://s3.example.com/med.jpg",
      cinematicRefUrl: "https://s3.example.com/cine.jpg",
    };
    expect(selectReferenceForScene(char as any, "cinematic")).toBe("https://s3.example.com/cine.jpg");
  });

  it("falls back to mediumShotRefUrl when cinematicRefUrl is null for cinematic scenes", () => {
    const char = { ...withMaster, mediumShotRefUrl: "https://s3.example.com/med.jpg" };
    expect(selectReferenceForScene(char as any, "cinematic")).toBe("https://s3.example.com/med.jpg");
  });

  it("prefers environmentRefUrl over cinematicRefUrl for environment scenes", () => {
    const char = {
      ...withMaster,
      cinematicRefUrl: "https://s3.example.com/cine.jpg",
      environmentRefUrl: "https://s3.example.com/env.jpg",
    };
    expect(selectReferenceForScene(char as any, "environment")).toBe("https://s3.example.com/env.jpg");
  });

  it("falls back to cinematicRefUrl when environmentRefUrl is null for environment scenes", () => {
    const char = { ...withMaster, cinematicRefUrl: "https://s3.example.com/cine.jpg" };
    expect(selectReferenceForScene(char as any, "environment")).toBe("https://s3.example.com/cine.jpg");
  });

  it("returns masterPortraitUrl for unknown scene types", () => {
    expect(selectReferenceForScene(withMaster as any, "unknown_type" as any)).toBe("https://s3.example.com/master.jpg");
  });
});

// ── Module export smoke tests ─────────────────────────────────────────────────

describe("character-auto-prep module exports", () => {
  it("exports runStage1AutoPrep as a function", async () => {
    const mod = await import("./character-auto-prep");
    expect(typeof mod.runStage1AutoPrep).toBe("function");
  });

  it("exports runStage2EnvironmentPrep as a function", async () => {
    const mod = await import("./character-auto-prep");
    expect(typeof mod.runStage2EnvironmentPrep).toBe("function");
  });

  it("exports selectReferenceForScene as a function", async () => {
    const mod = await import("./character-auto-prep");
    expect(typeof mod.selectReferenceForScene).toBe("function");
  });

  it("exports sceneTypeToRefType as a function", async () => {
    const mod = await import("./character-auto-prep");
    expect(typeof mod.sceneTypeToRefType).toBe("function");
  });
});
