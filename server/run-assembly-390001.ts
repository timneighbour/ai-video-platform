/**
 * One-off script to trigger assembly for job 390001.
 * Run with: npx tsx server/run-assembly-390001.ts
 */
import { assembleMusicVideo } from "./music-video-service";

const JOB_ID = 390001;
const AUDIO_TIER = "standard" as const;

async function main() {
  console.log(`=== Triggering assembly for job ${JOB_ID} ===`);
  console.log(`Audio tier: ${AUDIO_TIER}`);
  console.log(`Started at: ${new Date().toISOString()}\n`);

  try {
    await assembleMusicVideo(JOB_ID, AUDIO_TIER);
    console.log(`\n✅ Assembly completed successfully for job ${JOB_ID}`);
    console.log(`Completed at: ${new Date().toISOString()}`);
    process.exit(0);
  } catch (err) {
    console.error(`\n❌ Assembly failed for job ${JOB_ID}:`, err);
    process.exit(1);
  }
}

main();
