/**
 * run-assembly-510099.ts
 * Manually triggers assembly for job 510099 to capture the actual error.
 */
import "dotenv/config";
import { assembleMusicVideo } from "./music-video-service";

async function main() {
  console.log("[ManualAssembly] Starting assembly for job 510099...");
  try {
    await assembleMusicVideo(510099);
    console.log("[ManualAssembly] ✅ Assembly completed successfully for job 510099");
  } catch (err: any) {
    console.error("[ManualAssembly] ❌ Assembly FAILED:", err?.message ?? err);
    console.error("[ManualAssembly] Stack:", err?.stack);
    process.exit(1);
  }
}

main();
