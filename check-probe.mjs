import { createConnection } from 'mysql2/promise';

const conn = await createConnection(process.env.DATABASE_URL);

// Get all job columns to understand what's available
const [jobCols] = await conn.execute('DESCRIBE musicVideoJobs');
const jobColNames = jobCols.map(c => c.Field);
console.log('JOB COLS (audio/stem/vocal):', jobColNames.filter(f => 
  f.toLowerCase().includes('audio') || f.toLowerCase().includes('stem') || 
  f.toLowerCase().includes('vocal') || f.toLowerCase().includes('char')
).join(', '));

// Get job with safe columns
const [job] = await conn.execute(
  'SELECT id, status, probeSceneId, probePassed, audioUrl IS NOT NULL as hasAudio, audioDuration FROM musicVideoJobs WHERE id = 1080001'
);
console.log('JOB:', JSON.stringify(job[0]));

// Check orchestration server
const url = process.env.ORCHESTRATION_SERVER_URL;
console.log('ORCH URL:', url?.substring(0,40));

try {
  const r = await fetch(url + '/health');
  const t = await r.json();
  console.log('ORCH HEALTH:', JSON.stringify(t).substring(0, 200));
} catch(e) {
  console.log('ORCH HEALTH ERROR:', e.message);
}

// Try to understand what dispatch error is — check if there's a /render or /generate endpoint
try {
  const r = await fetch(url + '/render/status');
  const t = await r.text();
  console.log('RENDER STATUS:', t.substring(0, 300));
} catch(e) {
  console.log('render/status not available:', e.message);
}

// Check character tables
const [tables] = await conn.execute("SHOW TABLES");
const allTables = tables.map(t => Object.values(t)[0]);
console.log('ALL TABLES:', allTables.filter(t => t.toLowerCase().includes('char') || t.toLowerCase().includes('band') || t.toLowerCase().includes('artist')).join(', '));

await conn.end();
