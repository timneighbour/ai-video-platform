import { getDb } from "./server/db";
import { musicVideoScenes } from "./drizzle/schema";
import { eq } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) { console.log("No DB"); return; }
  
  // Get performance scenes only and check for audio clip fields
  const scenes = await db.select().from(musicVideoScenes).where(eq(musicVideoScenes.jobId, 720001));
  for (const s of scenes as any[]) {
    if (s.sceneType === "performance") {
      console.log(`\n=== Performance Scene ${s.sceneIndex} (id=${s.id}) ===`);
      console.log(`  startTime: ${s.startTime}, duration: ${s.duration}`);
      console.log(`  lipSync: ${s.lipSync}, lipSyncStatus: ${s.lipSyncStatus}`);
      console.log(`  lipSyncTaskId: ${s.lipSyncTaskId || "none"}`);
      console.log(`  lipSyncVideoUrl: ${s.lipSyncVideoUrl || "none"}`);
      console.log(`  compositeVideoUrl: ${s.compositeVideoUrl || "none"}`);
      // Check for any audio-related fields
      for (const [k, v] of Object.entries(s)) {
        if (k.toLowerCase().includes("audio") || k.toLowerCase().includes("vocal") || k.toLowerCase().includes("stem")) {
          console.log(`  ${k}: ${v || "none"}`);
        }
      }
    }
  }
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
