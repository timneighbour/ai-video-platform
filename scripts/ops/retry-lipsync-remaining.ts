/**
 * Retry lip sync for remaining 3 scenes (5, 8, 10) that hit concurrency limit.
 * Also polls the 3 already-submitted scenes and saves their results.
 */
import mysql from 'mysql2/promise';
import { extractSceneAudioClip } from './server/audio-clip-extractor';
import { submitSyncLabsLipSync, pollSyncLabsLipSync } from './server/ai-apis/synclabs-lipsync';
import { storagePut } from './server/storage';
import { SyncClient } from '@sync.so/sdk';

const AUDIO_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-audio/1-1778788890320.mp3';

// Already submitted
const SUBMITTED = [
  { id: 600001, sceneIndex: 0, syncJobId: 'ad7867e7-ba0e-4106-93d2-a0107274576a' },
  { id: 600004, sceneIndex: 3, syncJobId: '0b896e14-d0ee-4482-8b53-75621771c20e' },
  { id: 600005, sceneIndex: 4, syncJobId: '9a10464b-8cdd-42fe-8d20-95fef9a4f058' },
];

// Still need to submit
const REMAINING = [
  { id: 600006, sceneIndex: 5, startTime: 30, duration: 6, videoUrl: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-scenes/600006-1779140425162.mp4' },
  { id: 600009, sceneIndex: 8, startTime: 48, duration: 6, videoUrl: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-scenes/600009-1779140462315.mp4' },
  { id: 600011, sceneIndex: 10, startTime: 60, duration: 6, videoUrl: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-scenes/600011-1779140436263.mp4' },
];

const conn = await mysql.createConnection(process.env.DATABASE_URL!);
const sync = new SyncClient({ apiKey: process.env.SYNC_LABS_API_KEY! });

async function saveResult(sceneId: number, sceneIndex: number, outputUrl: string) {
  // Download and re-upload to S3
  const resp = await fetch(outputUrl);
  const buf = Buffer.from(await resp.arrayBuffer());
  const key = `music-video-scenes/${sceneId}-synclabs-${Date.now()}.mp4`;
  const { url } = await storagePut(key, buf, 'video/mp4');
  await conn.execute(
    "UPDATE musicVideoScenes SET lipSyncStatus='done', lipSyncVideoUrl=?, lipSyncVideoKey=?, updatedAt=NOW() WHERE id=?",
    [url, key, sceneId]
  );
  console.log(`  ✓ Scene ${sceneIndex} lip sync DONE → saved to S3`);
  return url;
}

// Poll the 3 already-submitted jobs
console.log('=== Polling 3 already-submitted SyncLabs jobs ===');
const pollPromises = SUBMITTED.map(async (scene) => {
  console.log(`Polling scene ${scene.sceneIndex} (job ${scene.syncJobId})...`);
  try {
    const outputUrl = await pollSyncLabsLipSync(scene.syncJobId, 15 * 60 * 1000); // 15min timeout
    await saveResult(scene.id, scene.sceneIndex, outputUrl);
  } catch (err: any) {
    console.error(`Scene ${scene.sceneIndex} poll failed: ${err.message}`);
    // Mark as error so assembly can proceed with raw clip
    await conn.execute(
      "UPDATE musicVideoScenes SET lipSyncStatus='error', updatedAt=NOW() WHERE id=?",
      [scene.id]
    );
  }
});

// Wait a bit for concurrency to free up, then submit remaining
const submitRemainingPromise = (async () => {
  console.log('\n=== Waiting 60s for concurrency to free up, then submitting remaining 3 ===');
  await new Promise(r => setTimeout(r, 60_000));
  
  for (const scene of REMAINING) {
    let retries = 3;
    while (retries > 0) {
      try {
        console.log(`\nSubmitting scene ${scene.sceneIndex} (ID: ${scene.id})...`);
        const audioClipUrl = await extractSceneAudioClip(AUDIO_URL, scene.startTime, scene.duration, scene.id);
        const syncJobId = await submitSyncLabsLipSync({
          videoUrl: scene.videoUrl,
          audioUrl: audioClipUrl,
          syncMode: 'cut_off',
          outputFileName: `wizsync-scene-${scene.id}-${Date.now()}`,
          temperature: 1.0,
          occlusionDetection: true,
        });
        await conn.execute(
          "UPDATE musicVideoScenes SET lipSyncStatus='processing', lipSyncTaskId=?, updatedAt=NOW() WHERE id=?",
          [syncJobId, scene.id]
        );
        console.log(`  ✓ Scene ${scene.sceneIndex} submitted: ${syncJobId}`);
        
        // Poll for result
        const outputUrl = await pollSyncLabsLipSync(syncJobId, 15 * 60 * 1000);
        await saveResult(scene.id, scene.sceneIndex, outputUrl);
        break;
      } catch (err: any) {
        retries--;
        if (err.message?.includes('429') && retries > 0) {
          console.log(`  Rate limited — waiting 30s before retry (${retries} retries left)...`);
          await new Promise(r => setTimeout(r, 30_000));
        } else {
          console.error(`  ✗ Scene ${scene.sceneIndex} failed: ${err.message}`);
          await conn.execute(
            "UPDATE musicVideoScenes SET lipSyncStatus='error', updatedAt=NOW() WHERE id=?",
            [scene.id]
          );
          break;
        }
      }
    }
  }
})();

// Wait for all to complete
await Promise.all([...pollPromises, submitRemainingPromise]);

// Check final status
const [scenes] = await conn.execute(
  "SELECT sceneIndex, lipSyncStatus FROM musicVideoScenes WHERE jobId=540026 ORDER BY sceneIndex ASC"
) as any;
console.log('\n=== Final lip sync status ===');
(scenes as any[]).forEach((s: any) => console.log(`Scene ${s.sceneIndex}: ${s.lipSyncStatus}`));

// Set job back to assembling
const allReady = (scenes as any[]).every((s: any) => s.lipSyncStatus === 'done' || s.lipSyncStatus === 'error');
if (allReady) {
  await conn.execute("UPDATE musicVideoJobs SET status='assembling', updatedAt=NOW() WHERE id=540026");
  console.log('\nAll scenes lip sync ready — job set back to assembling');
}

await conn.end();
