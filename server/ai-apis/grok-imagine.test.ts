/**
 * grok-imagine.test.ts
 * Unit tests for the Grok Imagine API integration.
 * All HTTP calls are mocked — no real API key required.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import axios from "axios";

// Mock axios before importing the module under test
vi.mock("axios");
const mockedAxios = vi.mocked(axios, true);

// Helper to re-import the module with a fresh env
async function importModule() {
  vi.resetModules();
  return import("./grok-imagine");
}

describe("Grok Imagine — Image Generation", () => {
  beforeEach(() => {
    process.env.XAI_API_KEY = "test-xai-key-123";
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.XAI_API_KEY;
  });

  it("throws if XAI_API_KEY is not set", async () => {
    delete process.env.XAI_API_KEY;
    const { generateGrokImage } = await importModule();
    await expect(
      generateGrokImage({ prompt: "A sunset over the ocean" })
    ).rejects.toThrow("XAI_API_KEY is not configured");
  });

  it("calls the correct endpoint with default params", async () => {
    const mockResponse = {
      data: {
        data: [
          {
            url: "https://cdn.x.ai/images/abc123.jpg",
            revised_prompt: "A beautiful sunset over the ocean",
          },
        ],
      },
    };
    mockedAxios.post = vi.fn().mockResolvedValue(mockResponse);

    const { generateGrokImage } = await importModule();
    const results = await generateGrokImage({ prompt: "A sunset over the ocean" });

    expect(mockedAxios.post).toHaveBeenCalledWith(
      "https://api.x.ai/v1/images/generations",
      expect.objectContaining({
        // Default model is grok-imagine-image (xAI dropped the -pro suffix)
        model: "grok-imagine-image",
        prompt: "A sunset over the ocean",
        n: 1,
        // Note: xAI grok-imagine-image does NOT support 'size' param — omitted by implementation
        response_format: "url",
      }),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-xai-key-123",
        }),
      })
    );

    expect(results).toHaveLength(1);
    expect(results[0].url).toBe("https://cdn.x.ai/images/abc123.jpg");
    expect(results[0].revisedPrompt).toBe("A beautiful sunset over the ocean");
  });

  it("returns multiple images when n > 1", async () => {
    const mockResponse = {
      data: {
        data: [
          { url: "https://cdn.x.ai/images/img1.jpg" },
          { url: "https://cdn.x.ai/images/img2.jpg" },
          { url: "https://cdn.x.ai/images/img3.jpg" },
        ],
      },
    };
    mockedAxios.post = vi.fn().mockResolvedValue(mockResponse);

    const { generateGrokImage } = await importModule();
    const results = await generateGrokImage({
      prompt: "A mountain landscape",
      n: 3,
      size: "1792x1024",
    });

    expect(results).toHaveLength(3);
    expect(results[0].url).toBe("https://cdn.x.ai/images/img1.jpg");
    expect(results[2].url).toBe("https://cdn.x.ai/images/img3.jpg");
  });

  it("uses the specified model when provided", async () => {
    const mockResponse = {
      data: { data: [{ url: "https://cdn.x.ai/images/test.jpg" }] },
    };
    mockedAxios.post = vi.fn().mockResolvedValue(mockResponse);

    const { generateGrokImage } = await importModule();
    await generateGrokImage({
      prompt: "Abstract art",
      model: "grok-imagine-image",
    });

    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ model: "grok-imagine-image" }),
      expect.any(Object)
    );
  });

  it("handles empty url in response gracefully", async () => {
    const mockResponse = {
      data: {
        data: [{ b64_json: "base64encodeddata==" }],
      },
    };
    mockedAxios.post = vi.fn().mockResolvedValue(mockResponse);

    const { generateGrokImage } = await importModule();
    const results = await generateGrokImage({
      prompt: "Test",
      response_format: "b64_json",
    });

    expect(results[0].url).toBe("");
    expect(results[0].b64Json).toBe("base64encodeddata==");
  });

  it("propagates axios errors", async () => {
    mockedAxios.post = vi.fn().mockRejectedValue(new Error("Network error"));

    const { generateGrokImage } = await importModule();
    await expect(
      generateGrokImage({ prompt: "Test" })
    ).rejects.toThrow("Network error");
  });
});

describe("Grok Imagine — Video Submission", () => {
  beforeEach(() => {
    process.env.XAI_API_KEY = "test-xai-key-123";
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.XAI_API_KEY;
  });

  it("submits a text-to-video request and returns request_id", async () => {
    const mockResponse = {
      data: { request_id: "req_abc123xyz" },
    };
    mockedAxios.post = vi.fn().mockResolvedValue(mockResponse);

    const { submitGrokVideo } = await importModule();
    const requestId = await submitGrokVideo({
      prompt: "A dancer performing on stage",
      duration: 5,
      aspect_ratio: "9:16",
    });

    expect(requestId).toBe("req_abc123xyz");
    expect(mockedAxios.post).toHaveBeenCalledWith(
      "https://api.x.ai/v1/videos/generations",
      expect.objectContaining({
        model: "grok-imagine-video",
        prompt: "A dancer performing on stage",
        duration: 5,
        aspect_ratio: "9:16",
        resolution: "720p",
      }),
      expect.any(Object)
    );
  });

  it("submits an image-to-video request with image_url", async () => {
    const mockResponse = {
      data: { request_id: "req_img2vid_456" },
    };
    mockedAxios.post = vi.fn().mockResolvedValue(mockResponse);

    const { submitGrokVideo } = await importModule();
    const requestId = await submitGrokVideo({
      prompt: "Animate this portrait",
      image_url: "https://example.com/portrait.jpg",
      duration: 8,
    });

    expect(requestId).toBe("req_img2vid_456");
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        image_url: "https://example.com/portrait.jpg",
      }),
      expect.any(Object)
    );
  });

  it("throws if response has no request_id", async () => {
    const mockResponse = {
      data: { error: "Invalid prompt" },
    };
    mockedAxios.post = vi.fn().mockResolvedValue(mockResponse);

    const { submitGrokVideo } = await importModule();
    await expect(
      submitGrokVideo({ prompt: "Test" })
    ).rejects.toThrow("no request_id in response");
  });

  it("uses default duration=5 and resolution=720p when not specified", async () => {
    const mockResponse = {
      data: { request_id: "req_defaults" },
    };
    mockedAxios.post = vi.fn().mockResolvedValue(mockResponse);

    const { submitGrokVideo } = await importModule();
    await submitGrokVideo({ prompt: "Test defaults" });

    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        duration: 5,
        resolution: "720p",
        aspect_ratio: "9:16",
      }),
      expect.any(Object)
    );
  });
});

describe("Grok Imagine — Video Polling", () => {
  beforeEach(() => {
    process.env.XAI_API_KEY = "test-xai-key-123";
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.XAI_API_KEY;
  });

  it("returns status=done with videoUrl when complete", async () => {
    const mockResponse = {
      data: {
        status: "done",
        video: {
          url: "https://cdn.x.ai/videos/output_abc123.mp4",
          duration: 5,
        },
      },
    };
    mockedAxios.get = vi.fn().mockResolvedValue(mockResponse);

    const { pollGrokVideo } = await importModule();
    const result = await pollGrokVideo("req_abc123");

    expect(result.status).toBe("done");
    expect(result.videoUrl).toBe("https://cdn.x.ai/videos/output_abc123.mp4");
    expect(result.duration).toBe(5);
  });

  it("returns status=processing with no videoUrl while in progress", async () => {
    const mockResponse = {
      data: { status: "processing" },
    };
    mockedAxios.get = vi.fn().mockResolvedValue(mockResponse);

    const { pollGrokVideo } = await importModule();
    const result = await pollGrokVideo("req_processing");

    expect(result.status).toBe("processing");
    expect(result.videoUrl).toBeUndefined();
  });

  it("returns status=failed when generation fails", async () => {
    const mockResponse = {
      data: { status: "failed" },
    };
    mockedAxios.get = vi.fn().mockResolvedValue(mockResponse);

    const { pollGrokVideo } = await importModule();
    const result = await pollGrokVideo("req_failed");

    expect(result.status).toBe("failed");
  });

  it("polls the correct endpoint with the request_id", async () => {
    const mockResponse = {
      data: { status: "pending" },
    };
    mockedAxios.get = vi.fn().mockResolvedValue(mockResponse);

    const { pollGrokVideo } = await importModule();
    await pollGrokVideo("req_test_id_789");

    expect(mockedAxios.get).toHaveBeenCalledWith(
      "https://api.x.ai/v1/videos/req_test_id_789",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-xai-key-123",
        }),
      })
    );
  });
});

describe("Grok Imagine — Synchronous Video Generation", () => {
  beforeEach(() => {
    process.env.XAI_API_KEY = "test-xai-key-123";
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    delete process.env.XAI_API_KEY;
    vi.useRealTimers();
  });

  it("returns video URL when generation completes on first poll", async () => {
    mockedAxios.post = vi.fn().mockResolvedValue({
      data: { request_id: "req_sync_001" },
    });
    mockedAxios.get = vi.fn().mockResolvedValue({
      data: {
        status: "done",
        video: { url: "https://cdn.x.ai/videos/sync_result.mp4", duration: 5 },
      },
    });

    const { generateGrokVideoSync } = await importModule();
    const promise = generateGrokVideoSync(
      { prompt: "Cinematic landscape" },
      { pollIntervalMs: 100 }
    );

    // Advance fake timers past the poll interval
    await vi.runAllTimersAsync();
    const url = await promise;

    expect(url).toBe("https://cdn.x.ai/videos/sync_result.mp4");
  });

  it("throws when generation fails", async () => {
    mockedAxios.post = vi.fn().mockResolvedValue({
      data: { request_id: "req_sync_fail" },
    });
    mockedAxios.get = vi.fn().mockResolvedValue({
      data: { status: "failed" },
    });

    const { generateGrokVideoSync } = await importModule();
    // Attach rejection handler BEFORE running timers to avoid unhandled rejection
    const promise = generateGrokVideoSync(
      { prompt: "Test" },
      { pollIntervalMs: 100 }
    );
    const expectation = expect(promise).rejects.toThrow("failed");
    await vi.runAllTimersAsync();
    await expectation;
  });

  it("throws when generation expires", async () => {
    mockedAxios.post = vi.fn().mockResolvedValue({
      data: { request_id: "req_sync_expire" },
    });
    mockedAxios.get = vi.fn().mockResolvedValue({
      data: { status: "expired" },
    });

    const { generateGrokVideoSync } = await importModule();
    // Attach rejection handler BEFORE running timers to avoid unhandled rejection
    const promise = generateGrokVideoSync(
      { prompt: "Test" },
      { pollIntervalMs: 100 }
    );
    const expectation = expect(promise).rejects.toThrow("expired");
    await vi.runAllTimersAsync();
    await expectation;
  });
});
