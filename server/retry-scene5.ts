/**
 * Retry scene 5 with MuseTalk — re-encode video first to fix "Unprocessable Entity"
 */
import { fal } from "@fal-ai/client";
import { getDb } from "./db";
import { musicVideoScenes, musicVideoJobs } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { storagePut } from "./storage";
import { execSync } from "child_process";
import { readFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const JOB_ID = 660001;
const FFMPEG = "/usr/bin/ffmpeg";
const WORK = "/tmp/musetalk-pipeline";

fal.config({ credentials: process.env.FAL_AI_API_KEY! });

async function main() {
  if (!existsSync(WORK)) mkdirSync(WORK, { recursive: true });
  
  const db = (await getDb())!;
  const [job] = await db.select().from(musicVideoJobs).where(eq(musicVideoJobs.id, JOB_ID));
  const scenes = await db.select().from(musicVideoScenes).where(eq(musicVideoScenes.jobId, JOB_ID));
  const scene5 = scenes.find(s => s.sceneIndex === 5)!;
  
  console.log("Scene 5 videoUrl:", scene5.videoUrl);
  
  // Download and re-encode scene 5 video to standard mp4
  const rawPath = join(WORK, "scene5-raw.mp4");
  const reencPath = join(WORK, "scene5-reenc.mp4");
  execSync(`curl -sL "${scene5.videoUrl}" -o "${rawPath}" --max-time 30`, { timeout: 35000 });
  
  // Re-encode to standard h264 mp4
  execSync(`${FFMPEG} -y -i "${rawPath}" -c:v libx264 -preset medium -crf 18 -r 30 -c:a aac -b:a 128k "${reencPath}" 2>/dev/null`, { timeout: 30000 });
  
  // Upload re-encoded video
  const videoBuf = readFileSync(reencPath);
  const videoKey = `${job.userId}/music-video/${JOB_ID}/scene5-reenc-${Date.now()}.mp4`;
  const { url: videoUrl } = await storagePut(videoKey, videoBuf, "video/mp4");
  console.log("Re-encoded video:", videoUrl);
  
  // Cut vocals
  const vocalsPath = join(WORK, "vocals-full.mp3");
  if (!existsSync(vocalsPath)) {
    execSync(`curl -sL "${job.vocalsUrl}" -o "${vocalsPath}" --max-time 30`, { timeout: 35000 });
  }
  const cutPath = join(WORK, "vox-5-retry.mp3");
  execSync(`${FFMPEG} -y -i "${vocalsPath}" -ss 30 -t 6 -c:a libmp3lame -q:a 2 "${cutPath}" 2>/dev/null`);
  const voxBuf = readFileSync(cutPath);
  const voxKey = `${job.userId}/music-video/${JOB_ID}/mt-vox-5-retry-${Date.now()}.mp3`;
  const { url: voxUrl } = await storagePut(voxKey, voxBuf, "audio/mpeg");
  
  // Submit to MuseTalk
  console.log("Submitting to MuseTalk...");
  const result = await fal.subscribe("fal-ai/musetalk", {
    input: {
      source_video_url: videoUrl,
      audio_url: voxUrl,
    },
    logs: true,
    onQueueUpdate: (update) => {
      if (update.status === "IN_PROGRESS") {
        process.stdout.write(".");
      }
    },
  });
  console.log("");
  
  const outputUrl = (result.data as any)?.video?.url;
  if (!outputUrl) {
    console.error("No output URL");
    process.exit(1);
  }
  
  // Save
  const resp = await fetch(outputUrl);
  const buf = Buffer.from(await resp.arrayBuffer());
  const key = `${job.userId}/music-video/${JOB_ID}/mt-ls-5-${Date.now()}.mp4`;
  const { url: savedUrl } = await storagePut(key, buf, "video/mp4");
  console.log("✅ Scene 5:", savedUrl);
  
  process.exit(0);
}

main().catch(err => { console.error("FATAL:", err); process.exit(1); });
