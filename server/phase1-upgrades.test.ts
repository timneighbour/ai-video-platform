/**
 * phase1-upgrades.test.ts
 *
 * Tests for Phase 1 pipeline upgrades:
 * 1. Default shot mix changed from 75% to 80%
 * 2. Storyboard LLM linting rules (7 rules)
 * 3. Raw-scene validation gate v2 (7 checks)
 */

import { describe, it, expect } from "vitest";

// ── 1. Default shot mix ──────────────────────────────────────────────────────

describe("Phase 1a — Default shot mix", () => {
  it("performanceShotRatio default is 80 in service function signature", async () => {
    // Read the service file and check the default value
    const fs = await import("fs");
    const content = fs.readFileSync("server/music-video-service.ts", "utf-8");
    expect(content).toContain("performanceShotRatio: number = 80");
  });

  it("performanceShotRatio DB schema default is 80", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("drizzle/schema.ts", "utf-8");
    expect(content).toContain("performanceShotRatio\").default(80)");
  });

  it("performanceShotRatio tRPC createJob fallback is 80", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/routers/musicVideo/render.ts", "utf-8") + fs.readFileSync("server/routers/musicVideo/job.ts", "utf-8") + fs.readFileSync("server/routers/musicVideo/character.ts", "utf-8");
    expect(content).toContain("performanceShotRatio: input.performanceShotRatio ?? 80");
  });

  it("performanceShotRatio UI localStorage default is 80", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/pages/MusicVideoAutopilot.tsx", "utf-8");
    expect(content).toContain("\"musicVideo_performanceShotRatio\", 80");
  });
});

// ── 2. Storyboard LLM linting rules ─────────────────────────────────────────

describe("Phase 1b — Storyboard LLM linting rules", () => {
  it("storyboard prompt contains vocal-only singing scene rule", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/music-video-service.ts", "utf-8");
    expect(content).toContain("RULE 1 — VOCAL-ONLY SINGING SCENES");
    expect(content).toContain("Only scenes with ACTIVE LEAD VOCALS may be classified as singing performance scenes");
  });

  it("storyboard prompt contains max 2 consecutive intercuts rule", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/music-video-service.ts", "utf-8");
    expect(content).toContain("RULE 2 — MAX 2 CONSECUTIVE INTERCUTS");
    expect(content).toContain("more than 2 consecutive cinematic intercut scenes");
  });

  it("storyboard prompt contains medium close-up rule", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/music-video-service.ts", "utf-8");
    expect(content).toContain("RULE 3 — AT LEAST HALF OF PERFORMANCE SCENES MUST BE MEDIUM CLOSE-UP");
    expect(content).toContain("At least 50% of all performance scenes must be framed as medium close-up");
  });

  it("storyboard prompt contains explicit population field rule", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/music-video-service.ts", "utf-8");
    expect(content).toContain("RULE 4 — EXPLICIT POPULATION FIELD");
    expect(content).toContain("NEVER leave the population ambiguous");
  });

  it("storyboard prompt contains explicit atmosphere field rule", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/music-video-service.ts", "utf-8");
    expect(content).toContain("RULE 5 — EXPLICIT ATMOSPHERE FIELD");
    expect(content).toContain("Atmosphere is what separates a cinematic shot from an empty AI room");
  });

  it("storyboard prompt contains structured prompt slot enforcement rule", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/music-video-service.ts", "utf-8");
    expect(content).toContain("RULE 6 — STRUCTURED PROMPT SLOT ENFORCEMENT");
    expect(content).toContain("[shot_size] + [camera_move] + [character_in_environment]");
  });

  it("storyboard prompt contains forbidden token list", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/music-video-service.ts", "utf-8");
    expect(content).toContain("RULE 7 — FORBIDDEN TOKENS");
    expect(content).toContain("grey background");
    expect(content).toContain("microphone stand");
    expect(content).toContain("empty stage");
    expect(content).toContain("duplicate singer");
    expect(content).toContain("performs on stage");
  });
});

// ── 3. Raw-scene validation gate v2 ─────────────────────────────────────────

describe("Phase 1c — Raw-scene validation gate v2", () => {
  it("validator interface includes all new check fields", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/raw-scene-validator.ts", "utf-8");
    expect(content).toContain("headCropDetected: boolean");
    expect(content).toContain("faceSizeAdequate: boolean");
    expect(content).toContain("populationPresent: boolean");
    expect(content).toContain("framingAdequate: boolean");
    expect(content).toContain("populationDescription: string");
  });

  it("validator includes failureCategory enum with all 7 categories", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/raw-scene-validator.ts", "utf-8");
    expect(content).toContain("grey_background");
    expect(content).toContain("head_crop");
    expect(content).toContain("face_too_small");
    expect(content).toContain("missing_population");
    expect(content).toContain("weak_framing");
    expect(content).toContain("empty_environment");
    expect(content).toContain("character_not_visible");
  });

  it("validator accepts requiresPopulation parameter", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/raw-scene-validator.ts", "utf-8");
    expect(content).toContain("requiresPopulation: boolean = false");
  });

  it("heartbeat infers requiresPopulation from scene prompt keywords", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/scheduled/sceneDispatchHeartbeat.ts", "utf-8");
    expect(content).toContain("scenePromptLower.includes(\"orchestra\")");
    expect(content).toContain("scenePromptLower.includes(\"lyndhurst hall\")");
    expect(content).toContain("scenePromptLower.includes(\"air studios\")");
  });

  it("heartbeat logs failureCategory on validation failure", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/scheduled/sceneDispatchHeartbeat.ts", "utf-8");
    expect(content).toContain("rawValidation.failureCategory ?? \"unknown\"");
  });

  it("LLM JSON schema includes all new fields", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/raw-scene-validator.ts", "utf-8");
    expect(content).toContain("\"headCropDetected\"");
    expect(content).toContain("\"faceSizeAdequate\"");
    expect(content).toContain("\"populationPresent\"");
    expect(content).toContain("\"framingAdequate\"");
    expect(content).toContain("\"populationDescription\"");
  });

  it("validator system prompt describes 8% face size threshold", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/raw-scene-validator.ts", "utf-8");
    expect(content).toContain("8%");
    expect(content).toContain("face occupies at least 8%");
  });
});
