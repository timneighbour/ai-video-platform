import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { musicVideoScenes } from "./drizzle/schema";
import { eq } from "drizzle-orm";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  const db = drizzle(conn);
  const scenes = await db.select().from(musicVideoScenes).where(eq(musicVideoScenes.jobId, 720001)).orderBy(musicVideoScenes.sceneNumber);
  for (const s of scenes) {
    console.log(`Scene ${s.sceneNumber}: type=${s.sceneType} status=${s.status} lipSync=${s.lipSync} lipSyncStatus=${s.lipSyncStatus} lipSyncGrade=${s.lipSyncGrade}`);
    console.log(`  prompt: ${(s.prompt||'').substring(0,200)}`);
    console.log(`  videoUrl: ${s.videoUrl ? s.videoUrl.substring(0,120) : 'none'}`);
    console.log(`  lipSyncVideoUrl: ${s.lipSyncVideoUrl ? s.lipSyncVideoUrl.substring(0,120) : 'none'}`);
    console.log('');
  }
  await conn.end();
}

main().catch(console.error);
