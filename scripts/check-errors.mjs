import { createRequire } from "module";
const require = createRequire(import.meta.url);
const mysql = require("mysql2/promise");

const url = new URL(process.env.DATABASE_URL);
const conn = await mysql.createConnection({
  host: url.hostname,
  port: parseInt(url.port || "4000"),
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1).split("?")[0],
  ssl: { rejectUnauthorized: true },
});

// Get scene 0 video URL (the only completed one)
const [s0] = await conn.query(
  "SELECT sceneIndex, mvSceneStatus, videoUrl FROM musicVideoScenes WHERE jobId=540026 AND sceneIndex=0"
);
console.log("=== SCENE 0 (completed) ===");
console.log("status:", s0[0]?.mvSceneStatus);
console.log("videoUrl:", s0[0]?.videoUrl || "none");

// Get provider job logs for all scenes
const [logs] = await conn.query(
  `SELECT pjlSceneId as sceneId, pjlStatus as status, pjlProvider as provider, 
   LEFT(pjlErrorMessage, 300) as error, pjlTaskId as taskId, pjlRetryCount as retries
   FROM providerJobLogs WHERE pjlJobId=540026 ORDER BY pjlSceneId`
);
console.log("\n=== PROVIDER JOB LOGS ===");
if (logs.length === 0) {
  console.log("No provider job logs found for job 540026");
} else {
  logs.forEach(r => {
    console.log(`scene=${r.sceneId} status=${r.status} provider=${r.provider} retries=${r.retries}`);
    if (r.error) console.log(`  ERROR: ${r.error}`);
  });
}

// Get scene error messages directly
const [scenes] = await conn.query(
  `SELECT sceneIndex, mvSceneStatus, LEFT(errorMessage,200) as error, retryCount, taskId
   FROM musicVideoScenes WHERE jobId=540026 ORDER BY sceneIndex`
);
console.log("\n=== SCENE ERROR MESSAGES ===");
scenes.forEach(r => {
  if (r.mvSceneStatus !== "completed") {
    console.log(`scene ${r.sceneIndex}: status=${r.mvSceneStatus} retries=${r.retryCount} taskId=${r.taskId || "none"}`);
    console.log(`  error: ${r.error || "none"}`);
  }
});

// Get job status
const [jobs] = await conn.query(
  `SELECT id, status, completedScenes, totalScenes, audioDuration, maxSpendLimitUsd, 
   syncLabsJobId, finalVideoProduced, assemblyStartedAt, LEFT(errorMessage,200) as error
   FROM musicVideoJobs WHERE id=540026`
);
console.log("\n=== JOB STATUS ===");
console.log(jobs[0]);

await conn.end();
process.exit(0);
