/**
 * chorus-demo.ts
 * Scene 9 (54–60s) — the loudest chorus section (-15.7 dB vocals)
 *
 * PIPELINE:
 *   1. Cut isolated vocals stem at 54–60s  →  send to SyncLabs sync-3
 *   2. SyncLabs drives Zara's mouth from isolated voice only
 *   3. Strip SyncLabs audio entirely
 *   4. Overlay original full mix at 54–60s  →  perfect timing match
 *
 * Run: npx tsx server/chorus-demo.ts
 */
import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { exec } from "child_process";
import { promisify } from "util";
import { createRequire } from "module";
import { storagePut } from "./storage";
import { submitSyncLabsLipSync } from "./ai-apis/synclabs-lipsync";
import { SyncClient } from "@sync.so/sdk";

const execAsync = promisify(exec);
const _require = createRequire(import.meta.url);

let FFMPEG = "ffmpeg";
try {
  const inst = _require("@ffmpeg-installer/ffmpeg");
  if (inst?.path && fs.existsSync(inst.path)) { fs.chmodSync(inst.path, 0o755); FFMPEG = inst.path; }
} catch {}
console.log(`[ChorusDemo] ffmpeg: ${FFMPEG}`);

// ── Scene 9 data ──────────────────────────────────────────────────────────────
const SCENE_START_S = 54;
const SCENE_DUR_S   = 6;
const RAW_VIDEO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-scenes/660010-1779235827583.mp4";
const VOCALS_STEM_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-audio/660001-vocals-demucs-1779230276688.mp3";
const FULL_MIX_URL    = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-audio/1-1778695391908.mp3";

async function dl(url: string, ext: string): Promise<string> {
  const p = path.join(os.tmpdir(), `chorus-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`);
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} downloading ${url.slice(0,80)}`);
  fs.writeFileSync(p, Buffer.from(await r.arrayBuffer()));
  console.log(`  ↓ ${(fs.statSync(p).size/1024).toFixed(0)}KB → ${path.basename(p)}`);
  return p;
}

async function cutAudio(src: string, startS: number, durS: number, label: string): Promise<string> {
  const out = path.join(os.tmpdir(), `chorus-cut-${label}-${Date.now()}.mp3`);
  // Two-pass: WAV then MP3 for sample-accurate cut
  const wav = out.replace(".mp3", ".wav");
  await execAsync(`${FFMPEG} -y -i "${src}" -ss ${startS} -t ${durS} -acodec pcm_s16le -ar 44100 -ac 2 -loglevel error "${wav}"`, { timeout: 30_000 });
  await execAsync(`${FFMPEG} -y -i "${wav}" -c:a libmp3lame -b:a 192k -loglevel error "${out}"`, { timeout: 30_000 });
  fs.unlinkSync(wav);
  // Check volume
  const vol = (await execAsync(`${FFMPEG} -i "${out}" -af volumedetect -f null /dev/null 2>&1 | grep mean_volume || true`)).stdout;
  console.log(`  Audio cut ${startS}s–${startS+durS}s: ${vol.trim() || "(no volumedetect output)"}`);
  return out;
}

async function main() {
  const tmp: string[] = [];
  const clean = () => tmp.forEach(f => { try { fs.unlinkSync(f); } catch {} });

  try {
    // ── Step 1: Download assets ───────────────────────────────────────────────
    console.log("\n[Step 1] Downloading assets...");
    const vocalsStemPath = await dl(VOCALS_STEM_URL, "mp3"); tmp.push(vocalsStemPath);
    const fullMixPath    = await dl(FULL_MIX_URL, "mp3");    tmp.push(fullMixPath);

    // ── Step 2: Cut isolated vocals at 54–60s ─────────────────────────────────
    console.log(`\n[Step 2] Cutting isolated vocals ${SCENE_START_S}s–${SCENE_START_S+SCENE_DUR_S}s...`);
    const vocalsClipPath = await cutAudio(vocalsStemPath, SCENE_START_S, SCENE_DUR_S, "vocals"); tmp.push(vocalsClipPath);

    // Verify vocals are audible
    const volCheckResult = await execAsync(`${FFMPEG} -i "${vocalsClipPath}" -af volumedetect -f null /dev/null 2>&1 || true`);
    const volCheck = volCheckResult.stdout + volCheckResult.stderr;
    const meanMatch = volCheck.match(/mean_volume:\s*([-\d.]+)/);
    const meanDb = meanMatch ? parseFloat(meanMatch[1]) : -99;
    console.log(`  Vocals clip mean volume: ${meanDb} dB`);
    if (meanDb < -40) {
      throw new Error(`Vocals clip is too quiet (${meanDb} dB) — no singing at ${SCENE_START_S}s`);
    }
    console.log(`  ✅ Vocals are audible (${meanDb} dB)`);

    // ── Step 3: Upload vocals clip to S3 (SyncLabs needs a public URL) ────────
    console.log("\n[Step 3] Uploading isolated vocals clip to S3...");
    const vocalsClipBuf = fs.readFileSync(vocalsClipPath);
    const { url: vocalsClipUrl } = await storagePut(
      `music-video-scene-audio/chorus-demo-vocals-${Date.now()}.mp3`,
      vocalsClipBuf, "audio/mpeg"
    );
    console.log(`  ✅ Vocals clip URL: ${vocalsClipUrl.slice(0,80)}...`);

    // ── Step 4: Submit to SyncLabs — isolated vocals only ─────────────────────
    console.log("\n[Step 4] Submitting to SyncLabs sync-3 (isolated vocals → mouth movements)...");
    console.log(`  videoUrl: ${RAW_VIDEO_URL.slice(0,80)}...`);
    console.log(`  audioUrl: ${vocalsClipUrl.slice(0,80)}...`);
    const syncJobId = await submitSyncLabsLipSync({
      videoUrl: RAW_VIDEO_URL,
      audioUrl: vocalsClipUrl,
      syncMode: "cut_off",
      outputFileName: `chorus-demo-scene9-${Date.now()}`,
      temperature: 1.0,
      occlusionDetection: true,
    });
    console.log(`  ✅ SyncLabs job submitted: ${syncJobId}`);

    // ── Step 5: Poll SyncLabs ─────────────────────────────────────────────────
    console.log("\n[Step 5] Polling SyncLabs (this takes ~3–5 minutes)...");
    const sync = new SyncClient({ apiKey: process.env.SYNC_LABS_API_KEY! });
    let outputUrl: string | null = null;
    const deadline = Date.now() + 10 * 60 * 1000;
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 8000));
      const gen = await sync.generations.get(syncJobId);
      console.log(`  SyncLabs status: ${gen.status}`);
      if (gen.status === "COMPLETED") {
        outputUrl = (gen as any).outputUrl ?? (gen as any).output_url ?? null;
        break;
      }
      if (gen.status === "FAILED" || gen.status === "REJECTED") {
        throw new Error(`SyncLabs job ${syncJobId} ${gen.status}`);
      }
    }
    if (!outputUrl) throw new Error("SyncLabs timed out or returned no URL");
    console.log(`  ✅ SyncLabs complete: ${outputUrl.slice(0,80)}...`);

    // ── Step 6: Download SyncLabs output (has isolated vocals audio) ──────────
    console.log("\n[Step 6] Downloading SyncLabs output...");
    const syncVideoPath = await dl(outputUrl, "mp4"); tmp.push(syncVideoPath);

    // ── Step 7: Cut full mix at 54–60s ────────────────────────────────────────
    console.log(`\n[Step 7] Cutting full mix ${SCENE_START_S}s–${SCENE_START_S+SCENE_DUR_S}s...`);
    const fullMixClipPath = await cutAudio(fullMixPath, SCENE_START_S, SCENE_DUR_S, "fullmix"); tmp.push(fullMixClipPath);

    // ── Step 8: Strip SyncLabs audio, overlay full mix ────────────────────────
    // Video from SyncLabs (lip-synced) + Audio from full mix (what audience hears)
    console.log("\n[Step 8] Replacing audio: SyncLabs video + full mix audio...");
    const finalPath = path.join(os.tmpdir(), `chorus-demo-final-${Date.now()}.mp4`);
    tmp.push(finalPath);
    await execAsync([
      FFMPEG, "-y",
      `-i "${syncVideoPath}"`,    // SyncLabs lip-synced video
      `-i "${fullMixClipPath}"`,  // Full mix audio
      "-map 0:v:0",               // Video from SyncLabs
      "-map 1:a:0",               // Audio from full mix
      "-c:v copy",                // No video re-encode
      "-c:a aac -ar 44100 -b:a 192k",
      `-t ${SCENE_DUR_S}`,
      "-loglevel error",
      `"${finalPath}"`,
    ].join(" "), { timeout: 60_000 });
    console.log(`  ✅ Final clip: ${(fs.statSync(finalPath).size/1024/1024).toFixed(1)}MB`);

    // ── Step 9: Upload final clip ─────────────────────────────────────────────
    console.log("\n[Step 9] Uploading final preview clip...");
    const finalBuf = fs.readFileSync(finalPath);
    const { url: finalUrl } = await storagePut(
      `music-video-preview/chorus-demo-scene9-${Date.now()}.mp4`,
      finalBuf, "video/mp4"
    );

    console.log(`\n${"=".repeat(60)}`);
    console.log(`✅ CHORUS DEMO CLIP READY`);
    console.log(`URL: ${finalUrl}`);
    console.log(`${"=".repeat(60)}`);
    console.log(`Scene 9 | 54–60s | Loudest chorus section`);
    console.log(`Mouth: driven by isolated Demucs vocals (${meanDb} dB)`);
    console.log(`Audio: original full mix (vocals + instruments)`);

  } finally {
    clean();
  }

  process.exit(0);
}

main().catch(err => { console.error("FAILED:", err.message); process.exit(1); });
