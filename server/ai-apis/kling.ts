/**
 * Kling AI Integration
 * Handles text-to-video generation with job tracking
 *
 * Authentication: Kling AI requires a JWT signed with HS256 using the secret key.
 * The JWT payload must include: { iss: accessKey, exp: now+1800, nbf: now-5 }
 *
 * Rate limits: Kling AI enforces per-minute submission limits.
 * All submission calls use withRetry (exponential backoff + Retry-After header).
 * Status polling uses withRetry with conservative defaults.
 */

import axios from "axios";
import jwt from "jsonwebtoken";
import { withRetry } from "../utils/rateLimitRetry";

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
    // Kling AI requires a JWT signed with HS256 using the secret key.
    const now = Math.floor(Date.now() / 1000);
    const token = jwt.sign(
      {
        iss: this.accessKey,
        exp: now + 1800, // expires in 30 minutes
        nbf: now - 5,   // not before (5 second grace period)
      },
      this.secretKey,
      { algorithm: "HS256", header: { alg: "HS256", typ: "JWT" } }
    );
    return `Bearer ${token}`;
  }

  /**
   * Create a text-to-video generation task.
   * Wrapped in withRetry to handle 429/503 with exponential backoff + jitter.
   */
  async createTextToVideo(request: KlingVideoRequest): Promise<string> {
    const ts = new Date().toISOString();
    console.log(`[Kling] ${ts} createTextToVideo START — prompt="${request.prompt.slice(0, 80)}..."`);

    try {
      const response = await withRetry(
        () =>
          axios.post<KlingVideoResponse>(
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
          ),
        { maxAttempts: 4, initialDelayMs: 5000, maxDelayMs: 60000, backoffFactor: 2 }
      );

      if (response.data.code === 0 && response.data.data?.task_id) {
        const taskId = response.data.data.task_id;
        console.log(`[Kling] ${new Date().toISOString()} createTextToVideo OK — taskId=${taskId}`);
        return taskId;
      } else {
        throw new Error(`Kling API error: ${response.data.message || "Unknown error"}`);
      }
    } catch (error: unknown) {
      const axiosErr = error as {
        response?: { status?: number; data?: unknown; headers?: Record<string, string> };
        message?: string;
      };
      const httpStatus = axiosErr?.response?.status;

      if (httpStatus === 401) {
        console.error(`[Kling] ${new Date().toISOString()} 401 Unauthorized — check KLING_AI_ACCESS_KEY / KLING_AI_SECRET_KEY`);
        throw new Error("Kling AI authentication failed (401). Check KLING_AI_ACCESS_KEY and KLING_AI_SECRET_KEY.");
      }

      if (httpStatus === 429) {
        const retryAfter = axiosErr?.response?.headers?.["retry-after"] ?? "unknown";
        console.error(
          `[Kling] ${new Date().toISOString()} 429 Rate Limited on createTextToVideo. ` +
          `Retry-After: ${retryAfter}s. Response body:`,
          axiosErr?.response?.data
        );
        throw new Error(
          `Rendering is busy right now. Please wait a moment and try again. (Rate limited — Retry-After: ${retryAfter}s)`
        );
      }

      console.error(`[Kling] ${new Date().toISOString()} createTextToVideo FAILED (HTTP ${httpStatus ?? "?"})`, axiosErr?.response?.data ?? error);
      throw error;
    }
  }

  /**
   * Get the status of a video generation task.
   * Wrapped in withRetry to handle transient 429/503 during polling.
   */
  async getTaskStatus(taskId: string): Promise<KlingTaskStatus["data"]> {
    try {
      const response = await withRetry(
        () =>
          axios.get<KlingTaskStatus>(
            `${KLING_API_BASE}/v1/videos/text2video/${taskId}`,
            {
              headers: {
                Authorization: this.getAuthHeader(),
                "Content-Type": "application/json",
              },
              timeout: 30000,
            }
          ),
        { maxAttempts: 3, initialDelayMs: 5000, maxDelayMs: 30000, backoffFactor: 2 }
      );

      if (response.data.code === 0) {
        const d = response.data.data;
        console.log(`[Kling] ${new Date().toISOString()} getTaskStatus taskId=${taskId} status=${d.task_status}`);
        return d;
      } else {
        throw new Error(`Kling API error: ${response.data.message || "Unknown error"}`);
      }
    } catch (error: unknown) {
      const axiosErr = error as { response?: { status?: number; data?: unknown } };
      const httpStatus = axiosErr?.response?.status;

      if (httpStatus === 401) {
        throw new Error("Kling AI authentication failed (401). Check KLING_AI_ACCESS_KEY and KLING_AI_SECRET_KEY.");
      }

      if (httpStatus === 429) {
        console.warn(`[Kling] ${new Date().toISOString()} 429 on getTaskStatus taskId=${taskId} — will retry via withRetry`);
      }

      console.error(`[Kling] ${new Date().toISOString()} getTaskStatus FAILED (HTTP ${httpStatus ?? "?"}) taskId=${taskId}`, axiosErr?.response?.data ?? error);
      throw error;
    }
  }

  /**
   * List all tasks for the user
   */
  async listTasks(pageNum: number = 1, pageSize: number = 30) {
    try {
      const response = await withRetry(
        () =>
          axios.get(
            `${KLING_API_BASE}/v1/videos/text2video?pageNum=${pageNum}&pageSize=${pageSize}`,
            {
              headers: {
                Authorization: this.getAuthHeader(),
                "Content-Type": "application/json",
              },
              timeout: 30000,
            }
          ),
        { maxAttempts: 2, initialDelayMs: 3000, maxDelayMs: 15000, backoffFactor: 2 }
      );

      if (response.data.code === 0) {
        return response.data.data;
      } else {
        throw new Error(`Kling API error: ${response.data.message || "Unknown error"}`);
      }
    } catch (error: unknown) {
      const axiosErr = error as { response?: { status?: number } };
      if (axiosErr?.response?.status === 401) {
        throw new Error("Kling AI authentication failed (401). Check KLING_AI_ACCESS_KEY and KLING_AI_SECRET_KEY.");
      }
      console.error("[Kling] listTasks error:", error);
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
