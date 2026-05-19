/**
 * Debug script: run the pre-render validator and probe gate for Job 660001
 */
import 'dotenv/config';
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Simulate runPreRenderValidation
const jobId = 660001;

// 1. Load job
const [[job]] = await conn.query(
  "SELECT id, audioUrl, probePassed, probeSceneId, fallbackProvider, providerSpendUsd, maxSpendLimitUsd, characterImageUrl FROM musicVideoJobs WHERE id = ?",
  [jobId]
);
console.log('Job:', JSON.stringify(job, null, 2));

// 2. Load scenes
const [scenes] = await conn.query(
  "SELECT id, sceneIndex, mvSceneStatus as status, taskId, previewImageUrl, lipSync, startTime, sceneType FROM musicVideoScenes WHERE jobId = ?",
  [jobId]
);
console.log(`\nScenes: ${scenes.length} total`);

// 3. Check critical conditions
const audioOk = !!job.audioUrl;
const scenesOk = scenes.length > 0;
const storyboardScenes = scenes.filter(s => s.previewImageUrl);
const storyboardOk = storyboardScenes.length === scenes.length;
const lipSyncScenes = scenes.filter(s => s.lipSync);
const lipSyncWithTime = lipSyncScenes.filter(s => s.startTime !== null);
const lipSyncTimingOk = lipSyncScenes.length === 0 || lipSyncWithTime.length === lipSyncScenes.length;
const spendOk = parseFloat(job.providerSpendUsd ?? '0') < parseFloat(job.maxSpendLimitUsd ?? '25');

console.log('\n=== VALIDATION CHECKS ===');
console.log('Audio URL:', audioOk ? 'PASS' : 'FAIL');
console.log('Scenes exist:', scenesOk ? 'PASS' : 'FAIL');
console.log(`Storyboard images: ${storyboardScenes.length}/${scenes.length}`, storyboardOk ? 'PASS' : 'FAIL');
console.log(`LipSync timing: ${lipSyncWithTime.length}/${lipSyncScenes.length}`, lipSyncTimingOk ? 'PASS' : 'FAIL');
console.log('Spend cap:', spendOk ? 'PASS' : `FAIL (${job.providerSpendUsd} / ${job.maxSpendLimitUsd})`);

const criticalFailed = [
  !audioOk && 'Audio URL',
  !scenesOk && 'Scenes exist',
  !storyboardOk && 'Storyboard images',
  !spendOk && 'Spend cap',
].filter(Boolean);

console.log('\nCritical failed:', criticalFailed.length === 0 ? 'NONE (validation PASSES)' : criticalFailed.join(', '));

// 4. Probe gate
console.log('\n=== PROBE GATE ===');
console.log('probePassed:', job.probePassed, '(1 = true = full_render)');
console.log('probeSceneId:', job.probeSceneId);

if (criticalFailed.length > 0) {
  console.log('PROBE DECISION: BLOCKED (validation failed)');
} else if (job.probePassed === 1 || job.probePassed === true) {
  console.log('PROBE DECISION: FULL_RENDER ✓');
} else if (job.probePassed === 0 || job.probePassed === false) {
  console.log('PROBE DECISION: BLOCKED (probe in progress)');
} else {
  console.log('PROBE DECISION: PROBE_ONLY (probePassed=null)');
}

// 5. Pending scenes
const pendingScenes = scenes.filter(s => s.status === 'pending' && !s.taskId);
console.log(`\nPending scenes (status=pending AND no taskId): ${pendingScenes.length}`);
for (const s of pendingScenes) {
  console.log(`  [${s.sceneIndex}] id=${s.id} status=${s.status} taskId=${s.taskId ?? 'NULL'}`);
}

await conn.end();
