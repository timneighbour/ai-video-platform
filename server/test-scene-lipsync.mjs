/**
 * test-scene-lipsync.mjs
 * Tests the full per-scene lip sync pipeline:
 * 1. extractSceneAudioClip — cuts isolated vocals to scene window
 * 2. submitSyncLabsLipSync — submits to SyncLabs sync-3
 * 3. pollSyncLabsLipSync — polls until done
 *
 * Run: npx tsx server/test-scene-lipsync.mjs
 */
import "dotenv/config";
import { extractSceneAudioClip } from "./audio-clip-extractor.ts";
import { submitSyncLabsLipSync, pollSyncLabsLipSync } from "./ai-apis/synclabs-lipsync.ts";

const ISOLATED_VOCALS_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-audio/660001-vocals-demucs-1779230276688.mp3";

// Scene 1 (sceneIndex=1, sceneId=660002): startTime=6000ms → 6s, duration=6s
// This is the probe scene that already has a WaveSpeed clip
const SCENE_VIDEO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-scenes/660002-synclabs-1779234792927.mp4";
const START_SECONDS = 6;   // 6000ms / 1000
const DURATION_SECONDS = 6;
const SCENE_ID = 660002;

async function main() {
  console.log("=== Per-Scene Lip Sync Pipeline Test ===\n");

  // Step 1: Extract isolated vocal segment
  console.log(`Step 1: Extracting isolated vocals (${START_SECONDS}s → ${START_SECONDS + DURATION_SECONDS}s)...`);
  let sceneAudioUrl;
  try {
    sceneAudioUrl = await extractSceneAudioClip(
      ISOLATED_VOCALS_URL,
      START_SECONDS,
      DURATION_SECONDS,
      SCENE_ID
    );
    console.log(`✅ Audio extracted: ${sceneAudioUrl}\n`);
  } catch (err) {
    console.error(`❌ Audio extraction FAILED: ${err.message}`);
    process.exit(1);
  }

  // Step 2: Submit to SyncLabs
  console.log(`Step 2: Submitting to SyncLabs sync-3...`);
  console.log(`  videoUrl: ${SCENE_VIDEO_URL.slice(0, 80)}...`);
  console.log(`  audioUrl: ${sceneAudioUrl.slice(0, 80)}...`);
  let syncJobId;
  try {
    syncJobId = await submitSyncLabsLipSync({
      videoUrl: SCENE_VIDEO_URL,
      audioUrl: sceneAudioUrl,
      syncMode: "cut_off",
      outputFileName: `test-scene-${SCENE_ID}-${Date.now()}`,
      temperature: 1.0,
      occlusionDetection: true,
    });
    console.log(`✅ SyncLabs job submitted: ${syncJobId}\n`);
  } catch (err) {
    console.error(`❌ SyncLabs submission FAILED: ${err.message}`);
    process.exit(1);
  }

  // Step 3: Poll for completion (max 10 minutes)
  console.log(`Step 3: Polling SyncLabs job ${syncJobId}...`);
  try {
    const outputUrl = await pollSyncLabsLipSync(syncJobId, 10 * 60 * 1000);
    console.log(`\n✅ SyncLabs COMPLETE!`);
    console.log(`Output URL: ${outputUrl}`);
  } catch (err) {
    console.error(`❌ SyncLabs polling FAILED: ${err.message}`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
