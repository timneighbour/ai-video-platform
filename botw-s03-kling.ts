/**
 * S03 single-scene test using Kling AI v3 with scene-aware reference image.
 * Uses image_reference (Subject Binding) to lock Zara's identity.
 * The reference image already has the concert hall background baked in.
 */

import axios from "axios";
import jwt from "jsonwebtoken";
import * as fs from "fs";
import * as https from "https";
import * as http from "http";

const ACCESS_KEY = process.env.KLING_AI_ACCESS_KEY!;
const SECRET_KEY = process.env.KLING_AI_SECRET_KEY!;
if (!ACCESS_KEY || !SECRET_KEY) throw new Error("KLING_AI_ACCESS_KEY or KLING_AI_SECRET_KEY not set");

const KLING_API_BASE = "https://api.klingai.com";
const SCENE_REF_URL = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663500868908/NqOwHsgJdSNHaLnI.png";
const OUTPUT_PATH = "/home/ubuntu/zara-audit/botw-v3-regen-vocals/s03-kling.mp4";
const LOG_FILE = "/tmp/botw-s03-kling.log";

function log(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + "\n");
}

function getAuthHeader(): string {
  const now = Math.floor(Date.now() / 1000);
  const token = jwt.sign(
    { iss: ACCESS_KEY, exp: now + 1800, nbf: now - 5 },
    SECRET_KEY,
    { algorithm: "HS256", header: { alg: "HS256", typ: "JWT" } }
  );
  return `Bearer ${token}`;
}

async function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tryGet = (u: string) => {
      const lib = u.startsWith("https") ? https : http;
      lib.get(u, (response) => {
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

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  fs.writeFileSync(LOG_FILE, "");
  log("=== S03 Kling AI v3 Test — Scene-Aware Reference ===");
  log(`Reference URL: ${SCENE_REF_URL}`);

  const prompt = `A woman with long straight jet-black hair and black leather jacket is singing passionately in a grand baroque concert hall. She faces the camera directly, head-and-shoulders framing, face fills most of the frame. Warm amber gold lighting. Full symphony orchestra visible and softly blurred behind her. Shallow depth of field. Subtle camera push-in. Cinematic music video quality. Premium performance shot.`;

  // Submit the task
  log("Submitting to Kling AI v3 text-to-video with image_reference...");
  const response = await axios.post(
    `${KLING_API_BASE}/v1/videos/text2video`,
    {
      model_name: "kling-v3",
      prompt,
      negative_prompt: "grey background, studio backdrop, full body shot, wide shot, microphone, static pose",
      duration: "5",
      mode: "std",
      sound: "off",
      aspect_ratio: "16:9",
      image_reference: [
        {
          url: SCENE_REF_URL,
          subject_token_type: "human",
        }
      ],
    },
    {
      headers: {
        Authorization: getAuthHeader(),
        "Content-Type": "application/json",
      },
      timeout: 30000,
    }
  );

  if (response.data.code !== 0 || !response.data.data?.task_id) {
    log(`ERROR submitting: ${JSON.stringify(response.data)}`);
    process.exit(1);
  }

  const taskId = response.data.data.task_id;
  log(`Task submitted. task_id=${taskId}`);

  // Poll for completion
  let attempts = 0;
  const maxAttempts = 60; // 10 minutes max
  while (attempts < maxAttempts) {
    await sleep(10000); // poll every 10s
    attempts++;

    const statusResp = await axios.get(
      `${KLING_API_BASE}/v1/videos/text2video/${taskId}`,
      {
        headers: { Authorization: getAuthHeader() },
        timeout: 15000,
      }
    );

    const status = statusResp.data.data?.task_status;
    log(`Poll ${attempts}: status=${status}`);

    if (status === "succeed") {
      const videos = statusResp.data.data?.task_result?.videos;
      if (!videos || videos.length === 0) {
        log("ERROR: No videos in result");
        process.exit(1);
      }
      const videoUrl = videos[0].url;
      log(`SUCCESS! Video URL: ${videoUrl}`);
      log(`Downloading to ${OUTPUT_PATH}...`);
      await downloadFile(videoUrl, OUTPUT_PATH);
      const stats = fs.statSync(OUTPUT_PATH);
      log(`Downloaded: ${(stats.size / 1024 / 1024).toFixed(1)}MB`);
      log("=== S03 Kling Test Complete ===");
      return;
    }

    if (status === "failed") {
      log(`ERROR: Task failed. ${JSON.stringify(statusResp.data)}`);
      process.exit(1);
    }
  }

  log("ERROR: Timeout after 10 minutes");
  process.exit(1);
}

main().catch(err => {
  log(`FATAL: ${err.message}`);
  process.exit(1);
});
