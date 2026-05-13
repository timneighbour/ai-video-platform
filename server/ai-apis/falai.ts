/**
 * fal.ai Integration
 *
 * Powers two capabilities:
 *  1. MuseTalk — audio-driven lip-sync  (fal-ai/musetalk)
 *  2. Seedance 1.5 Pro — image-to-video (bytedance/seedance/v1.5/pro/image-to-video)
 *
 * Auth: FAL_KEY environment variable (set via webdev_request_secrets)
 * SDK:  @fal-ai/client
 */

import { fal } from "@fal-ai/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MuseTalkInput {
  /** URL of a video with a visible face (the avatar to animate) */
  source_video_url: string;
  /** URL of the audio to lip-sync to (MP3, WAV, etc.) */
  audio_url: string;
}

export interface MuseTalkOutput {
  video: {
    url: string;
    content_type?: string;
    file_name?: string;
    file_size?: number;
  };
}

export interface SeedanceI2VInput {
  /** Prompt describing the motion / scene */
  prompt: string;
  /** URL of the reference image */
  image_url: string;
  /** Duration in seconds (5 or 10) */
  duration?: 5 | 10;
  /** Aspect ratio */
  aspect_ratio?: "16:9" | "9:16" | "1:1";
}

export interface SeedanceT2VInput {
  /** Prompt describing the scene */
  prompt: string;
  /** Duration in seconds (5 or 10) */
  duration?: 5 | 10;
  /** Aspect ratio */
  aspect_ratio?: "16:9" | "9:16" | "1:1";
}

export interface SeedanceOutput {
  video: {
    url: string;
    content_type?: string;
    file_name?: string;
    file_size?: number;
  };
}

// ─── Client ───────────────────────────────────────────────────────────────────

export class FalAIClient {
  constructor(apiKey: string) {
    fal.config({ credentials: apiKey });
  }

  /**
   * MuseTalk: animate a face video with an audio track.
   * Returns the URL of the lip-synced video.
   *
   * Uses async queue polling (NOT fal.subscribe) to avoid indefinite blocking.
   * - Polls every 8 seconds for up to 10 minutes per attempt
   * - Retries up to 3 times on failure before throwing
   * - Typical turnaround: 30–120 seconds
   */
  async museTalkLipSync(input: MuseTalkInput): Promise<string> {
    const MAX_ATTEMPTS = 3;
    const POLL_INTERVAL_MS = 8_000;      // poll every 8 seconds
    const ATTEMPT_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes per attempt

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      let requestId: string | null = null;
      try {
        console.log(`[MuseTalk] Submitting lip-sync job (attempt ${attempt}/${MAX_ATTEMPTS})`);
        requestId = await this.museTalkSubmit(input);
        console.log(`[MuseTalk] Job submitted — requestId: ${requestId}`);

        const deadline = Date.now() + ATTEMPT_TIMEOUT_MS;
        while (Date.now() < deadline) {
          await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
          const statusResult = await this.museTalkStatus(requestId);
          console.log(`[MuseTalk] Poll status: ${statusResult.status} (requestId: ${requestId})`);

          if (statusResult.status === "completed") {
            if (!statusResult.video_url) {
              throw new Error("MuseTalk: completed but no video URL returned");
            }
            console.log(`[MuseTalk] Lip-sync complete — url: ${statusResult.video_url}`);
            return statusResult.video_url;
          }

          if (statusResult.status === "failed") {
            throw new Error(`MuseTalk: job failed (requestId: ${requestId})`);
          }
          // status is "pending" or "processing" — keep polling
        }
        throw new Error(`MuseTalk: timed out after ${ATTEMPT_TIMEOUT_MS / 60000} minutes (requestId: ${requestId})`);
      } catch (err) {
        console.warn(`[MuseTalk] Attempt ${attempt}/${MAX_ATTEMPTS} failed: ${err}`);
        if (attempt === MAX_ATTEMPTS) {
          throw new Error(`MuseTalk: all ${MAX_ATTEMPTS} attempts failed. Last error: ${err}`);
        }
        // Wait 5 seconds before retrying
        await new Promise(r => setTimeout(r, 5_000));
      }
    }
    // TypeScript: unreachable but required
    throw new Error("MuseTalk: unexpected exit from retry loop");
  }

  /**
   * MuseTalk via queue — submit and return request ID for async polling.
   */
  async museTalkSubmit(input: MuseTalkInput): Promise<string> {
    const { request_id } = await fal.queue.submit("fal-ai/musetalk", {
      input: {
        source_video_url: input.source_video_url,
        audio_url: input.audio_url,
      },
    });
    return request_id;
  }

  /**
   * Poll MuseTalk queue status.
   */
  async museTalkStatus(requestId: string): Promise<{
    status: "pending" | "processing" | "completed" | "failed";
    video_url?: string;
  }> {
    const status = await fal.queue.status("fal-ai/musetalk", {
      requestId,
      logs: false,
    });

    if (status.status === "COMPLETED") {
      const result = await fal.queue.result("fal-ai/musetalk", { requestId }) as { data: MuseTalkOutput };
      return {
        status: "completed",
        video_url: result.data?.video?.url,
      };
    }

    const statusMap: Record<string, "pending" | "processing" | "completed" | "failed"> = {
      IN_QUEUE: "pending",
      IN_PROGRESS: "processing",
      COMPLETED: "completed",
      FAILED: "failed",
    };

    return { status: statusMap[status.status] ?? "processing" };
  }

  /**
   * Seedance 1.5 Pro: image-to-video generation.
   * Submit job and return request ID for async polling.
   */
  async seedanceImageToVideoSubmit(input: SeedanceI2VInput): Promise<string> {
    const { request_id } = await fal.queue.submit("bytedance/seedance/v1.5/pro/image-to-video", {
      input: {
        prompt: input.prompt,
        image_url: input.image_url,
        duration: input.duration ?? 5,
        aspect_ratio: input.aspect_ratio ?? "16:9",
      },
    });
    return request_id;
  }

  /**
   * Seedance 1.5 Pro: text-to-video generation.
   * Submit job and return request ID for async polling.
   */
  async seedanceTextToVideoSubmit(input: SeedanceT2VInput): Promise<string> {
    const { request_id } = await fal.queue.submit("bytedance/seedance/v1.5/pro/text-to-video", {
      input: {
        prompt: input.prompt,
        duration: input.duration ?? 5,
        aspect_ratio: input.aspect_ratio ?? "16:9",
      },
    });
    return request_id;
  }

  /**
   * Seedance 1.5 Pro: image-to-video — synchronous wrapper.
   * Uses fal.subscribe to block until the video is ready and returns the video URL directly.
   * Typical turnaround: 60–180 seconds.
   */
  async seedanceImageToVideo(input: SeedanceI2VInput): Promise<string> {
    const result = await fal.subscribe("bytedance/seedance/v1.5/pro/image-to-video", {
      input: {
        prompt: input.prompt,
        image_url: input.image_url,
        duration: input.duration ?? 5,
        aspect_ratio: input.aspect_ratio ?? "16:9",
      },
      logs: false,
    }) as { data: SeedanceOutput };

    const videoUrl = result.data?.video?.url;
    if (!videoUrl) {
      throw new Error("Seedance i2v: no video URL in response");
    }
    return videoUrl;
  }

  /**
   * Poll Seedance queue status (works for both i2v and t2v).
   */
  async seedanceStatus(
    requestId: string,
    modelId: "bytedance/seedance/v1.5/pro/image-to-video" | "bytedance/seedance/v1.5/pro/text-to-video"
  ): Promise<{
    status: "pending" | "processing" | "completed" | "failed";
    video_url?: string;
  }> {
    const status = await fal.queue.status(modelId, {
      requestId,
      logs: false,
    });

    if (status.status === "COMPLETED") {
      const result = await fal.queue.result(modelId, { requestId }) as { data: SeedanceOutput };
      return {
        status: "completed",
        video_url: result.data?.video?.url,
      };
    }

    const statusMap: Record<string, "pending" | "processing" | "completed" | "failed"> = {
      IN_QUEUE: "pending",
      IN_PROGRESS: "processing",
      COMPLETED: "completed",
      FAILED: "failed",
    };

    return { status: statusMap[status.status] ?? "processing" };
  }
}

/**
 * Initialize the fal.ai client from environment variables.
 */
export function initFalAI(): FalAIClient {
  const apiKey = process.env.FAL_AI_API_KEY;
  if (!apiKey) {
    throw new Error("FAL_AI_API_KEY is not configured");
  }
  return new FalAIClient(apiKey);
}
