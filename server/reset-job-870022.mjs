/**
 * Reset Job 870022 scenes to pending for re-dispatch with generate_audio: false fix.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const path = require('path');
const { fileURLToPath } = require('url');

// Load env
import { config } from 'dotenv';
config({ path: '/home/ubuntu/ai-video-platform/.env' });

const { getDb } = await import('./db.ts');
const { musicVideoScenes, musicVideoJobs, providerJobLogs } = await import('../drizzle/schema.ts');
const { eq, sql } = await import('drizzle-orm');

const db = await getDb();
if (!db) { console.error('No DB'); process.exit(1); }

// Reset all scenes to pending
const r1 = await db.update(musicVideoScenes)
  .set({
    status: 'pending',
    taskId: null,
    errorMessage: null,
    lipSyncStatus: 'pending',
    lipSyncTaskId: null,
    lipSyncVideoUrl: null,
    updatedAt: new Date(),
  })
  .where(eq(musicVideoScenes.jobId, 870022));
console.log('Scenes reset to pending:', JSON.stringify(r1));

// Cancel old provider job logs
const r2 = await db.update(providerJobLogs)
  .set({ status: 'cancelled' })
  .where(sql`${providerJobLogs.jobId} = 870022 AND ${providerJobLogs.status} IN ('submitted','failed')`);
console.log('Provider logs cancelled:', JSON.stringify(r2));

// Reset probe state AND clear fallbackProvider so fal_seedance is used
const r3 = await db.update(musicVideoJobs)
  .set({
    probePassed: null,
    probeSceneId: null,
    probeVideoUrl: null,
    fallbackProvider: null,
    updatedAt: new Date(),
  })
  .where(eq(musicVideoJobs.id, 870022));
console.log('Probe state reset + fallbackProvider cleared:', JSON.stringify(r3));

console.log('Done — Job 870022 ready for re-dispatch with fal_seedance (fallbackProvider=NULL)');
process.exit(0);
