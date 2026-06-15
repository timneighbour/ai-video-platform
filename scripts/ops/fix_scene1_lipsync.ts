import { muxAudioIntoVideo, extractSceneAudioClip } from "./server/audio-clip-extractor";
import { submitHeyGenLipSyncV3 } from "./server/ai-apis/heygen-lipsync";
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  
  // Get Scene 1 details
  const [rows] = await conn.execute<any[]>(`
    SELECT id, videoUrl, startTime, duration, lyrics
    FROM musicVideoScenes WHERE id=900026
  `);
  const scene = rows[0];
  console.log('Scene 1 video:', scene.videoUrl);
  console.log('Start:', scene.startTime, 'Duration:', scene.duration);
  
  // Get the job's vocal stem URL
  const [jobRows] = await conn.execute<any[]>(`
    SELECT vocalsUrl, audioUrl FROM musicVideoJobs WHERE id=1020003
  `);
  const job = jobRows[0];
  console.log('Vocals URL:', job.vocalsUrl);
  
  // Step 1: Extract the vocal stem clip for this scene's timing (positional args)
  console.log('\nStep 1: Extracting vocal stem clip...');
  const audioClipUrl = await extractSceneAudioClip(
    job.vocalsUrl || job.audioUrl,
    scene.startTime,
    scene.duration,
    scene.id
  );
  console.log('Audio clip URL:', audioClipUrl);
  
  // Step 2: Mux the audio into the video
  console.log('\nStep 2: Muxing audio into video...');
  const muxedVideoUrl = await muxAudioIntoVideo(
    scene.videoUrl,
    audioClipUrl,
    scene.id
  );
  console.log('Muxed video URL:', muxedVideoUrl);
  
  // Step 3: Submit to HeyGen
  console.log('\nStep 3: Submitting to HeyGen Precision...');
  const taskId = await submitHeyGenLipSyncV3({
    videoUrl: muxedVideoUrl,
    audioUrl: audioClipUrl,
    title: `WizAI Scene 900026 Job 1020003 MuxFix`
  });
  console.log('HeyGen task ID:', taskId);
  
  // Step 4: Update DB
  await conn.execute(
    `UPDATE musicVideoScenes SET lipSyncStatus='processing', lipSyncTaskId=?, updatedAt=NOW() WHERE id=900026`,
    [`heygen:${taskId}`]
  );
  console.log('✅ Scene 1 lip-sync submitted successfully');
  await conn.end();
}
main().catch(e => console.error('ERROR:', e.message, e.stack));
