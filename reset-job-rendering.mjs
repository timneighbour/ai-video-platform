import { createConnection } from 'mysql2/promise';

const url = process.env.DATABASE_URL;
if (!url) { console.error('No DATABASE_URL'); process.exit(1); }

const conn = await createConnection({ uri: url, ssl: { rejectUnauthorized: true } });
try {
  const [result] = await conn.execute(
    "UPDATE music_video_jobs SET status='rendering', updated_at=NOW() WHERE id=720001"
  );
  console.log('Updated rows:', result.affectedRows);
  
  // Also verify scene 10 state
  const [rows] = await conn.execute(
    "SELECT scene_index, scene_type, mv_scene_status, lip_sync_status, composite_status, composite_attempts FROM music_video_scenes WHERE job_id=720001 AND scene_index=10"
  );
  console.log('Scene 10:', JSON.stringify(rows));
} finally {
  await conn.end();
}
