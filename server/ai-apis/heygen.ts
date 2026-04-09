/**
 * HeyGen Integration
 * Handles lip-sync and animated character video generation
 */

import axios from "axios";

const HEYGEN_API_BASE = "https://api.heygen.com";

interface HeyGenVideoRequest {
  avatar_id?: string;
  voice_id?: string;
  input_text: string;
  title?: string;
  test?: boolean;
}

interface HeyGenVideoResponse {
  code: number;
  message: string;
  data: {
    video_id: string;
    status: "pending" | "processing" | "completed" | "failed";
    created_at: string;
    updated_at: string;
  };
}

interface HeyGenVideoStatus {
  code: number;
  message: string;
  data: {
    video_id: string;
    status: "pending" | "processing" | "completed" | "failed";
    video_url?: string;
    created_at: string;
    updated_at: string;
  };
}

interface HeyGenPhotoAvatarRequest {
  image_url: string;
  avatar_name: string;
}

interface HeyGenPhotoAvatarResponse {
  code: number;
  message: string;
  data: {
    avatar_id: string;
    avatar_name: string;
    created_at: string;
  };
}

export class HeyGenClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private getHeaders() {
    return {
      "X-Api-Key": this.apiKey,
      "Content-Type": "application/json",
    };
  }

  /**
   * Create a video with avatar and text
   */
  async createVideo(request: HeyGenVideoRequest): Promise<string> {
    try {
      const response = await axios.post<HeyGenVideoResponse>(
        `${HEYGEN_API_BASE}/v1/video_agent/generate`,
        {
          prompt: request.input_text,
          title: request.title || "Generated Video",
          test: request.test || false,
        },
        {
          headers: this.getHeaders(),
          timeout: 30000,
        }
      );

      if (response.data.code === 0 && response.data.data?.video_id) {
        return response.data.data.video_id;
      } else {
        throw new Error(
          `HeyGen API error: ${response.data.message || "Unknown error"}`
        );
      }
    } catch (error) {
      console.error("HeyGen create video error:", error);
      throw error;
    }
  }

  /**
   * Get video status and details
   */
  async getVideoStatus(videoId: string): Promise<HeyGenVideoStatus["data"]> {
    try {
      const response = await axios.get<HeyGenVideoStatus>(
        `${HEYGEN_API_BASE}/v1/video_agent/video/${videoId}`,
        {
          headers: this.getHeaders(),
          timeout: 30000,
        }
      );

      if (response.data.code === 0) {
        return response.data.data;
      } else {
        throw new Error(
          `HeyGen API error: ${response.data.message || "Unknown error"}`
        );
      }
    } catch (error) {
      console.error("HeyGen get status error:", error);
      throw error;
    }
  }

  /**
   * Create a photo avatar from an image URL
   */
  async createPhotoAvatar(
    request: HeyGenPhotoAvatarRequest
  ): Promise<string> {
    try {
      const response = await axios.post<HeyGenPhotoAvatarResponse>(
        `${HEYGEN_API_BASE}/v1/photo_avatar/train`,
        {
          image_url: request.image_url,
          avatar_name: request.avatar_name,
        },
        {
          headers: this.getHeaders(),
          timeout: 60000,
        }
      );

      if (response.data.code === 0 && response.data.data?.avatar_id) {
        return response.data.data.avatar_id;
      } else {
        throw new Error(
          `HeyGen API error: ${response.data.message || "Unknown error"}`
        );
      }
    } catch (error) {
      console.error("HeyGen create photo avatar error:", error);
      throw error;
    }
  }

  /**
   * Translate a video to another language
   */
  async translateVideo(videoUrl: string, targetLanguage: string) {
    try {
      const response = await axios.post(
        `${HEYGEN_API_BASE}/v1/video_translate/translate`,
        {
          video_url: videoUrl,
          target_language: targetLanguage,
        },
        {
          headers: this.getHeaders(),
          timeout: 60000,
        }
      );

      if (response.data.code === 0) {
        return response.data.data;
      } else {
        throw new Error(
          `HeyGen API error: ${response.data.message || "Unknown error"}`
        );
      }
    } catch (error) {
      console.error("HeyGen translate video error:", error);
      throw error;
    }
  }
}

/**
 * Initialize HeyGen client with environment variables
 */
export function initHeyGen(): HeyGenClient {
  const apiKey = process.env.HEYGEN_API_KEY;

  if (!apiKey) {
    throw new Error("HeyGen API key not configured");
  }

  return new HeyGenClient(apiKey);
}
