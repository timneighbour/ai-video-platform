/**
 * Benchmark v2 Recovery — Baroque Hall Background Generation
 * 
 * Generates locked baroque hall background videos for all 4 performance scenes.
 * These will be composited with the InfiniteTalk Zara outputs.
 * 
 * Venue lock: Three arched windows, warm amber god-rays, atmospheric haze, polished floor.
 * No microphones, no pop filters, no wrong venues.
 * 
 * Run: npx tsx --tsconfig tsconfig.json generate-v2-backgrounds.ts
 */

import { submitFalSeedanceVideo, pollFalSeedanceVideo } from "./server/ai-apis/fal-seedance";

// Locked baroque hall base prompt
const VENUE_BASE = "Grand baroque concert hall interior, three tall arched windows at rear with warm amber golden god-rays streaming through, polished wooden floor reflecting golden light, atmospheric floor haze, curved baroque balcony sections on left and right, deep shadow ceiling, warm amber and gold colour palette, cinematic 16:9 widescreen, no letterbox bars, no microphone, no pop filter, no microphone stand";

const BACKGROUNDS = [
  {
    id: "bg-s03",
    sceneIndex: 2,
    startTime: 12,
    prompt: `${VENUE_BASE}. Empty stage centre, warm amber spotlight pool on polished floor. Slow dolly forward camera movement. Cinematic depth of field. No people on stage.`,
    duration: 6,
  },
  {
    id: "bg-s07",
    sceneIndex: 6,
    startTime: 36,
    prompt: `${VENUE_BASE}. Orchestra musicians visible in soft bokeh background, strings section. Warm amber spotlight pool at stage centre. Slow pan camera movement. Cinematic depth of field.`,
    duration: 6,
  },
  {
    id: "bg-s09",
    sceneIndex: 8,
    startTime: 48,
    prompt: `${VENUE_BASE}. Close view of stage, warm amber spotlight pool. Subtle atmospheric haze at floor level. Very slow camera drift. Cinematic depth of field. No people.`,
    duration: 6,
  },
  {
    id: "bg-s12",
    sceneIndex: 10,
    startTime: 60,
    prompt: `${VENUE_BASE}. Wide stage view, god-rays intensified, atmospheric haze thick at floor level. Slow zoom in camera movement. Cinematic depth of field. No people on stage.`,
    duration: 6,
  },
];

async function main() {
  console.log("=== Baroque Hall Background Generation ===");
  console.log(`Submitting ${BACKGROUNDS.length} background videos to Fal Seedance\n`);
  
  const results: Array<{ id: string; requestId: string }> = [];
  
  for (const bg of BACKGROUNDS) {
    console.log(`Submitting: ${bg.id} (Scene ${bg.sceneIndex}, t=${bg.startTime}s)`);
    try {
      const requestId = await submitFalSeedanceVideo({
        prompt: bg.prompt,
        duration: "6",
        resolution: "720p",
        aspect_ratio: "16:9",
        generate_audio: false,
      });
      console.log(`  ✓ Request ID: ${requestId}`);
      results.push({ id: bg.id, requestId });
    } catch (err: any) {
      console.error(`  ✗ FAILED: ${err.message}`);
      results.push({ id: bg.id, requestId: `ERROR: ${err.message}` });
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  
  console.log("\n=== Submission Results ===");
  for (const r of results) {
    console.log(`${r.id}: ${r.requestId}`);
  }
  
  const { writeFileSync } = await import("fs");
  writeFileSync("/home/ubuntu/zara-audit/v2-probes/bg-task-ids.json", JSON.stringify(results, null, 2));
  console.log("\nTask IDs saved to /home/ubuntu/zara-audit/v2-probes/bg-task-ids.json");
  
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
