import { getDb } from "./server/db";
import { musicVideoJobs, musicVideoScenes } from "./drizzle/schema";
import { eq } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) { console.log("No DB connection"); return; }
  
  const jobs = await db.select().from(musicVideoJobs).where(eq(musicVideoJobs.id, 720001));
  const job = jobs[0] as any;
  if (!job) { console.log("Job 720001 not found"); return; }
  
  console.log("=== Job 720001 Audio / Character Fields ===");
  for (const key of Object.keys(job)) {
    const val = job[key];
    if (val && typeof val === "string" && val.length > 5) {
      const lk = key.toLowerCase();
      if (lk.includes("audio") || lk.includes("vocal") || lk.includes("stem") || 
          lk.includes("character") || lk.includes("image") || lk.includes("photo") ||
          lk.includes("url") || lk.includes("track")) {
        console.log(`  ${key}: ${String(val).substring(0, 180)}`);
      }
    }
  }
  
  // Also get the audio clip URLs from scenes
  console.log("\n=== Performance Scene Audio Clips ===");
  const scenes = await db.select().from(musicVideoScenes).where(eq(musicVideoScenes.jobId, 720001));
  for (const s of scenes as any[]) {
    if (s.sceneType === "performance") {
      console.log(`\nScene index ${s.sceneIndex} (id=${s.id}):`);
      console.log(`  audioClipUrl: ${s.audioClipUrl || "none"}`);
      console.log(`  vocalStemClipUrl: ${s.vocalStemClipUrl || "none"}`);
      console.log(`  characterImageUrl: ${s.characterImageUrl || "none"}`);
      // Print all URL-like fields
      for (const key of Object.keys(s)) {
        const val = (s as any)[key];
        if (val && typeof val === "string" && (val.startsWith("http") || val.includes("cdn"))) {
          if (!["videoUrl", "lipSyncVideoUrl", "previewImageUrl"].includes(key)) {
            console.log(`  ${key}: ${String(val).substring(0, 180)}`);
          }
        }
      }
    }
  }
  
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
