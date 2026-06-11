// Submit lip-sync for all pending vocal scenes in one go, bypassing the rate limit
import { muxAudioIntoVideo, extractSceneAudioClip } from "./server/audio-clip-extractor";
import { submitHeyGenLipSyncV3 } from "./server/ai-apis/heygen-lipsync";
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  
  // Get all scenes that need lip-sync
  const [scenes] = await conn.execute<any[]>(`
    SELECT s.id, s.sceneIndex, s.videoUrl, s.startTime, s.duration, s.lyrics
    FROM musicVideoScenes s
    WHERE s.jobId=1020003 
      AND s.lipSync=1 
      AND s.lipSyncStatus='pending' 
      AND s.videoUrl IS NOT NULL
    ORDER BY s.sceneIndex
  `);
  
  const [jobRows] = await conn.execute<any[]>(`
    SELECT vocalsUrl, audioUrl FROM musicVideoJobs WHERE id=1020003
  `);
  const job = jobRows[0];
  const vocalsUrl = job.vocalsUrl || job.audioUrl;
  
  console.log(`Found ${scenes.length} scenes needing lip-sync`);
  
  for (const scene of scenes) {
    console.log(`\nProcessing Scene ${scene.sceneIndex} (id=${scene.id})...`);
    try {
      // Extract vocal clip
      const audioClipUrl = await extractSceneAudioClip(
        vocalsUrl, scene.startTime, scene.duration, scene.id
      );
      
      // Mux audio into video
      const muxedVideoUrl = await muxAudioIntoVideo(
        scene.videoUrl, audioClipUrl, scene.id
      );
      
      // Submit to HeyGen
      const taskId = await submitHeyGenLipSyncV3({
        videoUrl: muxedVideoUrl,
        audioUrl: audioClipUrl,
        title: `WizAI Scene ${scene.id} Job 1020003 Batch`
      });
      
      // Update DB
      await conn.execute(
        `UPDATE musicVideoScenes SET lipSyncStatus='processing', lipSyncTaskId=?, updatedAt=NOW() WHERE id=?`,
        [`heygen:${taskId}`, scene.id]
      );
      console.log(`  ✅ Scene ${scene.sceneIndex} → HeyGen task ${taskId}`);
      
      // Small delay to avoid HeyGen rate limits
      await new Promise(r => setTimeout(r, 1500));
    } catch (e: any) {
      console.error(`  ❌ Scene ${scene.sceneIndex} failed: ${e.message}`);
    }
  }
  
  await conn.end();
  console.log('\nBatch lip-sync submission complete');
}
main().catch(e => console.error('FATAL:', e.message));
