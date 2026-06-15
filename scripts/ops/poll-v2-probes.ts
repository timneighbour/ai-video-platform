/**
 * Benchmark v2 Recovery — Probe Polling Script
 * Polls WaveSpeed InfiniteTalk for all 4 submitted probes
 * Run: npx tsx --tsconfig tsconfig.json poll-v2-probes.ts
 */

import { pollWaveSpeedInfiniteTalk } from "./server/ai-apis/wavespeed";
import { readFileSync } from "fs";

const TASK_IDS = JSON.parse(
  readFileSync("/home/ubuntu/zara-audit/v2-probes/probe-task-ids.json", "utf-8")
) as Array<{ id: string; taskId: string; lyric: string }>;

async function pollAll() {
  console.log(`=== Polling ${TASK_IDS.length} probes ===\n`);
  
  const results: Array<{ id: string; taskId: string; lyric: string; status: string; videoUrl?: string }> = [];
  
  for (const probe of TASK_IDS) {
    if (probe.taskId.startsWith("ERROR:")) {
      console.log(`${probe.id}: SKIPPED (submission failed)`);
      results.push({ ...probe, status: "submission_failed" });
      continue;
    }
    
    try {
      const result = await pollWaveSpeedInfiniteTalk(probe.taskId);
      const status = (result as any)?.status || (result as any)?.state || "unknown";
      const videoUrl = (result as any)?.output?.video_url || (result as any)?.video_url || (result as any)?.url || null;
      
      console.log(`${probe.id}:`);
      console.log(`  Task: ${probe.taskId}`);
      console.log(`  Status: ${status}`);
      if (videoUrl) {
        console.log(`  Video URL: ${videoUrl}`);
      }
      results.push({ ...probe, status, videoUrl: videoUrl || undefined });
    } catch (err: any) {
      console.log(`${probe.id}: POLL ERROR — ${err.message}`);
      results.push({ ...probe, status: `poll_error: ${err.message}` });
    }
    
    await new Promise(r => setTimeout(r, 500));
  }
  
  const completed = results.filter(r => r.videoUrl);
  const pending = results.filter(r => !r.videoUrl && !r.status.includes("failed") && !r.status.includes("error"));
  
  console.log(`\n=== Summary ===`);
  console.log(`Completed: ${completed.length}/${TASK_IDS.length}`);
  console.log(`Pending: ${pending.length}/${TASK_IDS.length}`);
  
  if (completed.length > 0) {
    console.log("\n=== Completed Video URLs ===");
    for (const r of completed) {
      console.log(`${r.id}: ${r.videoUrl}`);
    }
  }
  
  // Save results
  const { writeFileSync } = await import("fs");
  writeFileSync("/home/ubuntu/zara-audit/v2-probes/probe-results.json", JSON.stringify(results, null, 2));
  console.log("\nResults saved to /home/ubuntu/zara-audit/v2-probes/probe-results.json");
  
  process.exit(0);
}

pollAll().catch(e => { console.error(e); process.exit(1); });
