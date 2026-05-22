/**
 * Monitor showcase job progress — polls every 30s
 * Usage: node scripts/monitor-job.mjs
 */
import mysql from "mysql2/promise";

const JOB_ID = 690005;
const POLL_INTERVAL_MS = 30_000;

async function poll() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  // Job status
  const [jobs] = await conn.execute(
    `SELECT id, status, totalScenes, completedScenes, finalVideoUrl
     FROM musicVideoJobs WHERE id = ?`,
    [JOB_ID]
  );
  const job = jobs[0];
  console.log(`\n[${new Date().toISOString()}] Job ${JOB_ID}:`);
  console.log(`  status: ${job.status}`);
  console.log(`  scenes: ${job.completedScenes}/${job.totalScenes}`);
  if (job.finalVideoUrl) console.log(`  finalVideoUrl: ${job.finalVideoUrl}`);

  // Scene statuses
  const [scenes] = await conn.execute(
    `SELECT sceneIndex, mvSceneStatus as status, videoUrl, errorMessage
     FROM musicVideoScenes WHERE jobId = ? ORDER BY sceneIndex`,
    [JOB_ID]
  );

  const statusGroups = {};
  scenes.forEach((s) => {
    statusGroups[s.status] = (statusGroups[s.status] || 0) + 1;
  });
  console.log(`  scene statuses: ${JSON.stringify(statusGroups)}`);

  // Show any scenes with video URLs (completed)
  const completed = scenes.filter((s) => s.videoUrl);
  if (completed.length > 0) {
    console.log(`  completed scenes:`);
    completed.forEach((s) => {
      console.log(`    [${s.sceneIndex}]: ${s.videoUrl?.substring(0, 80)}...`);
    });
  }

  // Show any errors
  const failed = scenes.filter((s) => s.errorMessage);
  if (failed.length > 0) {
    console.log(`  failed scenes:`);
    failed.forEach((s) => {
      console.log(`    [${s.sceneIndex}]: ${s.errorMessage?.substring(0, 100)}`);
    });
  }

  await conn.end();

  // Check if probe scene is ready (first scene completed)
  const probeScene = scenes.find((s) => s.sceneIndex === 0);
  if (probeScene?.videoUrl) {
    console.log(`\n*** PROBE SCENE READY: ${probeScene.videoUrl} ***`);
    return "probe_ready";
  }

  // Check if job is fully done
  if (job.status === "completed" || job.status === "export_validation_failed") {
    return "done";
  }

  return "running";
}

// Poll loop
let iteration = 0;
while (true) {
  iteration++;
  const state = await poll();
  if (state === "probe_ready" || state === "done") {
    console.log(`\nFinal state: ${state}`);
    break;
  }
  if (iteration >= 40) {
    console.log("Max iterations reached — stopping monitor");
    break;
  }
  console.log(`  Next poll in ${POLL_INTERVAL_MS / 1000}s...`);
  await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
}
