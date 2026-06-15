/**
 * BOTW V3 — Vocal Scene Regeneration
 * Uses the Zara Performance Reference (head-and-shoulders crop, face ~45% of frame)
 * to regenerate all 5 vocal scenes for optimal SyncLabs lip-sync quality.
 *
 * Scenes:
 * S03 — Front-facing emotional introduction
 * S05 — 3/4 profile
 * S07 — Side-tracking hero shot
 * S09 — Elevated emotional performance shot
 * S11 — Intimate emotional close-up before final resolution
 */

import axios from "axios";
import * as fs from "fs";
import * as path from "path";

// Load env
import * as dotenv from "dotenv";
dotenv.config({ path: "/home/ubuntu/ai-video-platform/.env" });

const SEEDANCE_API_BASE = "https://ark.cn-beijing.volces.com/api/v3";
const SEEDANCE_API_KEY = process.env.SEEDANCE_API_KEY!;
const OUTPUT_DIR = "/home/ubuntu/zara-audit/botw-v3-regen-vocals";
const LOG_FILE = "/tmp/botw-v3-regen-vocals.log";

// Performance reference — head-and-shoulders crop, face ~45% of frame
const PERFORMANCE_REF_URL = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663500868908/mOaHHALJUZLMjOaW.jpg";

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function log(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + "\n");
}

interface SceneSpec {
  id: string;
  label: string;
  prompt: string;
  duration: number;
}

// Scene specifications — using performance reference for all vocal scenes
// Key: prompts must emphasise close-up/medium framing to prevent wide-shot generation
const VOCAL_SCENES: SceneSpec[] = [
  {
    id: "s03",
    label: "S03 — Front-facing emotional introduction",
    duration: 5,
    prompt: `Close-up medium shot of a woman with long straight black hair, black leather corset and jacket, singing with emotional intensity. 
    Head and shoulders framing, face clearly visible and occupying at least 40% of frame. 
    Front-facing toward camera, slight chin lift, warm amber light from above. 
    Grand baroque concert hall background with arched windows and warm golden light rays visible behind her. 
    Shallow depth of field, orchestra softly blurred in background. 
    Subtle head movement, natural breathing, lips parted in song. 
    Premium cinematic music video. Air Studios atmosphere. 
    Do NOT show full body. Do NOT zoom out. Keep face large in frame. 
    Camera: slow gentle push-in toward face. 
    BPM: 72. Emotional, intimate, front-facing performance.`,
  },
  {
    id: "s05",
    label: "S05 — 3/4 profile pre-chorus",
    duration: 5,
    prompt: `Medium close-up of a woman with long straight black hair, black leather corset and jacket, singing in 3/4 profile. 
    Head and shoulders framing, face occupying at least 40% of frame. 
    3/4 turn — facing slightly left of camera, chin slightly raised, eyes forward with intensity. 
    Warm amber Air Studios baroque concert hall background, arched windows glowing behind her. 
    Orchestra softly visible in background, shallow depth of field. 
    Lips moving in song, subtle facial expression of emotional build. 
    Premium cinematic music video quality. 
    Do NOT show full body. Do NOT zoom out. Keep face prominent in frame. 
    Camera: gentle arc movement around her face. 
    BPM: 72. Pre-chorus emotional build, 3/4 profile.`,
  },
  {
    id: "s07",
    label: "S07 — Side-tracking hero shot chorus",
    duration: 5,
    prompt: `Dynamic medium close-up of a woman with long straight black hair, black leather corset and jacket, singing with power and intensity. 
    Head and shoulders framing, face occupying at least 35% of frame. 
    Side profile or near-side angle, head turning slightly toward camera as she sings. 
    Warm amber baroque concert hall, ornate gold balcony columns visible behind her. 
    Motion — camera tracking alongside her as she moves, slight motion blur on background. 
    Powerful open-mouth singing expression, hair moving with motion. 
    Premium cinematic music video. Chorus energy. 
    Do NOT show full body. Keep face large in frame throughout. 
    Camera: lateral tracking shot, dynamic movement. 
    BPM: 72. Chorus hero performance, side-tracking.`,
  },
  {
    id: "s09",
    label: "S09 — Elevated emotional performance bridge",
    duration: 5,
    prompt: `Slightly elevated medium close-up of a woman with long straight black hair, black leather corset and jacket, singing with deep emotional vulnerability. 
    Head and shoulders framing, face occupying at least 40% of frame. 
    Camera angle slightly above eye level looking down at her face, creating an intimate elevated perspective. 
    Full orchestra visible on both sides behind her in warm amber baroque concert hall. 
    Arched windows with golden light rays. Shallow depth of field. 
    Eyes slightly upward, mouth open in song, emotional expression. 
    Premium cinematic music video. Bridge emotional peak. 
    Do NOT show full body. Keep face prominent. 
    Camera: slow tilt down toward face from slightly elevated position. 
    BPM: 72. Bridge emotional performance, elevated angle.`,
  },
  {
    id: "s11",
    label: "S11 — Intimate emotional close-up final vocal",
    duration: 5,
    prompt: `Intimate close-up of a woman with long straight black hair, black leather corset and jacket, singing the final emotional lyric. 
    Tight head and shoulders framing, face occupying 50-60% of frame. 
    3/4 profile with slight turn toward camera during lyric delivery. 
    Warm amber Air Studios baroque concert hall, full orchestra softly visible behind her. 
    Very shallow depth of field — background beautifully blurred. 
    Subtle facial movement, eyes glistening, lips forming final lyric. 
    This is the most intimate emotional moment of the video. 
    Do NOT show full body. This must be a close-up. Face must be large. 
    Camera: very slow gentle push-in, almost imperceptible. 
    BPM: 72. Final vocal, intimate emotional close-up.`,
  },
];

async function createSeedanceTask(scene: SceneSpec): Promise<string> {
  const requestBody = {
    model: "doubao-seedance-2-0-260128",
    content: [
      { type: "text", text: scene.prompt },
      { type: "image_url", image_url: { url: PERFORMANCE_REF_URL, role: "reference_image" } },
    ],
    generate_audio: false,
  };

  const response = await axios.post(
    `${SEEDANCE_API_BASE}/contents/generations/tasks`,
    requestBody,
    {
      headers: {
        Authorization: `Bearer ${SEEDANCE_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 60000,
    }
  );

  if (!response.data.id) {
    throw new Error(`No task ID returned for ${scene.id}: ${JSON.stringify(response.data)}`);
  }
  return response.data.id;
}

async function pollTask(taskId: string, sceneId: string): Promise<string> {
  const maxAttempts = 60;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 15000)); // 15s poll interval

    const response = await axios.get(
      `${SEEDANCE_API_BASE}/contents/generations/tasks/${taskId}`,
      {
        headers: {
          Authorization: `Bearer ${SEEDANCE_API_KEY}`,
        },
        timeout: 30000,
      }
    );

    const data = response.data;
    log(`  [POLL] ${sceneId} status=${data.status}`);

    if (data.status === "succeeded") {
      const videoUrl = data.content?.find(
        (c: any) => c.type === "video_url" || c.video_url
      )?.video_url?.url;
      if (!videoUrl) throw new Error(`No video URL in succeeded task for ${sceneId}`);
      return videoUrl;
    }

    if (data.status === "failed" || data.status === "expired") {
      throw new Error(`Task ${taskId} for ${sceneId} failed: ${JSON.stringify(data.error)}`);
    }
  }
  throw new Error(`Timeout waiting for ${sceneId} task ${taskId}`);
}

async function downloadVideo(url: string, outputPath: string): Promise<void> {
  const response = await axios.get(url, { responseType: "arraybuffer", timeout: 120000 });
  fs.writeFileSync(outputPath, Buffer.from(response.data));
}

async function main() {
  log("=== BOTW V3 Vocal Scene Regeneration ===");
  log(`Performance Reference: ${PERFORMANCE_REF_URL}`);
  log(`Output: ${OUTPUT_DIR}`);
  log("");

  const taskIds: Record<string, string> = {};

  // Submit all 5 scenes in parallel
  log("--- Submitting all 5 vocal scenes ---");
  for (const scene of VOCAL_SCENES) {
    log(`[SUBMIT] ${scene.label}`);
    try {
      const taskId = await createSeedanceTask(scene);
      taskIds[scene.id] = taskId;
      log(`  [JOB] ${scene.id} — taskId: ${taskId}`);
    } catch (err: any) {
      log(`  [ERROR] ${scene.id} submission failed: ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, 2000)); // small delay between submissions
  }

  // Save task IDs
  fs.writeFileSync(
    path.join(OUTPUT_DIR, "task-ids.json"),
    JSON.stringify(taskIds, null, 2)
  );
  log(`\nTask IDs saved: ${JSON.stringify(taskIds)}`);

  // Poll and download each scene
  log("\n--- Polling for completion ---");
  for (const scene of VOCAL_SCENES) {
    const taskId = taskIds[scene.id];
    if (!taskId) {
      log(`[SKIP] ${scene.id} — no task ID`);
      continue;
    }

    log(`[WAIT] ${scene.label} (taskId: ${taskId})`);
    try {
      const videoUrl = await pollTask(taskId, scene.id);
      log(`[COMPLETED] ${scene.id} — videoUrl: ${videoUrl}`);

      const outputPath = path.join(OUTPUT_DIR, `${scene.id}-regen.mp4`);
      log(`[DOWNLOAD] ${scene.id} -> ${outputPath}`);
      await downloadVideo(videoUrl, outputPath);

      const stats = fs.statSync(outputPath);
      log(`[SAVED] ${scene.id} → ${(stats.size / 1024 / 1024).toFixed(1)}MB`);
    } catch (err: any) {
      log(`[ERROR] ${scene.id}: ${err.message}`);
    }
  }

  log("\n=== All vocal scene regeneration jobs complete ===");
  const files = fs.readdirSync(OUTPUT_DIR).filter((f) => f.endsWith(".mp4"));
  log(`Files in output: ${files.join(", ")}`);
}

main().catch((err) => {
  log(`[FATAL] ${err.message}`);
  process.exit(1);
});
