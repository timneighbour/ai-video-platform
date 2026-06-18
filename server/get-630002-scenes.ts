import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { musicVideoScenes, musicVideoJobs } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  const db = drizzle(conn);
  const [job] = await db.select().from(musicVideoJobs).where(eq(musicVideoJobs.id, 630002));
  console.log("audioUrl:", job.audioUrl);
  console.log("vocalsUrl:", job.vocalsUrl || "null");
  console.log("finalVideoUrl:", job.finalVideoUrl);
  const scenes = await db.select().from(musicVideoScenes).where(eq(musicVideoScenes.jobId, 630002));
  scenes.sort((a, b) => (a.sceneIndex ?? 0) - (b.sceneIndex ?? 0));
  for (const s of scenes) {
    const ls = s.lipSyncVideoUrl ? "LS" : "raw";
    const url = (s.lipSyncVideoUrl || s.videoUrl || "").split("/").pop();
    console.log(`S${s.sceneIndex}|${s.sceneType}|${ls}|${s.startTime}ms|${url}|${(s.prompt || "").slice(0, 100)}`);
  }
  await conn.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
