import { config } from 'dotenv';
import mysql from 'mysql2/promise';
config();

async function checkStatus() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  const [scenes] = await conn.execute(
    "SELECT id, sceneIndex, mvSceneStatus, taskId, videoUrl, errorMessage FROM musicVideoScenes WHERE jobId=690007 ORDER BY sceneIndex"
  );
  
  const [jobs] = await conn.execute(
    "SELECT id, status, completedScenes, totalScenes, finalVideoUrl FROM musicVideoJobs WHERE id=690007"
  );
  
  await conn.end();
  
  const job = jobs[0];
  const completed = scenes.filter(s => s.mvSceneStatus === 'completed').length;
  const generating = scenes.filter(s => s.mvSceneStatus === 'generating').length;
  const pending = scenes.filter(s => s.mvSceneStatus === 'pending').length;
  const failed = scenes.filter(s => s.mvSceneStatus === 'failed').length;
  
  const ts = new Date().toISOString().substring(11, 19);
  console.log(`[${ts}] Job ${job.id}: ${job.status} | ✅${completed} 🔄${generating} ⏳${pending} ❌${failed} / 12`);
  
  if (failed > 0) {
    scenes.filter(s => s.mvSceneStatus === 'failed').forEach(s => {
      console.log(`  ❌ [${s.sceneIndex}] ${s.errorMessage?.substring(0, 80) || 'unknown error'}`);
    });
  }
  
  if (job.finalVideoUrl) {
    console.log('🎬 FINAL VIDEO:', job.finalVideoUrl);
  }
  
  return { job, scenes, completed, generating, pending, failed };
}

// Poll every 30 seconds for up to 30 minutes
let attempts = 0;
const maxAttempts = 60;

while (attempts < maxAttempts) {
  const { job, completed, generating, pending, failed } = await checkStatus();
  
  // If all scenes completed, trigger assembly
  if (completed === 12) {
    console.log('\n✅ ALL 12 SCENES COMPLETED! Triggering assembly...');
    
    // Trigger heartbeat to kick off assembly
    const hbRes = await fetch('http://localhost:3000/api/scheduled/sceneDispatchHeartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-dev-bypass': 'scene-dispatch-2026' }
    });
    const hbData = await hbRes.json();
    console.log('Assembly heartbeat:', JSON.stringify(hbData));
    break;
  }
  
  // If job is completed with final video
  if (job.status === 'completed' && job.finalVideoUrl) {
    console.log('\n🎬 JOB COMPLETED! Final video:', job.finalVideoUrl);
    break;
  }
  
  // If all generating/pending are done but some failed
  if (generating === 0 && pending === 0 && failed > 0) {
    console.log(`\n⚠️ ${failed} scenes failed, ${completed} completed. May need credit top-up.`);
    break;
  }
  
  attempts++;
  if (attempts < maxAttempts) {
    await new Promise(r => setTimeout(r, 30000));
    
    // Trigger heartbeat to poll WaveSpeed
    try {
      const res = await fetch('http://localhost:3000/api/scheduled/sceneDispatchHeartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-dev-bypass': 'scene-dispatch-2026' }
      });
      const data = await res.json();
      if (data.dispatched > 0 || data.polled > 0) {
        console.log(`  → Heartbeat: dispatched=${data.dispatched} polled=${data.polled} assembled=${data.assembled}`);
      }
    } catch (e) {
      console.log('  → Heartbeat error:', e.message);
    }
  }
}

console.log('\nMonitor complete.');
