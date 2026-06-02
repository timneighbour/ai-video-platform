/**
 * Check Job 870022 character and scene state
 */
import { config } from 'dotenv';
config({ path: '/home/ubuntu/ai-video-platform/.env' });

const { getDb } = await import('./db.ts');
const { musicVideoJobs, musicVideoScenes, videoCharacters } = await import('../drizzle/schema.ts');
const { eq } = await import('drizzle-orm');

const db = await getDb();
if (!db) { console.error('No DB'); process.exit(1); }

// Get job details
const jobs = await db.select().from(musicVideoJobs).where(eq(musicVideoJobs.id, 870022));
const job = jobs[0];
console.log('Job 870022:', JSON.stringify({
  id: job.id,
  characterId: job.characterId,
  probeSceneId: job.probeSceneId,
  probePassed: job.probePassed,
  fallbackProvider: job.fallbackProvider,
  status: job.status,
}));

// Get all scenes
const scenes = await db.select({
  id: musicVideoScenes.id,
  status: musicVideoScenes.status,
  taskId: musicVideoScenes.taskId,
  sceneType: musicVideoScenes.sceneType,
  lipSyncStatus: musicVideoScenes.lipSyncStatus,
  videoUrl: musicVideoScenes.videoUrl,
}).from(musicVideoScenes).where(eq(musicVideoScenes.jobId, 870022));
console.log('Scenes:', JSON.stringify(scenes));

// Get character
if (job.characterId) {
  const chars = await db.select({
    id: videoCharacters.id,
    name: videoCharacters.name,
    portraitUrl: videoCharacters.portraitUrl,
    performanceRefUrl: videoCharacters.performanceRefUrl,
    mediumShotRefUrl: videoCharacters.mediumShotRefUrl,
    cinematicRefUrl: videoCharacters.cinematicRefUrl,
    referencePhotoBase64: videoCharacters.referencePhotoBase64,
  }).from(videoCharacters).where(eq(videoCharacters.id, job.characterId));
  const c = chars[0];
  console.log('Character:', JSON.stringify({
    id: c.id,
    name: c.name,
    hasPortrait: !!c.portraitUrl,
    portraitUrl: c.portraitUrl,
    hasPerformanceRef: !!c.performanceRefUrl,
    performanceRefUrl: c.performanceRefUrl,
    hasMediumShot: !!c.mediumShotRefUrl,
    hasCinematic: !!c.cinematicRefUrl,
    hasRefBase64: !!c.referencePhotoBase64,
  }));
} else {
  console.log('No characterId set on job!');
  // List all characters
  const allChars = await db.select({
    id: videoCharacters.id,
    name: videoCharacters.name,
    hasPortrait: videoCharacters.portraitUrl,
  }).from(videoCharacters);
  console.log('All characters in DB:', JSON.stringify(allChars.map(c => ({ id: c.id, name: c.name, hasPortrait: !!c.hasPortrait }))));
}

process.exit(0);
