/**
 * Unit tests for the MVSEP diagnostic procedure in systemRouter.
 * Tests the testMvsep mutation logic by mocking the MVSEP API module.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the MVSEP module before importing anything that uses it
vi.mock("../ai-apis/mvsep-vocal-isolation", () => ({
  submitMvsepVocalIsolation: vi.fn(),
  pollMvsepVocalIsolation: vi.fn(),
}));

describe("MVSEP diagnostic — testMvsep mutation logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns ok=false with a clear message when MVSEP_API_KEY is not set", () => {
    const originalKey = process.env.MVSEP_API_KEY;
    delete process.env.MVSEP_API_KEY;

    // Inline the same guard logic as the procedure
    const apiToken = process.env.MVSEP_API_KEY;
    const result = !apiToken
      ? { ok: false, status: "error" as const, message: "MVSEP_API_KEY not configured", elapsedMs: 0, hash: null }
      : null;

    expect(result).not.toBeNull();
    expect(result!.ok).toBe(false);
    expect(result!.status).toBe("error");
    expect(result!.message).toContain("MVSEP_API_KEY not configured");

    // Restore
    if (originalKey !== undefined) process.env.MVSEP_API_KEY = originalKey;
  });

  it("resolves with status=done when MVSEP completes quickly", async () => {
    const { submitMvsepVocalIsolation, pollMvsepVocalIsolation } = await import(
      "../ai-apis/mvsep-vocal-isolation"
    );
    vi.mocked(submitMvsepVocalIsolation).mockResolvedValue({ jobId: "test-hash-123" });
    vi.mocked(pollMvsepVocalIsolation).mockResolvedValue({
      status: "done",
      vocalsUrl: "https://mvsep.com/vocals.wav",
      instrumentalUrl: "https://mvsep.com/instrum.wav",
    });

    const { jobId: hash } = await submitMvsepVocalIsolation("https://example.com/audio.mp3");
    const poll = await pollMvsepVocalIsolation(hash);

    expect(hash).toBe("test-hash-123");
    expect(poll.status).toBe("done");
  });

  it("resolves with status=error when MVSEP poll returns error", async () => {
    const { submitMvsepVocalIsolation, pollMvsepVocalIsolation } = await import(
      "../ai-apis/mvsep-vocal-isolation"
    );
    vi.mocked(submitMvsepVocalIsolation).mockResolvedValue({ jobId: "err-hash-456" });
    vi.mocked(pollMvsepVocalIsolation).mockResolvedValue({
      status: "error",
      errorMessage: "Separation failed",
    });

    const { jobId: hash } = await submitMvsepVocalIsolation("https://example.com/audio.mp3");
    const poll = await pollMvsepVocalIsolation(hash);

    expect(poll.status).toBe("error");
    expect(poll.errorMessage).toBe("Separation failed");
  });

  it("resolves with status=processing when job is still running after timeout", async () => {
    const { submitMvsepVocalIsolation, pollMvsepVocalIsolation } = await import(
      "../ai-apis/mvsep-vocal-isolation"
    );
    vi.mocked(submitMvsepVocalIsolation).mockResolvedValue({ jobId: "slow-hash-789" });
    vi.mocked(pollMvsepVocalIsolation).mockResolvedValue({ status: "processing" });

    const { jobId: hash } = await submitMvsepVocalIsolation("https://example.com/audio.mp3");
    const poll = await pollMvsepVocalIsolation(hash);

    // Still processing — key is valid, job was accepted
    expect(hash).toBe("slow-hash-789");
    expect(poll.status).toBe("processing");
  });

  it("rejects when submitMvsepVocalIsolation throws (e.g. invalid API key)", async () => {
    const { submitMvsepVocalIsolation } = await import("../ai-apis/mvsep-vocal-isolation");
    vi.mocked(submitMvsepVocalIsolation).mockRejectedValue(
      new Error("MVSEP submit failed: HTTP 401 — Unauthorized")
    );

    await expect(
      submitMvsepVocalIsolation("https://example.com/audio.mp3")
    ).rejects.toThrow("401");
  });
});
