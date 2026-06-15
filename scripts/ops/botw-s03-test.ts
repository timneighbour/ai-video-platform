/**
 * S03 single-scene test using scene-aware reference (concert hall background baked in)
 * Uses the correct @fal-ai/client named import pattern from the project.
 */

import { fal } from "@fal-ai/client";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";

const FAL_KEY = process.env.FAL_AI_API_KEY;
if (!FAL_KEY) throw new Error("FAL_AI_API_KEY not set");

fal.config({ credentials: FAL_KEY });

const SCENE_REF_URL = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663500868908/NqOwHsgJdSNHaLnI.png";
const OUTPUT_DIR = "/home/ubuntu/zara-audit/botw-v3-regen-vocals";
const LOG_FILE = "/tmp/botw-s03-test.log";

function log(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + "\n");
}

async function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tryGet = (u: string) => {
      https.get(u, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          tryGet(response.headers.location!);
          return;
        }
        const file = fs.createWriteStream(dest);
        response.pipe(file);
        file.on("finish", () => { file.close(); resolve(); });
        file.on("error", reject);
      }).on("error", reject);
    };
    tryGet(url);
  });
}

async function main() {
  fs.writeFileSync(LOG_FILE, "");
  log("=== S03 Scene-Aware Reference Test ===");
  log(`Reference: ${SCENE_REF_URL}`);

  const prompt = `A woman with long straight jet-black hair and black leather jacket is singing passionately in a grand baroque concert hall. She faces the camera directly, head-and-shoulders framing, face fills most of the frame. Warm amber gold lighting. Orchestra visible and blurred behind her. Shallow depth of field. Dynamic subtle camera movement, slight push-in. Cinematic music video quality. No grey background. Concert hall atmosphere throughout entire clip.`;

  log("Submitting S03 to FAL AI Seedance 1.5 Pro image-to-video...");

  try {
    const result = await fal.subscribe("bytedance/seedance-2.0/image-to-video", {
      input: {
        prompt,
        image_url: SCENE_REF_URL,
        duration: 5,
        aspect_ratio: "16:9",
      },
      logs: false,
      onQueueUpdate: (update: any) => {
        log(`Status: ${update.status}`);
      },
    }) as any;

    const videoUrl = result?.data?.video?.url || result?.video?.url;
    if (!videoUrl) {
      log(`ERROR: No video URL in result: ${JSON.stringify(result).slice(0, 300)}`);
      process.exit(1);
    }

    log(`S03 complete. URL: ${videoUrl}`);

    const outputPath = path.join(OUTPUT_DIR, "s03-scene-aware.mp4");
    log(`Downloading to ${outputPath}...`);
    await downloadFile(videoUrl, outputPath);

    const stats = fs.statSync(outputPath);
    log(`S03 downloaded: ${(stats.size / 1024 / 1024).toFixed(1)}MB`);
    log("=== S03 Test Complete ===");
  } catch (err: any) {
    log(`ERROR: ${err.message || JSON.stringify(err)}`);
    process.exit(1);
  }
}

main();
