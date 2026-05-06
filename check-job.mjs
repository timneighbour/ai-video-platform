import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL;
const conn = await mysql.createConnection(url);

// Check status breakdown for job 390001 using correct column name
const [statusCounts] = await conn.execute(
  'SELECT mvSceneStatus, COUNT(*) as cnt FROM musicVideoScenes WHERE jobId = 390001 GROUP BY mvSceneStatus'
);
console.log('Status breakdown for job 390001:', JSON.stringify(statusCounts, null, 2));

// Check if completed scenes have videoUrls
const [noUrl] = await conn.execute(
  "SELECT COUNT(*) as cnt FROM musicVideoScenes WHERE jobId = 390001 AND mvSceneStatus = 'completed' AND (videoUrl IS NULL OR videoUrl = '')"
);
console.log('Completed scenes with no videoUrl:', noUrl[0].cnt);

// Check the one non-completed scene
const [other] = await conn.execute(
  "SELECT sceneIndex, mvSceneStatus, errorMessage, taskId FROM musicVideoScenes WHERE jobId = 390001 AND mvSceneStatus != 'completed' ORDER BY sceneIndex"
);
console.log('Non-completed scenes:', JSON.stringify(other, null, 2));

// Check job error message
const [job] = await conn.execute(
  'SELECT status, errorMessage, completedScenes, totalScenes, updatedAt FROM musicVideoJobs WHERE id = 390001'
);
console.log('Job status:', JSON.stringify(job[0], null, 2));

await conn.end();
