/**
 * Runway ML Integration
 * Handles video-to-video style transfer and video generation
 */

import axios from "axios";

const RUNWAY_API_BASE = "https://api.runwayml.com";

interface RunwayVideoRequest {
  model: string;
  prompt?: string;
  video_url?: string;
  image_url?: string;
  style?: string;
  duration?: number;
}

interface RunwayTaskResponse {
  code: number;
  message: string;
  data: {
    task_id: string;
    status: "pending" | "processing" | "completed" | "failed";
    created_at: string;
  };
}

interface RunwayTaskStatus {
  code: number;
  message: string;
  data: {
    task_id: string;
    status: "pending" | "processing" | "completed" | "failed";
    output?: {
      video_url?: string;
      image_url?: string;
    };
    created_at: string;
    updated_at: string;
  };
}

export class RunwayClient {
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
   * Create a video-to-video style transfer task
   */
  async createVideoToVideo(request: RunwayVideoRequest): Promise<string> {
    try {
      const response = await axios.post<RunwayTaskResponse>(
        `${RUNWAY_API_BASE}/v1/video/generate`,
        {
          model: request.model || "gen3a",
          video_url: request.video_url,
          prompt: request.prompt || "Apply artistic style",
          style: request.style || "cinematic",
          duration: request.duration || 10,
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
          `Runway API error: ${response.data.message || "Unknown error"}`
        );
      }
    } catch (error) {
      console.error("Runway video-to-video error:", error);
      throw error;
    }
  }

  /**
   * Create an image-to-video generation task
   */
  async createImageToVideo(request: RunwayVideoRequest): Promise<string> {
    try {
      if (!request.image_url) {
        throw new Error("image_url is required for image-to-video generation");
      }

      const response = await axios.post<RunwayTaskResponse>(
        `${RUNWAY_API_BASE}/v1/image_to_video/generate`,
        {
          model: request.model || "gen3a",
          image_url: request.image_url,
          prompt: request.prompt || "Generate video from image",
          duration: request.duration || 10,
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
          `Runway API error: ${response.data.message || "Unknown error"}`
        );
      }
    } catch (error) {
      console.error("Runway image-to-video error:", error);
      throw error;
    }
  }

  /**
   * Get the status of a generation task
   */
  async getTaskStatus(taskId: string): Promise<RunwayTaskStatus["data"]> {
    try {
      const response = await axios.get<RunwayTaskStatus>(
        `${RUNWAY_API_BASE}/v1/task/${taskId}`,
        {
          headers: this.getHeaders(),
          timeout: 30000,
        }
      );

      if (response.data.code === 0) {
        return response.data.data;
      } else {
        throw new Error(
          `Runway API error: ${response.data.message || "Unknown error"}`
        );
      }
    } catch (error) {
      console.error("Runway get status error:", error);
      throw error;
    }
  }
}

/**
 * Initialize Runway client with environment variables
 */
export function initRunway(): RunwayClient {
  const apiKey = process.env.RUNWAY_ML_API_KEY;

  if (!apiKey) {
    throw new Error("Runway ML API key not configured");
  }

  return new RunwayClient(apiKey);
}
