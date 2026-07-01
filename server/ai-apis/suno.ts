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
/** Request for upload-cover: transform an uploaded track into a new style */
export interface SunoUploadCoverRequest {
  /** Public URL of the audio file to cover (max 8 min; max 1 min for V4_5ALL) */
  uploadUrl: string;
  /** Custom mode: requires style + title (+ prompt if not instrumental) */
  customMode: boolean;
  instrumental: boolean;
  /** Model: V4, V4_5, V4_5PLUS, V4_5ALL, V5, V5_5 */
  model?: string;
  /** Lyrics / description (custom mode: exact lyrics; non-custom: description) */
  prompt?: string;
  /** Music style/genre (custom mode only) */
  style?: string;
  /** Track title (custom mode only) */
  title?: string;
  /** Tags to exclude */
  negativeTags?: string;
  /** 0.0-1.0 — how much the style influences the output (default 0.7) */
  styleWeight?: number;
  /** 0.0-1.0 — how much the original audio influences the output (default 0.5) */
  audioWeight?: number;
  callBackUrl?: string;
}

/** Request for upload-extend: continue an uploaded track with AI */
export interface SunoUploadExtendRequest {
  /** Public URL of the audio file to extend */
  uploadUrl: string;
  customMode: boolean;
  instrumental: boolean;
  model?: string;
  prompt?: string;
  style?: string;
  title?: string;
  callBackUrl?: string;
}

/** Response from the Suno file upload API */
export interface SunoFileUploadResponse {
  fileId: string;
  fileUrl: string;
  downloadUrl: string;
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
    // Non-custom mode: Suno enforces a hard 500-character limit on the description prompt.
    const promptBody = useCustomMode && req.lyrics?.trim()
      ? req.lyrics.trim()
      : (req.prompt ?? "").slice(0, 500);

    // customMode is now a REQUIRED boolean field in the Suno API — must always be explicitly true/false
    const body: Record<string, unknown> = {
      customMode: useCustomMode,
      prompt: promptBody,
      instrumental: req.instrumental ?? false,
      model: req.model ?? "V4",
    };

    if (req.callBackUrl) {
      body.callBackUrl = req.callBackUrl;
    }

    if (useCustomMode) {
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
          errorCode?: string | null;
          errorMessage?: string | null;
          response?: {
            taskId?: string;
            sunoData?: Array<{
              id?: string;
              audioUrl?: string;
              streamAudioUrl?: string;
              imageUrl?: string;
              title?: string;
              tags?: string;
              duration?: number;
            }>;
          };
        };
      }>(`${SUNO_API_BASE}/api/v1/generate/record-info?taskId=${taskId}`, {
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
    // API returns uppercase: PENDING, TEXT_SUCCESS, FIRST_SUCCESS, SUCCESS, CREATE_TASK_FAILED, GENERATE_AUDIO_FAILED
    const statusUpper = (d.status ?? "").toUpperCase();
    let status: SunoTaskStatus["status"];
    if (statusUpper === "SUCCESS" || statusUpper === "FIRST_SUCCESS") {
      status = "complete";
    } else if (statusUpper.includes("FAILED") || statusUpper.includes("ERROR") || statusUpper === "CALLBACK_EXCEPTION") {
      status = "failed";
    } else if (statusUpper === "PENDING" || statusUpper === "TEXT_SUCCESS") {
      status = "pending";
    } else {
      status = "processing";
    }

    // Parse tracks from response.sunoData (current API format)
    let tracks: SunoTrack[] | undefined;
    const sunoData = d.response?.sunoData;
    if (sunoData && sunoData.length > 0) {
      tracks = sunoData.map((c) => ({
        id: c.id,
        audioUrl: c.audioUrl ?? "",
        imageUrl: c.imageUrl,
        title: c.title ?? "Generated Track",
        tags: c.tags,
        duration: c.duration,
      }));
    }

    const errorMessage = d.errorMessage ?? undefined;
    return { taskId, status, tracks, errorMessage };
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

  /**
   * Upload a file (stream) to Suno's file hosting and get a public URL.
   * The returned fileUrl can be passed to uploadCover / uploadExtend.
   */
  async uploadFile(fileBuffer: Buffer, mimeType: string, fileName: string): Promise<SunoFileUploadResponse> {
    // Use URL-based upload to avoid form-data dependency issues
    // First, we upload to S3 and then pass the S3 URL to Suno's URL upload endpoint
    // This method accepts a pre-uploaded URL from S3
    throw new Error("uploadFile: use uploadFileFromUrl instead — pass the S3 URL directly");
  }

  /**
   * Upload a file to Suno via a public URL (S3 or CDN).
   * This is the preferred method — upload to S3 first, then pass the URL here.
   */
  async uploadFileFromUrl(fileUrl: string, fileName: string): Promise<SunoFileUploadResponse> {
    const response = await withRetry(() =>
      axios.post<{
        success: boolean;
        code: number;
        msg: string;
        data: { fileId: string; fileUrl: string; downloadUrl: string };
      }>(
        "https://sunoapiorg.redpandaai.co/api/file-url-upload",
        { fileUrl, uploadPath: "audio", fileName },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 120000,
        }
      )
    );
    if (!response.data.success) {
      throw new Error(`Suno file upload failed: ${response.data.msg}`);
    }
    return response.data.data;
  }

  /**
   * Submit an upload-cover task: transform an existing track into a new style.
   * Returns the task ID (same polling endpoint as generate).
   */
  async uploadCover(req: SunoUploadCoverRequest): Promise<string> {
    const body: Record<string, unknown> = {
      uploadUrl: req.uploadUrl,
      customMode: req.customMode,
      instrumental: req.instrumental,
      model: req.model ?? "V4_5",
    };
    if (req.callBackUrl) body.callBackUrl = req.callBackUrl;
    if (req.prompt) body.prompt = req.prompt;
    if (req.customMode) {
      if (req.style) body.style = req.style;
      if (req.title) body.title = req.title;
    }
    if (req.negativeTags) body.negativeTags = req.negativeTags;
    if (req.styleWeight !== undefined) body.styleWeight = req.styleWeight;
    if (req.audioWeight !== undefined) body.audioWeight = req.audioWeight;

    const response = await withRetry(() =>
      axios.post<{ code: number; msg: string; data: { taskId: string } }>(
        `${SUNO_API_BASE}/api/v1/generate/upload-cover`,
        body,
        { headers: this.getHeaders(), timeout: 30000 }
      )
    );
    const data = response.data;
    if (data.code !== 200) throw new Error(`Suno upload-cover error: ${data.msg}`);
    if (!data.data?.taskId) throw new Error("Suno upload-cover: no taskId returned");
    return data.data.taskId;
  }

  /**
   * Submit an upload-extend task: extend an existing track with AI continuation.
   * Returns the task ID.
   */
  async uploadExtend(req: SunoUploadExtendRequest): Promise<string> {
    const body: Record<string, unknown> = {
      uploadUrl: req.uploadUrl,
      customMode: req.customMode,
      instrumental: req.instrumental,
      model: req.model ?? "V4_5",
    };
    if (req.callBackUrl) body.callBackUrl = req.callBackUrl;
    if (req.prompt) body.prompt = req.prompt;
    if (req.customMode) {
      if (req.style) body.style = req.style;
      if (req.title) body.title = req.title;
    }

    const response = await withRetry(() =>
      axios.post<{ code: number; msg: string; data: { taskId: string } }>(
        `${SUNO_API_BASE}/api/v1/generate/upload-extend`,
        body,
        { headers: this.getHeaders(), timeout: 30000 }
      )
    );
    const data = response.data;
    if (data.code !== 200) throw new Error(`Suno upload-extend error: ${data.msg}`);
    if (!data.data?.taskId) throw new Error("Suno upload-extend: no taskId returned");
    return data.data.taskId;
  }
}
export function initSuno(): SunoClient {
  const apiKey = process.env.SUNO_API_KEY;
  if (!apiKey) {
    throw new Error("SUNO_API_KEY is not configured. Add it in Settings → Secrets.");
  }
  return new SunoClient(apiKey);
}
