/**
 * Manual assembly trigger for job 510098 (Zara — stuck in assembling)
 * Run: npx tsx server/run-assembly-510098.ts
 */
import { assembleMusicVideo } from "./music-video-service";

const JOB_ID = 510098;
const AUDIO_TIER = "standard" as const;

console.log(`[ManualAssembly] Triggering assembly for job ${JOB_ID}...`);
console.log(`[ManualAssembly] assemblyStartedAt is set to 20min ago — Sync Labs will be SKIPPED.`);
console.log(`[ManualAssembly] Cinematic version will be delivered.`);

assembleMusicVideo(JOB_ID, AUDIO_TIER)
  .then((url) => {
    console.log(`[ManualAssembly] ✅ Job ${JOB_ID} assembled successfully!`);
    console.log(`[ManualAssembly] Final video URL: ${url}`);
    process.exit(0);
  })
  .catch((err) => {
    console.error(`[ManualAssembly] ❌ Assembly failed:`, err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
