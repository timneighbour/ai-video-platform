/**
 * Direct assembly runner for Job 660001 (Air Studios)
 * Run with: npx tsx server/run-assembly-660001.ts
 */
import "dotenv/config";
import { assembleMusicVideo } from "./music-video-service";

const JOB_ID = 660001;

console.log(`[RunAssembly] Starting assembly for Job ${JOB_ID}...`);

assembleMusicVideo(JOB_ID, "standard")
  .then((url) => {
    console.log(`[RunAssembly] ✅ Assembly complete for Job ${JOB_ID}`);
    console.log(`[RunAssembly] Final video URL: ${url}`);
    process.exit(0);
  })
  .catch((err) => {
    console.error(`[RunAssembly] ❌ Assembly failed for Job ${JOB_ID}:`, err);
    process.exit(1);
  });
