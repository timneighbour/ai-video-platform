/**
 * Kling AI Integration
 * Handles text-to-video generation with job tracking
 */

import axios from "axios";

const KLING_API_BASE = "https://api-singapore.klingai.com";

interface KlingVideoRequest {
  model_name?: string;
  prompt: string;
  negative_prompt?: string;
  duration?: string; // "5" or "10"
  mode?: "standard" | "pro";
  sound?: "on" | "off";
  aspect_ratio?: "1:1" | "9:16" | "16:9";
  callback_url?: string;
  external_task_id?: string;
}

interface KlingVideoResponse {
  code: number;
  message: string;
  request_id: string;
  data: {
    task_id: string;
    task_info: {
      external_task_id?: string;
    };
    task_status: "submitted" | "processing" | "succeed" | "failed";
    created_at: number;
    updated_at: number;
  };
}

interface KlingTaskStatus {
  code: number;
  message: string;
  request_id: string;
  data: {
    task_id: string;
    task_status: "submitted" | "processing" | "succeed" | "failed";
    task_result?: {
      videos: Array<{
        url: string;
        duration: number;
      }>;
    };
    created_at: number;
    updated_at: number;
  };
}

export class KlingAIClient {
  private accessKey: string;
  private secretKey: string;

  constructor(accessKey: string, secretKey: string) {
    this.accessKey = accessKey;
    this.secretKey = secretKey;
  }

  private getAuthHeader(): string {
    // Kling AI uses Bearer token format
    return `Bearer ${this.accessKey}`;
  }

  /**
   * Create a text-to-video generation task
   */
  async createTextToVideo(request: KlingVideoRequest): Promise<string> {
    try {
      const response = await axios.post<KlingVideoResponse>(
        `${KLING_API_BASE}/v1/videos/text2video`,
        {
          model_name: request.model_name || "kling-v3",
          prompt: request.prompt,
          negative_prompt: request.negative_prompt || "",
          duration: request.duration || "5",
          mode: request.mode || "pro",
          sound: request.sound || "on",
          aspect_ratio: request.aspect_ratio || "16:9",
          callback_url: request.callback_url || "",
          external_task_id: request.external_task_id || "",
        },
        {
          headers: {
            Authorization: this.getAuthHeader(),
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );

      if (response.data.code === 0 && response.data.data?.task_id) {
        return response.data.data.task_id;
      } else {
        throw new Error(
          `Kling API error: ${response.data.message || "Unknown error"}`
        );
      }
    } catch (error) {
      console.error("Kling AI text-to-video error:", error);
      throw error;
    }
  }

  /**
   * Get the status of a video generation task
   */
  async getTaskStatus(taskId: string): Promise<KlingTaskStatus["data"]> {
    try {
      const response = await axios.get<KlingTaskStatus>(
        `${KLING_API_BASE}/v1/videos/text2video/${taskId}`,
        {
          headers: {
            Authorization: this.getAuthHeader(),
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );

      if (response.data.code === 0) {
        return response.data.data;
      } else {
        throw new Error(
          `Kling API error: ${response.data.message || "Unknown error"}`
        );
      }
    } catch (error) {
      console.error("Kling AI get status error:", error);
      throw error;
    }
  }

  /**
   * List all tasks for the user
   */
  async listTasks(pageNum: number = 1, pageSize: number = 30) {
    try {
      const response = await axios.get(
        `${KLING_API_BASE}/v1/videos/text2video?pageNum=${pageNum}&pageSize=${pageSize}`,
        {
          headers: {
            Authorization: this.getAuthHeader(),
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );

      if (response.data.code === 0) {
        return response.data.data;
      } else {
        throw new Error(
          `Kling API error: ${response.data.message || "Unknown error"}`
        );
      }
    } catch (error) {
      console.error("Kling AI list tasks error:", error);
      throw error;
    }
  }
}

/**
 * Initialize Kling AI client with environment variables
 */
export function initKlingAI(): KlingAIClient {
  const accessKey = process.env.KLING_AI_ACCESS_KEY;
  const secretKey = process.env.KLING_AI_SECRET_KEY;

  if (!accessKey || !secretKey) {
    throw new Error("Kling AI credentials not configured");
  }

  return new KlingAIClient(accessKey, secretKey);
}
