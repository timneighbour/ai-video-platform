/**
 * One-off script: generate missing storyboard preview images for job 1080001
 * Scenes missing previews: 990013 (idx 0), 990014 (idx 1), 990017 (idx 4), 990023 (idx 10)
 */
import mysql from 'mysql2/promise';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Load env
const dotenv = require('dotenv');
dotenv.config({ path: '/home/ubuntu/ai-video-platform/.env' });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL not set');

const conn = await mysql.createConnection(DATABASE_URL);

// Fetch the scenes that need preview images
const [scenes] = await conn.execute(
  'SELECT id, sceneIndex, prompt FROM musicVideoScenes WHERE id IN (990013, 990014, 990017, 990023) ORDER BY sceneIndex'
);

const [jobs] = await conn.execute(
  'SELECT id, aspectRatio, sceneSetting FROM musicVideoJobs WHERE id = 1080001'
);
const job = jobs[0];
const aspectRatio = job.aspectRatio ?? '16:9';

console.log(`Generating preview images for ${scenes.length} scenes (aspectRatio: ${aspectRatio})`);

// Dynamically import the fal image gen module
const { generateCinematicStoryboardImage } = await import('/home/ubuntu/ai-video-platform/server/ai-apis/fal-image-gen.ts').catch(async () => {
  // Try compiled JS version
  return await import('/home/ubuntu/ai-video-platform/dist/server/ai-apis/fal-image-gen.js').catch(() => null);
});

if (!generateCinematicStoryboardImage) {
  console.error('Could not import generateCinematicStoryboardImage — will use direct fal.ai API call');
  process.exit(1);
}

// Venue reference for Air Studios
const venueRefUrl = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/venue-refs/air-studios-lyndhurst-hall.jpg';

for (const scene of scenes) {
  console.log(`\nGenerating preview for scene ${scene.id} (index ${scene.sceneIndex})...`);
  console.log(`Prompt: ${scene.prompt.slice(0, 100)}...`);
  
  try {
    const { url } = await generateCinematicStoryboardImage({
      prompt: scene.prompt,
      aspectRatio: aspectRatio,
      storageKeyPrefix: `music-video-storyboard/1080001-scene-${scene.id}-cinematic`,
      venueReferenceUrl: venueRefUrl,
    });
    
    if (url) {
      await conn.execute(
        'UPDATE musicVideoScenes SET previewImageUrl = ?, updatedAt = NOW() WHERE id = ?',
        [url, scene.id]
      );
      console.log(`✓ Scene ${scene.id} preview generated: ${url.slice(0, 80)}...`);
    } else {
      console.error(`✗ Scene ${scene.id}: no URL returned`);
    }
  } catch (err) {
    console.error(`✗ Scene ${scene.id} failed:`, err.message);
  }
}

await conn.end();
console.log('\nDone.');
