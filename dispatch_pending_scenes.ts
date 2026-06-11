/**
 * Force-dispatch all 7 pending scenes for job 1020003
 * using the Lyndhurst Hall reference image as the visual anchor.
 * Proven approach from the Scene 10 test render.
 */
import mysql from 'mysql2/promise';
import { submitAtlasImageToVideo } from './server/ai-apis/atlascloud';

// The Lyndhurst Hall reference image — direct CloudFront URL, no auth required
const VENUE_REF_IMAGE = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/venue-references/lyndhurst-hall-official-1781144248423.jpg';

// Provider-safe venue description to prepend to every prompt
const VENUE_PREFIX = 'Grand premium orchestral recording hall, vaulted gothic-style ceiling, ornate dark wood panelling, warm ivory and amber studio lighting, cinematic haze, elegant live recording atmosphere. ';

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);

  // Get all pending scenes for job 1020003
  const [scenes] = await conn.query<any[]>(`
    SELECT id, sceneIndex, prompt, duration, lipSync
    FROM musicVideoScenes
    WHERE jobId = 1020003 AND mvSceneStatus = 'pending'
    ORDER BY sceneIndex
  `);

  console.log(`Found ${scenes.length} pending scenes to dispatch`);

  for (const scene of scenes) {
    try {
      // Build provider-safe prompt: prepend venue description, strip any venue names
      const safePrompt = (VENUE_PREFIX + scene.prompt)
        .replace(/Lyndhurst Hall/gi, 'the grand orchestral hall')
        .replace(/Air Studios/gi, 'the premium recording studio')
        .slice(0, 480);

      const duration = Math.max(2, Math.min(15, scene.duration ?? 6));

      console.log(`\nDispatching Scene ${scene.sceneIndex} (id=${scene.id}, duration=${duration}s)...`);

      const job = await submitAtlasImageToVideo(safePrompt, VENUE_REF_IMAGE, duration);

      // Store task ID in DB
      await conn.query(`
        UPDATE musicVideoScenes
        SET taskId = ?, mvSceneStatus = 'generating', updatedAt = NOW()
        WHERE id = ?
      `, [`atlas:${job.predictionId}`, scene.id]);

      console.log(`  ✅ Scene ${scene.sceneIndex} dispatched → predictionId: ${job.predictionId}`);

      // Small delay between submissions to avoid rate limiting
      await new Promise(r => setTimeout(r, 1500));
    } catch (err: any) {
      console.error(`  ❌ Scene ${scene.sceneIndex} FAILED: ${err.message}`);
    }
  }

  console.log('\nAll scenes dispatched. Pipeline will poll via Manus cron every 2 minutes.');
  await conn.end();
}

main().catch(e => console.error('FATAL:', e.message));
