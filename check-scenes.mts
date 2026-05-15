import { getDb } from './server/db.ts';
import { musicVideoScenes, musicVideoJobs, providerJobLogs } from './drizzle/schema.ts';
import { eq, sql, desc } from 'drizzle-orm';

const db = await getDb();

// Scene status counts
const statusCounts = await db
  .select({ status: musicVideoScenes.status, count: sql<number>`COUNT(*)` })
  .from(musicVideoScenes)
  .where(eq(musicVideoScenes.jobId, 540026))
  .groupBy(musicVideoScenes.status);

console.log('=== SCENE STATUS COUNTS ===');
for (const row of statusCounts) {
  console.log(`  ${row.status}: ${row.count}`);
}

// Individual scene details
const scenes = await db
  .select({ id: musicVideoScenes.id, idx: musicVideoScenes.sceneIndex, status: musicVideoScenes.status, taskId: musicVideoScenes.taskId, videoUrl: musicVideoScenes.videoUrl, updatedAt: musicVideoScenes.updatedAt })
  .from(musicVideoScenes)
  .where(eq(musicVideoScenes.jobId, 540026))
  .orderBy(musicVideoScenes.sceneIndex);
console.log('\n=== INDIVIDUAL SCENES ===');
for (const s of scenes) {
  console.log(`  Scene ${s.idx} (id=${s.id}): ${s.status} | taskId=${s.taskId?.slice(0,30) ?? 'null'} | videoUrl=${s.videoUrl ? 'SET' : 'null'} | updated=${s.updatedAt?.toISOString()}`);
}

// Job status
const jobs = await db
  .select({ id: musicVideoJobs.id, status: musicVideoJobs.status, completedScenes: musicVideoJobs.completedScenes })
  .from(musicVideoJobs)
  .where(eq(musicVideoJobs.id, 540026));
console.log('\n=== JOB STATUS ===');
console.log(JSON.stringify(jobs[0]));



// Provider logs
const pLogs = await db
  .select({ sceneId: providerJobLogs.sceneId, provider: providerJobLogs.provider, providerJobId: providerJobLogs.providerJobId, createdAt: providerJobLogs.createdAt })
  .from(providerJobLogs)
  .where(eq(providerJobLogs.jobId, 540026))
  .orderBy(desc(providerJobLogs.createdAt))
  .limit(15);
console.log('\n=== PROVIDER JOB LOGS ===');
for (const log of pLogs) {
  console.log(`  scene ${log.sceneId} | ${log.provider} | jobId: ${log.providerJobId?.slice(0, 40)} | ${log.createdAt?.toISOString()}`);
}

process.exit(0);
