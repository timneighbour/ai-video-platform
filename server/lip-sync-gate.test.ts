/**
 * Lip-Sync Gate Tests
 * ===================
 * Validates the Phase 1.2 remediation: lip-sync gate must use file_url (not image_url)
 * to send the full video to the LLM for temporal assessment.
 *
 * Root cause of the bug: the original implementation used type: "image_url" which
 * cannot process video files. The LLM would assess a single frame at best.
 *
 * Fix: replaced with type: "file_url" + mime_type: "video/mp4" so the LLM receives
 * the full video and can assess mouth movement across the entire clip duration.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { assessLipSyncQuality, shouldProceedToAssembly, shouldRetryLipSync, applyNumericLipSyncGate } from "./lip-sync-gate";

// ─── Mock the LLM ─────────────────────────────────────────────────────────────

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

import { invokeLLM } from "./_core/llm";
const mockInvokeLLM = vi.mocked(invokeLLM);

// ─── Helper: build a mock LLM response ────────────────────────────────────────

function mockLLMResponse(gate: "GREEN" | "AMBER" | "RED", mouthOpenFrames = 75, articulationVisible = true) {
  return {
    choices: [
      {
        message: {
          content: JSON.stringify({
            gate,
            assessment: `Test assessment for ${gate}`,
            confidence: 0.85,
            failureReason: gate !== "GREEN" ? `Test failure: ${gate}` : null,
            mouthOpenFrames,
            articulationVisible,
          }),
        },
      },
    ],
  };
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe("Lip-Sync Gate — Phase 1.2 Remediation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Critical: file_url vs image_url ─────────────────────────────────────────

  it("CRITICAL: sends video as file_url with mime_type video/mp4, NOT as image_url", async () => {
    mockInvokeLLM.mockResolvedValueOnce(mockLLMResponse("GREEN") as any);

    await assessLipSyncQuality({
      videoUrl: "https://cdn.example.com/test-scene.mp4",
      sceneId: 1,
      jobId: 100,
    });

    expect(mockInvokeLLM).toHaveBeenCalledOnce();
    const callArgs = mockInvokeLLM.mock.calls[0][0];
    const userMessage = callArgs.messages.find((m: any) => m.role === "user");
    expect(userMessage).toBeDefined();

    const contentArray = userMessage.content as any[];
    const videoContent = contentArray.find((c: any) => c.type === "file_url");
    const imageContent = contentArray.find((c: any) => c.type === "image_url");

    // Must use file_url
    expect(videoContent).toBeDefined();
    expect(videoContent.file_url.url).toBe("https://cdn.example.com/test-scene.mp4");
    expect(videoContent.file_url.mime_type).toBe("video/mp4");

    // Must NOT use image_url
    expect(imageContent).toBeUndefined();
  });

  it("system prompt instructs LLM to assess FULL CLIP, not a single frame", async () => {
    mockInvokeLLM.mockResolvedValueOnce(mockLLMResponse("GREEN") as any);

    await assessLipSyncQuality({
      videoUrl: "https://cdn.example.com/test-scene.mp4",
      sceneId: 1,
      jobId: 100,
    });

    const callArgs = mockInvokeLLM.mock.calls[0][0];
    const systemMessage = callArgs.messages.find((m: any) => m.role === "system");
    expect(systemMessage).toBeDefined();

    // Must mention full clip assessment, not single frame
    expect(systemMessage.content).toContain("FULL VIDEO CLIP");
    expect(systemMessage.content).toContain("ACROSS THE ENTIRE CLIP DURATION");

    // Must mention the critical closed-mouth failure mode
    expect(systemMessage.content).toContain("mouth is CLOSED");
    expect(systemMessage.content).toContain("RED");
  });

  it("response schema requires mouthOpenFrames and articulationVisible fields", async () => {
    mockInvokeLLM.mockResolvedValueOnce(mockLLMResponse("GREEN") as any);

    await assessLipSyncQuality({
      videoUrl: "https://cdn.example.com/test-scene.mp4",
      sceneId: 1,
      jobId: 100,
    });

    const callArgs = mockInvokeLLM.mock.calls[0][0];
    const schema = callArgs.response_format?.json_schema?.schema;
    expect(schema).toBeDefined();
    expect(schema.required).toContain("mouthOpenFrames");
    expect(schema.required).toContain("articulationVisible");
  });

  // ── Gate logic ───────────────────────────────────────────────────────────────

  it("returns GREEN when LLM returns GREEN with good articulation", async () => {
    mockInvokeLLM.mockResolvedValueOnce(mockLLMResponse("GREEN", 80, true) as any);

    const result = await assessLipSyncQuality({
      videoUrl: "https://cdn.example.com/test.mp4",
      sceneId: 2,
      jobId: 100,
    });

    expect(result.gate).toBe("GREEN");
    expect(result.usedSyncNetMetrics).toBe(false);
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("returns RED when LLM returns RED (closed mouth failure)", async () => {
    mockInvokeLLM.mockResolvedValueOnce(mockLLMResponse("RED", 5, false) as any);

    const result = await assessLipSyncQuality({
      videoUrl: "https://cdn.example.com/test.mp4",
      sceneId: 3,
      jobId: 100,
    });

    expect(result.gate).toBe("RED");
    expect(shouldRetryLipSync(result)).toBe(true);
    expect(shouldProceedToAssembly(result)).toBe(false);
  });

  it("escalates AMBER to RED when articulationVisible=false and mouthOpenFrames<20", async () => {
    // This is the S11 failure mode: AMBER result but mouth barely open
    mockInvokeLLM.mockResolvedValueOnce(mockLLMResponse("AMBER", 10, false) as any);

    const result = await assessLipSyncQuality({
      videoUrl: "https://cdn.example.com/s11-scene.mp4",
      sceneId: 11,
      jobId: 100,
    });

    // Should be escalated to RED
    expect(result.gate).toBe("RED");
    expect(result.failureReason).toContain("Escalated from AMBER");
    expect(shouldRetryLipSync(result)).toBe(true);
  });

  it("does NOT escalate AMBER when articulationVisible=true", async () => {
    // AMBER with visible articulation should remain AMBER (proceed with flag)
    mockInvokeLLM.mockResolvedValueOnce(mockLLMResponse("AMBER", 60, true) as any);

    const result = await assessLipSyncQuality({
      videoUrl: "https://cdn.example.com/test.mp4",
      sceneId: 4,
      jobId: 100,
    });

    expect(result.gate).toBe("AMBER");
    expect(shouldProceedToAssembly(result)).toBe(true);
  });

  it("falls back to AMBER (not RED) when LLM is unavailable", async () => {
    mockInvokeLLM.mockRejectedValueOnce(new Error("LLM service unavailable"));

    const result = await assessLipSyncQuality({
      videoUrl: "https://cdn.example.com/test.mp4",
      sceneId: 5,
      jobId: 100,
    });

    // Fail open — prefer AMBER over blocking assembly on LLM errors
    expect(result.gate).toBe("AMBER");
    expect(result.confidence).toBeLessThan(0.5);
    expect(shouldProceedToAssembly(result)).toBe(true);
  });

  // ── Numeric SyncNet path (unchanged) ────────────────────────────────────────

  it("uses numeric SyncNet metrics when lseD and lseC are provided, bypassing LLM", async () => {
    const result = await assessLipSyncQuality({
      videoUrl: "https://cdn.example.com/test.mp4",
      sceneId: 6,
      jobId: 100,
      lseD: 7.5,
      lseC: 7.0,
    });

    expect(result.gate).toBe("GREEN");
    expect(result.usedSyncNetMetrics).toBe(true);
    expect(mockInvokeLLM).not.toHaveBeenCalled();
  });

  it("numeric gate returns RED when LSE-D exceeds 10.0", async () => {
    const result = applyNumericLipSyncGate(11.5, 5.0);
    expect(result.gate).toBe("RED");
  });

  it("numeric gate returns AMBER when LSE-D is in 8.0-10.0 range", async () => {
    const result = applyNumericLipSyncGate(9.0, 7.0);
    expect(result.gate).toBe("AMBER");
  });
});
