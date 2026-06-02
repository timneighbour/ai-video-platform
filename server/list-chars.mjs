import { config } from 'dotenv';
config({ path: '/home/ubuntu/ai-video-platform/.env' });

const { getDb } = await import('./db.ts');
const { musicVideoJobs, videoCharacters } = await import('../drizzle/schema.ts');
const { eq } = await import('drizzle-orm');

const db = await getDb();

// Get job
const jobs = await db.select({ id: musicVideoJobs.id, characterId: musicVideoJobs.characterId, status: musicVideoJobs.status }).from(musicVideoJobs).where(eq(musicVideoJobs.id, 870022));
console.log('Job 870022 characterId:', jobs[0]?.characterId, 'status:', jobs[0]?.status);

// List all characters
const chars = await db.select({ id: videoCharacters.id, name: videoCharacters.name, portraitUrl: videoCharacters.portraitUrl }).from(videoCharacters);
for (const c of chars) {
  console.log(`Char ${c.id}: ${c.name} | portrait: ${c.portraitUrl ? c.portraitUrl.substring(0, 80) : 'NONE'}`);
}

process.exit(0);
