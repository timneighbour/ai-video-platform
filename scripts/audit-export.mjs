import { createConnection } from 'mysql2/promise';
import { writeFileSync } from 'fs';

function toCSV(rows) {
  if (!rows.length) return 'No rows found\n';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for (const row of rows) {
    const vals = headers.map(h => {
      const v = row[h] == null ? '' : String(row[h]);
      return (v.includes(',') || v.includes('"') || v.includes('\n'))
        ? '"' + v.replace(/"/g, '""') + '"'
        : v;
    });
    lines.push(vals.join(','));
  }
  return lines.join('\n') + '\n';
}

const conn = await createConnection(process.env.DATABASE_URL);

// Query 1: Scenes stuck in generating
const [stuck] = await conn.execute(`
  SELECT id as sceneId, jobId, sceneIndex, mvSceneStatus, taskId, errorMessage, createdAt, updatedAt
  FROM musicVideoScenes
  WHERE mvSceneStatus = 'generating'
  ORDER BY updatedAt ASC
`);
writeFileSync('/home/ubuntu/audit-1-stuck-generating.csv', toCSV(stuck));
console.log('Query 1 (stuck generating):', stuck.length, 'rows');

// Query 2: providerJobLogs (all rows)
const [logs] = await conn.execute(`
  SELECT * FROM providerJobLogs ORDER BY submittedAt DESC LIMIT 500
`);
writeFileSync('/home/ubuntu/audit-2-provider-job-logs.csv', toCSV(logs));
console.log('Query 2 (providerJobLogs):', logs.length, 'rows — table is empty until first protected render runs');

// Query 3: Duplicate submission check in providerJobLogs
const [dupes] = await conn.execute(`
  SELECT idempotencyKey, COUNT(*) as count, GROUP_CONCAT(id) as logIds
  FROM providerJobLogs
  GROUP BY idempotencyKey
  HAVING COUNT(*) > 1
  ORDER BY count DESC
`);
writeFileSync('/home/ubuntu/audit-3-duplicate-check.csv', toCSV(dupes));
console.log('Query 3 (duplicate idempotency keys):', dupes.length, 'duplicates found');

// Query 4: All fal.ai scenes (full evidence for fal.ai support)
const [falScenes] = await conn.execute(`
  SELECT s.id as sceneId, s.jobId, s.sceneIndex, s.mvSceneStatus, s.taskId,
         s.errorMessage, s.createdAt, s.updatedAt, j.status as jobStatus
  FROM musicVideoScenes s
  JOIN musicVideoJobs j ON j.id = s.jobId
  WHERE s.taskId LIKE 'fal:%'
  ORDER BY s.updatedAt ASC
`);
writeFileSync('/home/ubuntu/audit-4-fal-all-scenes.csv', toCSV(falScenes));
console.log('Query 4 (all fal.ai scenes):', falScenes.length, 'rows');

// Query 5: All Atlas Cloud scenes
const [atlasScenes] = await conn.execute(`
  SELECT s.id as sceneId, s.jobId, s.sceneIndex, s.mvSceneStatus, s.taskId,
         s.errorMessage, s.createdAt, s.updatedAt, j.status as jobStatus
  FROM musicVideoScenes s
  JOIN musicVideoJobs j ON j.id = s.jobId
  WHERE s.taskId LIKE 'atlas:%'
  ORDER BY s.updatedAt ASC
`);
writeFileSync('/home/ubuntu/audit-5-atlas-all-scenes.csv', toCSV(atlasScenes));
console.log('Query 5 (all Atlas Cloud scenes):', atlasScenes.length, 'rows');

// Query 6: Active render jobs (confirm no paid render is running)
const [running] = await conn.execute(`
  SELECT id, userId, status, createdAt, updatedAt
  FROM musicVideoJobs
  WHERE status IN ('rendering', 'assembling')
  ORDER BY updatedAt DESC
`);
writeFileSync('/home/ubuntu/audit-6-active-render-jobs.csv', toCSV(running));
console.log('Query 6 (active render jobs):', running.length, 'job(s) in rendering/assembling state');
if (running.length > 0) {
  for (const j of running) {
    console.log('  Job', j.id, '| status:', j.status, '| created:', j.createdAt, '| updated:', j.updatedAt);
  }
}

await conn.end();
console.log('\nAll 6 CSV files written to /home/ubuntu/');
