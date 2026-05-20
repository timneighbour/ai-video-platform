import "dotenv/config";
import { getDb } from "./db";
import { musicVideoScenes } from "../drizzle/schema";
import { eq, inArray } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) { console.error("DB unavailable"); process.exit(1); }
  const scenes = await db.select().from(musicVideoScenes).where(inArray(musicVideoScenes.id, [660008, 660010]));
  for (const s of scenes) {
    console.log(`Scene ${s.sceneIndex} (id=${s.id}) startTime=${s.startTime}ms`);
    console.log(`  videoUrl: ${s.videoUrl}`);
    console.log(`  lipSyncVideoUrl: ${s.lipSyncVideoUrl}`);
  }
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
