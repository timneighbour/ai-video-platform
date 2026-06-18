/**
 * Tests for SyncLabs v2 API modules:
 *   - synclabs-errors.ts  (/v2/errors)
 *   - synclabs-assets.ts  (/v2/assets)
 *   - synclabs-voices.ts  (/v2/voices)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── synclabs-errors.ts ───────────────────────────────────────────────────────

vi.mock("axios", () => {
  return {
    default: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    },
  };
});

import axios from "axios";

describe("synclabs-errors — classifySyncLabsError", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Reset the module-level catalog cache between tests
    vi.resetModules();
  });

  it("classifies generation_timeout as retry", async () => {
    (axios.get as any).mockResolvedValueOnce({ data: [] }); // empty catalog → fallback
    const { classifySyncLabsError } = await import("./ai-apis/synclabs-errors");
    const result = await classifySyncLabsError("generation_timeout");
    expect(result.retryAction).toBe("retry");
    expect(result.retryDelayMs).toBeGreaterThan(0);
  });

  it("classifies generation_input_validation_failed as no_retry", async () => {
    (axios.get as any).mockResolvedValueOnce({ data: [] });
    const { classifySyncLabsError } = await import("./ai-apis/synclabs-errors");
    const result = await classifySyncLabsError("generation_input_validation_failed");
    expect(result.retryAction).toBe("no_retry");
    expect(result.retryDelayMs).toBe(0);
  });

  it("classifies generation_infra_resource_exhausted as retry_later", async () => {
    (axios.get as any).mockResolvedValueOnce({ data: [] });
    const { classifySyncLabsError } = await import("./ai-apis/synclabs-errors");
    const result = await classifySyncLabsError("generation_infra_resource_exhausted");
    expect(result.retryAction).toBe("retry_later");
    expect(result.retryDelayMs).toBeGreaterThanOrEqual(30_000);
  });

  it("classifies generation_internal_auth as escalate", async () => {
    (axios.get as any).mockResolvedValueOnce({ data: [] });
    const { classifySyncLabsError } = await import("./ai-apis/synclabs-errors");
    const result = await classifySyncLabsError("generation_internal_auth");
    expect(result.retryAction).toBe("escalate");
  });

  it("classifies unknown code as retry with fallback message", async () => {
    (axios.get as any).mockResolvedValueOnce({ data: [] });
    const { classifySyncLabsError } = await import("./ai-apis/synclabs-errors");
    const result = await classifySyncLabsError("some_unknown_code_xyz");
    expect(result.retryAction).toBe("retry");
    expect(result.errorCode).toBe("some_unknown_code_xyz");
  });

  it("classifies null/undefined errorCode as retry", async () => {
    (axios.get as any).mockResolvedValueOnce({ data: [] });
    const { classifySyncLabsError } = await import("./ai-apis/synclabs-errors");
    const result = await classifySyncLabsError(null);
    expect(result.retryAction).toBe("retry");
    expect(result.errorCode).toBe("unknown");
  });

  it("uses built-in fallback catalog when /v2/errors is unreachable", async () => {
    (axios.get as any).mockRejectedValueOnce(new Error("Network error"));
    const { classifySyncLabsError } = await import("./ai-apis/synclabs-errors");
    // Should not throw — falls back to built-in catalog
    const result = await classifySyncLabsError("generation_timeout");
    expect(result.retryAction).toBe("retry");
  });

  it("resolves error message and suggestion from catalog", async () => {
    (axios.get as any).mockResolvedValueOnce({
      data: [
        {
          code: "generation_audio_length_exceeded",
          message: "The provided audio exceeds the maximum allowed length.",
          suggestion: "Trim or split your audio so each generation is under 300 seconds (5 minutes).",
        },
      ],
    });
    const { resolveSyncLabsError } = await import("./ai-apis/synclabs-errors");
    const result = await resolveSyncLabsError("generation_audio_length_exceeded");
    expect(result.message).toContain("maximum allowed length");
    expect(result.suggestion).toContain("300 seconds");
  });

  it("formatSyncLabsError returns a formatted log string", async () => {
    (axios.get as any).mockResolvedValueOnce({ data: [] });
    const { formatSyncLabsError } = await import("./ai-apis/synclabs-errors");
    const log = await formatSyncLabsError("generation_timeout", "job-abc-123");
    expect(log).toContain("errorCode=generation_timeout");
    expect(log).toContain("job: job-abc-123");
    expect(log).toContain("action=retry");
  });
});

// ─── synclabs-assets.ts ───────────────────────────────────────────────────────

describe("synclabs-assets — createSyncLabsUploadUrl", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
    process.env.SYNC_LABS_API_KEY = "test-key";
  });

  it("returns uploadUrl and url on success", async () => {
    (axios.post as any).mockResolvedValueOnce({
      data: {
        uploadUrl: "https://s3.example.com/presigned-put?sig=abc",
        url: "https://assets.sync.so/my-file.wav",
        expiresIn: 3600,
      },
    });
    const { createSyncLabsUploadUrl } = await import("./ai-apis/synclabs-assets");
    const result = await createSyncLabsUploadUrl("test.wav", "audio/wav", 12345);
    expect(result.uploadUrl).toContain("presigned-put");
    expect(result.url).toContain("sync.so");
    expect(result.expiresIn).toBe(3600);
  });

  it("throws if uploadUrl is missing from response", async () => {
    (axios.post as any).mockResolvedValueOnce({ data: { url: "https://example.com" } });
    const { createSyncLabsUploadUrl } = await import("./ai-apis/synclabs-assets");
    await expect(createSyncLabsUploadUrl("test.wav", "audio/wav", 100)).rejects.toThrow("createUploadUrl failed");
  });

  it("throws if SYNC_LABS_API_KEY is not set", async () => {
    delete process.env.SYNC_LABS_API_KEY;
    const { createSyncLabsUploadUrl } = await import("./ai-apis/synclabs-assets");
    await expect(createSyncLabsUploadUrl("test.wav", "audio/wav", 100)).rejects.toThrow("SYNC_LABS_API_KEY");
  });

  it("registerSyncLabsAsset returns asset with id", async () => {
    (axios.post as any).mockResolvedValueOnce({
      data: {
        id: "asset-uuid-001",
        name: "test.wav",
        type: "AUDIO",
        url: "https://assets.sync.so/test.wav",
        format: "wav",
        size: 12345,
        createdAt: "2026-06-18T00:00:00Z",
        updatedAt: "2026-06-18T00:00:00Z",
      },
    });
    process.env.SYNC_LABS_API_KEY = "test-key";
    const { registerSyncLabsAsset } = await import("./ai-apis/synclabs-assets");
    const asset = await registerSyncLabsAsset("https://assets.sync.so/test.wav", "test.wav", "AUDIO");
    expect(asset.id).toBe("asset-uuid-001");
    expect(asset.type).toBe("AUDIO");
  });

  it("getSyncLabsAsset returns null for 404", async () => {
    const err: any = new Error("Not Found");
    err.response = { status: 404 };
    (axios.get as any).mockRejectedValueOnce(err);
    process.env.SYNC_LABS_API_KEY = "test-key";
    const { getSyncLabsAsset } = await import("./ai-apis/synclabs-assets");
    const result = await getSyncLabsAsset("nonexistent-id");
    expect(result).toBeNull();
  });
});

// ─── synclabs-voices.ts ───────────────────────────────────────────────────────

describe("synclabs-voices — cloneSyncLabsVoice", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
    process.env.SYNC_LABS_API_KEY = "test-key";
  });

  it("returns voiceId on success", async () => {
    (axios.post as any).mockResolvedValueOnce({
      data: {
        voiceId: "voice-uuid-001",
        name: "Tim-voice-v1",
        internalVoiceId: "el-internal-001",
      },
    });
    const { cloneSyncLabsVoice } = await import("./ai-apis/synclabs-voices");
    const voice = await cloneSyncLabsVoice({ name: "Tim-voice-v1", assetId: "asset-uuid-001" });
    expect(voice.voiceId).toBe("voice-uuid-001");
    expect(voice.name).toBe("Tim-voice-v1");
  });

  it("throws if neither url nor assetId is provided", async () => {
    const { cloneSyncLabsVoice } = await import("./ai-apis/synclabs-voices");
    await expect(cloneSyncLabsVoice({ name: "test" })).rejects.toThrow("url or assetId");
  });

  it("throws if voiceId is missing from response", async () => {
    (axios.post as any).mockResolvedValueOnce({ data: { name: "test" } });
    const { cloneSyncLabsVoice } = await import("./ai-apis/synclabs-voices");
    await expect(cloneSyncLabsVoice({ name: "test", url: "https://example.com/audio.wav" })).rejects.toThrow("Clone failed");
  });

  it("throws if SYNC_LABS_API_KEY is not set", async () => {
    delete process.env.SYNC_LABS_API_KEY;
    const { cloneSyncLabsVoice } = await import("./ai-apis/synclabs-voices");
    await expect(cloneSyncLabsVoice({ name: "test", url: "https://example.com/audio.wav" })).rejects.toThrow("SYNC_LABS_API_KEY");
  });
});
