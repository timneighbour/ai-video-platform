/**
 * run-job-870022-fixes.mjs
 *
 * Executes the three pre-conditions for Job 870022 demo render:
 *
 * Fix 1: Trigger Stage 2 environment portrait for Zara (char 570001)
 *         — Air Studios Lyndhurst Hall
 * Fix 2: Re-run Whisper transcription for Job 870022 audio
 * Fix 3: Reset probe scene 780014 to pending for fresh r2v dispatch
 *
 * Usage: node server/run-job-870022-fixes.mjs
 */
import "dotenv/config";
import mysql from "mysql2/promise";

const JOB_ID = 870022;
const CHAR_ID = 570001; // Zara
const PROBE_SCENE_ID = 780014;
const SCENE_STYLE = "Air Studios, London";

// ── Zara's identity brief from characterPrompt ──────────────────────────────
const ZARA_IDENTITY_BRIEF =
  "young woman, early 20s, youthful appearance, smooth skin, vibrant energy, " +
  "white/Caucasian, long flowing black hair, bright green eyes, elegant stage presence, " +
  "contemporary fashion-forward outfit, confident and expressive performer";

const ZARA_MASTER_PORTRAIT_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/characters/zara-portrait-b-v2.jpg";

async function main() {
  console.log("=== Job 870022 Pre-render Fixes ===\n");

  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  // ── Fix 3: Reset probe scene ─────────────────────────────────────────────
  console.log("Fix 3: Resetting probe scene 780014 to pending...");
  await conn.execute(
    `UPDATE musicVideoScenes 
     SET mvSceneStatus = 'pending', taskId = NULL, videoUrl = NULL, videoKey = NULL, updatedAt = NOW()
     WHERE id = ?`,
    [PROBE_SCENE_ID]
  );
  await conn.execute(
    `UPDATE musicVideoJobs 
     SET probePassed = NULL, probeVideoUrl = NULL, updatedAt = NOW()
     WHERE id = ?`,
    [JOB_ID]
  );
  // Clear any existing provider job logs for probe scene
  await conn.execute(
    `DELETE FROM providerJobLogs WHERE sceneId = ?`,
    [PROBE_SCENE_ID]
  );
  console.log("  ✓ Probe scene 780014 reset to pending");
  console.log("  ✓ probePassed = NULL, probeVideoUrl = NULL");
  console.log("  ✓ providerJobLogs cleared for scene 780014\n");

  // ── Fix 2: Re-trigger transcription ─────────────────────────────────────
  console.log("Fix 2: Re-setting transcription status to 'pending' for re-trigger...");
  await conn.execute(
    `UPDATE musicVideoJobs 
     SET transcriptionStatus = 'pending', transcription = NULL, transcriptionSegments = NULL, updatedAt = NOW()
     WHERE id = ?`,
    [JOB_ID]
  );
  console.log("  ✓ transcriptionStatus = 'pending' (heartbeat will pick up and re-run)\n");

  // ── Verify state ─────────────────────────────────────────────────────────
  const [jobRows] = await conn.execute(
    `SELECT id, status, probePassed, probeSceneId, probeVideoUrl, transcriptionStatus, 
            LEFT(audioUrl, 80) as audioSnip, LEFT(stemVocalsUrl, 80) as stemVocalsSnip
     FROM musicVideoJobs WHERE id = ?`,
    [JOB_ID]
  );
  console.log("Job state after fixes:", JSON.stringify(jobRows[0], null, 2));

  const [sceneRows] = await conn.execute(
    `SELECT id, sceneIndex, mvSceneStatus, taskId, videoUrl 
     FROM musicVideoScenes WHERE id = ?`,
    [PROBE_SCENE_ID]
  );
  console.log("Probe scene state:", JSON.stringify(sceneRows[0], null, 2));

  await conn.end();

  console.log("\n=== Fixes 2 & 3 complete ===");
  console.log("Fix 1 (Stage 2 environment portrait) will be triggered via the heartbeat.");
  console.log("The heartbeat will:");
  console.log("  1. Detect transcriptionStatus = 'pending' and re-run Whisper");
  console.log("  2. Detect environmentRefUrl = NULL and trigger Stage 2 auto-prep");
  console.log("  3. Once Stage 2 completes, dispatch probe scene with r2v pipeline");
  console.log("\nNext step: trigger the heartbeat at /api/scheduled/sceneDispatchHeartbeat");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
