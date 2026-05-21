import { getDb } from "./db";
import { musicVideoScenes, musicVideoJobs } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { execSync } from "child_process";

const JOB_ID = 660001;
const FFMPEG = "/usr/bin/ffmpeg";

async function main() {
  const db = (await getDb())!;
  const scenes = await db.select().from(musicVideoScenes).where(eq(musicVideoScenes.jobId, JOB_ID));
  const sorted = scenes.sort((a, b) => (a.sceneIndex ?? 0) - (b.sceneIndex ?? 0));

  console.log("=== Scene Status ===");
  for (const s of sorted) {
    const hasLS = !!s.lipSyncVideoUrl;
    console.log(`\nScene ${s.sceneIndex} | lipSyncStatus: ${s.lipSyncStatus} | hasLipSyncUrl: ${hasLS}`);
    if (s.lipSyncVideoUrl) {
      console.log(`  lipSyncUrl: ${s.lipSyncVideoUrl}`);
      // Check if it's a SyncLabs token URL (expires) vs S3 URL
      if (s.lipSyncVideoUrl.includes("api.sync.so")) {
        console.log("  ⚠️  WARNING: This is a SyncLabs token URL — it may have EXPIRED!");
      } else if (s.lipSyncVideoUrl.includes("cloudfront") || s.lipSyncVideoUrl.includes("s3")) {
        console.log("  ✅ S3/CDN URL — should be permanent");
        // Try to probe the video
        try {
          const info = execSync(`${FFMPEG} -i "${s.lipSyncVideoUrl}" 2>&1 || true`, { timeout: 15000 }).toString();
          const dim = info.match(/(\d{3,4})x(\d{3,4})/);
          const dur = info.match(/Duration:\s*([\d:\.]+)/);
          console.log(`  Dimensions: ${dim ? dim[0] : "unknown"}, Duration: ${dur ? dur[1] : "unknown"}`);
        } catch (e: any) {
          console.log(`  ❌ Could not probe: ${e.message}`);
        }
      }
    }
    if (s.videoUrl) {
      console.log(`  videoUrl: ${s.videoUrl.slice(0, 100)}`);
    }
  }

  // Check the final video
  const [job] = await db.select().from(musicVideoJobs).where(eq(musicVideoJobs.id, JOB_ID));
  console.log("\n=== Final Video ===");
  console.log("finalVideoUrl:", job.finalVideoUrl);
  console.log("status:", job.status);
}

main().catch(err => { console.error("FATAL:", err); process.exit(1); });
