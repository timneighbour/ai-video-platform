/**
 * Suno AI Music Generation Client (via sunoapi.org)
 * Generates music tracks from style/mood/genre prompts.
 *
 * Auth: Bearer token — SUNO_API_KEY env var
 * Docs: https://sunoapi.org/docs
 */

import axios from "axios";
import { withRetry } from "../utils/rateLimitRetry";

const SUNO_API_BASE = "https://api.sunoapi.org";

export interface SunoGenerateRequest {
  /** Describe the style, mood, and topic (non-custom mode). Max 400 chars. */
  prompt: string;
  /**
   * Actual song lyrics (custom mode only).
   * When customMode is active, Suno uses this as the lyric body.
   * If omitted in custom mode, prompt is used as lyrics (may cause 400).
   */
  lyrics?: string;
  /** Music style/genre (custom mode). Max 200 chars. */
  style?: string;
  /** Song title (custom mode). Max 80 chars. */
  title?: string;
  /** True = instrumental only (no vocals) */
  instrumental?: boolean;
  /** Model version: "V3_5" or "V4" */
  model?: "V3_5" | "V4";
  /** Webhook URL for completion notification (required by Suno API) */
  callBackUrl?: string;
}

export interface SunoTrack {
  audioUrl: string;
  imageUrl?: string;
  title: string;
  tags?: string;
  duration?: number;
  id?: string;
}

export interface SunoTaskStatus {
  taskId: string;
  status: "pending" | "processing" | "complete" | "failed";
  tracks?: SunoTrack[];
  errorMessage?: string;
}

export class SunoClient {
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
   * Submit a music generation task.
   * Returns the task ID. Each task generates 2 tracks.
   */
  async generate(req: SunoGenerateRequest): Promise<string> {
    // Custom mode requires: style + title + lyrics (as prompt body)
    // Non-custom mode: prompt is a description and Suno auto-generates lyrics
    const useCustomMode = !!(req.style && req.title);

    // In custom mode, the prompt field must contain the actual lyrics.
    // If the user provided explicit lyrics, use those; otherwise fall back to the description.
    const promptBody = useCustomMode && req.lyrics?.trim()
      ? req.lyrics.trim()
      : req.prompt;

    const body: Record<string, unknown> = {
      prompt: promptBody,
      instrumental: req.instrumental ?? false,
      model: req.model ?? "V4",
    };

    if (req.callBackUrl) {
      body.callBackUrl = req.callBackUrl;
    }

    if (useCustomMode) {
      body.customMode = true;
      body.style = req.style;
      body.title = req.title;
    }

    const response = await withRetry(() =>
      axios.post<{ code: number; msg: string; data: { taskId: string } | { taskId: string }[] }>(
        `${SUNO_API_BASE}/api/v1/generate`,
        body,
        { headers: this.getHeaders(), timeout: 30000 }
      )
    );

    const data = response.data;
    if (data.code !== 200) {
      throw new Error(`Suno API error: ${data.msg}`);
    }

    // API may return a single object or an array
    const taskData = Array.isArray(data.data) ? data.data[0] : data.data;
    if (!taskData?.taskId) {
      throw new Error("Suno API: no taskId returned");
    }

    return taskData.taskId;
  }

  /**
   * Poll the status of a generation task.
   */
  async getTaskStatus(taskId: string): Promise<SunoTaskStatus> {
    const response = await withRetry(() =>
      axios.get<{
        code: number;
        msg: string;
        data: {
          taskId: string;
          status: string;
          clips?: Array<{
            id?: string;
            audio_url?: string;
            image_url?: string;
            title?: string;
            tags?: string;
            duration?: number;
          }>;
          // Some API versions return top-level audioUrl for single track
          audioUrl?: string;
          imageUrl?: string;
          title?: string;
          tags?: string;
        };
      }>(`${SUNO_API_BASE}/api/v1/generate-record-info?taskId=${taskId}`, {
        headers: this.getHeaders(),
        timeout: 30000,
      })
    );

    const data = response.data;
    if (data.code !== 200) {
      throw new Error(`Suno API error: ${data.msg}`);
    }

    const d = data.data;

    // Map status string to our enum
    const statusMap: Record<string, SunoTaskStatus["status"]> = {
      pending: "pending",
      processing: "processing",
      complete: "complete",
      completed: "complete",
      success: "complete",
      failed: "failed",
      error: "failed",
    };
    const status = statusMap[d.status?.toLowerCase()] ?? "processing";

    // Parse tracks from clips array or top-level fields
    let tracks: SunoTrack[] | undefined;
    if (d.clips && d.clips.length > 0) {
      tracks = d.clips.map((c) => ({
        id: c.id,
        audioUrl: c.audio_url ?? "",
        imageUrl: c.image_url,
        title: c.title ?? "Generated Track",
        tags: c.tags,
        duration: c.duration,
      }));
    } else if (d.audioUrl) {
      tracks = [
        {
          audioUrl: d.audioUrl,
          imageUrl: d.imageUrl,
          title: d.title ?? "Generated Track",
          tags: d.tags,
        },
      ];
    }

    return { taskId, status, tracks };
  }

  /**
   * Query remaining API credits.
   */
  async getCredits(): Promise<number> {
    const response = await withRetry(() =>
      axios.get<{ code: number; data: { credits: number } }>(
        `${SUNO_API_BASE}/api/v1/generate-credit`,
        { headers: this.getHeaders(), timeout: 15000 }
      )
    );
    return response.data?.data?.credits ?? 0;
  }
}

export function initSuno(): SunoClient {
  const apiKey = process.env.SUNO_API_KEY;
  if (!apiKey) {
    throw new Error("SUNO_API_KEY is not configured. Add it in Settings → Secrets.");
  }
  return new SunoClient(apiKey);
}
