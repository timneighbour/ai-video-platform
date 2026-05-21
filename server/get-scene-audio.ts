import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { musicVideoScenes, musicVideoJobs, musicVideoVocalStems } from "../drizzle/schema";
import { eq, inArray } from "drizzle-orm";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  const db = drizzle(conn);

  // Job details
  const jobs = await db.select().from(musicVideoJobs).where(inArray(musicVideoJobs.id, [630001, 630002]));
  for (const j of jobs) {
    console.log(`Job ${j.id}: status=${j.status} vocalsUrl=${j.vocalsUrl || 'NULL'} audioUrl=${j.audioUrl?.split('/').pop()}`);
  }

  // Scene 0 of job 630002
  const scenes = await db.select().from(musicVideoScenes).where(eq(musicVideoScenes.jobId, 630002));
  for (const s of scenes) {
    console.log(`S${s.sceneIndex}: sceneAudioUrl=${(s as any).sceneAudioUrl || 'NULL'} lipSyncStatus=${s.lipSyncStatus}`);
  }

  // Vocal stems
  const stems = await db.select().from(musicVideoVocalStems).where(inArray(musicVideoVocalStems.jobId, [630001, 630002]));
  console.log(`Vocal stems: ${stems.length}`);
  for (const st of stems) {
    console.log(`  jobId=${st.jobId} char=${st.characterName} url=${st.vocalsUrl?.split('/').pop()}`);
  }

  await conn.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
