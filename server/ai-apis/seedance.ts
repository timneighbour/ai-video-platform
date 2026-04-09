/**
 * Seedance (ByteDance) Integration
 * Uses the Volcengine Ark API platform for Seedance 2.0 video generation.
 *
 * Correct endpoint (from official Volcengine docs):
 * - Create task: POST https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks
 * - Get status:  GET  https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks/{task_id}
 * - Auth: Bearer $SEEDANCE_API_KEY (sk- prefix)
 * - Model IDs: doubao-seedance-2-0-260128 | doubao-seedance-2-0-fast-250128 | doubao-seedance-1-5-pro-250528
 * Ref: https://www.volcengine.com/docs/82379/1520757
 */

import axios from "axios";

const SEEDANCE_API_BASE = "https://ark.cn-beijing.volces.com/api/v3";

interface SeedanceContentItem {
  type: "text" | "image_url" | "video_url" | "audio_url";
  text?: string;
  image_url?: { url: string; role?: "reference_image" };
  video_url?: { url: string };
  audio_url?: { url: string };
}

interface SeedanceTaskRequest {
  model: string;
  content: SeedanceContentItem[];
  callback_url?: string;
  generate_audio?: boolean;
  return_last_frame?: boolean;
}

interface SeedanceTaskResponse {
  id: string;
  status: "queued" | "running" | "succeeded" | "failed" | "expired";
  created_at?: number;
  content?: Array<{
    type: string;
    video_url?: { url: string };
    image_url?: { url: string };
  }>;
  error?: { code: string; message: string };
}

// Legacy status type for backward compatibility with video-service.ts
interface SeedanceLegacyStatus {
  task_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  video_url?: string;
  created_at: string;
  updated_at: string;
}

export class SeedanceClient {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = "doubao-seedance-2-0-260128") {
    this.apiKey = apiKey;
    this.model = model;
  }

  private getHeaders() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };
  }

  /**
   * Create a text-to-video generation task.
   * Returns the task ID for polling.
   */
  async createTextToVideo(request: {
    prompt: string;
    image_url?: string;
    duration?: number;
    aspect_ratio?: "16:9" | "9:16" | "1:1";
    quality?: string;
  }): Promise<string> {
    const content: SeedanceContentItem[] = [
      { type: "text", text: request.prompt },
    ];

    const requestBody: SeedanceTaskRequest = {
      model: this.model,
      content,
      generate_audio: false,
    };

    try {
      const response = await axios.post<SeedanceTaskResponse>(
        `${SEEDANCE_API_BASE}/contents/generations/tasks`,
        requestBody,
        {
          headers: this.getHeaders(),
          timeout: 60000,
        }
      );

      if (response.data.id) {
        return response.data.id;
      } else {
        throw new Error("Seedance API: no task ID returned");
      }
    } catch (error: any) {
      console.error("Seedance create task error:", error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Create an image-to-video generation task.
   * Returns the task ID for polling.
   */
  async createImageToVideo(request: {
    prompt: string;
    image_url: string;
    duration?: number;
    aspect_ratio?: "16:9" | "9:16" | "1:1";
    quality?: string;
  }): Promise<string> {
    const content: SeedanceContentItem[] = [
      { type: "image_url", image_url: { url: request.image_url, role: "reference_image" } },
    ];

    if (request.prompt) {
      content.unshift({ type: "text", text: request.prompt });
    }

    const requestBody: SeedanceTaskRequest = {
      model: this.model,
      content,
      generate_audio: false,
    };

    try {
      const response = await axios.post<SeedanceTaskResponse>(
        `${SEEDANCE_API_BASE}/contents/generations/tasks`,
        requestBody,
        {
          headers: this.getHeaders(),
          timeout: 60000,
        }
      );

      if (response.data.id) {
        return response.data.id;
      } else {
        throw new Error("Seedance API: no task ID returned");
      }
    } catch (error: any) {
      console.error("Seedance image-to-video error:", error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get the status of a video generation task.
   * Returns a legacy-compatible status object.
   */
  async getTaskStatus(taskId: string): Promise<SeedanceLegacyStatus> {
    try {
      const response = await axios.get<SeedanceTaskResponse>(
        `${SEEDANCE_API_BASE}/contents/generations/tasks/${taskId}`,
        {
          headers: this.getHeaders(),
          timeout: 30000,
        }
      );

      const data = response.data;
      const videoUrl = data.content?.find(
        (c) => c.type === "video_url" || c.video_url
      )?.video_url?.url;

      // Map Volcengine statuses to legacy statuses
      const statusMap: Record<string, SeedanceLegacyStatus["status"]> = {
        queued: "pending",
        running: "processing",
        succeeded: "completed",
        failed: "failed",
        expired: "failed",
      };

      return {
        task_id: taskId,
        status: statusMap[data.status] || "processing",
        video_url: videoUrl,
        created_at: new Date(data.created_at ? data.created_at * 1000 : Date.now()).toISOString(),
        updated_at: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error("Seedance get task status error:", error.response?.data || error.message);
      throw error;
    }
  }
}

/**
 * Initialize Seedance client with environment variables
 */
export function initSeedance(): SeedanceClient {
  const apiKey = process.env.SEEDANCE_API_KEY;

  if (!apiKey) {
    throw new Error("Seedance API key not configured");
  }

  return new SeedanceClient(apiKey);
}
