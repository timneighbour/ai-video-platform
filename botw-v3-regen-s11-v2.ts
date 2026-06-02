/**
 * BOTW V3 — Regenerate S11 using head-and-shoulders crop reference
 * Goal: intimate 3/4 profile emotional close-up for final vocal phrase
 */
import {
  submitWaveSpeedImageToVideo,
  pollWaveSpeedVideo,
} from "./server/ai-apis/wavespeed";
import * as fs from "fs";
import * as https from "https";
import * as http from "http";

const OUTPUT_DIR = "/home/ubuntu/zara-audit/botw-v3-raw";
const LOG_FILE = "/tmp/botw-v3-regen-s11-v2.log";

// Head-and-shoulders crop — face occupies ~45% of frame
const ZARA_HEAD_SHOULDERS_URL = "https://wiz-ai.b-cdn.net/manus-storage/zara-head-shoulders-crop_c7916905.jpg";
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

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  if (fs.existsSync(LOG_FILE)) fs.unlinkSync(LOG_FILE);
  log("=== BOTW V3 — Regenerating S11 with head-and-shoulders crop ===");

  const outputPath = `${OUTPUT_DIR}/s11-v3-regen-v2.mp4`;

  const prompt = `${ZARA_BASE} performing in baroque concert hall. ${VENUE_BASE}. 
Intimate performance shot — camera positioned at Zara's right side and slightly in front, capturing her face in a 3/4 profile angle. 
Her face and upper chest fill approximately 50% of the frame — this is a close-up performance shot, not a wide shot. 
She is delivering the final emotional phrase of the song with deep feeling. 
Mouth slightly open on the lyric, eyes glistening with emotion, subtle jaw movement. 
Warm amber light from arched windows falls across her cheekbone and hair. 
Shallow depth of field — Zara's face sharp, orchestra musicians softly blurred in warm bokeh behind her. 
Camera performs a very slow imperceptible push-in toward her face. 
Visible emotion — not exaggerated, deeply felt. 
Her head turns very slightly toward camera during the lyric. 
No microphone. No full-body framing. Close-up performance shot only. 
Cinematic 16:9 widescreen, no letterbox bars, full frame, photorealistic, 8K.`;

  log("[START] S11 — intimate 3/4 profile close-up using head-and-shoulders reference");

  const requestId = await submitWaveSpeedImageToVideo(
    {
      prompt,
      image: ZARA_HEAD_SHOULDERS_URL,
      duration: 5,
      aspect_ratio: "16:9",
      resolution: "720p",
    },
    "bytedance/seedance-2.0/image-to-video"
  );

  log(`[SUBMITTED] S11 — requestId: ${requestId}`);

  let attempts = 0;
  const maxAttempts = 80;
  while (attempts < maxAttempts) {
    await new Promise(r => setTimeout(r, 10000));
    attempts++;
    try {
      const result = await pollWaveSpeedVideo(requestId);
      if (result.status === "completed" && result.video_url) {
        log(`[COMPLETED] S11 — downloading...`);
        await downloadFile(result.video_url, outputPath);
        const stats = fs.statSync(outputPath);
        log(`[SAVED] S11 → ${(stats.size / 1024 / 1024).toFixed(1)}MB at ${outputPath}`);
        log("=== S11 regeneration v2 complete ===");
        return;
      } else if (result.status === "failed") {
        throw new Error("Generation failed for S11");
      } else {
        log(`[POLLING] S11 — ${result.status} (${attempts}/${maxAttempts})`);
      }
    } catch (pollErr: any) {
      if (pollErr.message?.includes("Generation failed")) throw pollErr;
      log(`[POLL_ERROR] S11 — ${pollErr.message}`);
    }
  }
  throw new Error("S11 timed out");
}

main().catch(err => {
  log(`FATAL: ${err.message}`);
  process.exit(1);
});
