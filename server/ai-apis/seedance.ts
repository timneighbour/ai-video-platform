/**
 * Seedance 2.0 Integration
 * Handles ultra-realistic cinematic video generation
 */

import axios from "axios";

const SEEDANCE_API_BASE = "https://api.seedance.ai";

interface SeedanceVideoRequest {
  prompt: string;
  image_url?: string;
  video_url?: string;
  duration?: number; // in seconds
  aspect_ratio?: "16:9" | "9:16" | "1:1";
  quality?: "standard" | "high";
}

interface SeedanceVideoResponse {
  code: number;
  message: string;
  data: {
    task_id: string;
    status: "pending" | "processing" | "completed" | "failed";
    created_at: string;
  };
}

interface SeedanceTaskStatus {
  code: number;
  message: string;
  data: {
    task_id: string;
    status: "pending" | "processing" | "completed" | "failed";
    video_url?: string;
    created_at: string;
    updated_at: string;
  };
}

export class SeedanceClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private getHeaders() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };
  }

  /**
   * Create a text-to-video generation task
   */
  async createTextToVideo(request: SeedanceVideoRequest): Promise<string> {
    try {
      const response = await axios.post<SeedanceVideoResponse>(
        `${SEEDANCE_API_BASE}/v1/video/text-to-video`,
        {
          prompt: request.prompt,
          duration: request.duration || 10,
          aspect_ratio: request.aspect_ratio || "16:9",
          quality: request.quality || "high",
        },
        {
          headers: this.getHeaders(),
          timeout: 30000,
        }
      );

      if (response.data.code === 0 && response.data.data?.task_id) {
        return response.data.data.task_id;
      } else {
        throw new Error(
          `Seedance API error: ${response.data.message || "Unknown error"}`
        );
      }
    } catch (error) {
      console.error("Seedance text-to-video error:", error);
      throw error;
    }
  }

  /**
   * Create an image-to-video generation task
   */
  async createImageToVideo(request: SeedanceVideoRequest): Promise<string> {
    try {
      if (!request.image_url) {
        throw new Error("image_url is required for image-to-video generation");
      }

      const response = await axios.post<SeedanceVideoResponse>(
        `${SEEDANCE_API_BASE}/v1/video/image-to-video`,
        {
          image_url: request.image_url,
          prompt: request.prompt,
          duration: request.duration || 10,
          aspect_ratio: request.aspect_ratio || "16:9",
          quality: request.quality || "high",
        },
        {
          headers: this.getHeaders(),
          timeout: 30000,
        }
      );

      if (response.data.code === 0 && response.data.data?.task_id) {
        return response.data.data.task_id;
      } else {
        throw new Error(
          `Seedance API error: ${response.data.message || "Unknown error"}`
        );
      }
    } catch (error) {
      console.error("Seedance image-to-video error:", error);
      throw error;
    }
  }

  /**
   * Get the status of a video generation task
   */
  async getTaskStatus(taskId: string): Promise<SeedanceTaskStatus["data"]> {
    try {
      const response = await axios.get<SeedanceTaskStatus>(
        `${SEEDANCE_API_BASE}/v1/video/task/${taskId}`,
        {
          headers: this.getHeaders(),
          timeout: 30000,
        }
      );

      if (response.data.code === 0) {
        return response.data.data;
      } else {
        throw new Error(
          `Seedance API error: ${response.data.message || "Unknown error"}`
        );
      }
    } catch (error) {
      console.error("Seedance get status error:", error);
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
