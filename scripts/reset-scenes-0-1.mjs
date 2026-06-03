import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Reset only scenes 0 and 1 (sceneIndex 0 and 1) back to pending
const [r1] = await conn.execute(
  "UPDATE musicVideoScenes SET mvSceneStatus = 'pending', taskId = NULL, videoUrl = NULL, errorMessage = NULL, retryCount = 0 WHERE jobId = 930003 AND sceneIndex IN (0, 1)"
);
console.log('Scenes 0 and 1 reset to pending:', r1.affectedRows);

// Reset job to rendering so heartbeat picks it up
const [r2] = await conn.execute(
  "UPDATE musicVideoJobs SET status = 'rendering' WHERE id = 930003"
);
console.log('Job reset to rendering:', r2.affectedRows);

// Confirm current state
const [scenes] = await conn.query(
  'SELECT sceneIndex, mvSceneStatus, previewImageUrl IS NOT NULL as hasImg FROM musicVideoScenes WHERE jobId = 930003 AND sceneIndex IN (0,1) ORDER BY sceneIndex'
);
scenes.forEach(s => console.log(`Scene ${s.sceneIndex}: ${s.mvSceneStatus} hasImg=${s.hasImg}`));

await conn.end();
