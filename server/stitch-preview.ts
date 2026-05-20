/**
 * Stitch scenes 7, 8, 9 (42-60s) into an 18-second preview with original full mix audio.
 * 
 * Scene 7 (42-48s) → lip-synced video (performance)
 * Scene 8 (48-54s) → raw video (cinematic, no lip sync needed)
 * Scene 9 (54-60s) → lip-synced video (performance)
 * 
 * Audio: original full mix cut at 42-60s
 * 
 * Run: npx tsx server/stitch-preview.ts
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

let FFMPEG = "ffmpeg";
try {
  const inst = _require("@ffmpeg-installer/ffmpeg");
  if (inst?.path && fs.existsSync(inst.path)) { fs.chmodSync(inst.path, 0o755); FFMPEG = inst.path; }
} catch {}

// Scene video URLs — use lip-synced versions for performance scenes
const SCENE_7_VIDEO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-scenes/660008-synclabs-1779235874323.mp4";
const SCENE_8_VIDEO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-scenes/660009-1779235756466.mp4";
const SCENE_9_VIDEO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-scenes/lipsync-660010-1779236038214.mp4";

// Original full mix
const FULL_MIX_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-audio/1-1778788890320.mp3";

const PREVIEW_START_S = 42;
const PREVIEW_DUR_S = 18;

async function dl(url: string, ext: string, label: string): Promise<string> {
  const p = path.join(os.tmpdir(), `stitch-${label}-${Date.now()}.${ext}`);
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} downloading ${label}`);
  fs.writeFileSync(p, Buffer.from(await r.arrayBuffer()));
  console.log(`  ↓ ${label}: ${(fs.statSync(p).size/1024).toFixed(0)}KB`);
  return p;
}

async function main() {
  const tmp: string[] = [];
  const clean = () => tmp.forEach(f => { try { fs.unlinkSync(f); } catch {} });

  try {
    console.log("[Preview] Downloading scene clips and audio...");
    const scene7 = await dl(SCENE_7_VIDEO, "mp4", "scene7-lipsync"); tmp.push(scene7);
    const scene8 = await dl(SCENE_8_VIDEO, "mp4", "scene8-cinematic"); tmp.push(scene8);
    const scene9 = await dl(SCENE_9_VIDEO, "mp4", "scene9-lipsync"); tmp.push(scene9);
    const fullMix = await dl(FULL_MIX_URL, "mp3", "full-mix"); tmp.push(fullMix);

    // Step 1: Normalize all videos to same codec/resolution/fps for concat
    console.log("\n[Preview] Normalizing video clips...");
    const normalized: string[] = [];
    for (const [i, src] of [scene7, scene8, scene9].entries()) {
      const out = path.join(os.tmpdir(), `stitch-norm-${i}-${Date.now()}.mp4`);
      tmp.push(out);
      await execAsync([
        FFMPEG, "-y", `-i "${src}"`,
        "-c:v libx264 -preset fast -crf 18",
        "-vf 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2'",
        "-r 24 -an",  // strip audio, normalize to 24fps
        "-loglevel error",
        `"${out}"`
      ].join(" "), { timeout: 60000 });
      normalized.push(out);
      console.log(`  ✅ Normalized clip ${i+1}/3`);
    }

    // Step 2: Create concat file
    const concatFile = path.join(os.tmpdir(), `stitch-concat-${Date.now()}.txt`);
    tmp.push(concatFile);
    fs.writeFileSync(concatFile, normalized.map(f => `file '${f}'`).join("\n"));

    // Step 3: Concatenate video clips
    console.log("\n[Preview] Concatenating 3 clips...");
    const concatVideo = path.join(os.tmpdir(), `stitch-concat-${Date.now()}.mp4`);
    tmp.push(concatVideo);
    await execAsync([
      FFMPEG, "-y", "-f concat -safe 0",
      `-i "${concatFile}"`,
      "-c:v copy -loglevel error",
      `"${concatVideo}"`
    ].join(" "), { timeout: 30000 });
    console.log("  ✅ Video concatenated");

    // Step 4: Cut full mix at 42-60s
    console.log(`\n[Preview] Cutting full mix ${PREVIEW_START_S}s-${PREVIEW_START_S + PREVIEW_DUR_S}s...`);
    const audioClip = path.join(os.tmpdir(), `stitch-audio-${Date.now()}.aac`);
    tmp.push(audioClip);
    await execAsync([
      FFMPEG, "-y",
      `-i "${fullMix}"`,
      `-ss ${PREVIEW_START_S} -t ${PREVIEW_DUR_S}`,
      "-c:a aac -ar 44100 -b:a 192k -loglevel error",
      `"${audioClip}"`
    ].join(" "), { timeout: 30000 });
    console.log("  ✅ Audio cut");

    // Step 5: Combine video + audio
    console.log("\n[Preview] Combining video + original full mix audio...");
    const finalPath = path.join(os.tmpdir(), `stitch-final-${Date.now()}.mp4`);
    tmp.push(finalPath);
    await execAsync([
      FFMPEG, "-y",
      `-i "${concatVideo}"`,
      `-i "${audioClip}"`,
      "-map 0:v:0 -map 1:a:0",
      "-c:v copy -c:a copy",
      `-t ${PREVIEW_DUR_S}`,
      "-shortest -loglevel error",
      `"${finalPath}"`
    ].join(" "), { timeout: 30000 });
    const finalSize = fs.statSync(finalPath).size;
    console.log(`  ✅ Final preview: ${(finalSize/1024/1024).toFixed(1)}MB`);

    // Step 6: Upload
    console.log("\n[Preview] Uploading...");
    const finalBuf = fs.readFileSync(finalPath);
    const { url: finalUrl } = await storagePut(
      `music-video-preview/3-scene-preview-${Date.now()}.mp4`,
      finalBuf, "video/mp4"
    );

    console.log(`\n${"=".repeat(60)}`);
    console.log(`✅ 3-SCENE PREVIEW READY (18 seconds)`);
    console.log(`URL: ${finalUrl}`);
    console.log(`${"=".repeat(60)}`);
    console.log(`Scenes 7→8→9 | 42-60s | Chorus section`);
    console.log(`Video: lip-synced performance + cinematic cutaway`);
    console.log(`Audio: original full mix "Beauty of the Wreckage"`);

  } finally {
    clean();
  }
  process.exit(0);
}

main().catch(err => { console.error("FAILED:", err.message); process.exit(1); });
