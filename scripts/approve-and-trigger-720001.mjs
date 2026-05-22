/**
 * Approve probe for job 720001 and trigger full render.
 * Sets probePassed=true, status=rendering, resets all failed/error scenes to pending.
 */
import { createConnection } from "../server/db.ts";

const db = await createConnection();

// 1. Approve probe on the job
await db.execute(`
  UPDATE musicVideoJobs 
  SET probePassed = 1, status = 'rendering', updatedAt = NOW()
  WHERE id = 720001
`);
console.log("✅ Job 720001: probe approved, status=rendering");

// 2. Reset all failed/error scenes to pending so they can be dispatched
const [resetResult] = await db.execute(`
  UPDATE musicVideoScenes 
  SET status = 'pending', taskId = NULL, videoUrl = NULL, lipSyncStatus = NULL, lipSyncTaskId = NULL, lipSyncVideoUrl = NULL, updatedAt = NOW()
  WHERE jobId = 720001 AND status IN ('failed', 'error')
`);
console.log(`✅ Reset ${resetResult.affectedRows} failed/error scenes to pending`);

// 3. Check current scene state
const [scenes] = await db.execute(`
  SELECT id, sceneIndex, status, sceneType, lipSync, startTime, duration
  FROM musicVideoScenes 
  WHERE jobId = 720001
  ORDER BY sceneIndex
`);
console.log("\nScene state:");
for (const s of scenes) {
  console.log(`  Scene ${s.id} (idx ${s.sceneIndex}): ${s.status} | type=${s.sceneType} | lipSync=${s.lipSync} | start=${s.startTime}s | dur=${s.duration}s`);
}

// 4. Trigger the heartbeat
console.log("\n🚀 Triggering heartbeat...");
try {
  const resp = await fetch("http://localhost:3000/api/scheduled/scene-dispatch", {
    method: "POST",
    headers: { "x-dev-bypass": "1", "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const text = await resp.text();
  console.log(`Heartbeat response: ${resp.status} ${text.slice(0, 200)}`);
} catch (e) {
  console.log("Heartbeat trigger failed:", e.message);
}

process.exit(0);
