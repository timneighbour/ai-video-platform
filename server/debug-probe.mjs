/**
 * debug-probe.mjs — run the pre-render validator against job 540026
 * and print the full decision output
 * Run: node server/debug-probe.mjs
 */
import "dotenv/config";
import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Replicate the getProbeDecision logic directly
const jobId = 540026;

// 1. Load job
const [jobRows] = await conn.execute(
  "SELECT id, status, audioUrl, probePassed, probeSceneId, enableLipSync, characterRoster FROM musicVideoJobs WHERE id = ?",
  [jobId]
);
const job = jobRows[0];
console.log("JOB:", JSON.stringify(job, null, 2));

// 2. Load scenes
const [sceneRows] = await conn.execute(
  "SELECT id, sceneIndex, mvSceneStatus as status, lipSync, startTime, previewImageUrl IS NOT NULL as hasStoryboard, taskId FROM musicVideoScenes WHERE jobId = ? ORDER BY sceneIndex",
  [jobId]
);
console.log("\nSCENES:");
sceneRows.forEach(s => console.log(JSON.stringify(s)));

// 3. Check validation
const pendingScenes = sceneRows.filter(s => s.status === "pending" && !s.taskId);
console.log("\nPENDING SCENES (no taskId):", pendingScenes.length);

const lipSyncPending = pendingScenes.filter(s => s.lipSync === 1 && s.startTime !== null);
console.log("LIP SYNC PENDING WITH START TIME:", lipSyncPending.length);

const bestProbeScene = lipSyncPending[0] ?? pendingScenes[0];
console.log("\nBEST PROBE SCENE:", bestProbeScene ? JSON.stringify(bestProbeScene) : "NONE — this is why dispatch is blocked!");

// 4. Check characters
const [charRows] = await conn.execute(
  "SELECT id, name, masterPortraitUrl IS NOT NULL as hasMaster, previewImageUrl IS NOT NULL as hasPreview FROM videoCharacters WHERE jobId = ?",
  [jobId]
);
console.log("\nCHARACTERS:", charRows.length);
charRows.forEach(c => console.log(JSON.stringify(c)));

// 5. Check Sync Labs config
const syncLabsKey = process.env.SYNC_LABS_API_KEY;
console.log("\nSYNC LABS KEY:", syncLabsKey ? `Set (${syncLabsKey.slice(0, 8)}...)` : "MISSING");

// 6. Check Atlas key
const atlasKey = process.env.ATLAS_CLOUD_API_KEY;
console.log("ATLAS KEY:", atlasKey ? `Set (${atlasKey.slice(0, 8)}...)` : "MISSING");

await conn.end();
