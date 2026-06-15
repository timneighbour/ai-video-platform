/**
 * BOTW V3 — Vocal Scene Regeneration via FAL AI Seedance 1.5 Pro
 * Uses the Zara Performance Reference (head-and-shoulders, face ~45% of frame)
 * Model: bytedance/seedance/v1.5/pro/image-to-video
 */

import { fal } from "@fal-ai/client";
import * as fs from "fs";
import * as path from "path";
import axios from "axios";

// Load env
import * as dotenv from "dotenv";
dotenv.config({ path: "/home/ubuntu/ai-video-platform/.env" });

const FAL_AI_API_KEY = process.env.FAL_AI_API_KEY!;
const OUTPUT_DIR = "/home/ubuntu/zara-audit/botw-v3-regen-vocals";
const LOG_FILE = "/tmp/botw-v3-regen-fal.log";

// Performance reference — head-and-shoulders crop, face ~45% of frame
const PERFORMANCE_REF_URL = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663500868908/mOaHHALJUZLMjOaW.jpg";

const MODEL_ID = "bytedance/seedance-2.0/image-to-video";

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function log(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + "\n");
}

// Configure FAL AI
fal.config({ credentials: FAL_AI_API_KEY });

interface SceneSpec {
  id: string;
  label: string;
  prompt: string;
}

const VOCAL_SCENES: SceneSpec[] = [
  {
    id: "s03",
    label: "S03 — Front-facing emotional introduction",
    prompt: `Close-up performance shot of a woman with long straight black hair, black leather corset and jacket, singing with emotional intensity. Head and shoulders framing, face clearly visible and large in frame. Front-facing toward camera, slight chin lift, warm amber light from above. Grand baroque concert hall background with arched windows and warm golden light rays. Shallow depth of field, orchestra softly blurred in background. Subtle head movement, lips parted in song. Premium cinematic music video. Air Studios atmosphere. Camera: slow gentle push-in toward face. Emotional, intimate, front-facing performance.`,
  },
  {
    id: "s05",
    label: "S05 — 3/4 profile pre-chorus",
    prompt: `Medium close-up of a woman with long straight black hair, black leather corset and jacket, singing in 3/4 profile. Head and shoulders framing, face large in frame. 3/4 turn facing slightly left of camera, chin slightly raised, eyes forward with intensity. Warm amber Air Studios baroque concert hall background, arched windows glowing. Orchestra softly visible in background, shallow depth of field. Lips moving in song, emotional expression of build. Premium cinematic music video quality. Camera: gentle arc movement around her face. Pre-chorus emotional build.`,
  },
  {
    id: "s07",
    label: "S07 — Side-tracking hero shot chorus",
    prompt: `Dynamic medium close-up of a woman with long straight black hair, black leather corset and jacket, singing with power. Head and shoulders framing, face prominent in frame. Near-side angle, head turning slightly toward camera as she sings. Warm amber baroque concert hall, ornate gold balcony columns visible behind. Camera tracking alongside her, slight motion blur on background. Powerful open-mouth singing expression, hair moving with motion. Premium cinematic music video. Chorus energy. Camera: lateral tracking shot, dynamic movement.`,
  },
  {
    id: "s09",
    label: "S09 — Elevated emotional performance bridge",
    prompt: `Slightly elevated medium close-up of a woman with long straight black hair, black leather corset and jacket, singing with deep emotional vulnerability. Head and shoulders framing, face large in frame. Camera angle slightly above eye level looking down at her face. Full orchestra visible on both sides behind her in warm amber baroque concert hall. Arched windows with golden light rays. Shallow depth of field. Eyes slightly upward, mouth open in song, emotional expression. Premium cinematic music video. Bridge emotional peak. Camera: slow tilt down toward face from elevated position.`,
  },
  {
    id: "s11",
    label: "S11 — Intimate emotional close-up final vocal",
    prompt: `Intimate close-up of a woman with long straight black hair, black leather corset and jacket, singing the final emotional lyric. Tight head and shoulders framing, face filling most of frame. 3/4 profile with slight turn toward camera. Warm amber Air Studios baroque concert hall, full orchestra softly visible behind. Very shallow depth of field, background beautifully blurred. Subtle facial movement, eyes glistening, lips forming lyric. Most intimate emotional moment of the video. Camera: very slow gentle push-in, almost imperceptible. Final vocal, intimate emotional close-up.`,
  },
];

async function submitScene(scene: SceneSpec): Promise<string> {
  log(`[SUBMIT] ${scene.label}`);
  const { request_id } = await fal.queue.submit(MODEL_ID, {
    input: {
      prompt: scene.prompt,
      image_url: PERFORMANCE_REF_URL,
      duration: 5,
      aspect_ratio: "16:9",
    },
  });
  log(`  [JOB] ${scene.id} — request_id: ${request_id}`);
  return request_id;
}

async function pollScene(requestId: string, sceneId: string): Promise<string> {
  const maxAttempts = 80;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 15000));
    const status = await fal.queue.status(MODEL_ID, { requestId, logs: false });
    log(`  [POLL] ${sceneId} status=${status.status} (attempt ${i + 1})`);

    if (status.status === "COMPLETED") {
      const result = await fal.queue.result(MODEL_ID, { requestId });
      const data = result.data as { video: { url: string } };
      return data.video.url;
    }
    if (status.status === "FAILED" || (status.status as string) === "ERROR") {
      throw new Error(`FAL job ${requestId} for ${sceneId} failed`);
    }
  }
  throw new Error(`Timeout for ${sceneId} request_id=${requestId}`);
}

async function downloadVideo(url: string, outputPath: string): Promise<void> {
  const response = await axios.get(url, { responseType: "arraybuffer", timeout: 120000 });
  fs.writeFileSync(outputPath, Buffer.from(response.data));
}

async function main() {
  log("=== BOTW V3 Vocal Scene Regeneration via FAL AI Seedance 1.5 Pro ===");
  log(`Performance Reference: ${PERFORMANCE_REF_URL}`);
  log(`Model: ${MODEL_ID}`);
  log(`Output: ${OUTPUT_DIR}`);
  log("");

  const requestIds: Record<string, string> = {};

  // Submit all 5 scenes
  log("--- Submitting all 5 vocal scenes ---");
  for (const scene of VOCAL_SCENES) {
    try {
      const requestId = await submitScene(scene);
      requestIds[scene.id] = requestId;
    } catch (err: any) {
      log(`  [ERROR] ${scene.id} submission failed: ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  fs.writeFileSync(
    path.join(OUTPUT_DIR, "fal-request-ids.json"),
    JSON.stringify(requestIds, null, 2)
  );
  log(`\nRequest IDs saved: ${JSON.stringify(requestIds)}`);

  // Poll and download each scene
  log("\n--- Polling for completion ---");
  for (const scene of VOCAL_SCENES) {
    const requestId = requestIds[scene.id];
    if (!requestId) {
      log(`[SKIP] ${scene.id} — no request ID`);
      continue;
    }

    log(`[WAIT] ${scene.label} (request_id: ${requestId})`);
    try {
      const videoUrl = await pollScene(requestId, scene.id);
      log(`[COMPLETED] ${scene.id} — videoUrl: ${videoUrl}`);

      const outputPath = path.join(OUTPUT_DIR, `${scene.id}-regen.mp4`);
      await downloadVideo(videoUrl, outputPath);
      const stats = fs.statSync(outputPath);
      log(`[SAVED] ${scene.id} → ${(stats.size / 1024 / 1024).toFixed(1)}MB at ${outputPath}`);
    } catch (err: any) {
      log(`[ERROR] ${scene.id}: ${err.message}`);
    }
  }

  log("\n=== All vocal scene regeneration jobs complete ===");
  const files = fs.readdirSync(OUTPUT_DIR).filter((f) => f.endsWith(".mp4"));
  log(`MP4 files in output: ${files.join(", ")}`);
}

main().catch((err) => {
  log(`[FATAL] ${err.message}`);
  process.exit(1);
});
