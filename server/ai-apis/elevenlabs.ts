/**
 * ElevenLabs API wrapper
 * - Sound Effects: exact duration generation (up to 30s) via POST /v1/sound-generation
 * - Music: full composition via POST /v1/music (synchronous streaming response)
 *
 * Both functions include automatic retry with exponential back-off for 429
 * rate-limit responses (up to 3 retries, starting at 10s, doubling each time).
 *
 * NOTE: The Music API (/v1/music) is SYNCHRONOUS — it streams audio bytes directly
 * in the response body. There is NO async job ID / polling step.
 * Duration is passed as `music_length_ms` (milliseconds, range 3000–600000).
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
        throw new Error(
          `ElevenLabs rate-limited after ${maxRetries} retries. Please wait a moment and try again.`
        );
      }

      // Non-429 error — surface the actual message from the response body
      if (axiosErr?.response?.data) {
        let detail: string;
        try {
          const raw = axiosErr.response.data;
          if (Buffer.isBuffer(raw)) {
            detail = raw.toString("utf8").substring(0, 400);
          } else {
            detail = JSON.stringify(raw).substring(0, 400);
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
 * Returns a permanent S3 URL.
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
    `  prompt (${params.prompt.length} chars): "${params.prompt.substring(0, 200)}"`
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

// ─── Music (full composition, 3s–10min) ──────────────────────────────────────

/**
 * Generate a full music composition via ElevenLabs Music API (POST /v1/music).
 *
 * The API is SYNCHRONOUS — it streams audio bytes directly in the response body.
 * There is no async job ID or polling step.
 *
 * Duration is passed as `music_length_ms` (milliseconds, 3000–600000).
 * Returns a permanent S3 URL.
 */
export async function generateMusic(params: {
  prompt: string;
  durationSeconds?: number;
  makeInstrumental?: boolean;
  userId: number;
}): Promise<ElevenLabsMusicResult> {
  const key = getApiKey();

  // Clamp duration to ElevenLabs Music limits: 3s – 600s (10 min)
  const durationMs = params.durationSeconds
    ? Math.min(600_000, Math.max(3_000, Math.round(params.durationSeconds * 1000)))
    : undefined;

  console.log(
    `[ElevenLabs Music] Submitting generation request\n` +
    `  music_length_ms: ${durationMs ?? "not set (model chooses)"}\n` +
    `  force_instrumental: ${params.makeInstrumental ?? false}\n` +
    `  prompt (${params.prompt.length} chars): "${params.prompt.substring(0, 300)}"`
  );

  // POST /v1/music — returns audio bytes directly (arraybuffer)
  const response = await withRateLimitRetry(
    "Music generate",
    () =>
      axios.post(
        `${BASE_URL}/music`,
        {
          prompt: params.prompt,
          ...(durationMs !== undefined ? { music_length_ms: durationMs } : {}),
          force_instrumental: params.makeInstrumental ?? false,
        },
        {
          headers: {
            "xi-api-key": key,
            "Content-Type": "application/json",
            Accept: "audio/mpeg",
          },
          responseType: "arraybuffer",
          // Music generation can take several minutes — generous timeout
          timeout: 600_000,
        }
      ),
    3,
    15_000 // start at 15s for music (heavier endpoint)
  );

  const audioBuffer = Buffer.from(response.data);
  if (audioBuffer.length < 1000) {
    // Suspiciously small — likely an error JSON encoded as bytes
    const text = audioBuffer.toString("utf8");
    throw new Error(`ElevenLabs Music: unexpected small response (${audioBuffer.length} bytes): ${text.substring(0, 300)}`);
  }

  // Derive actual duration from the song-id header if available, else estimate from bytes
  const songId = response.headers?.["song-id"] as string | undefined;
  // ~128kbps MP3: bytes / (128000/8) = seconds
  const estimatedDuration = params.durationSeconds ?? Math.round(audioBuffer.length / 16_000);

  const fileKey = `elevenlabs-music/${params.userId}/${randomSuffix()}.mp3`;
  const { url: s3Url } = await storagePut(fileKey, audioBuffer, "audio/mpeg");

  console.log(
    `[ElevenLabs Music] Done — song-id: ${songId ?? "n/a"}, ` +
    `~${estimatedDuration}s, ${audioBuffer.length} bytes → ${s3Url}`
  );

  return {
    audioUrl: s3Url,
    durationSeconds: estimatedDuration,
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
