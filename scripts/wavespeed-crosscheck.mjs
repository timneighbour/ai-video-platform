/**
 * WaveSpeed Prediction ID Cross-Check Script
 * Searches every table and every text field for the 15 WaveSpeed prediction IDs.
 * Run from: /home/ubuntu/ai-video-platform
 */
import { createConnection } from 'mysql2/promise';
import { writeFileSync } from 'fs';

const WAVESPEED_PREDICTIONS = [
  { id: 'b589324f239648a38e9fff6d00329eb4', model: 'seedance-2.0',      date: '2026-04-19 23:03:37', cost: 2.40 },
  { id: '4f6e237057f84404a689a3e53de5f9bb', model: 'seedance-2.0',      date: '2026-04-19 23:03:33', cost: 2.40 },
  { id: '4d872866675948edbba0f2217e753af3', model: 'seedance-2.0',      date: '2026-04-19 23:03:30', cost: 2.40 },
  { id: '3b7ee07de0ed40d0b3671e622f3cf0e3', model: 'seedance-2.0',      date: '2026-04-19 23:03:27', cost: 2.40 },
  { id: 'a80d7b7a16244aa494ae4ce57a330301', model: 'seedance-2.0',      date: '2026-04-19 22:59:59', cost: 1.20 },
  { id: 'bd5a999c45144826903a513c9935291c', model: 'seedance-v1.5-pro', date: '2026-04-19 22:59:42', cost: 0.26 },
  { id: '1349e72794db43e08bca79bcb0b1f925', model: 'seedance-2.0-fast', date: '2026-04-19 22:59:42', cost: 1.00 },
  { id: '3721c8fe4dbe447ea9d1b02ebdc6ea12', model: 'seedance-2.0',      date: '2026-04-19 22:59:41', cost: 1.20 },
  { id: '25d55913db4e4504a3c3ce1629054c8c', model: 'seedance-2.0',      date: '2026-04-19 22:50:12', cost: 1.20 },
  { id: 'f16bf3f2941843ba918d97a517146db6', model: 'seedance-2.0',      date: '2026-04-19 22:48:33', cost: 1.20 },
  { id: '77bfc1fe9cf4415aad09e20c78e37a4c', model: 'seedance-2.0-fast', date: '2026-04-19 22:46:53', cost: 1.00 },
  { id: 'c5baef728eda440eb75289550507c382', model: 'seedance-2.0',      date: '2026-04-19 22:46:53', cost: 1.20 },
  { id: '2ce22d8df96c4e9c96987deaee0091e2', model: 'seedance-2.0',      date: '2026-04-19 22:46:52', cost: 1.20 },
  { id: '0d60907669ca4c209903e7644c1d2fe0', model: 'seedance-2.0',      date: '2026-04-19 22:45:22', cost: 1.20 },
  { id: '46c55defa8874fd9bb1ae49f27eeec208', model: 'seedance-2.0-fast', date: '2026-04-15 23:18:42', cost: 0.50 },
];

const conn = await createConnection(process.env.DATABASE_URL);

// Get all tables
const [tables] = await conn.execute('SHOW TABLES');
const tableNames = tables.map(t => Object.values(t)[0]);
console.log('Tables to search:', tableNames.join(', '));

const results = [];

for (const pred of WAVESPEED_PREDICTIONS) {
  const matches = [];

  // Search every table for this prediction ID in any text/varchar column
  for (const table of tableNames) {
    const [cols] = await conn.execute(`DESCRIBE ${table}`);
    const textCols = cols
      .filter(c => c.Type.includes('text') || c.Type.includes('varchar') || c.Type.includes('char') || c.Type.includes('json'))
      .map(c => c.Field);

    if (textCols.length === 0) continue;

    const conditions = textCols.map(col => `\`${col}\` LIKE ?`).join(' OR ');
    const params = textCols.map(() => `%${pred.id}%`);

    const [rows] = await conn.execute(
      `SELECT * FROM \`${table}\` WHERE ${conditions} LIMIT 10`,
      params
    );

    if (rows.length > 0) {
      matches.push({ table, rows });
    }
  }

  results.push({ prediction: pred, matches });
  const found = matches.length > 0;
  console.log(`${found ? '✅ FOUND' : '❌ NOT FOUND'} | ${pred.id} | $${pred.cost} | ${pred.date} | ${pred.model}`);
  if (found) {
    for (const m of matches) {
      console.log(`   → Table: ${m.table}, ${m.rows.length} row(s)`);
    }
  }
}

// Also search specifically in musicVideoScenes for any of the IDs in any column
console.log('\n--- Broad search in musicVideoScenes for all 15 IDs ---');
for (const pred of WAVESPEED_PREDICTIONS) {
  const [rows] = await conn.execute(
    `SELECT id, jobId, sceneIndex, mvSceneStatus, taskId, videoUrl, errorMessage, updatedAt
     FROM musicVideoScenes
     WHERE taskId LIKE ? OR videoUrl LIKE ? OR errorMessage LIKE ?`,
    [`%${pred.id}%`, `%${pred.id}%`, `%${pred.id}%`]
  );
  if (rows.length > 0) {
    console.log(`MATCH in musicVideoScenes for ${pred.id}:`, JSON.stringify(rows, null, 2));
  }
}

// Check providerJobLogs specifically
console.log('\n--- Search in providerJobLogs for all 15 IDs ---');
for (const pred of WAVESPEED_PREDICTIONS) {
  const [rows] = await conn.execute(
    `SELECT * FROM providerJobLogs WHERE providerJobId LIKE ? OR idempotencyKey LIKE ?`,
    [`%${pred.id}%`, `%${pred.id}%`]
  );
  if (rows.length > 0) {
    console.log(`MATCH in providerJobLogs for ${pred.id}:`, JSON.stringify(rows, null, 2));
  }
}

// Check timing: what was happening in the DB around 19 Apr 22:45–23:04 UTC?
console.log('\n--- musicVideoScenes activity on 19 Apr 22:45–23:10 UTC ---');
const [timeWindow] = await conn.execute(`
  SELECT id as sceneId, jobId, sceneIndex, mvSceneStatus, taskId, videoUrl, errorMessage, createdAt, updatedAt
  FROM musicVideoScenes
  WHERE updatedAt BETWEEN '2026-04-19 22:40:00' AND '2026-04-19 23:10:00'
  ORDER BY updatedAt ASC
`);
console.log('Scenes updated in WaveSpeed billing window:', timeWindow.length);
if (timeWindow.length > 0) console.log(JSON.stringify(timeWindow, null, 2));

// Check musicVideoJobs activity in same window
console.log('\n--- musicVideoJobs activity on 19 Apr 22:40–23:10 UTC ---');
const [jobsWindow] = await conn.execute(`
  SELECT id, userId, status, createdAt, updatedAt
  FROM musicVideoJobs
  WHERE updatedAt BETWEEN '2026-04-19 22:40:00' AND '2026-04-19 23:10:00'
  ORDER BY updatedAt ASC
`);
console.log('Jobs updated in WaveSpeed billing window:', jobsWindow.length);
if (jobsWindow.length > 0) console.log(JSON.stringify(jobsWindow, null, 2));

// Check the single Apr 15 prediction (46c55defa8874fd9bb1ae49f27eeec208)
console.log('\n--- musicVideoScenes activity on 15 Apr 23:15–23:25 UTC ---');
const [apr15Window] = await conn.execute(`
  SELECT id as sceneId, jobId, sceneIndex, mvSceneStatus, taskId, videoUrl, errorMessage, createdAt, updatedAt
  FROM musicVideoScenes
  WHERE updatedAt BETWEEN '2026-04-15 23:10:00' AND '2026-04-15 23:30:00'
  ORDER BY updatedAt ASC
`);
console.log('Scenes updated around Apr 15 23:18 UTC:', apr15Window.length);
if (apr15Window.length > 0) console.log(JSON.stringify(apr15Window, null, 2));

// Write CSV summary
const csvLines = [
  'prediction_id,model,date_utc,cost_usd,found_in_db,table_found,scene_id,job_id,scene_status,task_id_in_db,notes'
];
for (const r of results) {
  const found = r.matches.length > 0;
  if (found) {
    for (const m of r.matches) {
      for (const row of m.rows) {
        csvLines.push([
          r.prediction.id,
          r.prediction.model,
          r.prediction.date,
          r.prediction.cost,
          'YES',
          m.table,
          row.id ?? row.sceneId ?? '',
          row.jobId ?? '',
          row.mvSceneStatus ?? row.status ?? '',
          row.taskId ?? '',
          'MATCHED'
        ].join(','));
      }
    }
  } else {
    csvLines.push([
      r.prediction.id,
      r.prediction.model,
      r.prediction.date,
      r.prediction.cost,
      'NO',
      '',
      '',
      '',
      '',
      '',
      'Not found in any DB table'
    ].join(','));
  }
}
writeFileSync('/home/ubuntu/audit-wavespeed-crosscheck.csv', csvLines.join('\n') + '\n');
console.log('\nCSV written to /home/ubuntu/audit-wavespeed-crosscheck.csv');

await conn.end();
