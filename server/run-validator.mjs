/**
 * run-validator.mjs — run the full pre-render validator + probe decision for job 540026
 * Run: node server/run-validator.mjs
 */
import "dotenv/config";
import mysql from "mysql2/promise";
import { execSync } from "child_process";

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const jobId = 540026;

// Replicate runPreRenderValidation exactly
const [jobRows] = await conn.execute(
  `SELECT id, status, audioUrl, probePassed, probeSceneId, enableLipSync, 
   characterRoster, providerSpendUsd, maxSpendLimitUsd, fallbackProvider
   FROM musicVideoJobs WHERE id = ?`,
  [jobId]
);
const job = jobRows[0];

const [sceneRows] = await conn.execute(
  `SELECT id, sceneIndex, mvSceneStatus as status, lipSync, startTime, 
   previewImageUrl IS NOT NULL as hasStoryboard, taskId 
   FROM musicVideoScenes WHERE jobId = ? ORDER BY sceneIndex`,
  [jobId]
);

const [charRows] = await conn.execute(
  `SELECT id, name, masterPortraitUrl IS NOT NULL as hasMaster, previewImageUrl IS NOT NULL as hasPreview 
   FROM videoCharacters WHERE jobId = ?`,
  [jobId]
);

const checks = [];

// 1. Audio URL
checks.push({
  name: "Audio URL",
  passed: !!job.audioUrl,
  detail: job.audioUrl ? `Set: ${job.audioUrl.slice(0, 60)}...` : "MISSING",
});

// 2. Scenes exist
checks.push({
  name: "Scenes exist",
  passed: sceneRows.length > 0,
  detail: `${sceneRows.length} scenes found`,
});

// 3. Storyboard images
const withStoryboard = sceneRows.filter(s => s.hasStoryboard === 1);
checks.push({
  name: "Storyboard images",
  passed: withStoryboard.length === sceneRows.length,
  detail: `${withStoryboard.length}/${sceneRows.length} scenes have storyboard images`,
});

// 4. LipSync timing
const lipSyncScenes = sceneRows.filter(s => s.lipSync === 1);
const lipSyncWithTime = lipSyncScenes.filter(s => s.startTime !== null && s.startTime !== undefined);
checks.push({
  name: "LipSync scene timing",
  passed: lipSyncScenes.length === 0 || lipSyncWithTime.length === lipSyncScenes.length,
  detail: `${lipSyncWithTime.length}/${lipSyncScenes.length} lip sync scenes have startTime`,
});

// 5. Character portrait
const bestChar = charRows.find(c => c.hasMaster) ?? charRows.find(c => c.hasPreview);
checks.push({
  name: "Character portrait",
  passed: !!bestChar,
  detail: bestChar ? `Found: ${bestChar.name}` : "No character portrait",
});

// 6. Sync Labs
const syncLabsKey = process.env.SYNC_LABS_API_KEY;
checks.push({
  name: "Sync Labs",
  passed: !!syncLabsKey,
  detail: syncLabsKey ? "Configured ✓" : "SYNC_LABS_API_KEY not set",
});

// 7. ffmpeg (non-critical)
let ffmpegOk = false;
try { execSync("ffmpeg -version", { stdio: "ignore" }); ffmpegOk = true; } catch {}
checks.push({
  name: "ffmpeg",
  passed: ffmpegOk,
  detail: ffmpegOk ? "Available ✓" : "ffmpeg not found (non-critical — only needed for assembly)",
});

// 8. Spend cap
const spent = parseFloat(job.providerSpendUsd ?? "0");
const cap = parseFloat(job.maxSpendLimitUsd ?? "25");
checks.push({
  name: "Spend cap",
  passed: spent < cap,
  detail: `Spent $${spent.toFixed(4)} / cap $${cap.toFixed(2)}`,
});

// 9. Provider mode
checks.push({
  name: "Provider mode",
  passed: true,
  detail: job.fallbackProvider ? `Fallback: ${job.fallbackProvider}` : "Atlas Cloud (primary) ✓",
});

// Critical check evaluation (ffmpeg excluded)
const criticalChecks = ["Audio URL", "Scenes exist", "Storyboard images", "Spend cap"];
const criticalFailed = checks.filter(c => criticalChecks.includes(c.name) && !c.passed);
const passed = criticalFailed.length === 0;

console.log("\n=== PRE-RENDER VALIDATION RESULTS ===");
checks.forEach(c => {
  const icon = c.passed ? "✅" : "❌";
  const crit = criticalChecks.includes(c.name) ? " [CRITICAL]" : " [warning]";
  console.log(`${icon} ${c.name}${crit}: ${c.detail}`);
});

console.log(`\nOVERALL: ${passed ? "✅ PASSED" : "❌ BLOCKED"}`);
if (!passed) {
  console.log(`REASON: Critical check failed: ${criticalFailed.map(c => c.name).join(", ")}`);
}

// Probe decision
console.log("\n=== PROBE DECISION ===");
if (!passed) {
  console.log("Mode: BLOCKED");
} else if (job.probePassed === true) {
  console.log("Mode: FULL_RENDER (probe already approved)");
} else if (job.probePassed === false) {
  console.log("Mode: BLOCKED (probe in progress — awaiting approval)");
} else {
  // probePassed === null
  const pendingScenes = sceneRows.filter(s => s.status === "pending" && !s.taskId);
  const bestProbe = pendingScenes.find(s => s.lipSync === 1 && s.startTime !== null) ?? pendingScenes[0];
  if (bestProbe) {
    console.log(`Mode: PROBE_ONLY — would dispatch scene ${bestProbe.id} (index ${bestProbe.sceneIndex})`);
  } else {
    console.log("Mode: BLOCKED — no pending scenes");
  }
}

await conn.end();
