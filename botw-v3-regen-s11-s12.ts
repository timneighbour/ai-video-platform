/**
 * BOTW V3 — Regenerate S11 and S12
 * S11: Intimate 3/4 profile Zara — final vocal phrase, emotional climax
 * S12: Pure cinematic orchestral ending — no character, full orchestra, fade to black
 */
import {
  submitWaveSpeedVideo,
  submitWaveSpeedImageToVideo,
  pollWaveSpeedVideo,
} from "./server/ai-apis/wavespeed";
import * as fs from "fs";
import * as https from "https";
import * as http from "http";

const OUTPUT_DIR = "/home/ubuntu/zara-audit/botw-v3-raw";
const LOG_FILE = "/tmp/botw-v3-regen-s11-s12.log";
const ZARA_PORTRAIT_URL = "https://wiz-ai.b-cdn.net/manus-storage/zara-character-portrait_365c4dd1.jpg";
const VENUE_BASE = "Grand baroque concert hall, three tall arched windows at rear with warm amber god-rays streaming through, polished wooden floor reflecting golden light, atmospheric floor haze, curved baroque balcony sections on left and right, deep shadow ceiling, warm amber and gold colour palette";
const ZARA_BASE = "Young woman with long straight jet-black centre-parted hair falling past shoulders, black leather corset bustier and black leather jacket, pale fair skin, defined cheekbones, smoky dark eye makeup, natural lip colour, no microphone, no fringe, no bangs";

function log(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + "\n");
}

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const protocol = url.startsWith("https") ? https : http;
    const req = protocol.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        file.close();
        downloadFile(response.headers.location!, dest).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        file.close();
        reject(new Error(`HTTP ${response.statusCode} for ${url}`));
        return;
      }
      response.pipe(file);
      file.on("finish", () => { file.close(); resolve(); });
    });
    req.on("error", (err) => { fs.unlink(dest, () => {}); reject(err); });
  });
}

async function generateScene(params: {
  id: string;
  label: string;
  type: "cinematic" | "zara";
  duration: 5 | 8;
  prompt: string;
  imageUrl?: string;
}) {
  const outputPath = `${OUTPUT_DIR}/${params.id}-v3-regen.mp4`;
  log(`[START] ${params.id} — ${params.label}`);

  let requestId: string;
  if (params.type === "zara" && params.imageUrl) {
    requestId = await submitWaveSpeedImageToVideo(
      {
        prompt: params.prompt,
        image: params.imageUrl,
        duration: params.duration,
        aspect_ratio: "16:9",
        resolution: "720p",
      },
      "bytedance/seedance-2.0/image-to-video"
    );
  } else {
    requestId = await submitWaveSpeedVideo(
      {
        prompt: params.prompt,
        duration: params.duration,
        aspect_ratio: "16:9",
        resolution: "720p",
      },
      "bytedance/seedance-2.0/text-to-video"
    );
  }

  log(`[SUBMITTED] ${params.id} — requestId: ${requestId}`);
  let attempts = 0;
  const maxAttempts = 80;
  while (attempts < maxAttempts) {
    await new Promise(r => setTimeout(r, 10000));
    attempts++;
    try {
      const result = await pollWaveSpeedVideo(requestId);
      if (result.status === "completed" && result.video_url) {
        log(`[COMPLETED] ${params.id} — downloading...`);
        await downloadFile(result.video_url, outputPath);
        const stats = fs.statSync(outputPath);
        log(`[SAVED] ${params.id} → ${(stats.size / 1024 / 1024).toFixed(1)}MB at ${outputPath}`);
        return;
      } else if (result.status === "failed") {
        throw new Error(`Generation failed for ${params.id}`);
      } else {
        log(`[POLLING] ${params.id} — ${result.status} (${attempts}/${maxAttempts})`);
      }
    } catch (pollErr: any) {
      if (pollErr.message?.includes("Generation failed")) throw pollErr;
      log(`[POLL_ERROR] ${params.id} — ${pollErr.message}`);
    }
  }
  throw new Error(`[${params.id}] Timed out after ${maxAttempts} attempts`);
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  if (fs.existsSync(LOG_FILE)) fs.unlinkSync(LOG_FILE);
  log("=== BOTW V3 — Regenerating S11 and S12 ===");

  // S11: Intimate 3/4 profile — final vocal phrase, emotional climax
  // Image-to-video to lock Zara identity
  await generateScene({
    id: "s11",
    label: "S11 — Final Vocal Phrase (3/4 PROFILE — emotional climax)",
    type: "zara",
    duration: 5,
    imageUrl: ZARA_PORTRAIT_URL,
    prompt: `${ZARA_BASE} performing in baroque concert hall. ${VENUE_BASE}. Camera positioned at Zara's right side, slightly in front — capturing her face in intimate 3/4 profile. She is delivering the final emotional phrase of the song. Mouth slightly open on the lyric, eyes glistening with emotion, subtle jaw movement. Warm amber light from arched windows behind her. Shallow depth of field — Zara sharp, orchestra musicians softly blurred in background. Slow imperceptible push-in toward her face. Visible emotion — not exaggerated, deeply felt. No microphone. Cinematic 16:9 widescreen, no letterbox bars, full frame, photorealistic, 8K.`,
  });

  // S12: Pure cinematic orchestral ending — no character, full orchestra, fade to black
  await generateScene({
    id: "s12",
    label: "S12 — Cinematic Orchestral Closing (no character, fade to black)",
    type: "cinematic",
    duration: 8,
    prompt: `${VENUE_BASE}. Wide cinematic shot of a full symphony orchestra performing at the emotional peak of a piece. Conductor visible at centre with baton raised, full ensemble around them — violinists, cellists, brass section, all actively playing. Camera begins at mid-height and slowly pulls back and upward in a graceful crane movement to reveal the full grandeur of the baroque hall. Warm amber light rays streaming through arched windows. Dust particles in the light beams. Musicians leaning into the final passage with full energy. No solo character. No fantasy costumes. No crowns. No royalty styling. The hall is alive with music. The video ends with a slow graceful fade to black as the camera reaches its widest position. Cinematic 16:9 widescreen, no letterbox bars, full frame, photorealistic, 8K.`,
  });

  log("=== S11 and S12 regeneration complete ===");
}

main().catch(err => {
  log(`FATAL: ${err.message}`);
  process.exit(1);
});
