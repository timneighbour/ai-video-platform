import { config } from 'dotenv';
import mysql from 'mysql2/promise';
config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const cdnBase = process.env.VITE_CDN_URL || 'https://wiz-ai.b-cdn.net';
const newAudioUrl = `${cdnBase}/showcase-fullmix_bf2a7b2a.mp3`;
const newVocalsUrl = `${cdnBase}/zara-vocal-stem_demucs.mp3`;

console.log('Updating job 690007 audio URLs to CDN:');
console.log('  audioUrl:', newAudioUrl);
console.log('  vocalsUrl:', newVocalsUrl);

const [res] = await conn.execute(
  "UPDATE musicVideoJobs SET audioUrl=?, vocalsUrl=?, vocalsKey=? WHERE id=690007",
  [newAudioUrl, newVocalsUrl, 'zara-vocal-stem_demucs.mp3']
);
console.log('Updated rows:', res.affectedRows);

// Verify
const [jobs] = await conn.execute(
  "SELECT id, audioUrl, vocalsUrl, vocalsKey FROM musicVideoJobs WHERE id=690007"
);
console.log('Verified:', JSON.stringify(jobs[0]));

// Also check the probe scene 690014 - it has a videoUrl already (from Atlas Cloud)
const [scenes] = await conn.execute(
  "SELECT id, sceneIndex, mvSceneStatus, taskId, videoUrl, lipSyncStatus FROM musicVideoScenes WHERE jobId=690007 ORDER BY sceneIndex"
);
console.log('\nScene states:');
scenes.forEach(s => console.log(`  [${s.sceneIndex}] id=${s.id} ${s.mvSceneStatus} taskId=${s.taskId || 'none'} videoUrl=${s.videoUrl ? 'YES' : 'no'} lipSync=${s.lipSyncStatus}`));

await conn.end();

// Now cancel the provider logs for scene 690014 (atlas_cloud) so it can be re-dispatched via WaveSpeed
console.log('\nCancelling providerJobLogs for scene 690014 (atlas_cloud attempt)...');
const conn2 = await mysql.createConnection(process.env.DATABASE_URL);
const [cancelRes] = await conn2.execute(
  "UPDATE providerJobLogs SET pjlStatus='cancelled' WHERE sceneId=690014 AND pjlStatus != 'cancelled'"
);
console.log('Cancelled:', cancelRes.affectedRows, 'log entries');

// Also cancel all other scene logs for job 690007
const sceneIds = [690013, 690015, 690016, 690017, 690018, 690019, 690020, 690021, 690022, 690023, 690024];
const placeholders = sceneIds.map(() => '?').join(',');
const [cancelRes2] = await conn2.execute(
  `UPDATE providerJobLogs SET pjlStatus='cancelled' WHERE sceneId IN (${placeholders}) AND pjlStatus != 'cancelled'`,
  sceneIds
);
console.log('Cancelled other scene logs:', cancelRes2.affectedRows);

// Reset scene 690014 to pending so it gets re-dispatched via WaveSpeed
const [resetRes] = await conn2.execute(
  "UPDATE musicVideoScenes SET mvSceneStatus='pending', taskId=NULL, videoUrl=NULL, lipSyncStatus='pending', lipSyncTaskId=NULL, lipSyncVideoUrl=NULL, errorMessage=NULL, retryCount=0 WHERE id=690014"
);
console.log('Reset scene 690014:', resetRes.affectedRows);

// Also reset probePassed to null to restart probe gate
const [probeReset] = await conn2.execute(
  "UPDATE musicVideoJobs SET probePassed=NULL, probeSceneId=NULL WHERE id=690007"
);
console.log('Reset probe gate:', probeReset.affectedRows);

await conn2.end();

// Trigger heartbeat
console.log('\n=== Triggering heartbeat ===');
const res2 = await fetch('http://localhost:3000/api/scheduled/sceneDispatchHeartbeat', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'x-dev-bypass': 'scene-dispatch-2026'
  }
});
const text = await res2.text();
console.log('Heartbeat HTTP', res2.status, ':', text.substring(0, 500));
