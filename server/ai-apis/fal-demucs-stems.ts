/**
 * fal-demucs-stems.ts
 * =====================
 * FAL AI Demucs htdemucs_6s — separates a full audio track into 6 stems:
 *   vocals, drums, bass, other, guitar, piano
 *
 * Used for:
 *   1. Multi-vocal assignment (duet / ensemble mode)
 *   2. Instrument-aware motion prompting (per-stem energy drives Kling prompts)
 *   3. Beat-locked scene timing (bass + drums stems used for beat detection)
 *
 * API: https://fal.ai/models/fal-ai/demucs
 * Model: htdemucs_6s (6-stem: vocals, drums, bass, other, guitar, piano)
 */

import { fal } from "@fal-ai/client";
import { storagePut } from "../storage";
import * as https from "https";
import * as http from "http";

// ─── Types ────────────────────────────────────────────────────────────────────

export type StemType = "vocals" | "drums" | "bass" | "other" | "guitar" | "piano";

export interface StemResult {
  stemType: StemType;
  url: string;           // S3 URL after upload
  key: string;           // S3 key
  falUrl: string;        // Original FAL URL (may expire)
  label: string;         // Human-readable label
  voiceGender?: "male" | "female" | "unknown";
}

export interface DemucsResult {
  stems: StemResult[];
  requestId: string;
}

// ─── Labels ───────────────────────────────────────────────────────────────────

const STEM_LABELS: Record<StemType, string> = {
  vocals: "Lead Vocal",
  drums: "Drums",
  bass: "Bass",
  other: "Other Instruments",
  guitar: "Guitar",
  piano: "Piano / Keys",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function downloadBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    client.get(url, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    }).on("error", reject);
  });
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}

// ─── Main function ────────────────────────────────────────────────────────────

/**
 * Separate a full audio track into up to 6 stems using FAL Demucs htdemucs_6s.
 * Downloads each stem and uploads to S3 for permanent storage.
 *
 * @param audioUrl  Public URL of the audio file (mp3, wav, etc.)
 * @param jobId     Music video job ID (used for S3 key namespacing)
 * @param stems     Which stems to extract (default: all 6)
 */
export async function separateAudioStems(
  audioUrl: string,
  jobId: number,
  stems: StemType[] = ["vocals", "drums", "bass", "other", "guitar", "piano"]
): Promise<DemucsResult> {
  const apiKey = process.env.FAL_AI_API_KEY;
  if (!apiKey) throw new Error("FAL_AI_API_KEY is not configured");

  // Configure FAL client
  fal.config({ credentials: apiKey });

  console.log(`[FalDemucs] Job ${jobId}: submitting ${stems.join(", ")} separation for ${audioUrl}`);

  // Submit to FAL queue (async — can take 60–180s for a full track)
  const { request_id } = await fal.queue.submit("fal-ai/demucs", {
    input: {
      audio_url: audioUrl,
      model: "htdemucs_6s",
      stems,
      output_format: "mp3",
      shifts: 1,
      overlap: 0.25,
    },
  });

  console.log(`[FalDemucs] Job ${jobId}: queued as ${request_id}`);

  // Poll until complete (max 5 minutes)
  const MAX_POLLS = 60;
  const POLL_INTERVAL_MS = 5000;

  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const status = await fal.queue.status("fal-ai/demucs", {
      requestId: request_id,
      logs: false,
    });

    const statusStr = String(status.status);
    if (statusStr === "COMPLETED") {
      const result = await fal.queue.result("fal-ai/demucs", { requestId: request_id }) as {
        data: Record<string, { url: string; content_type: string }>;
      };

      console.log(`[FalDemucs] Job ${jobId}: separation complete, uploading stems to S3`);

      // Upload each stem to S3
      const stemResults: StemResult[] = [];

      for (const stemType of stems) {
        const stemData = result.data[stemType];
        if (!stemData?.url) {
          console.warn(`[FalDemucs] Job ${jobId}: stem "${stemType}" not in result, skipping`);
          continue;
        }

        try {
          const buffer = await downloadBuffer(stemData.url);
          const s3Key = `music-video-stems/${jobId}/${stemType}-${randomSuffix()}.mp3`;
          const { url: s3Url } = await storagePut(s3Key, buffer, "audio/mpeg");

          stemResults.push({
            stemType: stemType as StemType,
            url: s3Url,
            key: s3Key,
            falUrl: stemData.url,
            label: STEM_LABELS[stemType as StemType] ?? stemType,
            voiceGender: stemType === "vocals" ? "unknown" : undefined,
          });

          console.log(`[FalDemucs] Job ${jobId}: ${stemType} uploaded → ${s3Key}`);
        } catch (uploadErr) {
          console.error(`[FalDemucs] Job ${jobId}: failed to upload ${stemType}:`, uploadErr);
        }
      }

      return { stems: stemResults, requestId: request_id };
    }

    if (statusStr === "FAILED") {
      throw new Error(`[FalDemucs] Job ${jobId}: separation failed — ${JSON.stringify(status)}`);
    }

    console.log(`[FalDemucs] Job ${jobId}: poll ${i + 1}/${MAX_POLLS} — status: ${status.status}`);
  }

  throw new Error(`[FalDemucs] Job ${jobId}: timed out after ${MAX_POLLS * POLL_INTERVAL_MS / 1000}s`);
}

/**
 * Submit a Demucs separation job and return the request_id immediately.
 * Use pollDemucsJob() to check completion on subsequent heartbeat ticks.
 */
export async function submitDemucsJob(
  audioUrl: string,
  stems: StemType[] = ["vocals", "drums", "bass", "other", "guitar", "piano"]
): Promise<string> {
  const apiKey = process.env.FAL_AI_API_KEY;
  if (!apiKey) throw new Error("FAL_AI_API_KEY is not configured");

  fal.config({ credentials: apiKey });

  const { request_id } = await fal.queue.submit("fal-ai/demucs", {
    input: {
      audio_url: audioUrl,
      model: "htdemucs_6s",
      stems,
      output_format: "mp3",
      shifts: 1,
      overlap: 0.25,
    },
  });

  return request_id;
}

/**
 * Poll a previously submitted Demucs job.
 * Returns "in_progress" | "completed" | "failed"
 * When completed, returns the stem URLs.
 */
export async function pollDemucsJob(requestId: string): Promise<{
  status: "in_progress" | "completed" | "failed";
  stems?: Record<string, { url: string }>;
}> {
  const apiKey = process.env.FAL_AI_API_KEY;
  if (!apiKey) throw new Error("FAL_AI_API_KEY is not configured");

  fal.config({ credentials: apiKey });

  const status = await fal.queue.status("fal-ai/demucs", {
    requestId,
    logs: false,
  });

  const s = String(status.status);
  if (s === "COMPLETED") {
    const result = await fal.queue.result("fal-ai/demucs", { requestId }) as {
      data: Record<string, { url: string }>;
    };
    return { status: "completed", stems: result.data };
  }

  if (s === "FAILED") {
    return { status: "failed" };
  }

  return { status: "in_progress" };
}
