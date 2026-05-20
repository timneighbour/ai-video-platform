/**
 * Redo lip sync for scenes 7, 8, 9 with PRECISE isolated vocal cuts.
 * Uses the project's SyncLabs SDK (@sync.so/sdk) via api.sync.so/v2.
 * 
 * Scene 7: 42-48s (performance)
 * Scene 8: 48-54s (cinematic but Zara visible = needs lip sync)
 * Scene 9: 54-60s (performance)
 * 
 * Pipeline per scene:
 * 1. Cut isolated Demucs vocals at exact scene timestamp
 * 2. Upload vocal clip to S3
 * 3. Submit scene video + isolated vocal clip to SyncLabs sync-3
 * 4. Wait for completion
 * 
 * Then:
 * 5. Strip SyncLabs audio from all 3 outputs
 * 6. Concatenate 3 silent videos
 * 7. Overlay original full mix at 42-60s
 * 8. Upload final preview
 */
import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { exec } from "child_process";
import { promisify } from "util";
import { createRequire } from "module";
import { storagePut } from "./storage";
import { submitSyncLabsLipSync, pollSyncLabsLipSync } from "./ai-apis/synclabs-lipsync";

const execAsync = promisify(exec);
const _require = createRequire(import.meta.url);

let FFMPEG = "ffmpeg";
try {
  const inst = _require("@ffmpeg-installer/ffmpeg");
  if (inst?.path && fs.existsSync(inst.path)) { fs.chmodSync(inst.path, 0o755); FFMPEG = inst.path; }
} catch {}

// Scene raw videos (NOT lip-synced — we redo from raw WaveSpeed output)
const SCENES = [
  { id: 660008, index: 7, startS: 42, durS: 6, videoUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-scenes/660008-1779235688059.mp4" },
  { id: 660009, index: 8, startS: 48, durS: 6, videoUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-scenes/660009-1779235756466.mp4" },
  { id: 660010, index: 9, startS: 54, durS: 6, videoUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-scenes/660010-1779235827583.mp4" },
];

// Isolated Demucs vocals (full track) — from DB
const VOCALS_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-audio/660001-vocals-demucs-1779230276688.mp3";
// Original full mix
const FULL_MIX_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-audio/1-1778788890320.mp3";

const tmp: string[] = [];
function tmpFile(label: string, ext: string): string {
  const p = path.join(os.tmpdir(), `redo-${label}-${Date.now()}-${Math.random().toString(36).slice(2,6)}.${ext}`);
  tmp.push(p);
  return p;
}
function clean() { tmp.forEach(f => { try { fs.unlinkSync(f); } catch {} }); }

async function dl(url: string, label: string, ext: string): Promise<string> {
  const p = tmpFile(label, ext);
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} downloading ${label}`);
  fs.writeFileSync(p, Buffer.from(await r.arrayBuffer()));
  console.log(`  ↓ ${label}: ${(fs.statSync(p).size / 1024).toFixed(0)}KB`);
  return p;
}

async function cutVocals(vocalsPath: string, startS: number, durS: number, label: string): Promise<string> {
  const out = tmpFile(`vocals-${label}`, "mp3");
  await execAsync([
    FFMPEG, "-y",
    `-ss ${startS} -t ${durS}`,
    `-i "${vocalsPath}"`,
    "-c:a libmp3lame -ar 44100 -b:a 192k -loglevel error",
    `"${out}"`
  ].join(" "), { timeout: 30000 });
  const size = fs.statSync(out).size;
  console.log(`  ✂ Vocals cut ${startS}-${startS + durS}s: ${(size / 1024).toFixed(0)}KB`);
  return out;
}

async function main() {
  try {
    console.log("[Redo Lip Sync] Downloading vocals stem...");
    const vocalsLocal = await dl(VOCALS_URL, "vocals-full", "mp3");

    // Process each scene sequentially
    const lipSyncedVideoUrls: string[] = [];

    for (const scene of SCENES) {
      console.log(`\n[Scene ${scene.index}] ${scene.startS}-${scene.startS + scene.durS}s`);

      // 1. Cut isolated vocals at exact timestamp
      const vocalClip = await cutVocals(vocalsLocal, scene.startS, scene.durS, `s${scene.index}`);

      // 2. Upload vocal clip to S3 so SyncLabs can access it
      const buf = fs.readFileSync(vocalClip);
      const { url: vocalUrl } = await storagePut(
        `music-video-preview/vocals-scene${scene.index}-${Date.now()}.mp3`,
        buf, "audio/mpeg"
      );
      console.log(`  ↑ Vocals uploaded: ${vocalUrl.slice(0, 70)}...`);

      // 3. Submit to SyncLabs sync-3 using the project's SDK
      const jobId = await submitSyncLabsLipSync({
        videoUrl: scene.videoUrl,
        audioUrl: vocalUrl,
        syncMode: "cut_off",
        temperature: 1.0,
        occlusionDetection: true,
        outputFileName: `redo-scene${scene.index}-${Date.now()}`,
      });

      // 4. Poll until done (up to 10 minutes)
      const outputUrl = await pollSyncLabsLipSync(jobId, 10 * 60 * 1000);
      lipSyncedVideoUrls.push(outputUrl);
      console.log(`  ✅ Scene ${scene.index} lip sync complete`);
    }

    console.log(`\n\n[Assembly] All 3 scenes lip-synced. Assembling preview...`);

    // Download all 3 lip-synced videos
    const localVideos: string[] = [];
    for (let i = 0; i < lipSyncedVideoUrls.length; i++) {
      const local = await dl(lipSyncedVideoUrls[i], `synced-s${SCENES[i].index}`, "mp4");
      localVideos.push(local);
    }

    // Normalize all to same format (strip audio, 1280x720, 24fps)
    console.log("\n[Assembly] Normalizing clips (stripping SyncLabs audio)...");
    const normalized: string[] = [];
    for (let i = 0; i < localVideos.length; i++) {
      const out = tmpFile(`norm-${i}`, "mp4");
      await execAsync([
        FFMPEG, "-y", `-i "${localVideos[i]}"`,
        "-c:v libx264 -preset fast -crf 18",
        "-vf 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2'",
        "-r 24 -an -loglevel error",
        `"${out}"`
      ].join(" "), { timeout: 60000 });
      normalized.push(out);
      console.log(`  ✅ Normalized ${i + 1}/3 (audio stripped)`);
    }

    // Concatenate
    console.log("\n[Assembly] Concatenating 3 silent clips...");
    const concatFile = tmpFile("concat", "txt");
    fs.writeFileSync(concatFile, normalized.map(f => `file '${f}'`).join("\n"));
    const concatVideo = tmpFile("concat-video", "mp4");
    await execAsync([
      FFMPEG, "-y", "-f concat -safe 0",
      `-i "${concatFile}"`,
      "-c:v copy -loglevel error",
      `"${concatVideo}"`
    ].join(" "), { timeout: 30000 });
    console.log("  ✅ Video concatenated (silent)");

    // Cut original full mix at 42-60s
    console.log("\n[Assembly] Cutting original full mix 42-60s...");
    const fullMixLocal = await dl(FULL_MIX_URL, "fullmix", "mp3");
    const audioClip = tmpFile("audio-42-60", "aac");
    await execAsync([
      FFMPEG, "-y",
      `-i "${fullMixLocal}"`,
      `-ss 42 -t 18`,
      "-c:a aac -ar 44100 -b:a 192k -loglevel error",
      `"${audioClip}"`
    ].join(" "), { timeout: 30000 });
    console.log("  ✅ Audio cut (original full mix 42-60s)");

    // Combine: silent concatenated video + original full mix audio
    console.log("\n[Assembly] Overlaying original full mix on silent video...");
    const finalPath = tmpFile("final-preview", "mp4");
    await execAsync([
      FFMPEG, "-y",
      `-i "${concatVideo}"`,
      `-i "${audioClip}"`,
      "-map 0:v:0 -map 1:a:0",
      "-c:v copy -c:a copy",
      "-t 18 -shortest -loglevel error",
      `"${finalPath}"`
    ].join(" "), { timeout: 30000 });

    const finalSize = fs.statSync(finalPath).size;
    console.log(`  ✅ Final preview: ${(finalSize / 1024 / 1024).toFixed(1)}MB`);

    // Upload
    console.log("\n[Upload] Uploading final preview...");
    const finalBuf = fs.readFileSync(finalPath);
    const { url: finalUrl } = await storagePut(
      `music-video-preview/lipsync-redo-preview-${Date.now()}.mp4`,
      finalBuf, "video/mp4"
    );

    console.log(`\n${"=".repeat(60)}`);
    console.log(`✅ LIP SYNC REDO PREVIEW READY`);
    console.log(`URL: ${finalUrl}`);
    console.log(`${"=".repeat(60)}`);
    console.log(`Scenes 7→8→9 | 42-60s | ALL scenes lip-synced`);
    console.log(`Vocals sent to SyncLabs: isolated Demucs stem ONLY`);
    console.log(`Audio in final video: original full mix overlaid`);
    console.log(`SyncLabs audio: STRIPPED (not present in output)`);

  } finally {
    clean();
  }
  process.exit(0);
}

main().catch(err => { console.error("FAILED:", err.message); process.exit(1); });
