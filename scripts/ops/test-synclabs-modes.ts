/**
 * SyncLabs sync mode comparison test
 * Tests cut_off vs loop with a precisely extracted audio clip
 * to identify which produces better lip sync timing.
 */

import { execSync } from "child_process";
import { readFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { storagePut } from "./server/storage";

const AUDIO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-audio/1-1778788890320.mp3";
const SCENE0_VIDEO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-scenes/600001-1779119272419.mp4";
const SYNC_LABS_API_KEY = process.env.SYNC_LABS_API_KEY!;

async function main() {
  // === STEP 1: Extract precise 0-6s audio clip ===
  const fullTrackPath = join(tmpdir(), `full-track-cal-${Date.now()}.mp3`);
  const wavPath = join(tmpdir(), `scene0-precise-${Date.now()}.wav`);
  const mp3Path = join(tmpdir(), `scene0-precise-${Date.now()}.mp3`);

  console.log("Downloading full audio track...");
  execSync(`curl -s -o "${fullTrackPath}" "${AUDIO_URL}"`);
  console.log(`Downloaded: ${readFileSync(fullTrackPath).length} bytes`);

  console.log("\nExtracting 0-6s with accurate seek (ss AFTER -i)...");
  execSync(
    `ffmpeg -y -i "${fullTrackPath}" -ss 0 -t 6 -acodec pcm_s16le -ar 44100 -ac 2 -loglevel error "${wavPath}"`
  );
  const wavDur = execSync(
    `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${wavPath}"`
  )
    .toString()
    .trim();
  console.log(`WAV duration: ${wavDur}s (expected: 6.0000s)`);

  execSync(
    `ffmpeg -y -i "${wavPath}" -acodec libmp3lame -ar 44100 -ab 192k -ac 2 -write_xing 0 -loglevel error "${mp3Path}"`
  );
  const mp3Dur = execSync(
    `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${mp3Path}"`
  )
    .toString()
    .trim();
  const driftMs = (parseFloat(mp3Dur) - 6.0) * 1000;
  console.log(`MP3 duration: ${mp3Dur}s | drift: ${driftMs.toFixed(1)}ms`);

  // Upload WAV to S3 (zero frame padding — exact 6.000000s)
  const wavBuffer = readFileSync(wavPath);
  const { url: audioClipUrlWav } = await storagePut(
    `music-video-scene-audio/probe-test-wav-${Date.now()}.wav`,
    wavBuffer,
    "audio/wav"
  );
  console.log(`\nUploaded WAV clip to S3: ${audioClipUrlWav}`);
  console.log(`WAV is exactly 6.000000s — zero frame padding`);

  // Also upload MP3 for comparison
  const mp3Buffer = readFileSync(mp3Path);
  const { url: audioClipUrlMp3 } = await storagePut(
    `music-video-scene-audio/probe-test-mp3-${Date.now()}.mp3`,
    mp3Buffer,
    "audio/mpeg"
  );
  console.log(`Uploaded MP3 clip to S3: ${audioClipUrlMp3} (34ms drift)`);

  // Clean up
  try { unlinkSync(fullTrackPath); } catch {}
  try { unlinkSync(wavPath); } catch {}
  try { unlinkSync(mp3Path); } catch {}

  // === STEP 2: Submit to SyncLabs with both modes ===
  async function submitJob(syncMode: string): Promise<string> {
    const resp = await fetch("https://api.sync.so/v2/generations", {
      method: "POST",
      headers: {
        "x-api-key": SYNC_LABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: [
          { type: "video", url: SCENE0_VIDEO_URL },
          { type: "audio", url: audioClipUrl },
        ],
        model: "sync-3",
        options: {
          sync_mode: syncMode,
          temperature: 1.0,
          occlusion_detection_enabled: true,
        },
        outputFileName: `probe-${syncMode}-${Date.now()}`,
      }),
    });
    const job = await resp.json() as any;
    if (!job.id) {
      console.error(`Submit failed for ${syncMode}:`, JSON.stringify(job));
      throw new Error(`Failed to submit ${syncMode} job`);
    }
    console.log(`[${syncMode}] Submitted job: ${job.id}`);
    return job.id;
  }

  async function pollJob(jobId: string, label: string): Promise<any> {
    const deadline = Date.now() + 10 * 60 * 1000;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 8000));
      const resp = await fetch(
        `https://api.sync.so/v2/generations/${jobId}`,
        { headers: { "x-api-key": SYNC_LABS_API_KEY } }
      );
      const g = await resp.json() as any;
      console.log(`[${label}] status: ${g.status}`);
      if (["COMPLETED", "FAILED", "REJECTED"].includes(g.status)) {
        return g;
      }
    }
    throw new Error(`${label} timed out`);
  }

  // Override submitJob to accept audioUrl and model params
  async function submitJobFull(syncMode: string, audioUrl: string, model: string, label: string): Promise<string> {
    const resp = await fetch("https://api.sync.so/v2/generations", {
      method: "POST",
      headers: {
        "x-api-key": SYNC_LABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: [
          { type: "video", url: SCENE0_VIDEO_URL },
          { type: "audio", url: audioUrl },
        ],
        model,
        options: {
          sync_mode: syncMode,
          temperature: 1.0,
          occlusion_detection_enabled: true,
        },
        outputFileName: `probe-${label}-${Date.now()}`,
      }),
    });
    const job = await resp.json() as any;
    if (!job.id) {
      console.error(`Submit failed for ${label}:`, JSON.stringify(job));
      throw new Error(`Failed to submit ${label} job`);
    }
    console.log(`[${label}] Submitted job: ${job.id}`);
    return job.id;
  }

  console.log("\nSubmitting 3 comparison jobs...");
  // Test 1: sync-3 + WAV (zero drift)
  // Test 2: sync-3 + MP3 (34ms drift baseline)
  // Test 3: lipsync-2-pro + WAV (alternative model)
  const [id1, id2, id3] = await Promise.all([
    submitJobFull("cut_off", audioClipUrlWav, "sync-3", "sync3-wav"),
    submitJobFull("cut_off", audioClipUrlMp3, "sync-3", "sync3-mp3"),
    submitJobFull("cut_off", audioClipUrlWav, "lipsync-2-pro", "lipsync2pro-wav"),
  ]);

  console.log("\nPolling for completion...");
  const [res1, res2, res3] = await Promise.all([
    pollJob(id1, "sync3-wav"),
    pollJob(id2, "sync3-mp3"),
    pollJob(id3, "lipsync2pro-wav"),
  ]);

  console.log("\n=== FINAL RESULTS ===");
  console.log(`sync-3 + WAV:       ${res1?.status} | ${res1?.outputUrl}`);
  console.log(`sync-3 + MP3:       ${res2?.status} | ${res2?.outputUrl}`);
  console.log(`lipsync-2-pro + WAV: ${res3?.status} | ${res3?.outputUrl}`);
  
  console.log("\nAudio drift summary:");
  console.log(`  WAV extraction: ${wavDur}s (${(parseFloat(wavDur) - 6.0) * 1000 < 5 ? "✅ precise" : "⚠️ drift detected"})`);
  console.log(`  MP3 conversion: ${mp3Dur}s (drift: ${driftMs.toFixed(1)}ms)`);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
