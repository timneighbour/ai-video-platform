/**
 * Billing Audit Query Script
 * Queries providerJobLogs and musicVideoScenes for the bug window evidence.
 * Run with: node scripts/audit-query.mjs
 */
import { createConnection } from 'mysql2/promise';

const conn = await createConnection(process.env.DATABASE_URL);

// 1. Describe musicVideoScenes to get actual column names
const [sceneCols] = await conn.execute('DESCRIBE musicVideoScenes');
console.log('\n=== musicVideoScenes COLUMNS ===');
console.log(sceneCols.map(c => `${c.Field} (${c.Type})`).join('\n'));

// 2. Describe providerJobLogs
const [logCols] = await conn.execute('DESCRIBE providerJobLogs');
console.log('\n=== providerJobLogs COLUMNS ===');
console.log(logCols.map(c => `${c.Field} (${c.Type})`).join('\n'));

// 3. All providerJobLogs rows
const [logs] = await conn.execute('SELECT * FROM providerJobLogs ORDER BY submittedAt DESC LIMIT 500');
console.log('\n=== providerJobLogs ROWS ===');
console.log('Total rows:', logs.length);
if (logs.length > 0) {
  console.log(JSON.stringify(logs, null, 2));
} else {
  console.log('(empty — providerJobLogs was created after the bug window; no historical data)');
}

// 4. Get scene columns dynamically then query rendering jobs
const sceneColNames = sceneCols.map(c => c.Field);
console.log('\n=== musicVideoScenes for job 360001 (most recent rendering job) ===');
const [scenes360] = await conn.execute(`SELECT * FROM musicVideoScenes WHERE jobId = 360001 ORDER BY id ASC`);
console.log('Total scenes:', scenes360.length);
console.log(JSON.stringify(scenes360, null, 2));

console.log('\n=== musicVideoScenes for job 330001 (previous rendering job) ===');
const [scenes330] = await conn.execute(`SELECT * FROM musicVideoScenes WHERE jobId = 330001 ORDER BY id ASC`);
console.log('Total scenes:', scenes330.length);
console.log(JSON.stringify(scenes330, null, 2));

// 5. Duplicate taskId detection (same taskId on multiple scenes = duplicate submission)
console.log('\n=== DUPLICATE TASK ID DETECTION (scenes with same taskId) ===');
const [dupes] = await conn.execute(`
  SELECT taskId, COUNT(*) as count, GROUP_CONCAT(id) as sceneIds, GROUP_CONCAT(jobId) as jobIds
  FROM musicVideoScenes
  WHERE taskId IS NOT NULL AND taskId != ''
  GROUP BY taskId
  HAVING COUNT(*) > 1
  ORDER BY count DESC
  LIMIT 50
`);
console.log('Duplicate taskIds found:', dupes.length);
if (dupes.length > 0) console.log(JSON.stringify(dupes, null, 2));

// 6. Scene status summary per job
console.log('\n=== SCENE STATUS SUMMARY PER JOB ===');
const [statusSummary] = await conn.execute(`
  SELECT jobId, 
    COUNT(*) as totalScenes,
    SUM(CASE WHEN taskId IS NOT NULL AND taskId != '' THEN 1 ELSE 0 END) as scenesWithTaskId
  FROM musicVideoScenes
  GROUP BY jobId
  ORDER BY jobId DESC
  LIMIT 20
`);
console.log(JSON.stringify(statusSummary, null, 2));

// 7. Credit transactions during bug window (Apr 14-20)
console.log('\n=== CREDIT TRANSACTIONS (Apr 14-20 bug window) ===');
const [credits] = await conn.execute(`
  SELECT * FROM creditTransactions
  WHERE createdAt >= '2026-04-14 00:00:00'
  ORDER BY createdAt DESC
  LIMIT 100
`);
console.log('Total transactions:', credits.length);
if (credits.length > 0) console.log(JSON.stringify(credits, null, 2));

await conn.end();
console.log('\n=== AUDIT QUERY COMPLETE ===');
