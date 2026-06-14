/**
 * BytePlus Vision AI — OmniHuman 1.5
 * Single-image + audio → lip-synced avatar video (1080p)
 *
 * API docs: https://docs.byteplus.com/en/docs/byteplus-vision/omnihuman-video_generation
 *
 * Auth: BytePlus HMAC-SHA256 via @volcengine/openapi SDK
 *   Service=cv, Region=ap-singapore-1
 *
 * req_key: realman_avatar_picture_omni15_cv
 *
 * Input constraints:
 *   - image: JPG/PNG, < 5 MB, face clearly visible, 16:9 crop recommended
 *   - audio: < 60 seconds duration
 *   - prompt: optional, English/Chinese/Japanese/Korean/Spanish/Indonesian
 *
 * Pricing: $0.12 per second of output video
 */

import { Service } from "@volcengine/openapi";

const CV_HOST = "cv.byteplusapi.com";
const REGION = "ap-singapore-1";
const API_VERSION = "2024-06-06";
const REQ_KEY = "realman_avatar_picture_omni15_cv";

// The old/invalid key — if the env still has this, use the correct replacement
const STALE_KEY = "AKAPNzRkMmQxMjYyYzFlNDYzZWI3ZTAzYWNhNTcxODZjN2Q";
const CORRECT_KEY = "AKAPNTMyNTdkNDdmNTAxNDUyYzhjOGU2NmQ0ZjQzNDRlYzk";
const CORRECT_SECRET = "TW1ReE9EQmpNbU5sTURNNU5HVTJaamszTUdKbE1qRXpPR05pTVRrNU5HUQ==";

function createService() {
  let accessKeyId = process.env.BYTEPLUS_VISION_ACCESS_KEY_ID;
  let secretKey = process.env.BYTEPLUS_VISION_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretKey) {
    throw new Error("BYTEPLUS_VISION_ACCESS_KEY_ID or BYTEPLUS_VISION_SECRET_ACCESS_KEY not set");
  }
  // If the env still has the stale/invalid key, use the correct one
  if (accessKeyId === STALE_KEY) {
    console.warn("[OmniHuman] Stale AccessKeyId detected — using correct replacement key");
    accessKeyId = CORRECT_KEY;
    secretKey = CORRECT_SECRET;
  }
  return new Service({
    host: CV_HOST,
    region: REGION,
    serviceName: "cv",
    accessKeyId,
    secretKey,
  });
}

export interface OmniHumanRequest {
  /** URL of the character portrait image (JPG/PNG, < 5 MB, face clearly visible) */
  imageUrl: string;
  /** URL of the vocal stem audio file (< 60 seconds) */
  audioUrl: string;
  /** Optional text prompt to guide motion/expression (English recommended) */
  prompt?: string;
}

export interface OmniHumanTask {
  taskId: string;
  status: "pending" | "running" | "done" | "failed";
  videoUrl?: string;
  errorMessage?: string;
}

/**
 * Submit an OmniHuman 1.5 lip-sync task.
 * Returns the task ID for polling.
 */
export async function submitOmniHumanTask(request: OmniHumanRequest): Promise<string> {
  const service = createService();

  const data: Record<string, unknown> = {
    req_key: REQ_KEY,
    image_url: request.imageUrl,
    audio_url: request.audioUrl,
  };

  if (request.prompt) {
    data.prompt = request.prompt;
  }

  console.log(`[OmniHuman] Submitting task — image: ${request.imageUrl.slice(0, 60)}..., audio: ${request.audioUrl.slice(0, 60)}...`);

  const response = await service.fetchOpenAPI({
    Action: "CVSubmitTask",
    Version: API_VERSION,
    method: "POST",
    data,
  });

  // Check for API-level errors
  const apiError = response?.ResponseMetadata?.Error;
  if (apiError?.Code) {
    throw new Error(`OmniHuman submit error ${apiError.Code}: ${apiError.Message}`);
  }

  // Response structure: { ResponseMetadata: {...}, Result: { task_id: "..." } }
  const taskId = (response?.Result as any)?.task_id as string;
  if (!taskId) {
    throw new Error(`OmniHuman submit: no task_id in response: ${JSON.stringify(response).slice(0, 300)}`);
  }

  console.log(`[OmniHuman] Task submitted: ${taskId}`);
  return taskId;
}

/**
 * Poll an OmniHuman task by ID.
 * Returns the task status and video URL when complete.
 */
export async function pollOmniHumanTask(taskId: string): Promise<OmniHumanTask> {
  const service = createService();

  const response = await service.fetchOpenAPI({
    Action: "CVGetResult",
    Version: API_VERSION,
    method: "POST",
    data: {
      req_key: REQ_KEY,
      task_id: taskId,
    },
  });

  const apiError = response?.ResponseMetadata?.Error;
  if (apiError?.Code) {
    throw new Error(`OmniHuman poll error ${apiError.Code}: ${apiError.Message}`);
  }

  const result = response?.Result as Record<string, unknown> | undefined;
  const status = (result?.status as string) ?? "pending";
  const videoUrl = result?.video_url as string | undefined;
  const errorMessage = result?.message as string | undefined;

  return {
    taskId,
    status: mapOmniHumanStatus(status),
    videoUrl,
    errorMessage,
  };
}

function mapOmniHumanStatus(raw: string): OmniHumanTask["status"] {
  switch (raw?.toLowerCase()) {
    case "done":
    case "success":
    case "succeed":
    case "completed":
      return "done";
    case "failed":
    case "error":
      return "failed";
    case "running":
    case "processing":
    case "in_queue":
    case "queued":
      return "running";
    default:
      return "pending";
  }
}
