import { config } from 'dotenv';
import mysql from 'mysql2/promise';
config();

async function checkProbe() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  const [scenes] = await conn.execute(
    "SELECT id, sceneIndex, mvSceneStatus, taskId, videoUrl, lipSyncStatus, lipSyncVideoUrl, errorMessage FROM musicVideoScenes WHERE jobId=690007 ORDER BY sceneIndex"
  );
  
  const [jobs] = await conn.execute(
    "SELECT id, status, probePassed, probeSceneId, probeVideoUrl FROM musicVideoJobs WHERE id=690007"
  );
  
  await conn.end();
  
  const job = jobs[0];
  const probeScene = scenes.find(s => s.id === 690014);
  
  console.log(`[${new Date().toISOString()}] Job status: ${job.status} | probePassed: ${job.probePassed} | probeSceneId: ${job.probeSceneId}`);
  console.log(`Probe scene 690014 [idx 1]: ${probeScene?.mvSceneStatus} | taskId: ${probeScene?.taskId || 'none'} | videoUrl: ${probeScene?.videoUrl ? 'YES' : 'no'} | lipSync: ${probeScene?.lipSyncStatus}`);
  
  if (probeScene?.videoUrl) {
    console.log('PROBE VIDEO URL:', probeScene.videoUrl);
  }
  if (probeScene?.lipSyncVideoUrl) {
    console.log('LIP SYNC VIDEO URL:', probeScene.lipSyncVideoUrl);
  }
  
  console.log('\nAll scenes:');
  scenes.forEach(s => {
    const status = s.mvSceneStatus.padEnd(10);
    const video = s.videoUrl ? '✓video' : '·video';
    const lipSync = s.lipSyncStatus ? s.lipSyncStatus.padEnd(10) : 'none      ';
    console.log(`  [${s.sceneIndex}] ${status} ${video} lipSync=${lipSync} ${s.errorMessage ? '| ERR: ' + s.errorMessage.substring(0, 50) : ''}`);
  });
  
  return { job, probeScene, scenes };
}

// Poll every 30 seconds for up to 10 minutes
let attempts = 0;
const maxAttempts = 20;

while (attempts < maxAttempts) {
  const { probeScene } = await checkProbe();
  
  if (probeScene?.mvSceneStatus === 'completed' && probeScene?.videoUrl) {
    console.log('\n✅ PROBE SCENE COMPLETED! Ready for review.');
    break;
  }
  
  if (probeScene?.mvSceneStatus === 'failed') {
    console.log('\n❌ PROBE SCENE FAILED!');
    break;
  }
  
  attempts++;
  if (attempts < maxAttempts) {
    console.log(`\nWaiting 30s... (attempt ${attempts}/${maxAttempts})\n`);
    await new Promise(r => setTimeout(r, 30000));
    
    // Trigger heartbeat to poll WaveSpeed
    try {
      const res = await fetch('http://localhost:3000/api/scheduled/sceneDispatchHeartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-dev-bypass': 'scene-dispatch-2026' }
      });
      const data = await res.json();
      console.log(`Heartbeat: dispatched=${data.dispatched} polled=${data.polled}`);
    } catch (e) {
      console.log('Heartbeat error:', e.message);
    }
  }
}
