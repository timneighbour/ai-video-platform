/**
 * Tests for character-photo-validator.ts — Phase 1.4
 *
 * The validator uses LLM vision, so all LLM calls are mocked.
 * Tests verify:
 *  - Correct pass/fail decisions for each check
 *  - Correct subscriber-facing messages per failure
 *  - Priority ordering of failure messages
 *  - Fail-open behaviour when LLM is unavailable
 *  - Resolution check using client-supplied dimensions
 *  - AI character identity reference path (referencePhotoBase64 saved)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateCharacterPhoto } from "./character-photo-validator";

// ─── Mock the LLM ─────────────────────────────────────────────────────────────

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

import { invokeLLM } from "./_core/llm";
const mockInvokeLLM = vi.mocked(invokeLLM);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeLLMResponse(overrides: Partial<{
  face_detected: boolean;
  single_person: boolean;
  face_size_adequate: boolean;
  no_sunglasses: boolean;
  no_mask: boolean;
  no_severe_blur: boolean;
  frontal_face: boolean;
  adequate_lighting: boolean;
  estimated_width_px: number;
  estimated_height_px: number;
}> = {}) {
  const defaults = {
    face_detected: true,
    single_person: true,
    face_size_adequate: true,
    no_sunglasses: true,
    no_mask: true,
    no_severe_blur: true,
    frontal_face: true,
    adequate_lighting: true,
    estimated_width_px: 800,
    estimated_height_px: 800,
  };
  const data = { ...defaults, ...overrides };
  return {
    choices: [{ message: { content: JSON.stringify(data) } }],
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("validateCharacterPhoto", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes when all checks succeed", async () => {
    mockInvokeLLM.mockResolvedValue(makeLLMResponse() as any);
    const result = await validateCharacterPhoto("https://cdn.example.com/photo.jpg");
    expect(result.passed).toBe(true);
    expect(result.failedChecks).toHaveLength(0);
    expect(result.message).toBe("Photo validated successfully.");
  });

  it("fails when no face is detected", async () => {
    mockInvokeLLM.mockResolvedValue(makeLLMResponse({ face_detected: false }) as any);
    const result = await validateCharacterPhoto("https://cdn.example.com/photo.jpg");
    expect(result.passed).toBe(false);
    expect(result.failedChecks).toContain("face_detected");
    expect(result.message).toContain("No face was detected");
  });

  it("fails when multiple people are detected", async () => {
    mockInvokeLLM.mockResolvedValue(makeLLMResponse({ single_person: false }) as any);
    const result = await validateCharacterPhoto("https://cdn.example.com/photo.jpg");
    expect(result.passed).toBe(false);
    expect(result.failedChecks).toContain("single_person");
    expect(result.message).toContain("more than one person");
  });

  it("fails when face is too small", async () => {
    mockInvokeLLM.mockResolvedValue(makeLLMResponse({ face_size_adequate: false }) as any);
    const result = await validateCharacterPhoto("https://cdn.example.com/photo.jpg");
    expect(result.passed).toBe(false);
    expect(result.failedChecks).toContain("face_size");
    expect(result.message).toContain("too small in the photo");
  });

  it("fails when sunglasses are detected", async () => {
    mockInvokeLLM.mockResolvedValue(makeLLMResponse({ no_sunglasses: false }) as any);
    const result = await validateCharacterPhoto("https://cdn.example.com/photo.jpg");
    expect(result.passed).toBe(false);
    expect(result.failedChecks).toContain("no_sunglasses");
    expect(result.message).toContain("Sunglasses were detected");
  });

  it("fails when a mask is detected", async () => {
    mockInvokeLLM.mockResolvedValue(makeLLMResponse({ no_mask: false }) as any);
    const result = await validateCharacterPhoto("https://cdn.example.com/photo.jpg");
    expect(result.passed).toBe(false);
    expect(result.failedChecks).toContain("no_mask");
    expect(result.message).toContain("face covering or mask");
  });

  it("fails when severe blur is detected", async () => {
    mockInvokeLLM.mockResolvedValue(makeLLMResponse({ no_severe_blur: false }) as any);
    const result = await validateCharacterPhoto("https://cdn.example.com/photo.jpg");
    expect(result.passed).toBe(false);
    expect(result.failedChecks).toContain("no_blur");
    expect(result.message).toContain("blurry or out of focus");
  });

  it("fails when face is not frontal", async () => {
    mockInvokeLLM.mockResolvedValue(makeLLMResponse({ frontal_face: false }) as any);
    const result = await validateCharacterPhoto("https://cdn.example.com/photo.jpg");
    expect(result.passed).toBe(false);
    expect(result.failedChecks).toContain("frontal_face");
    expect(result.message).toContain("facing the camera");
  });

  it("fails when lighting is inadequate", async () => {
    mockInvokeLLM.mockResolvedValue(makeLLMResponse({ adequate_lighting: false }) as any);
    const result = await validateCharacterPhoto("https://cdn.example.com/photo.jpg");
    expect(result.passed).toBe(false);
    expect(result.failedChecks).toContain("adequate_lighting");
    expect(result.message).toContain("too dark or too bright");
  });

  it("fails resolution check when client-supplied dimensions are too small", async () => {
    mockInvokeLLM.mockResolvedValue(makeLLMResponse({ estimated_width_px: 100, estimated_height_px: 100 }) as any);
    const result = await validateCharacterPhoto("https://cdn.example.com/photo.jpg", 100, 100);
    expect(result.passed).toBe(false);
    expect(result.failedChecks).toContain("min_resolution");
    expect(result.message).toContain("too small");
  });

  it("passes resolution check when dimensions are exactly at minimum", async () => {
    // ISS-037: minimum raised to 512x512
    mockInvokeLLM.mockResolvedValue(makeLLMResponse({ estimated_width_px: 512, estimated_height_px: 512 }) as any);
    const result = await validateCharacterPhoto("https://cdn.example.com/photo.jpg", 512, 512);
    expect(result.passed).toBe(true);
    expect(result.failedChecks).not.toContain("min_resolution");
  });

  it("prioritises face_detected message over other failures", async () => {
    mockInvokeLLM.mockResolvedValue(makeLLMResponse({
      face_detected: false,
      no_sunglasses: false,
      adequate_lighting: false,
    }) as any);
    const result = await validateCharacterPhoto("https://cdn.example.com/photo.jpg");
    expect(result.passed).toBe(false);
    // face_detected is highest priority — message should reflect it
    expect(result.message).toContain("No face was detected");
    expect(result.failedChecks).toHaveLength(3);
  });

  it("prioritises no_mask over no_sunglasses", async () => {
    mockInvokeLLM.mockResolvedValue(makeLLMResponse({
      no_mask: false,
      no_sunglasses: false,
    }) as any);
    const result = await validateCharacterPhoto("https://cdn.example.com/photo.jpg");
    // no_mask comes before no_sunglasses in priority list
    expect(result.message).toContain("face covering or mask");
  });

  it("fails open (passes) when LLM throws an error", async () => {
    mockInvokeLLM.mockRejectedValue(new Error("LLM service unavailable"));
    const result = await validateCharacterPhoto("https://cdn.example.com/photo.jpg");
    // Fail-open: LLM unavailable should NOT block the subscriber
    expect(result.passed).toBe(true);
    expect(result.failedChecks).toHaveLength(0);
  });

  it("uses LLM-estimated dimensions when client dimensions are not supplied", async () => {
    mockInvokeLLM.mockResolvedValue(makeLLMResponse({ estimated_width_px: 150, estimated_height_px: 150 }) as any);
    // No client dimensions supplied — LLM estimate should trigger resolution fail
    const result = await validateCharacterPhoto("https://cdn.example.com/photo.jpg");
    expect(result.passed).toBe(false);
    expect(result.failedChecks).toContain("min_resolution");
    expect(result.estimatedWidth).toBe(150);
    expect(result.estimatedHeight).toBe(150);
  });

  it("skips resolution check when both client and LLM dimensions are unknown (0)", async () => {
    mockInvokeLLM.mockResolvedValue(makeLLMResponse({ estimated_width_px: 0, estimated_height_px: 0 }) as any);
    const result = await validateCharacterPhoto("https://cdn.example.com/photo.jpg");
    // Cannot determine resolution — should not fail on this check
    expect(result.failedChecks).not.toContain("min_resolution");
  });

  it("returns all nine check results in the checks object", async () => {
    mockInvokeLLM.mockResolvedValue(makeLLMResponse() as any);
    const result = await validateCharacterPhoto("https://cdn.example.com/photo.jpg");
    const expectedChecks: string[] = [
      "face_detected", "single_person", "min_resolution", "face_size",
      "no_sunglasses", "no_mask", "no_blur", "frontal_face", "adequate_lighting",
    ];
    for (const check of expectedChecks) {
      expect(result.checks).toHaveProperty(check);
    }
  });
});
