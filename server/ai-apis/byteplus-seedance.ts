/**
 * BytePlus ModelArk — Seedance 2.0 Video Generation
 * Official ByteDance international API platform
 *
 * API docs: https://docs.byteplus.com/en/docs/ModelArk/2298881
 *
 * Endpoints:
 *   POST https://ark.ap-southeast.bytepluses.com/api/v3/contents/generations/tasks
 *   GET  https://ark.ap-southeast.bytepluses.com/api/v3/contents/generations/tasks/{id}
 *
 * Auth: Authorization: Bearer <ARK_API_KEY>
 *
 * Model IDs:
 *   dreamina-seedance-2-0-260128       (Seedance 2.0 full quality)
 *   dreamina-seedance-2-0-fast-260128  (Seedance 2.0 fast)
 */

const BASE_URL = "https://ark.ap-southeast.bytepluses.com/api/v3";
const MODEL_ID = "dreamina-seedance-2-0-260128";

function getApiKey(): string {
  const key = process.env.BYTEPLUS_ARK_API_KEY;
  if (!key) throw new Error("BYTEPLUS_ARK_API_KEY is not set");
  return key;
}

export interface BytePlusSeedanceRequest {
  prompt: string;
  imageUrl?: string;       // First-frame image for image-to-video
  ratio?: "16:9" | "9:16" | "1:1" | "4:3" | "3:4" | "adaptive";
  duration?: 5 | 10;       // seconds
  resolution?: "720p" | "1080p";
  generateAudio?: boolean; // whether to generate ambient audio (we set false — we mux our own)
}

export interface BytePlusSeedanceTask {
  id: string;
  status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
  content?: {
    video_url?: string;
  };
  error?: {
    code: string;
    message: string;
  };
  resolution?: string;
  ratio?: string;
  duration?: number;
}

/**
 * Submit a video generation task to BytePlus Seedance 2.0.
 * Returns the task ID for polling.
 */
export async function submitBytePlusSeedanceVideo(
  request: BytePlusSeedanceRequest
): Promise<string> {
  const apiKey = getApiKey();

  // Build the content array
  const content: Array<Record<string, unknown>> = [
    {
      type: "text",
      text: request.prompt,
    },
  ];

  // Add image for image-to-video if provided
  if (request.imageUrl) {
    content.push({
      type: "image_url",
      image_url: {
        url: request.imageUrl,
      },
    });
  }

  const body: Record<string, unknown> = {
    model: MODEL_ID,
    content,
    ratio: request.ratio ?? "16:9",
    generate_audio: request.generateAudio ?? false, // we mux our own audio
  };

  if (request.duration) body.duration = request.duration;
  if (request.resolution) body.resolution = request.resolution;

  console.log(`[BytePlus] Submitting Seedance 2.0 task — model: ${MODEL_ID}, ratio: ${body.ratio}, hasImage: ${!!request.imageUrl}`);

  const response = await fetch(`${BASE_URL}/contents/generations/tasks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`BytePlus Seedance submit failed (${response.status}): ${errorText.slice(0, 300)}`);
  }

  const data = (await response.json()) as { id: string };
  if (!data.id) {
    throw new Error(`BytePlus Seedance submit: no task ID in response: ${JSON.stringify(data).slice(0, 200)}`);
  }

  console.log(`[BytePlus] Task submitted: ${data.id}`);
  return data.id;
}

/**
 * Poll a BytePlus Seedance task by ID.
 * Returns the full task object.
 */
export async function pollBytePlusSeedanceTask(taskId: string): Promise<BytePlusSeedanceTask> {
  const apiKey = getApiKey();

  const response = await fetch(`${BASE_URL}/contents/generations/tasks/${taskId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`BytePlus Seedance poll failed (${response.status}): ${errorText.slice(0, 300)}`);
  }

  return (await response.json()) as BytePlusSeedanceTask;
}

/**
 * Submit and synchronously wait for a BytePlus Seedance task to complete.
 * Polls every 10 seconds, times out after 10 minutes.
 * Returns the video URL on success.
 */
export async function submitAndWaitBytePlusSeedance(
  request: BytePlusSeedanceRequest,
  timeoutMs = 600_000
): Promise<string> {
  const taskId = await submitBytePlusSeedanceVideo(request);
  const deadline = Date.now() + timeoutMs;
  const pollInterval = 10_000;

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, pollInterval));

    const task = await pollBytePlusSeedanceTask(taskId);
    console.log(`[BytePlus] Task ${taskId} status: ${task.status}`);

    if (task.status === "succeeded") {
      const videoUrl = task.content?.video_url;
      if (!videoUrl) throw new Error(`BytePlus task ${taskId} succeeded but no video_url`);
      console.log(`[BytePlus] Task ${taskId} completed: ${videoUrl.slice(0, 80)}...`);
      return videoUrl;
    }

    if (task.status === "failed" || task.status === "cancelled") {
      const errMsg = task.error?.message ?? task.status;
      throw new Error(`BytePlus Seedance task ${taskId} ${task.status}: ${errMsg}`);
    }

    // queued or running — keep polling
  }

  throw new Error(`BytePlus Seedance task ${taskId} timed out after ${timeoutMs / 1000}s`);
}
