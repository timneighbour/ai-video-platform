import { getDb } from "./server/db";
import { musicVideoScenes } from "./drizzle/schema";
import { eq, inArray } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) { console.log("No DB"); return; }
  
  // Get all scenes from job 720001 and print all their fields
  const scenes = await db.select().from(musicVideoScenes).where(eq(musicVideoScenes.jobId, 720001));
  for (const s of scenes as any[]) {
    console.log(`\n=== Scene ${s.sceneIndex} (id=${s.id}, type=${s.sceneType}) ===`);
    for (const [k, v] of Object.entries(s)) {
      if (v !== null && v !== undefined && v !== "" && v !== 0 && v !== false) {
        if (typeof v === "string" && v.length > 5) {
          console.log(`  ${k}: ${String(v).substring(0, 200)}`);
        } else if (typeof v === "number" || typeof v === "boolean") {
          console.log(`  ${k}: ${v}`);
        }
      }
    }
  }
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
