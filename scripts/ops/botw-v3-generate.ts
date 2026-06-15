/**
 * Beauty of the Wreckage V3 — Scene Generation
 * Generates all 13 scenes per the approved storyboard (Revision 2)
 * 
 * Cinematic scenes (7): text-to-video using Seedance 2.0
 * Zara scenes (6): image-to-video using Seedance 2.0 with locked portrait
 * 
 * Venue lock: baroque hall with 3 arched windows, amber god-rays, polished floor, floor haze
 * Zara lock: long straight black hair, black leather jacket/corset, no microphone, no fringe
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
const LOG_FILE = "/tmp/botw-v3-generate.log";

// Locked Zara portrait from V2 (confirmed working identity)
const ZARA_PORTRAIT_URL = "https://wiz-ai.b-cdn.net/manus-storage/zara-character-portrait_365c4dd1.jpg";

// Venue base prompt (from VENUE-LOCK-MANIFEST.md)
const VENUE_BASE = "Grand baroque concert hall, three tall arched windows at rear with warm amber god-rays streaming through, polished wooden floor reflecting golden light, atmospheric floor haze, curved baroque balcony sections on left and right, deep shadow ceiling, warm amber and gold colour palette";

// Zara base description (from ZARA-IDENTITY-PACK.md)
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

// ============================================================
// SCENE DEFINITIONS
// ============================================================

interface Scene {
  id: string;
  label: string;
  type: "cinematic" | "zara";
  duration: 5 | 10;
  prompt: string;
  imageUrl?: string; // only for Zara scenes
}

const scenes: Scene[] = [
  // ── ACT 1 ──────────────────────────────────────────────────
  {
    id: "s01",
    label: "S01 — Opening Wide Shot",
    type: "cinematic",
    duration: 5,
    prompt: `${VENUE_BASE}. Empty baroque concert hall before the performance begins. Wide establishing shot. Camera drifts slowly left to right at low angle, revealing the full scale of the hall. Three arched windows at rear glowing with amber god-rays. Polished floor reflects the light. Atmospheric floor haze. Orchestra seating visible but empty. Sense of anticipation and grandeur. No performers. Cinematic 16:9 widescreen, no letterbox bars, full frame, photorealistic, 8K.`,
  },
  {
    id: "s02",
    label: "S02 — Zara Emotional Build (back to camera)",
    type: "zara",
    duration: 5,
    imageUrl: ZARA_PORTRAIT_URL,
    prompt: `${ZARA_BASE} standing with her back to camera, facing the baroque concert hall. ${VENUE_BASE}. Camera slowly orbits from behind her toward her right side profile. She is still, emotionally present, looking at the hall. Not singing. Slight head movement. Hair falls down her back. Warm amber light from the hall windows illuminates her silhouette. Sense of loneliness and anticipation. No microphone. Cinematic 16:9 widescreen, no letterbox bars, full frame, photorealistic, 8K.`,
  },

  // ── ACT 2 ──────────────────────────────────────────────────
  {
    id: "s03",
    label: "S03 — First Vocal (FRONT — direct eye contact)",
    type: "zara",
    duration: 5,
    imageUrl: ZARA_PORTRAIT_URL,
    prompt: `${ZARA_BASE} performing in baroque concert hall. ${VENUE_BASE}. Medium shot, front-facing, direct eye contact with camera. Face occupies approximately 40% of frame. Singing with emotional intensity, mouth open on a lyric. Slight head movement and body sway. Orchestra visible in warm bokeh behind her. Warm amber spotlight from above. Camera slowly pushes in. No microphone. Cinematic 16:9 widescreen, no letterbox bars, full frame, photorealistic, 8K.`,
  },
  {
    id: "s04",
    label: "S04 — String Section Tracking",
    type: "cinematic",
    duration: 5,
    prompt: `${VENUE_BASE}. Low-angle cinematic tracking shot moving slowly through the string section of the orchestra. Camera glides from right to left at musician knee-height level. Cellists and violinists actively playing. Visible bow movement across strings. Musicians leaning into their performance. Shallow depth of field — nearest musician sharp, rest in warm bokeh. Warm amber orchestral lighting. No finger close-ups. Focus on movement, atmosphere, and energy. Cinematic 16:9 widescreen, no letterbox bars, full frame, photorealistic, 8K.`,
  },
  {
    id: "s05",
    label: "S05 — Pre-Chorus (3/4 PROFILE RIGHT — off-axis)",
    type: "zara",
    duration: 5,
    imageUrl: ZARA_PORTRAIT_URL,
    prompt: `${ZARA_BASE} performing in baroque concert hall. ${VENUE_BASE}. Medium shot from 3/4 angle on Zara's right side. Camera slightly off-axis — not a pure profile, not front-facing. Face at approximately 35% of frame. Singing with rising emotional tension, building toward chorus. Slight upward head tilt. Orchestra visible in warm bokeh behind her left shoulder. Warm amber light. Camera holds with very slow drift. No microphone. Cinematic 16:9 widescreen, no letterbox bars, full frame, photorealistic, 8K.`,
  },
  {
    id: "s06",
    label: "S06 — Conductor Over-Shoulder",
    type: "cinematic",
    duration: 5,
    prompt: `${VENUE_BASE}. Over-the-shoulder shot from behind a conductor. The conductor is in the foreground, slightly out of focus. Baton raised. The full orchestra is visible in front, actively playing. Warm amber god-rays stream through the three arched windows at rear. Musicians in motion — bows moving, bodies swaying. Camera slowly pushes in over the conductor's shoulder toward the orchestra. Single conductor only — no duplicate figures. Cinematic 16:9 widescreen, no letterbox bars, full frame, photorealistic, 8K.`,
  },
  {
    id: "s07",
    label: "S07 — Chorus Hero Shot (SIDE TRACKING — parallel)",
    type: "zara",
    duration: 5,
    imageUrl: ZARA_PORTRAIT_URL,
    prompt: `${ZARA_BASE} performing in baroque concert hall. ${VENUE_BASE}. Side tracking shot — camera positioned to Zara's left side, moving parallel to her from left to right. Her profile is visible throughout. Face at approximately 35% of frame. Singing with maximum emotional intensity and full performance energy. Visible body movement — hair moving, head turning slightly, shoulders engaged. Baroque hall columns pass behind her as camera tracks. Orchestra in warm bokeh. Warm amber light. This is the hero kinetic shot. No microphone. Cinematic 16:9 widescreen, no letterbox bars, full frame, photorealistic, 8K.`,
  },

  // ── ACT 3 ──────────────────────────────────────────────────
  {
    id: "s08a",
    label: "S08a — String Section Glide (from behind)",
    type: "cinematic",
    duration: 5,
    prompt: `${VENUE_BASE}. Cinematic tracking shot moving through the string section from behind the players. Camera glides slowly from right to left at shoulder height — level with the musicians' upper backs. Cellists and violinists actively playing. Visible bow movement. Bodies swaying with the music. Shallow depth of field — nearest musician sharp, rest fall into warm amber bokeh. Baroque hall visible in the background. Orchestra feels alive and engaged. No finger close-ups. No static musicians. Focus on movement, atmosphere, and immersion. Cinematic 16:9 widescreen, no letterbox bars, full frame, photorealistic, 8K.`,
  },
  {
    id: "s08b",
    label: "S08b — Zara Emotional Moment (non-singing profile)",
    type: "zara",
    duration: 5,
    imageUrl: ZARA_PORTRAIT_URL,
    prompt: `${ZARA_BASE} in baroque concert hall. ${VENUE_BASE}. Pure profile shot — camera is exactly to Zara's right side. She is NOT singing. Eyes closed or looking across the hall toward the orchestra. Reflective, emotionally present, listening. A moment of stillness inside the performance. Slight natural breathing. Orchestra visible and warm behind her. Static camera — no movement. The stillness is intentional and cinematic. No lip movement. No open mouth. No microphone. Cinematic 16:9 widescreen, no letterbox bars, full frame, photorealistic, 8K.`,
  },
  {
    id: "s09",
    label: "S09 — Bridge (ELEVATED — hall architecture)",
    type: "zara",
    duration: 5,
    imageUrl: ZARA_PORTRAIT_URL,
    prompt: `${ZARA_BASE} performing in baroque concert hall. ${VENUE_BASE}. Elevated angle — camera positioned high, looking down at Zara from the level of the baroque upper gallery or balcony. Zara is small but central in the frame — face at approximately 25-30% of frame. Full grandeur of the hall visible: ornate ceiling above, orchestra spread below. She looks up toward the camera. Singing with emotional vulnerability. Very slow downward push-in. Warm amber light from windows. No microphone. Cinematic 16:9 widescreen, no letterbox bars, full frame, photorealistic, 8K.`,
  },
  {
    id: "s10",
    label: "S10 — Full Orchestra Wide Pull-Back",
    type: "cinematic",
    duration: 5,
    prompt: `${VENUE_BASE}. Wide shot of the full orchestra in performance. Camera starts at mid-height and slowly pulls back and upward, revealing the full scale of the ensemble and the hall. All sections visible — strings, brass, woodwinds. Musicians actively playing — bows moving, bodies engaged. Conductor at front with baton raised. Single conductor only. Warm amber god-rays from three arched windows. Floor haze. Sense of orchestral power and scale. No static musicians. Cinematic 16:9 widescreen, no letterbox bars, full frame, photorealistic, 8K.`,
  },

  // ── ACT 4 ──────────────────────────────────────────────────
  {
    id: "s11",
    label: "S11 — Final Vocal (REAR 3/4 — turns to profile)",
    type: "zara",
    duration: 5,
    imageUrl: ZARA_PORTRAIT_URL,
    prompt: `${ZARA_BASE} performing in baroque concert hall. ${VENUE_BASE}. Rear 3/4 shot — camera is behind and slightly to Zara's right. We see the back of her head and right shoulder. The hall stretches before her. She is singing the final lyric. During the clip she slowly turns her head to the right — revealing her profile by the end of the shot. Hair falls down her back. Warm amber light from the hall windows. Orchestra visible ahead of her. Emotional resolution. No microphone. Cinematic 16:9 widescreen, no letterbox bars, full frame, photorealistic, 8K.`,
  },
  {
    id: "s12",
    label: "S12 — Orchestral Closing (crane pull-back, fade)",
    type: "cinematic",
    duration: 5,
    prompt: `${VENUE_BASE}. Final closing shot. Wide crane pull-back from stage level upward and backward, revealing the full baroque hall. A female figure stands alone at the front of the stage, facing the empty seats. Orchestra at rest behind her. Warm amber light. Floor haze. Three arched windows glowing. Sense of resolution, silence, and aftermath. Camera continues to pull back and upward until the figure is small in the frame. Cinematic 16:9 widescreen, no letterbox bars, full frame, photorealistic, 8K.`,
  },
];

// ============================================================
// GENERATION
// ============================================================

async function generateScene(scene: Scene): Promise<void> {
  log(`[START] ${scene.id} — ${scene.label}`);
  
  let requestId: string;
  
  try {
    if (scene.type === "zara" && scene.imageUrl) {
      // Image-to-video: Seedance 2.0 with Zara portrait as anchor
      requestId = await submitWaveSpeedImageToVideo(
        {
          prompt: scene.prompt,
          image: scene.imageUrl,
          duration: scene.duration,
          aspect_ratio: "16:9",
          resolution: "720p",
        },
        "bytedance/seedance-2.0/image-to-video"
      );
    } else {
      // Text-to-video: Seedance 2.0 for cinematic scenes
      requestId = await submitWaveSpeedVideo(
        {
          prompt: scene.prompt,
          duration: scene.duration,
          aspect_ratio: "16:9",
          resolution: "720p",
        },
        "bytedance/seedance-2.0/text-to-video"
      );
    }
    
    log(`[SUBMITTED] ${scene.id} — requestId: ${requestId}`);
    
    // Poll for completion
    let attempts = 0;
    const maxAttempts = 60; // 10 minutes max
    
    while (attempts < maxAttempts) {
      await new Promise(r => setTimeout(r, 10000)); // 10s poll interval
      attempts++;
      
      try {
        const result = await pollWaveSpeedVideo(requestId);
        
        if (result.status === "completed" && result.video_url) {
          log(`[COMPLETED] ${scene.id} — downloading from ${result.video_url.substring(0, 60)}...`);
          const outputPath = `${OUTPUT_DIR}/${scene.id}.mp4`;
          await downloadFile(result.video_url, outputPath);
          const stats = fs.statSync(outputPath);
          log(`[SAVED] ${scene.id} → ${outputPath} (${(stats.size / 1024 / 1024).toFixed(1)}MB)`);
          return;
        } else if (result.status === "failed") {
          log(`[FAILED] ${scene.id} — generation failed`);
          throw new Error(`Generation failed for ${scene.id}`);
        } else {
          log(`[POLLING] ${scene.id} — status: ${result.status} (attempt ${attempts}/${maxAttempts})`);
        }
      } catch (pollErr: any) {
        if (pollErr.message?.includes("Generation failed")) throw pollErr;
        log(`[POLL_ERROR] ${scene.id} — ${pollErr.message} (will retry)`);
      }
    }
    
    throw new Error(`Timeout: ${scene.id} did not complete within ${maxAttempts * 10}s`);
    
  } catch (err: any) {
    log(`[ERROR] ${scene.id} — ${err.message}`);
    throw err;
  }
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(LOG_FILE, ""); // reset log
  
  log(`=== Beauty of the Wreckage V3 — Generation Start ===`);
  log(`Output directory: ${OUTPUT_DIR}`);
  log(`Total scenes: ${scenes.length}`);
  log(`Zara scenes: ${scenes.filter(s => s.type === "zara").length}`);
  log(`Cinematic scenes: ${scenes.filter(s => s.type === "cinematic").length}`);
  
  // Generate scenes sequentially to avoid rate limits
  const results: { id: string; success: boolean; error?: string }[] = [];
  
  for (const scene of scenes) {
    try {
      await generateScene(scene);
      results.push({ id: scene.id, success: true });
    } catch (err: any) {
      results.push({ id: scene.id, success: false, error: err.message });
      log(`[SKIPPING] ${scene.id} failed — continuing with next scene`);
    }
    
    // Brief pause between submissions
    await new Promise(r => setTimeout(r, 2000));
  }
  
  log(`\n=== Generation Complete ===`);
  log(`Results:`);
  for (const r of results) {
    log(`  ${r.id}: ${r.success ? "✓ SUCCESS" : `✗ FAILED — ${r.error}`}`);
  }
  
  const succeeded = results.filter(r => r.success).length;
  log(`\n${succeeded}/${scenes.length} scenes generated successfully`);
  
  // Save results manifest
  fs.writeFileSync(
    `${OUTPUT_DIR}/generation-manifest.json`,
    JSON.stringify({ timestamp: new Date().toISOString(), results }, null, 2)
  );
}

main().catch(err => {
  log(`[FATAL] ${err.message}`);
  process.exit(1);
});
