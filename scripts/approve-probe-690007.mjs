import { config } from 'dotenv';
import mysql from 'mysql2/promise';
config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

console.log('=== Approving probe for job 690007 ===');

// Set probePassed=1 (true) and record the probe video URL
const probeVideoUrl = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-scenes/690014-1779402810627.mp4';

const [res] = await conn.execute(
  `UPDATE musicVideoJobs 
   SET probePassed=1, probeVideoUrl=?, probeApprovedAt=NOW()
   WHERE id=690007`,
  [probeVideoUrl]
);
console.log('Probe approved, updated rows:', res.affectedRows);

// Verify
const [jobs] = await conn.execute(
  "SELECT id, status, probePassed, probeSceneId, probeVideoUrl, probeApprovedAt FROM musicVideoJobs WHERE id=690007"
);
console.log('Job state:', JSON.stringify(jobs[0]));

await conn.end();

// Trigger heartbeat to dispatch all remaining scenes
console.log('\n=== Triggering heartbeat for full render dispatch ===');
const hbRes = await fetch('http://localhost:3000/api/scheduled/sceneDispatchHeartbeat', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'x-dev-bypass': 'scene-dispatch-2026'
  }
});
const hbData = await hbRes.json();
console.log('Heartbeat result:', JSON.stringify(hbData));
