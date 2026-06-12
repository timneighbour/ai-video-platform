import { getDb } from './db';
import { musicVideoScenes, musicVideoJobs } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) { console.error('no db'); process.exit(1); }
  
  const job = await db.select().from(musicVideoJobs).where(eq(musicVideoJobs.id, 1080001));
  console.log('JOB 1080001:', JSON.stringify({
    id: job[0]?.id,
    status: job[0]?.status,
    stemVocalsUrl: job[0]?.stemVocalsUrl ? 'SET' : 'NULL',
    vocalsStatus: job[0]?.vocalsStatus,
    fallbackProvider: job[0]?.fallbackProvider,
    aspectRatio: job[0]?.aspectRatio,
  }, null, 2));

  const scene = await db.select().from(musicVideoScenes).where(eq(musicVideoScenes.id, 930003));
  console.log('SCENE 930003:', JSON.stringify({
    id: scene[0]?.id,
    sceneIndex: scene[0]?.sceneIndex,
    status: scene[0]?.status,
    previewImageUrl: scene[0]?.previewImageUrl ? 'SET: ' + scene[0].previewImageUrl.slice(0, 80) : 'NULL',
    lipSync: scene[0]?.lipSync,
    sceneType: scene[0]?.sceneType,
    startTime: scene[0]?.startTime,
    duration: scene[0]?.duration,
    taskId: scene[0]?.taskId,
  }, null, 2));
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
