/**
 * Test LatentSync via fal.ai on the same canonical source clip
 * LatentSync is reported to have much better phoneme-level accuracy for singing
 */
import { fal } from "@fal-ai/client";
import * as fs from "fs";
import { storagePut } from "./storage";

const WORK = "/tmp/latentsync-test";
fs.mkdirSync(WORK, { recursive: true });

const log = (msg: string) => console.log(`[${new Date().toISOString()}] ${msg}`);

// Same source clip and audio as the A/B test
const SOURCE_VIDEO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-scenes/630001-1779172682604.mp4";
const FULL_MIX_SEG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-ab-test/A-FULLMIX-audio-1779298674606.mp3";
const VOX_SEG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-ab-test/B-VOCALS-audio-1779298769170.mp3";

async function testLatentSync(label: string, audioUrl: string): Promise<string> {
  log(`--- LatentSync TEST: ${label} ---`);
  log(`Video: ${SOURCE_VIDEO}`);
  log(`Audio: ${audioUrl}`);

  const apiKey = process.env.FAL_AI_API_KEY;
  if (!apiKey) throw new Error("FAL_AI_API_KEY not set");
  fal.config({ credentials: apiKey });

  // Try LatentSync model
  const result = await fal.subscribe("fal-ai/latentsync", {
    input: {
      video_url: SOURCE_VIDEO,
      audio_url: audioUrl,
    },
    logs: true,
    onQueueUpdate: (update) => {
      if (update.status === "IN_PROGRESS") {
        log(`  LatentSync ${label}: processing...`);
      }
    },
  }) as any;

  log(`LatentSync result: ${JSON.stringify(result.data || result).substring(0, 500)}`);

  const videoUrl = result.data?.video?.url || result.video?.url || result.data?.output?.url;
  if (!videoUrl) {
    log(`ERROR: No video URL in result. Full result: ${JSON.stringify(result)}`);
    throw new Error("No video URL returned");
  }

  log(`Output URL: ${videoUrl}`);

  // Download and upload to S3
  const resp = await fetch(videoUrl);
  const buf = Buffer.from(await resp.arrayBuffer());
  const { url: s3Url } = await storagePut(
    `music-video-ab-test/latentsync-${label}-${Date.now()}.mp4`,
    buf,
    "video/mp4"
  );
  log(`✅ LatentSync ${label}: ${s3Url}`);
  return s3Url;
}

async function main() {
  log("=== LATENTSYNC LIP SYNC TEST ===");
  log("Same source clip as A/B test. Testing with both audio conditions.");

  try {
    const resultA = await testLatentSync("FULLMIX", FULL_MIX_SEG);
    log(`\nResult (Full Mix): ${resultA}`);
  } catch (e: any) {
    log(`Full mix test failed: ${e.message}`);
  }

  try {
    const resultB = await testLatentSync("VOCALS", VOX_SEG);
    log(`\nResult (Vocals): ${resultB}`);
  } catch (e: any) {
    log(`Vocals test failed: ${e.message}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
