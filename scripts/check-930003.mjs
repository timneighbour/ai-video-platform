import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const [jobRows] = await conn.query('SELECT id, status, probePassed, probeSceneId FROM musicVideoJobs WHERE id = 930003');
console.log('JOB:', JSON.stringify(jobRows[0]));

// First get column names
const [cols] = await conn.query('SHOW COLUMNS FROM musicVideoScenes');
const colNames = cols.map(c => c.Field);
console.log('COLUMNS:', colNames.join(', '));

const [sceneRows] = await conn.query(
  'SELECT id, jobId, sceneIndex, mvSceneStatus, taskId, videoUrl, isApproved, approvedAt, previewImageUrl, sceneType, lipSync FROM musicVideoScenes WHERE jobId = 930003 ORDER BY sceneIndex LIMIT 12'
);
for (const s of sceneRows) {
  const idx = s.scene_index ?? s.sceneIndex ?? '?';
  const st = s.render_status ?? s.status ?? '?';
  const task = s.task_id ?? s.taskId;
  const approved = s.is_approved ?? s.isApproved;
  const img = s.preview_image_url ?? s.previewImageUrl;
  console.log(`SCENE ${idx} id=${s.id} status=${st} task=${task ? 'yes' : 'no'} approved=${approved ? 'YES' : 'no'} img=${img ? 'YES' : 'no'}`);
}

await conn.end();
