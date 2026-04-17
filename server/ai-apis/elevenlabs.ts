/**
 * ElevenLabs API wrapper
 * - Sound Effects: exact duration generation (up to 30s)
 * - Music: full composition generation (3s–5min), prompt-guided duration
 *
 * Both functions include automatic retry with exponential back-off for 429
 * rate-limit responses (up to 3 retries, starting at 10s, doubling each time).
 */
import axios, { AxiosError } from "axios";
import { storagePut } from "../storage";

const BASE_URL = "https://api.elevenlabs.io/v1";

function getApiKey(): string {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("ELEVENLABS_API_KEY not configured");
  return key;
}

function randomSuffix(): string {
  return Math.random().toString(36).substring(2, 10);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Retry an async operation up to `maxRetries` times.
 * Only retries on HTTP 429 (rate-limit); all other errors are thrown immediately.
 * Back-off: initialDelay * 2^attempt  (default: 10s, 20s, 40s)
 */
async function withRateLimitRetry<T>(
  label: string,
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelayMs = 10_000
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const axiosErr = err as AxiosError;
      const status = axiosErr?.response?.status;

      if (status === 429) {
        lastError = err;
        // Respect Retry-After header if present, else use exponential back-off
        const retryAfterHeader = axiosErr.response?.headers?.["retry-after"];
        const retryAfterSec = retryAfterHeader ? parseInt(String(retryAfterHeader), 10) : NaN;
        const waitMs = !isNaN(retryAfterSec)
          ? retryAfterSec * 1000
          : initialDelayMs * Math.pow(2, attempt);

        if (attempt < maxRetries) {
          console.warn(
            `[ElevenLabs] ${label} — 429 rate-limited. Retry ${attempt + 1}/${maxRetries} in ${(waitMs / 1000).toFixed(0)}s…`
          );
          await sleep(waitMs);
          continue;
        }
        // Exhausted retries
        throw new Error(
          `ElevenLabs rate-limited after ${maxRetries} retries. Please wait a moment and try again.`
        );
      }

      // Non-429 error — surface the actual message
      if (axiosErr?.response?.data) {
        let detail: string;
        try {
          // response.data may be a Buffer (arraybuffer) or object
          const raw = axiosErr.response.data;
          if (Buffer.isBuffer(raw)) {
            detail = raw.toString("utf8").substring(0, 300);
          } else {
            detail = JSON.stringify(raw).substring(0, 300);
          }
        } catch {
          detail = String(axiosErr.message);
        }
        throw new Error(`ElevenLabs ${label} error (HTTP ${status}): ${detail}`);
      }
      throw err;
    }
  }
  throw lastError;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ElevenLabsSoundEffectResult {
  audioUrl: string;
  durationSeconds: number;
  provider: "elevenlabs_sfx";
}

export interface ElevenLabsMusicResult {
  audioUrl: string;
  durationSeconds: number;
  provider: "elevenlabs_music";
  title?: string;
}

// ─── Sound Effects (exact duration ≤ 30s) ────────────────────────────────────

/**
 * Generate a sound effect / short cinematic audio at an exact duration.
 * Duration range: 0.5s – 30s (ElevenLabs hard limit).
 * Returns a permanent S3/CloudFront URL.
 */
export async function generateSoundEffect(params: {
  prompt: string;
  durationSeconds: number;
  promptInfluence?: number; // 0–1, default 0.3 (more creative)
  userId: number;
}): Promise<ElevenLabsSoundEffectResult> {
  const key = getApiKey();
  const clampedDuration = Math.min(30, Math.max(0.5, params.durationSeconds));

  console.log(
    `[ElevenLabs SFX] Generating ${clampedDuration}s sound effect\n` +
    `  prompt: "${params.prompt.substring(0, 200)}"`
  );

  const response = await withRateLimitRetry("SFX generate", () =>
    axios.post(
      `${BASE_URL}/sound-generation`,
      {
        text: params.prompt,
        duration_seconds: clampedDuration,
        prompt_influence: params.promptInfluence ?? 0.3,
      },
      {
        headers: {
          "xi-api-key": key,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        responseType: "arraybuffer",
        timeout: 60_000,
      }
    )
  );

  const audioBuffer = Buffer.from(response.data);
  const fileKey = `elevenlabs-sfx/${params.userId}/${randomSuffix()}.mp3`;
  const { url } = await storagePut(fileKey, audioBuffer, "audio/mpeg");

  console.log(`[ElevenLabs SFX] Done — ${audioBuffer.length} bytes → ${url}`);
  return {
    audioUrl: url,
    durationSeconds: clampedDuration,
    provider: "elevenlabs_sfx",
  };
}

// ─── Music (full composition, 3s–5min) ───────────────────────────────────────

/**
 * Generate a full music composition via ElevenLabs Music API.
 * Duration is prompt-guided (not exact) — pass duration in the prompt text.
 * Returns a permanent S3/CloudFront URL.
 *
 * The Music API is async: POST to submit, GET to poll for completion.
 */
export async function generateMusic(params: {
  prompt: string;
  durationSeconds?: number; // Prepended as natural-language guidance in the prompt
  makeInstrumental?: boolean; // Passed as make_instrumental to the API
  userId: number;
}): Promise<ElevenLabsMusicResult> {
  const key = getApiKey();

  // Build duration-enriched prompt
  let finalPrompt = params.prompt;
  if (params.durationSeconds) {
    const mins = Math.floor(params.durationSeconds / 60);
    const secs = params.durationSeconds % 60;
    let durationLabel: string;
    if (mins > 0 && secs > 0) {
      durationLabel = `${mins} minute ${secs} second`;
    } else if (mins > 0) {
      durationLabel = `${mins} minute`;
    } else {
      durationLabel = `${secs} second`;
    }
    // Prepend duration guidance — ElevenLabs Music understands natural language duration
    finalPrompt = `${durationLabel} track. ${params.prompt}`;
  }

  console.log(
    `[ElevenLabs Music] Submitting generation request\n` +
    `  make_instrumental: ${params.makeInstrumental ?? false}\n` +
    `  full prompt (${finalPrompt.length} chars): "${finalPrompt.substring(0, 300)}"`
  );

  // Step 1: Submit generation request (with 429 retry)
  const submitResponse = await withRateLimitRetry("Music submit", () =>
    axios.post(
      `${BASE_URL}/text-to-music`,
      {
        text: finalPrompt,
        make_instrumental: params.makeInstrumental ?? false,
      },
      {
        headers: {
          "xi-api-key": key,
          "Content-Type": "application/json",
        },
        timeout: 30_000,
      }
    )
  );

  const generationId: string = submitResponse.data.id || submitResponse.data.generation_id;
  if (!generationId) {
    throw new Error(
      `ElevenLabs Music: no generation ID in response: ${JSON.stringify(submitResponse.data).substring(0, 200)}`
    );
  }

  console.log(`[ElevenLabs Music] Generation ID: ${generationId} — polling...`);

  // Step 2: Poll until complete (max 5 minutes, with 429 retry on each poll)
  const maxAttempts = 60;
  const pollInterval = 5_000;
  let audioUrl: string | null = null;
  let actualDuration = 0;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await sleep(pollInterval);

    const statusResponse = await withRateLimitRetry(`Music poll ${attempt + 1}`, () =>
      axios.get(`${BASE_URL}/text-to-music/${generationId}`, {
        headers: { "xi-api-key": key },
        timeout: 15_000,
      })
    );

    const status = statusResponse.data.status;
    console.log(`[ElevenLabs Music] Poll ${attempt + 1}/${maxAttempts}: status=${status}`);

    if (status === "complete" || status === "completed") {
      audioUrl = statusResponse.data.audio_url || statusResponse.data.url;
      actualDuration = statusResponse.data.duration_seconds || statusResponse.data.duration || 0;
      break;
    } else if (status === "failed" || status === "error") {
      throw new Error(
        `ElevenLabs Music generation failed: ${statusResponse.data.error || "unknown error"}`
      );
    }
    // status === "pending" | "processing" — keep polling
  }

  if (!audioUrl) {
    throw new Error("ElevenLabs Music: timed out waiting for generation to complete");
  }

  // Step 3: Download and re-upload to our S3 (ElevenLabs URLs may expire)
  console.log(`[ElevenLabs Music] Downloading audio from ${audioUrl.substring(0, 80)}...`);
  const downloadResponse = await axios.get(audioUrl, {
    responseType: "arraybuffer",
    timeout: 120_000,
  });

  const audioBuffer = Buffer.from(downloadResponse.data);
  const fileKey = `elevenlabs-music/${params.userId}/${randomSuffix()}.mp3`;
  const { url: s3Url } = await storagePut(fileKey, audioBuffer, "audio/mpeg");

  console.log(`[ElevenLabs Music] Done — ${actualDuration}s, ${audioBuffer.length} bytes → ${s3Url}`);
  return {
    audioUrl: s3Url,
    durationSeconds: actualDuration,
    provider: "elevenlabs_music",
  };
}

// ─── Utility: choose provider based on duration ───────────────────────────────

export type ElevenLabsProvider = "sfx" | "music";

/**
 * Choose the best ElevenLabs provider for a given duration.
 * - ≤30s: Sound Effects (exact duration)
 * - >30s: Music (prompt-guided, near-exact)
 */
export function chooseElevenLabsProvider(durationSeconds: number): ElevenLabsProvider {
  return durationSeconds <= 30 ? "sfx" : "music";
}
