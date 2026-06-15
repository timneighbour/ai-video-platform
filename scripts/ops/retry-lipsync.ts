/**
 * Retry lip sync submission for the 6 failed scenes of job 540026.
 * Run from sandbox where ffmpeg is available.
 */
import mysql from 'mysql2/promise';
import { extractSceneAudioClip } from './server/audio-clip-extractor';
import { submitSyncLabsLipSync } from './server/ai-apis/synclabs-lipsync';

const AUDIO_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-audio/1-1778788890320.mp3';

const FAILED_SCENES = [
  { id: 600001, sceneIndex: 0, startTime: 0, duration: 6, videoUrl: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-scenes/600001-1779119272419.mp4' },
  { id: 600004, sceneIndex: 3, startTime: 18, duration: 6, videoUrl: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-scenes/600004-1779140428733.mp4' },
  { id: 600005, sceneIndex: 4, startTime: 24, duration: 6, videoUrl: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-scenes/600005-1779140423321.mp4' },
  { id: 600006, sceneIndex: 5, startTime: 30, duration: 6, videoUrl: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-scenes/600006-1779140425162.mp4' },
  { id: 600009, sceneIndex: 8, startTime: 48, duration: 6, videoUrl: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-scenes/600009-1779140462315.mp4' },
  { id: 600011, sceneIndex: 10, startTime: 60, duration: 6, videoUrl: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-scenes/600011-1779140436263.mp4' },
];

const conn = await mysql.createConnection(process.env.DATABASE_URL!);

// First, reset the job status back to 'rendering' so assembly waits for lip sync
await conn.execute("UPDATE musicVideoJobs SET status='rendering', updatedAt=NOW() WHERE id=540026");
console.log('Job 540026 reset to rendering — assembly paused');

for (const scene of FAILED_SCENES) {
  console.log(`\n--- Scene ${scene.sceneIndex} (ID: ${scene.id}) ---`);
  try {
    // Step 1: Extract audio clip
    console.log(`  Extracting audio clip (startTime=${scene.startTime}s, duration=${scene.duration}s)...`);
    const audioClipUrl = await extractSceneAudioClip(AUDIO_URL, scene.startTime, scene.duration, scene.id);
    console.log(`  Audio clip: ${audioClipUrl.slice(0, 80)}...`);

    // Step 2: Submit to SyncLabs
    console.log(`  Submitting to SyncLabs...`);
    const syncJobId = await submitSyncLabsLipSync({
      videoUrl: scene.videoUrl,
      audioUrl: audioClipUrl,
      syncMode: 'cut_off',
      outputFileName: `wizsync-scene-${scene.id}-${Date.now()}`,
      temperature: 1.0,
      occlusionDetection: true,
    });
    console.log(`  SyncLabs job ID: ${syncJobId}`);

    // Step 3: Update DB
    await conn.execute(
      "UPDATE musicVideoScenes SET lipSyncStatus='processing', lipSyncTaskId=?, updatedAt=NOW() WHERE id=?",
      [syncJobId, scene.id]
    );
    console.log(`  ✓ Scene ${scene.sceneIndex} submitted to SyncLabs`);
  } catch (err: any) {
    console.error(`  ✗ Scene ${scene.sceneIndex} FAILED: ${err.message}`);
  }
}

await conn.end();
console.log('\nDone. Production heartbeat will now poll SyncLabs for results and trigger assembly when all done.');
