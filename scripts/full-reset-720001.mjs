import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Reset all scenes to pending, clear video/lipSync data
await conn.execute(`
  UPDATE musicVideoScenes SET 
    mvSceneStatus='pending', 
    taskId=NULL, 
    videoUrl=NULL, 
    videoKey=NULL,
    lipSyncStatus='pending',
    lipSyncTaskId=NULL,
    lipSyncVideoUrl=NULL,
    lipSyncVideoKey=NULL
  WHERE jobId=720001
`);

// Reset job to rendering state
await conn.execute(`
  UPDATE musicVideoJobs SET 
    status='rendering',
    finalVideoUrl=NULL,
    finalVideoKey=NULL
  WHERE id=720001
`);

// Clear old providerJobLogs
await conn.execute(`
  DELETE FROM providerJobLogs WHERE sceneId IN (
    SELECT id FROM musicVideoScenes WHERE jobId=720001
  )
`);

console.log('Reset complete - all 12 scenes back to pending');
await conn.end();
