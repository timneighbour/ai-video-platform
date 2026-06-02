/**
 * Benchmark v2 Recovery — Background Video Polling
 * Run: npx tsx --tsconfig tsconfig.json poll-v2-backgrounds.ts
 */

import { pollFalSeedanceVideo } from "./server/ai-apis/fal-seedance";
import { readFileSync, writeFileSync } from "fs";

const TASK_IDS = JSON.parse(
  readFileSync("/home/ubuntu/zara-audit/v2-probes/bg-task-ids.json", "utf-8")
) as Array<{ id: string; requestId: string }>;

async function pollAll() {
  console.log(`=== Polling ${TASK_IDS.length} background videos ===\n`);
  
  const results: Array<{ id: string; requestId: string; status: string; videoUrl?: string }> = [];
  
  for (const task of TASK_IDS) {
    if (task.requestId.startsWith("ERROR:")) {
      console.log(`${task.id}: SKIPPED (submission failed)`);
      results.push({ ...task, status: "submission_failed" });
      continue;
    }
    
    try {
      const result = await pollFalSeedanceVideo(task.requestId);
      if (result) {
        console.log(`${task.id}: COMPLETED — ${result.videoUrl}`);
        results.push({ ...task, status: "completed", videoUrl: result.videoUrl });
      } else {
        console.log(`${task.id}: PENDING`);
        results.push({ ...task, status: "pending" });
      }
    } catch (err: any) {
      console.log(`${task.id}: ERROR — ${err.message}`);
      results.push({ ...task, status: `error: ${err.message}` });
    }
    
    await new Promise(r => setTimeout(r, 500));
  }
  
  const completed = results.filter(r => r.videoUrl);
  console.log(`\n=== Summary: ${completed.length}/${TASK_IDS.length} completed ===`);
  
  if (completed.length > 0) {
    console.log("\nCompleted URLs:");
    for (const r of completed) {
      console.log(`  ${r.id}: ${r.videoUrl}`);
    }
  }
  
  writeFileSync("/home/ubuntu/zara-audit/v2-probes/bg-results.json", JSON.stringify(results, null, 2));
  console.log("\nResults saved to /home/ubuntu/zara-audit/v2-probes/bg-results.json");
  
  process.exit(0);
}

pollAll().catch(e => { console.error(e); process.exit(1); });
