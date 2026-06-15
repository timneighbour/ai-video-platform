import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({ path: '/home/ubuntu/ai-video-platform/.env' });

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Get the most recently updated job
const [jobs] = await conn.execute(
  `SELECT id, status, probe_scene_id, probe_passed, render_status, error_message, updated_at 
   FROM music_video_jobs 
   ORDER BY updated_at DESC LIMIT 3`
);
console.log('=== RECENT JOBS ===');
console.log(JSON.stringify(jobs, null, 2));

if (jobs.length > 0) {
  const job = jobs[0];
  const jobId = job.id;
  
  // Get all scenes for this job
  const [scenes] = await conn.execute(
    `SELECT id, scene_index, status, task_id, video_url, preview_image_url, error_message, attempts, updated_at
     FROM music_video_scenes 
     WHERE job_id = ?
     ORDER BY scene_index ASC`,
    [jobId]
  );
  console.log(`\n=== SCENES FOR JOB ${jobId} ===`);
  scenes.forEach(s => {
    console.log(`Scene ${s.scene_index} (ID ${s.id}): status=${s.status} taskId=${s.task_id || 'null'} hasVideo=${!!s.video_url} hasPreview=${!!s.preview_image_url} attempts=${s.attempts} err=${s.error_message ? s.error_message.substring(0, 80) : 'none'}`);
  });
  
  // Check heartbeat schedule
  const [schedules] = await conn.execute(
    `SELECT * FROM heartbeat_schedules WHERE name LIKE '%scene%' OR name LIKE '%dispatch%' OR name LIKE '%probe%' LIMIT 5`
  ).catch(() => [[]]);
  if (schedules.length > 0) {
    console.log('\n=== HEARTBEAT SCHEDULES ===');
    console.log(JSON.stringify(schedules, null, 2));
  }
}

await conn.end();
