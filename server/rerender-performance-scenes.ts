/**
 * Re-render ONLY the performance scenes (1, 3, 5, 7, 9) for job 660001
 * with SyncLabs-optimised framing:
 *   - Medium close-up, face-forward
 *   - Mic offset/lowered — never blocking lips or jaw
 *   - Clear jawline, stable camera
 *   - Air Studios aesthetic preserved
 * 
 * Then apply SyncLabs sync-3 with isolated vocals and reassemble.
 */
import { getDb } from "./db";
import { musicVideoScenes, musicVideoJobs } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { submitWaveSpeedImageToVideo, pollWaveSpeedVideo } from "./ai-apis/wavespeed";
import type { WaveSpeedVideoResponse } from "./ai-apis/wavespeed";
import { submitSyncLabsLipSync, pollSyncLabsLipSync } from "./ai-apis/synclabs-lipsync";
import { storagePut } from "./storage";
import { execSync } from "child_process";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";

const JOB_ID = 660001;
const FFMPEG = "/usr/bin/ffmpeg";
const WORK = "/tmp/rerender-perf";

// SyncLabs-optimised performance scene prompts
// Key requirements:
//   - Medium close-up (MCU): face fills ~40-60% of frame height
//   - Face-forward: camera axis aligned with face
//   - Mic BELOW chin or to the side — never in front of mouth
//   - Clear jawline and mouth region always visible
//   - Stable, minimal camera movement
//   - Air Studios warm amber lighting preserved
const PERFORMANCE_PROMPTS: Record<number, string> = {
  1: `Medium close-up of Zara singing at Air Studios Lindhurst Hall. Slim white woman, long straight black hair, green eyes, black leather jacket over black corset. Camera is face-forward, eye-level. Vintage Neumann U87 microphone positioned BELOW her chin and slightly to the left side — mouth and lips completely unobstructed and clearly visible. Warm amber studio lighting from above-right. Soft bokeh orchestra background. Stable camera, slow subtle breathing motion. Jaw and mouth fully visible throughout. Cinematic 24fps, shallow depth of field.`,

  3: `Medium close-up of Zara singing passionately at Air Studios. Slim white woman, long straight black hair, green eyes, black leather jacket. Camera face-forward at eye level. Vintage microphone stand positioned to her LEFT side — mic body beside her cheek, NOT in front of her mouth. Lips, teeth, and jaw clearly visible as she sings with eyes closed. Warm amber side lighting, dramatic shadows on cheekbones. Emotional expression, slight head tilt. Stable camera. Cinematic Air Studios atmosphere.`,

  5: `Medium close-up of Zara at Air Studios, raw emotional singing performance. Slim white woman, long straight black hair, green eyes. Camera directly face-forward. Vintage microphone on a low stand positioned BELOW her chin — mouth region completely clear and unobstructed. Tears glistening in eyes, warm amber light. Jaw movement fully visible. Slight camera breathing motion only. Cinematic shallow depth of field, orchestra softly visible in background bokeh.`,

  7: `Medium close-up of Zara performing at Air Studios Lindhurst Hall. Slim white woman, long straight black hair, green eyes, black corset. Camera at eye level, face-forward. Microphone positioned to the RIGHT side of frame — offset away from her mouth, lips and jaw fully visible. Climactic emotional expression, mouth open in song. Warm amber studio lighting, soft orchestra bokeh background. Stable camera with subtle breathing motion. Cinematic 24fps.`,

  9: `Cinematic medium close-up of Zara at Air Studios, final emotional performance. Slim white woman, long straight black hair, green eyes, black leather jacket. Camera face-forward, eye level. NO microphone in front of face — microphone stand visible to far left side only. Lips, mouth, and jaw completely clear and visible throughout. Tears, raw emotion, eyes open looking into camera. Warm amber backlighting with soft fill. Shallow depth of field, orchestra in background. Stable camera, slow zoom in.`,
};

async function main() {
  const db = (await getDb())!;
  const [job] = await db.select().from(musicVideoJobs).where(eq(musicVideoJobs.id, JOB_ID));
  if (!job) throw new Error("Job not found");
  if (!job.characterImageUrl) throw new Error("No character image URL");
  if (!job.vocalsUrl) throw new Error("No vocals URL");

  if (!existsSync(WORK)) mkdirSync(WORK, { recursive: true });

  // Download isolated vocals once
  console.log("=== Downloading isolated vocals ===");
  execSync(`curl -sL "${job.vocalsUrl}" -o "${WORK}/vocals.mp3"`, { timeout: 30000 });
  console.log("  Vocals downloaded");

  const allScenes = await db.select().from(musicVideoScenes).where(eq(musicVideoScenes.jobId, JOB_ID));
  const perfSceneIndices = [1, 3, 5, 7, 9];

  // ── PHASE 1: Re-render performance scenes ──────────────────────────────────
  console.log("\n=== PHASE 1: Re-rendering performance scenes with optimised framing ===");
  const renderResults: Record<number, string> = {};

  for (const sceneIndex of perfSceneIndices) {
    const scene = allScenes.find(s => s.sceneIndex === sceneIndex)!;
    const prompt = PERFORMANCE_PROMPTS[sceneIndex];
    console.log(`\nScene ${sceneIndex}: Submitting to WaveSpeed...`);
    console.log(`  Prompt: ${prompt.slice(0, 100)}...`);

    try {
      const taskId = await submitWaveSpeedImageToVideo({
        image: job.characterImageUrl!,
        prompt,
        duration: 5,
        aspect_ratio: "16:9",
        resolution: "720p",
      });
      console.log(`  Task ID: ${taskId}`);

      // pollWaveSpeedVideo returns WaveSpeedVideoResponse, not a string
      // We need to poll until status=completed
      let pollResult: any;
      const deadline = Date.now() + 10 * 60 * 1000;
      while (true) {
        pollResult = await pollWaveSpeedVideo(taskId);
        if (pollResult.status === 'completed') break;
        if (pollResult.status === 'failed') throw new Error(`WaveSpeed render failed: ${pollResult.error}`);
        if (Date.now() > deadline) throw new Error('WaveSpeed render timed out');
        await new Promise(r => setTimeout(r, 5000));
      }
      const videoUrl: string = pollResult.video_url || (pollResult.outputs && pollResult.outputs[0]);
      if (!videoUrl) throw new Error('No video URL in WaveSpeed response');
      console.log(`  ✅ Scene ${sceneIndex} rendered: ${videoUrl.slice(0, 80)}`);

      // Download and re-upload to S3 for permanent storage
      const resp = await fetch(videoUrl);
      const buf = Buffer.from(await resp.arrayBuffer());
      const key = `${job.userId}/music-video/${JOB_ID}/perf-v2-${sceneIndex}-${Date.now()}.mp4`;
      const { url: s3Url } = await storagePut(key, buf, "video/mp4");

      // Update scene with new video URL, reset lip sync
      await db.update(musicVideoScenes)
        .set({
          videoUrl: s3Url,
          lipSyncStatus: "pending",
          lipSyncVideoUrl: null,
          lipSyncTaskId: null,
          updatedAt: new Date(),
        })
        .where(eq(musicVideoScenes.id, scene.id));

      renderResults[sceneIndex] = s3Url;
      console.log(`  Saved to S3: ${s3Url.slice(0, 80)}`);
    } catch (err: any) {
      console.error(`  ❌ Scene ${sceneIndex} render failed: ${err.message}`);
      // Use existing video as fallback
      renderResults[sceneIndex] = scene.videoUrl!;
    }
  }

  // ── PHASE 2: Apply SyncLabs lip sync ──────────────────────────────────────
  console.log("\n=== PHASE 2: Applying SyncLabs sync-3 lip sync ===");
  const lipSyncResults: Record<number, string> = {};

  // Re-fetch scenes after render updates
  const updatedScenes = await db.select().from(musicVideoScenes).where(eq(musicVideoScenes.jobId, JOB_ID));

  for (const sceneIndex of perfSceneIndices) {
    const scene = updatedScenes.find(s => s.sceneIndex === sceneIndex)!;
    const videoUrl = renderResults[sceneIndex] || scene.videoUrl!;
    const startSec = (scene.startTime ?? (sceneIndex * 6000)) / 1000;
    const durSec = 6;

    console.log(`\nScene ${sceneIndex}: vocals ${startSec}s–${startSec + durSec}s`);

    // Cut isolated vocals for this scene
    const tmpAudio = `${WORK}/vox-${sceneIndex}.mp3`;
    execSync(
      `${FFMPEG} -y -i "${WORK}/vocals.mp3" -ss ${startSec} -t ${durSec} -c:a libmp3lame -q:a 2 "${tmpAudio}" 2>/dev/null`,
      { timeout: 15000 }
    );

    // Volume check
    const vc = execSync(`${FFMPEG} -i "${tmpAudio}" -af volumedetect -f null /dev/null 2>&1 || true`).toString();
    const mm = vc.match(/mean_volume:\s*([-\d.]+)/);
    const vol = mm ? parseFloat(mm[1]) : -99;
    console.log(`  Vocal volume: ${vol} dB`);

    if (vol < -40) {
      console.log(`  ⚠ Vocals too quiet at ${startSec}s — using full mix segment instead`);
      // Fall back to full mix segment — download mix first if not present
      if (!existsSync(`${WORK}/mix.mp3`)) {
        execSync(`curl -sL "${job.audioUrl}" -o "${WORK}/mix.mp3"`, { timeout: 30000 });
      }
      execSync(
        `${FFMPEG} -y -i "${WORK}/mix.mp3" -ss ${startSec} -t ${durSec} -c:a libmp3lame -q:a 2 "${tmpAudio}" 2>/dev/null`,
        { timeout: 15000 }
      );
    }

    // Upload vocals clip to S3
    const audioBuf = readFileSync(tmpAudio);
    const audioKey = `${job.userId}/music-video/${JOB_ID}/vox-v2-${sceneIndex}-${Date.now()}.mp3`;
    const { url: audioS3 } = await storagePut(audioKey, audioBuf, "audio/mpeg");

    // Submit to SyncLabs sync-3
    console.log(`  Submitting to SyncLabs sync-3...`);
    try {
      const syncJobId = await submitSyncLabsLipSync({
        videoUrl,
        audioUrl: audioS3,
        syncMode: "cut_off",
        temperature: 1.0,
        occlusionDetection: true,
        outputFileName: `wizsync-v2-scene-${sceneIndex}-${Date.now()}`,
      });
      console.log(`  SyncLabs job: ${syncJobId}`);

      const outputUrl = await pollSyncLabsLipSync(syncJobId, 8 * 60 * 1000);
      console.log(`  ✅ Lip sync done`);

      // Download and re-upload to S3
      const lsResp = await fetch(outputUrl);
      const lsBuf = Buffer.from(await lsResp.arrayBuffer());
      const lsKey = `${job.userId}/music-video/${JOB_ID}/ls-v2-${sceneIndex}-${Date.now()}.mp4`;
      const { url: lsS3 } = await storagePut(lsKey, lsBuf, "video/mp4");

      await db.update(musicVideoScenes)
        .set({ lipSyncStatus: "done", lipSyncVideoUrl: lsS3, lipSyncVideoKey: lsKey, updatedAt: new Date() })
        .where(eq(musicVideoScenes.id, scene.id));

      lipSyncResults[sceneIndex] = lsS3;
      console.log(`  Saved: ${lsS3.slice(0, 80)}`);
    } catch (err: any) {
      console.error(`  ❌ SyncLabs failed for scene ${sceneIndex}: ${err.message}`);
      // Mark as error — assembly will use raw clip
      await db.update(musicVideoScenes)
        .set({ lipSyncStatus: "error", updatedAt: new Date() })
        .where(eq(musicVideoScenes.id, scene.id));
      lipSyncResults[sceneIndex] = videoUrl; // fallback to raw
    }
  }

  // ── PHASE 3: Assemble final video ─────────────────────────────────────────
  console.log("\n=== PHASE 3: Assembling final video ===");

  // Download full mix audio
  execSync(`curl -sL "${job.audioUrl}" -o "${WORK}/mix.mp3"`, { timeout: 30000 });

  const finalScenes = await db.select().from(musicVideoScenes).where(eq(musicVideoScenes.jobId, JOB_ID));
  const sorted = finalScenes.sort((a, b) => (a.sceneIndex ?? 0) - (b.sceneIndex ?? 0));

  // Download all clips
  for (const s of sorted) {
    const isPerf = s.sceneType === "performance";
    const url = isPerf
      ? (s.lipSyncVideoUrl || s.videoUrl!)
      : s.videoUrl!;
    const clipPath = `${WORK}/clip-${s.sceneIndex}.mp4`;
    console.log(`  Downloading scene ${s.sceneIndex} (${isPerf ? (s.lipSyncVideoUrl ? "lip-synced" : "raw-perf") : "cinematic"})...`);
    execSync(`curl -sL "${url}" -o "${clipPath}"`, { timeout: 60000 });
  }

  // Normalize all clips to 1280x720 @ 30fps H.264
  console.log("  Normalizing clips...");
  for (let i = 0; i < sorted.length; i++) {
    execSync(
      `${FFMPEG} -y -i "${WORK}/clip-${i}.mp4" ` +
      `-vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1" ` +
      `-r 30 -c:v libx264 -preset medium -crf 18 -an "${WORK}/norm-${i}.mp4" 2>/dev/null`,
      { timeout: 90000 }
    );
  }

  // Concatenate
  console.log("  Concatenating...");
  const list = sorted.map((_, i) => `file '${WORK}/norm-${i}.mp4'`).join("\n");
  writeFileSync(`${WORK}/list.txt`, list);
  execSync(
    `${FFMPEG} -y -f concat -safe 0 -i "${WORK}/list.txt" -c:v copy "${WORK}/silent.mp4" 2>/dev/null`,
    { timeout: 60000 }
  );

  // Add original full mix audio
  console.log("  Adding original full mix audio...");
  execSync(
    `${FFMPEG} -y -i "${WORK}/silent.mp4" -i "${WORK}/mix.mp3" ` +
    `-c:v copy -c:a aac -b:a 192k -shortest "${WORK}/final.mp4" 2>/dev/null`,
    { timeout: 60000 }
  );

  // Upload final video
  console.log("  Uploading final video...");
  const finalBuf = readFileSync(`${WORK}/final.mp4`);
  const finalKey = `${job.userId}/music-video/${JOB_ID}/final-v2-${Date.now()}.mp4`;
  const { url: finalUrl } = await storagePut(finalKey, finalBuf, "video/mp4");

  await db.update(musicVideoJobs)
    .set({ status: "completed", finalVideoUrl: finalUrl, finalVideoKey: finalKey, updatedAt: new Date() })
    .where(eq(musicVideoJobs.id, JOB_ID));

  console.log(`\n✅ FINAL VIDEO (v2): ${finalUrl}`);
  execSync(`rm -rf ${WORK}`);
  process.exit(0);
}

main().catch(err => {
  console.error("FATAL:", err);
  process.exit(1);
});
