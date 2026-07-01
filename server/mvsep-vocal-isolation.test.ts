/**
 * Unit tests for MVSEP Vocal Isolation Service
 *
 * Tests cover:
 *   - submitMvsepVocalIsolation: correct request construction, success/error handling
 *   - pollMvsepVocalIsolation: status mapping, stem URL extraction, error handling
 *
 * API contract (verified from live MVSEP docs 2026-07-01):
 *   Submit response:  { success: true, data: { hash: "20230327071601-0e3e5c6c85-13-song.mp3", link: "..." } }
 *   Poll endpoint:    GET /api/separation/get?hash=<hash>
 *   Poll response:    { success: true, status: "done"|"waiting"|"processing"|"failed", data: { files: [...] } }
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  submitMvsepVocalIsolation,
  pollMvsepVocalIsolation,
} from "./ai-apis/mvsep-vocal-isolation";

// ─── Mock fetch globally ──────────────────────────────────────────────────────
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// ─── Helpers ─────────────────────────────────────────────────────────────────
function makeResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

const MOCK_HASH = "20230327071601-0e3e5c6c85-13-song.mp3";

// ─── submitMvsepVocalIsolation ────────────────────────────────────────────────
describe("submitMvsepVocalIsolation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.MVSEP_API_KEY = "test-api-key";
  });

  afterEach(() => {
    delete process.env.MVSEP_API_KEY;
  });

  it("throws if MVSEP_API_KEY is not set", async () => {
    delete process.env.MVSEP_API_KEY;
    await expect(submitMvsepVocalIsolation("https://example.com/audio.mp3"))
      .rejects.toThrow("MVSEP_API_KEY not configured");
  });

  it("returns jobId (hash) on successful submission", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({
      success: true,
      data: { hash: MOCK_HASH, link: `https://mvsep.com/api/separation/get?hash=${MOCK_HASH}` },
    }));
    const result = await submitMvsepVocalIsolation("https://example.com/audio.mp3");
    expect(result.jobId).toBe(MOCK_HASH);
  });

  it("sends correct sep_type and add_opt2 for best quality preset", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({
      success: true,
      data: { hash: MOCK_HASH, link: "" },
    }));
    await submitMvsepVocalIsolation("https://example.com/audio.mp3");

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("https://mvsep.com/api/separation/create");
    expect(options.method).toBe("POST");

    const body = new URLSearchParams(options.body);
    expect(body.get("sep_type")).toBe("26");
    expect(body.get("add_opt2")).toBe("7");
    expect(body.get("output_format")).toBe("1"); // WAV 16-bit
    expect(body.get("is_demo")).toBe("false");
    expect(body.get("url")).toBe("https://example.com/audio.mp3");
    expect(body.get("api_token")).toBe("test-api-key");
  });

  it("throws on HTTP error response", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse("Internal Server Error", 500));
    await expect(submitMvsepVocalIsolation("https://example.com/audio.mp3"))
      .rejects.toThrow("MVSEP submit failed: HTTP 500");
  });

  it("throws when API returns success: false", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({
      success: false,
      data: { message: "Invalid token" },
    }));
    await expect(submitMvsepVocalIsolation("https://example.com/audio.mp3"))
      .rejects.toThrow("MVSEP submit error");
  });

  it("throws when API returns success: true but no hash", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({ success: true, data: {} }));
    await expect(submitMvsepVocalIsolation("https://example.com/audio.mp3"))
      .rejects.toThrow("MVSEP submit error");
  });
});

// ─── pollMvsepVocalIsolation ──────────────────────────────────────────────────
describe("pollMvsepVocalIsolation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.MVSEP_API_KEY = "test-api-key";
  });

  afterEach(() => {
    delete process.env.MVSEP_API_KEY;
  });

  it("throws if MVSEP_API_KEY is not set", async () => {
    delete process.env.MVSEP_API_KEY;
    await expect(pollMvsepVocalIsolation(MOCK_HASH))
      .rejects.toThrow("MVSEP_API_KEY not configured");
  });

  it("polls the correct endpoint with hash parameter", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({
      success: true,
      status: "waiting",
      data: {},
    }));
    await pollMvsepVocalIsolation(MOCK_HASH);
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/separation/get");
    expect(url).toContain(`hash=${encodeURIComponent(MOCK_HASH)}`);
    // Must NOT use get-remote endpoint for standard URL submissions
    expect(url).not.toContain("get-remote");
  });

  it("returns waiting status when job is queued", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({
      success: true,
      status: "waiting",
      data: {},
    }));
    const result = await pollMvsepVocalIsolation(MOCK_HASH);
    expect(result.status).toBe("waiting");
  });

  it("returns processing status when job is running", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({
      success: true,
      status: "processing",
      data: {},
    }));
    const result = await pollMvsepVocalIsolation(MOCK_HASH);
    expect(result.status).toBe("processing");
  });

  it("maps 'distributing' status to processing", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({
      success: true,
      status: "distributing",
      data: {},
    }));
    const result = await pollMvsepVocalIsolation(MOCK_HASH);
    expect(result.status).toBe("processing");
  });

  it("maps 'merging' status to processing", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({
      success: true,
      status: "merging",
      data: {},
    }));
    const result = await pollMvsepVocalIsolation(MOCK_HASH);
    expect(result.status).toBe("processing");
  });

  it("returns error status on failure", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({
      success: true,
      status: "failed",
      data: { message: "Separation failed" },
    }));
    const result = await pollMvsepVocalIsolation(MOCK_HASH);
    expect(result.status).toBe("error");
    expect(result.errorMessage).toBe("Separation failed");
  });

  it("extracts vocalsUrl from done response by filename", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({
      success: true,
      status: "done",
      data: {
        files: [
          { name: "vocals.wav", url: "https://cdn.mvsep.com/vocals.wav" },
          { name: "instrumental.wav", url: "https://cdn.mvsep.com/instrum.wav" },
        ],
      },
    }));
    const result = await pollMvsepVocalIsolation(MOCK_HASH);
    expect(result.status).toBe("done");
    expect(result.vocalsUrl).toBe("https://cdn.mvsep.com/vocals.wav");
    expect(result.instrumentalUrl).toBe("https://cdn.mvsep.com/instrum.wav");
  });

  it("extracts vocalsUrl when file is named 'voice_lead'", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({
      success: true,
      status: "done",
      data: {
        files: [
          { name: "voice_lead.wav", url: "https://cdn.mvsep.com/voice_lead.wav" },
          { name: "accompaniment.wav", url: "https://cdn.mvsep.com/accompaniment.wav" },
        ],
      },
    }));
    const result = await pollMvsepVocalIsolation(MOCK_HASH);
    expect(result.status).toBe("done");
    expect(result.vocalsUrl).toBe("https://cdn.mvsep.com/voice_lead.wav");
    expect(result.instrumentalUrl).toBe("https://cdn.mvsep.com/accompaniment.wav");
  });

  it("falls back to first file as vocals if no name match", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({
      success: true,
      status: "done",
      data: {
        files: [
          { name: "output_1.wav", url: "https://cdn.mvsep.com/output_1.wav" },
          { name: "output_2.wav", url: "https://cdn.mvsep.com/output_2.wav" },
        ],
      },
    }));
    const result = await pollMvsepVocalIsolation(MOCK_HASH);
    expect(result.status).toBe("done");
    expect(result.vocalsUrl).toBe("https://cdn.mvsep.com/output_1.wav");
  });

  it("returns error when API success is false", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({
      success: false,
      data: { message: "Hash not found" },
    }));
    const result = await pollMvsepVocalIsolation(MOCK_HASH);
    expect(result.status).toBe("error");
  });

  it("throws on HTTP error", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse("Not Found", 404));
    await expect(pollMvsepVocalIsolation(MOCK_HASH))
      .rejects.toThrow("MVSEP poll failed: HTTP 404");
  });

  it("includes rawData in done response", async () => {
    const files = [
      { name: "vocals.wav", url: "https://cdn.mvsep.com/vocals.wav" },
      { name: "instrumental.wav", url: "https://cdn.mvsep.com/instrum.wav" },
    ];
    mockFetch.mockResolvedValueOnce(makeResponse({
      success: true,
      status: "done",
      data: { files },
    }));
    const result = await pollMvsepVocalIsolation(MOCK_HASH);
    expect(result.rawData).toEqual(files);
  });
});
