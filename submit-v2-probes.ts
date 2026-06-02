/**
 * Benchmark v2 Recovery — Performance Scene Probe Submission
 * 
 * Submits all 4 performance scenes to WaveSpeed InfiniteTalk using:
 * - Locked Zara character portrait (zara-portrait-b-v2.jpg)
 * - Correct audio clips for each scene's time window
 * - No microphone in prompts
 * - Venue-locked baroque hall background prompts
 * 
 * Run: npx tsx --tsconfig tsconfig.json submit-v2-probes.ts
 */

import { submitWaveSpeedInfiniteTalk } from "./server/ai-apis/wavespeed";

const ZARA_PORTRAIT_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/characters/zara-portrait-b-v2.jpg";

// Audio clips uploaded to CDN (from full track, CloudFront-served)
const AUDIO_CLIPS = {
  scene2: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663500868908/bUOkaqeQabWgXKkw.mp3",  // 12–18s
  scene6: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663500868908/NUihaHMFKGBgwsHW.mp3",  // 36–42s
  scene8: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663500868908/wNYzmlNJNtDdoXKJ.mp3",  // 48–54s
  scene10: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663500868908/GerRsmrIEyPCJWuk.mp3", // 60–66s
};

// V2 Performance Scene Prompts
// Rules applied:
// 1. NO microphone, NO pop filter, NO microphone stand
// 2. Venue-locked: baroque hall with three arched windows, god-rays, warm amber
// 3. Zara facing camera, emotional singing expression
// 4. Full 16:9, no letterbox bars
const PROBES = [
  {
    id: "probe-s03-scene2",
    sceneIndex: 2,
    startTime: 12,
    lyric: "The walls are leaning in tonight",
    audio: AUDIO_CLIPS.scene2,
    prompt: "Zara, a woman in her late 20s with long straight jet-black centre-parted hair, pale fair skin, smoky dark eye makeup, wearing a black leather corset and black leather jacket. Medium close-up, facing camera directly, singing with emotional intensity. NO microphone, NO pop filter, NO microphone stand. Background: grand baroque concert hall with three tall arched windows, warm amber god-rays streaming through, atmospheric floor haze, polished wooden floor, curved balcony sections. Warm amber spotlight on face. Full 16:9 frame, no letterbox bars.",
    duration: 6,
    resolution: "720p" as const,
  },
  {
    id: "probe-s07-scene6",
    sceneIndex: 6,
    startTime: 36,
    lyric: "Beauty of the wreckage (chorus)",
    audio: AUDIO_CLIPS.scene6,
    prompt: "Zara, a woman in her late 20s with long straight jet-black centre-parted hair, pale fair skin, smoky dark eye makeup, wearing a black leather corset and black leather jacket. Medium close-up, facing camera with slight 3/4 angle, singing with raw emotional power, eyes open and intense. NO microphone, NO pop filter, NO microphone stand. Background: grand baroque concert hall with three tall arched windows, warm amber god-rays streaming through, atmospheric floor haze, polished wooden floor. Warm amber spotlight on face. Full 16:9 frame, no letterbox bars.",
    duration: 6,
    resolution: "720p" as const,
  },
  {
    id: "probe-s09-scene8",
    sceneIndex: 8,
    startTime: 48,
    lyric: "And I (brief)",
    audio: AUDIO_CLIPS.scene8,
    prompt: "Zara, a woman in her late 20s with long straight jet-black centre-parted hair, pale fair skin, smoky dark eye makeup, wearing a black leather corset and black leather jacket. Extreme close-up on face, singing, eyes slightly closed with emotion. NO microphone, NO pop filter, NO microphone stand. Background: grand baroque concert hall with three tall arched windows, warm amber god-rays, atmospheric haze. Warm amber spotlight. Full 16:9 frame, no letterbox bars.",
    duration: 6,
    resolution: "720p" as const,
  },
  {
    id: "probe-s12-scene10",
    sceneIndex: 10,
    startTime: 60,
    lyric: "Behind the lies (climactic held note)",
    audio: AUDIO_CLIPS.scene10,
    prompt: "Zara, a woman in her late 20s with long straight jet-black centre-parted hair NO FRINGE NO BANGS, pale fair skin, smoky dark eye makeup, wearing a black leather corset and black leather jacket. Extreme close-up on face, singing a sustained held note with mouth wide open, eyes closed, deeply emotional. NO microphone, NO pop filter, NO microphone stand. Background: grand baroque concert hall with three tall arched windows, warm amber god-rays, atmospheric haze. Warm amber spotlight. Full 16:9 frame, no letterbox bars.",
    duration: 6,
    resolution: "720p" as const,
  },
];

async function main() {
  console.log("=== Benchmark v2 Probe Submission ===");
  console.log(`Submitting ${PROBES.length} performance scene probes to WaveSpeed InfiniteTalk\n`);
  
  const results: Array<{ id: string; taskId: string; lyric: string }> = [];
  
  for (const probe of PROBES) {
    console.log(`Submitting: ${probe.id} (Scene ${probe.sceneIndex}, t=${probe.startTime}s)`);
    console.log(`  Lyric: "${probe.lyric}"`);
    try {
      const taskId = await submitWaveSpeedInfiniteTalk({
        image: ZARA_PORTRAIT_URL,
        audio: probe.audio,
        prompt: probe.prompt,
        duration: probe.duration,
        resolution: probe.resolution,
      });
      console.log(`  ✓ Task ID: ${taskId}`);
      results.push({ id: probe.id, taskId, lyric: probe.lyric });
    } catch (err: any) {
      console.error(`  ✗ FAILED: ${err.message}`);
      results.push({ id: probe.id, taskId: `ERROR: ${err.message}`, lyric: probe.lyric });
    }
    // Small delay between submissions
    await new Promise(r => setTimeout(r, 1000));
  }
  
  console.log("\n=== Submission Results ===");
  for (const r of results) {
    console.log(`${r.id}: ${r.taskId}`);
  }
  
  // Save task IDs for polling
  const fs = await import("fs");
  fs.writeFileSync("/home/ubuntu/zara-audit/v2-probes/probe-task-ids.json", JSON.stringify(results, null, 2));
  console.log("\nTask IDs saved to /home/ubuntu/zara-audit/v2-probes/probe-task-ids.json");
  
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
