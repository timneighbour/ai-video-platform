/**
 * Re-render scenes 0, 3, 4, 5, 6 at proper 16:9 (1280x720).
 * 
 * The issue: WaveSpeed returns 960x960 when the character reference image is square.
 * Fix: For cinematic scenes (0, 4, 6) — don't send character image (orchestra shots).
 *      For performance scenes (3, 5) — send character image but ensure 16:9 output.
 * 
 * Also: re-apply lip sync to scenes 3 and 5 with isolated vocals.
 */
import { getDb } from "./db";
import { musicVideoScenes, musicVideoJobs } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { submitWaveSpeedImageToVideo, submitWaveSpeedVideo, pollWaveSpeedVideo } from "./ai-apis/wavespeed";
import { submitSyncLabsLipSync, pollSyncLabsLipSync } from "./ai-apis/synclabs-lipsync";
import { storagePut } from "./storage";
import { execSync } from "child_process";
import { readFileSync } from "fs";

const JOB_ID = 660001;
const FFMPEG = "/usr/bin/ffmpeg";

// Cinematic scenes — no character image needed (orchestra/environment shots)
const CINEMATIC_SCENES = [0, 4, 6];
// Performance scenes — need character image + lip sync
const PERFORMANCE_SCENES = [3, 5];

async function main() {
  const db = (await getDb())!;
  const [job] = await db.select().from(musicVideoJobs).where(eq(musicVideoJobs.id, JOB_ID));
  if (!job) throw new Error("Job not found");

  const allScenes = await db.select().from(musicVideoScenes).where(eq(musicVideoScenes.jobId, JOB_ID));
  const charImage = job.characterImageUrl || "";
  
  // Check character image dimensions
  if (charImage) {
    try {
      const info = execSync(`${FFMPEG} -i "${charImage}" 2>&1 || true`).toString();
      const match = info.match(/(\d{3,4})x(\d{3,4})/);
      console.log(`Character image: ${match ? match[0] : "unknown"}`);
    } catch {}
  }

  console.log("\n=== RE-RENDERING 5 SCENES AT 16:9 ===\n");

  // Submit all renders
  const tasks: { sceneIndex: number; taskId: string }[] = [];

  for (const sceneIndex of [...CINEMATIC_SCENES, ...PERFORMANCE_SCENES]) {
    const scene = allScenes.find(s => s.sceneIndex === sceneIndex);
    if (!scene) continue;

    const prompt = (scene.prompt || "") + " Tempo: 76 BPM. All movement must be slow, graceful, flowing.";
    const isCinematic = CINEMATIC_SCENES.includes(sceneIndex);

    try {
      let taskId: string;
      if (isCinematic) {
        // Text-to-video for cinematic scenes (no character image = guaranteed 16:9)
        taskId = await submitWaveSpeedVideo(
          { prompt, duration: 5, aspect_ratio: "16:9", resolution: "720p" },
          "bytedance/seedance-2.0-fast/text-to-video"
        );
      } else {
        // Image-to-video for performance scenes with character
        taskId = await submitWaveSpeedImageToVideo(
          { prompt, image: charImage, duration: 5, aspect_ratio: "16:9", resolution: "720p" },
          "bytedance/seedance-2.0-fast/image-to-video"
        );
      }
      console.log(`Scene ${sceneIndex} (${isCinematic ? "cinematic" : "performance"}): submitted ${taskId}`);
      tasks.push({ sceneIndex, taskId });
    } catch (err: any) {
      console.error(`Scene ${sceneIndex}: FAILED - ${err.message}`);
    }
  }

  // Poll all
  console.log("\nPolling...");
  for (const { sceneIndex, taskId } of tasks) {
    const start = Date.now();
    let videoUrl: string | undefined;

    while (Date.now() - start < 10 * 60 * 1000) {
      const result = await pollWaveSpeedVideo(taskId);
      if (result.status === "completed" && (result.video_url || (result.outputs && result.outputs.length > 0))) {
        videoUrl = result.video_url || result.outputs![0];
        break;
      } else if (result.status === "failed") {
        console.error(`Scene ${sceneIndex}: FAILED - ${result.error}`);
        break;
      }
      await new Promise(r => setTimeout(r, 10000));
    }

    if (videoUrl) {
      // Check dimensions
      const info = execSync(`${FFMPEG} -i "${videoUrl}" 2>&1 || true`).toString();
      const match = info.match(/(\d{3,4})x(\d{3,4})/);
      console.log(`Scene ${sceneIndex}: ✅ ${match ? match[0] : "?"} (${((Date.now() - start) / 1000).toFixed(0)}s)`);

      // Upload to S3
      const resp = await fetch(videoUrl);
      const buffer = Buffer.from(await resp.arrayBuffer());
      const key = `${job.userId}/music-video/${JOB_ID}/scene-${sceneIndex}-16x9-${Date.now()}.mp4`;
      const { url: s3Url } = await storagePut(key, buffer, "video/mp4");

      // Update DB
      const scene = allScenes.find(s => s.sceneIndex === sceneIndex)!;
      await db.update(musicVideoScenes)
        .set({ status: "completed", videoUrl: s3Url, videoKey: key, lipSyncStatus: "pending", lipSyncVideoUrl: null, lipSyncVideoKey: null, updatedAt: new Date() })
        .where(eq(musicVideoScenes.id, scene.id));
    } else {
      console.error(`Scene ${sceneIndex}: ❌ TIMEOUT`);
    }
  }

  // Apply lip sync to performance scenes (3, 5)
  console.log("\n=== APPLYING LIP SYNC ===\n");
  const vocalsUrl = job.vocalsUrl;
  if (!vocalsUrl) { console.error("No vocals URL"); process.exit(1); }

  const tmpVocals = "/tmp/full-vocals-rerender.mp3";
  execSync(`curl -sL "${vocalsUrl}" -o "${tmpVocals}"`, { timeout: 30000 });

  // Refresh scenes
  const refreshed = await db.select().from(musicVideoScenes).where(eq(musicVideoScenes.jobId, JOB_ID));

  for (const sceneIndex of PERFORMANCE_SCENES) {
    const scene = refreshed.find(s => s.sceneIndex === sceneIndex);
    if (!scene || !scene.videoUrl) { console.warn(`Scene ${sceneIndex}: skip`); continue; }

    const startTimeSec = (scene.startTime ?? (sceneIndex * 6000)) / 1000;
    const durationSec = 6; // duration field is 6 (seconds)
    
    console.log(`Scene ${sceneIndex}: vocals ${startTimeSec}s-${startTimeSec + durationSec}s`);

    const tmpAudio = `/tmp/vocals-rerender-${sceneIndex}.mp3`;
    execSync(`${FFMPEG} -y -i "${tmpVocals}" -ss ${startTimeSec} -t ${durationSec} -c:a libmp3lame -q:a 2 "${tmpAudio}" 2>/dev/null`);

    // Volume check
    const vc = execSync(`${FFMPEG} -i "${tmpAudio}" -af volumedetect -f null /dev/null 2>&1 || true`).toString();
    const mm = vc.match(/mean_volume:\s*([-\d.]+)/);
    console.log(`  Volume: ${mm ? mm[1] : "?"} dB`);

    // Upload vocals
    const audioBuffer = readFileSync(tmpAudio);
    const audioKey = `${job.userId}/music-video/${JOB_ID}/vocals-16x9-scene-${sceneIndex}-${Date.now()}.mp3`;
    const { url: audioS3Url } = await storagePut(audioKey, audioBuffer, "audio/mpeg");

    // Submit to SyncLabs
    console.log(`  Submitting to SyncLabs...`);
    const syncJobId = await submitSyncLabsLipSync({
      videoUrl: scene.videoUrl,
      audioUrl: audioS3Url,
      temperature: 1.0,
      occlusionDetection: true,
      syncMode: "cut_off",
    });
    console.log(`  Job: ${syncJobId}`);

    // Poll — pollSyncLabsLipSync returns the output URL string directly (throws on failure)
    const syncStart = Date.now();
    let lsUrl: string | undefined;
    try {
      lsUrl = await pollSyncLabsLipSync(syncJobId, 5 * 60 * 1000);
    } catch (pollErr: any) {
      console.error(`  Lip sync poll failed: ${String(pollErr?.message ?? pollErr).slice(0, 200)}`);
    }

    if (lsUrl) {
      console.log(`  ✅ Lip sync done (${((Date.now() - syncStart) / 1000).toFixed(0)}s)`);
      const lsResp = await fetch(lsUrl);
      const lsBuf = Buffer.from(await lsResp.arrayBuffer());
      const lsKey = `${job.userId}/music-video/${JOB_ID}/lipsync-16x9-scene-${sceneIndex}-${Date.now()}.mp4`;
      const { url: lsS3Url } = await storagePut(lsKey, lsBuf, "video/mp4");
      await db.update(musicVideoScenes)
        .set({ lipSyncStatus: "done", lipSyncVideoUrl: lsS3Url, lipSyncVideoKey: lsKey, updatedAt: new Date() })
        .where(eq(musicVideoScenes.id, scene.id));
    } else {
      console.error(`  ❌ Timeout`);
    }
  }

  // Mark cinematic scenes as lip sync done (no vocals needed)
  for (const sceneIndex of CINEMATIC_SCENES) {
    const scene = refreshed.find(s => s.sceneIndex === sceneIndex);
    if (scene) {
      await db.update(musicVideoScenes)
        .set({ lipSyncStatus: "done", updatedAt: new Date() })
        .where(eq(musicVideoScenes.id, scene.id));
    }
  }

  console.log("\n=== ALL DONE ===");
  process.exit(0);
}

main().catch(err => { console.error("FATAL:", err); process.exit(1); });
