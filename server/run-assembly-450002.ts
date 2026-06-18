/**
 * One-off script to trigger assembly for job 450002 (Unstoppable).
 * Run with: npx tsx server/run-assembly-450002.ts
 */
import { assembleMusicVideo } from "./music-video-service";
const JOB_ID = 450002;
const AUDIO_TIER = "standard" as const;
async function main() {
  console.log(`=== Triggering assembly for job ${JOB_ID} ===`);
  console.log(`Audio tier: ${AUDIO_TIER}`);
  console.log(`Started at: ${new Date().toISOString()}\n`);
  try {
    const url = await assembleMusicVideo(JOB_ID, AUDIO_TIER);
    console.log(`\n✅ Assembly completed successfully for job ${JOB_ID}`);
    console.log(`Final video URL: ${url}`);
    console.log(`Completed at: ${new Date().toISOString()}`);
    process.exit(0);
  } catch (err) {
    console.error(`\n❌ Assembly failed for job ${JOB_ID}:`, err);
    process.exit(1);
  }
}
main();
