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

// Scene 0 video URL
const [s0] = await conn.query(
  "SELECT sceneIndex, mvSceneStatus, videoUrl FROM musicVideoScenes WHERE jobId=540026 AND sceneIndex=0"
);
console.log("=== SCENE 0 (completed) ===");
console.log("videoUrl:", s0[0]?.videoUrl || "none");

// Provider job logs - actual column names
const [logs] = await conn.query(
  `SELECT sceneId, pjlStatus as status, provider, LEFT(errorMessage,300) as error, providerJobId, attemptNumber
   FROM providerJobLogs WHERE jobId=540026 ORDER BY sceneId, attemptNumber`
);
console.log("\n=== PROVIDER JOB LOGS ===");
if (logs.length === 0) {
  console.log("No provider job logs found");
} else {
  logs.forEach(r => {
    console.log("scene=" + r.sceneId + " status=" + r.status + " provider=" + r.provider + " attempt=" + r.attemptNumber);
    if (r.error) console.log("  ERROR: " + r.error);
  });
}

// Scene error messages
const [scenes] = await conn.query(
  `SELECT sceneIndex, mvSceneStatus, LEFT(errorMessage,200) as error, retryCount, taskId, providerUsed
   FROM musicVideoScenes WHERE jobId=540026 ORDER BY sceneIndex`
);
console.log("\n=== SCENE ERRORS ===");
scenes.forEach(r => {
  if (r.mvSceneStatus !== "completed") {
    console.log("scene " + r.sceneIndex + ": status=" + r.mvSceneStatus + " retries=" + r.retryCount + " provider=" + r.providerUsed);
    console.log("  error: " + (r.error || "none"));
  }
});

// Job status
const [jobs] = await conn.query(
  `SELECT id, status, completedScenes, totalScenes, audioDuration, maxSpendLimitUsd,
   syncLabsJobId, finalVideoProduced, assemblyStartedAt, LEFT(errorMessage,200) as error
   FROM musicVideoJobs WHERE id=540026`
);
console.log("\n=== JOB STATUS ===");
const j = jobs[0];
console.log("status=" + j.status + " completed=" + j.completedScenes + "/" + j.totalScenes);
console.log("maxSpend=" + j.maxSpendLimitUsd + " audioDuration=" + j.audioDuration);
console.log("finalVideoProduced=" + j.finalVideoProduced + " assemblyStartedAt=" + j.assemblyStartedAt);
console.log("syncLabsJobId=" + j.syncLabsJobId);
console.log("error=" + (j.error || "none"));

await conn.end();
process.exit(0);
