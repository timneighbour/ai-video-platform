/**
 * register-heartbeat-cron.ts
 * Registers the sceneDispatchHeartbeat as a platform cron job running every 2 minutes.
 * Must be run AFTER the site is deployed (the platform POSTs to the production URL).
 *
 * Run: npx tsx server/register-heartbeat-cron.ts
 */

import "dotenv/config";
import { createHeartbeatJob, listHeartbeatJobs } from "./_core/heartbeat";

async function main() {
  console.log("[RegisterCron] Checking existing heartbeat jobs...");

  // List existing jobs (empty session = owner identity)
  const existing = await listHeartbeatJobs("").catch(() => ({ total: 0, jobs: [] as any[] }));
  console.log(`[RegisterCron] Found ${existing.total} existing cron jobs`);

  const alreadyRegistered = existing.jobs?.find(
    (j: any) => j.name === "scene-dispatch-heartbeat"
  );

  if (alreadyRegistered) {
    console.log(`[RegisterCron] ✅ scene-dispatch-heartbeat already registered`);
    console.log(`  taskUid: ${alreadyRegistered.taskUid}`);
    console.log(`  enabled: ${alreadyRegistered.isEnable}`);
    console.log(`  nextExecution: ${alreadyRegistered.nextExecutionAt}`);
    console.log(`  lastExecution: ${alreadyRegistered.lastExecutedAt}`);
    return;
  }

  console.log("[RegisterCron] Registering scene-dispatch-heartbeat cron (every 2 minutes)...");

  const result = await createHeartbeatJob(
    {
      name: "scene-dispatch-heartbeat",
      cron: "0 */2 * * * *", // every 2 minutes
      path: "/api/scheduled/sceneDispatchHeartbeat",
      method: "POST",
      payload: {},
      description: "Dispatches pending music video scenes to Atlas Cloud / WaveSpeed and polls for completion. Runs every 2 minutes.",
    },
    "" // empty session = owner identity
  );

  console.log(`[RegisterCron] ✅ Registered successfully!`);
  console.log(`  taskUid: ${result.taskUid}`);
  console.log(`  nextExecution: ${result.nextExecutionAt}`);

  // Also register the stuck scene reaper (every 10 minutes)
  const reaperRegistered = existing.jobs?.find(
    (j: any) => j.name === "stuck-scene-reaper"
  );

  if (!reaperRegistered) {
    console.log("[RegisterCron] Registering stuck-scene-reaper cron (every 10 minutes)...");
    const reaperResult = await createHeartbeatJob(
      {
        name: "stuck-scene-reaper",
        cron: "0 */10 * * * *", // every 10 minutes
        path: "/api/scheduled/stuckSceneReaper",
        method: "POST",
        payload: {},
        description: "Resets scenes stuck in 'generating' for more than 15 minutes back to 'pending' for retry.",
      },
      ""
    );
    console.log(`[RegisterCron] ✅ stuck-scene-reaper registered: ${reaperResult.taskUid}`);
  }

  // Also register the assembly worker heartbeat if it exists
  const assemblyRegistered = existing.jobs?.find(
    (j: any) => j.name === "assembly-worker-heartbeat"
  );

  if (!assemblyRegistered) {
    console.log("[RegisterCron] Registering assembly-worker-heartbeat cron (every 2 minutes)...");
    const assemblyResult = await createHeartbeatJob(
      {
        name: "assembly-worker-heartbeat",
        cron: "0 */2 * * * *", // every 2 minutes
        path: "/api/scheduled/assemblyWorker",
        method: "POST",
        payload: {},
        description: "Triggers assembly for completed music video jobs. Runs every 2 minutes.",
      },
      ""
    ).catch((e) => {
      console.log(`[RegisterCron] assembly-worker-heartbeat not registered (endpoint may not exist): ${e.message}`);
      return null;
    });
    if (assemblyResult) {
      console.log(`[RegisterCron] ✅ assembly-worker-heartbeat registered: ${assemblyResult.taskUid}`);
    }
  }

  console.log("\n[RegisterCron] All crons registered. Scenes will dispatch within 2 minutes.");
}

main().catch((err) => {
  console.error("[RegisterCron] FAILED:", err);
  process.exit(1);
});
