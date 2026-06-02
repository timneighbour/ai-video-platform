/**
 * Tests for sliceVocalStemForSeedance
 *
 * Tests the per-scene vocal stem slicing utility that extracts a time-windowed
 * WAV segment from a full vocal stem and uploads it to S3 for Seedance r2v.
 *
 * Strategy: mock the three external dependencies (fetch, child_process.exec,
 * storagePut) and let the real fs calls write to the actual OS temp directory.
 * ffmpeg is mocked to create a real (empty) output file so the size check passes.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// ─── Mock storagePut so no real S3 calls are made ───────────────────────────
vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({
    url: "https://cdn.example.com/stem-slice-test.wav",
    key: "stem-slice-test.wav",
  }),
}));

// ─── Mock child_process so ffmpeg is never invoked ──────────────────────────
// The mock also creates the expected output .wav file so existsSync passes.
let lastExecCmd = "";
vi.mock("child_process", async (importOriginal) => {
  const original = await importOriginal<typeof import("child_process")>();
  return {
    ...original,
    exec: vi.fn((cmd: string, opts: any, callback?: Function) => {
      lastExecCmd = cmd;
      const cb = typeof opts === "function" ? opts : callback;
      // Create the output file so the real fs.existsSync check passes
      const wavMatch = cmd.match(/"([^"]+\.wav)"[^"]*$/);
      if (wavMatch) {
        try {
          // Write a minimal WAV header (44 bytes) + 1KB of silence so size > 500
          const buf = Buffer.alloc(1100, 0);
          fs.writeFileSync(wavMatch[1], buf);
        } catch {}
      }
      if (cb) cb(null, { stdout: "", stderr: "" });
      return { pid: 1234 } as any;
    }),
  };
});

// ─── Mock fetch for audio download ──────────────────────────────────────────
const MOCK_WAV_CONTENT = Buffer.alloc(1024, 0); // small placeholder

global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  status: 200,
  arrayBuffer: async () => MOCK_WAV_CONTENT.buffer,
} as any);

import { sliceVocalStemForSeedance } from "./audio-clip-extractor";
import { storagePut } from "./storage";

// Track temp files created so we can clean them up
const tempFilesCreated: string[] = [];

describe("sliceVocalStemForSeedance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastExecCmd = "";
    // Reset fetch mock to default success
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: async () => MOCK_WAV_CONTENT.buffer,
    });
  });

  afterEach(() => {
    // Clean up any temp files left by the mock
    for (const f of tempFilesCreated) {
      try { fs.unlinkSync(f); } catch {}
    }
    tempFilesCreated.length = 0;
  });

  it("returns an S3 URL for a valid vocal stem slice", async () => {
    const url = await sliceVocalStemForSeedance(
      "https://cdn.example.com/vocals-test.wav",
      6,
      6,
      780014
    );
    expect(url).toBe("https://cdn.example.com/stem-slice-test.wav");
  });

  it("calls storagePut with audio/wav content type", async () => {
    await sliceVocalStemForSeedance(
      "https://cdn.example.com/vocals-test.wav",
      0,
      6,
      780013
    );
    expect(storagePut).toHaveBeenCalledWith(
      expect.stringContaining("music-video-stem-slices/780013-"),
      expect.any(Buffer),
      "audio/wav"
    );
  });

  it("clamps duration to Seedance max (10s)", async () => {
    await sliceVocalStemForSeedance(
      "https://cdn.example.com/vocals-test.wav",
      0,
      15, // exceeds 10s max
      780015
    );
    expect(lastExecCmd).toContain("-t 10");
  });

  it("clamps duration to Seedance min (1s)", async () => {
    await sliceVocalStemForSeedance(
      "https://cdn.example.com/vocals-test.wav",
      0,
      0.5, // below 1s min
      780016
    );
    expect(lastExecCmd).toContain("-t 1");
  });

  it("uses decode-based seek: -ss appears AFTER -i for frame-perfect accuracy", async () => {
    await sliceVocalStemForSeedance(
      "https://cdn.example.com/vocals-test.wav",
      12,
      6,
      780017
    );
    const iPos = lastExecCmd.indexOf("-i ");
    const ssPos = lastExecCmd.indexOf("-ss ");
    expect(iPos).toBeGreaterThan(-1);
    expect(ssPos).toBeGreaterThan(iPos);
    expect(lastExecCmd).toContain("-ss 12");
  });

  it("outputs PCM WAV (pcm_s16le) and not MP3 for lossless quality", async () => {
    await sliceVocalStemForSeedance(
      "https://cdn.example.com/vocals-test.wav",
      6,
      6,
      780018
    );
    expect(lastExecCmd).toContain("pcm_s16le");
    expect(lastExecCmd).toContain(".wav");
    expect(lastExecCmd).not.toContain("libmp3lame");
  });

  it("downloads the stem from the provided URL", async () => {
    await sliceVocalStemForSeedance(
      "https://cdn.example.com/vocals-specific.wav",
      0,
      6,
      780019
    );
    expect(global.fetch).toHaveBeenCalledWith(
      "https://cdn.example.com/vocals-specific.wav"
    );
  });

  it("throws when fetch returns a non-ok response", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 404,
    });
    await expect(
      sliceVocalStemForSeedance(
        "https://cdn.example.com/missing.wav",
        0,
        6,
        780020
      )
    ).rejects.toThrow("Failed to download audio");
  });

  it("uses the correct S3 key prefix for stem slices", async () => {
    await sliceVocalStemForSeedance(
      "https://cdn.example.com/vocals-test.wav",
      24,
      6,
      780021
    );
    expect(storagePut).toHaveBeenCalledWith(
      expect.stringMatching(/^music-video-stem-slices\/780021-\d+\.wav$/),
      expect.any(Buffer),
      "audio/wav"
    );
  });
});
