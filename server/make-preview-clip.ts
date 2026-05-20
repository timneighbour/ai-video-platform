/**
 * make-preview-clip.ts
 * Takes the SyncLabs lip-synced video (which has isolated vocals audio),
 * strips that audio, and overlays the original full mix at the correct time offset.
 * This is the correct final step: SyncLabs drove the mouth movements,
 * but the audience hears the original full mix (vocals + instruments).
 *
 * Run: npx tsx server/make-preview-clip.ts
 */
import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { exec } from "child_process";
import { promisify } from "util";
import { createRequire } from "module";
import { storagePut } from "./storage";

const execAsync = promisify(exec);
const _require = createRequire(import.meta.url);

// Resolve bundled ffmpeg
let FFMPEG_BIN = "ffmpeg";
try {
  const installer = _require("@ffmpeg-installer/ffmpeg");
  if (installer?.path && fs.existsSync(installer.path)) {
    fs.chmodSync(installer.path, 0o755);
    FFMPEG_BIN = installer.path;
  }
} catch {}
console.log(`[Preview] Using ffmpeg: ${FFMPEG_BIN}`);

// ── Inputs ────────────────────────────────────────────────────────────────────
// Scene 1 (sceneIndex=1, id=660002): startTime=6000ms, duration=6s
// SyncLabs output from our test run (isolated vocals drove the mouth)
const SYNCLABS_OUTPUT_URL = "https://api.sync.so/v2/generations/3686c21d-31b0-4aa0-83f7-20c9f5388c78/result?token=cb69cede-de5f-4318-8607-e76a8a846818";

// Original full mix — this is what the audience hears
const FULL_MIX_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-audio/1-1778695391908.mp3";

// Scene timing
const SCENE_START_SECONDS = 6;   // 6000ms / 1000
const SCENE_DURATION_SECONDS = 6;

async function downloadToTemp(url: string, ext: string): Promise<string> {
  const tmpPath = path.join(os.tmpdir(), `wiz-preview-${Date.now()}.${ext}`);
  console.log(`[Preview] Downloading ${url.slice(0, 80)}...`);
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Download failed: HTTP ${resp.status} from ${url.slice(0, 80)}`);
  const buf = Buffer.from(await resp.arrayBuffer());
  fs.writeFileSync(tmpPath, buf);
  console.log(`[Preview] Downloaded ${(buf.length / 1024).toFixed(0)}KB → ${tmpPath}`);
  return tmpPath;
}

async function main() {
  const tmpDir = os.tmpdir();

  // Step 1: Download the SyncLabs lip-synced video (has isolated vocals audio)
  console.log("\n[Preview] Step 1: Downloading SyncLabs lip-synced video...");
  const syncLabsVideoPath = await downloadToTemp(SYNCLABS_OUTPUT_URL, "mp4");

  // Step 2: Download the original full mix
  console.log("\n[Preview] Step 2: Downloading original full mix...");
  const fullMixPath = await downloadToTemp(FULL_MIX_URL, "mp3");

  // Step 3: Extract the exact 6-second segment from the full mix at the scene's start time
  // This is the audio the audience hears — same timing as the isolated vocals that drove the mouth
  const fullMixClipPath = path.join(tmpDir, `wiz-fullmix-clip-${Date.now()}.wav`);
  console.log(`\n[Preview] Step 3: Extracting full mix segment (${SCENE_START_SECONDS}s → ${SCENE_START_SECONDS + SCENE_DURATION_SECONDS}s)...`);
  const extractCmd = [
    FFMPEG_BIN, "-y",
    "-i", `"${fullMixPath}"`,
    "-ss", SCENE_START_SECONDS.toString(),
    "-t", SCENE_DURATION_SECONDS.toString(),
    "-acodec", "pcm_s16le",
    "-ar", "44100",
    "-ac", "2",
    "-loglevel", "error",
    `"${fullMixClipPath}"`,
  ].join(" ");
  await execAsync(extractCmd, { timeout: 30_000 });
  console.log(`[Preview] Full mix segment extracted ✓`);

  // Step 4: Replace the SyncLabs audio with the full mix segment
  // -map 0:v:0 = take video from SyncLabs output (the lip-synced video)
  // -map 1:a:0 = take audio from full mix segment (the original audio)
  // Result: Zara's mouth moves to isolated vocals, but audience hears the full mix
  const finalClipPath = path.join(tmpDir, `wiz-preview-final-${Date.now()}.mp4`);
  console.log(`\n[Preview] Step 4: Replacing audio — SyncLabs video + full mix audio...`);
  const mergeCmd = [
    FFMPEG_BIN, "-y",
    "-i", `"${syncLabsVideoPath}"`,   // SyncLabs lip-synced video (video track)
    "-i", `"${fullMixClipPath}"`,      // Full mix segment (audio track)
    "-map", "0:v:0",                   // Video from SyncLabs
    "-map", "1:a:0",                   // Audio from full mix
    "-c:v", "copy",                    // Copy video stream (no re-encode)
    "-c:a", "aac",
    "-ar", "44100",
    "-b:a", "192k",
    "-t", SCENE_DURATION_SECONDS.toString(),
    "-loglevel", "error",
    `"${finalClipPath}"`,
  ].join(" ");
  await execAsync(mergeCmd, { timeout: 60_000 });

  if (!fs.existsSync(finalClipPath)) {
    throw new Error("ffmpeg did not produce final clip");
  }
  const stats = fs.statSync(finalClipPath);
  console.log(`[Preview] Final clip created: ${(stats.size / 1024 / 1024).toFixed(1)}MB`);

  // Step 5: Upload to S3
  console.log(`\n[Preview] Step 5: Uploading to S3...`);
  const buf = fs.readFileSync(finalClipPath);
  const key = `music-video-preview/scene1-lipsync-preview-${Date.now()}.mp4`;
  const { url } = await storagePut(key, buf, "video/mp4");

  console.log(`\n✅ PREVIEW CLIP READY!`);
  console.log(`URL: ${url}`);
  console.log(`\nThis clip has:`);
  console.log(`  - Zara's mouth synced to ISOLATED VOCALS (driven by SyncLabs sync-3)`);
  console.log(`  - ORIGINAL FULL MIX audio (vocals + instruments) as the soundtrack`);
  console.log(`  - Perfect timing: both tracks share the same ${SCENE_START_SECONDS}s start offset`);

  // Cleanup
  for (const f of [syncLabsVideoPath, fullMixPath, fullMixClipPath, finalClipPath]) {
    try { fs.unlinkSync(f); } catch {}
  }

  process.exit(0);
}

main().catch(err => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
