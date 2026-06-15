/**
 * Gate 1 — Integrated Still Validation
 * Generates 5 FluxPuLID integrated stills of Zara inside the locked baroque hall.
 * 
 * Requirements:
 * - Zara Identity Pack: long straight black hair, pale skin, all-black wardrobe
 * - Locked Baroque Hall: grand hall, arched windows, god-ray lighting, warm amber
 * - No microphone, no pop filter, no mic stand
 * - No grey background, no compositing
 * - Cinematic close-up framing
 * - Zara appears naturally inside the venue
 */

import { fal } from "@fal-ai/client";
import { storagePut } from "./server/storage";
import axios from "axios";
import * as fs from "fs";

const ZARA_PORTRAIT_CDN_URL = "https://wiz-ai.b-cdn.net/manus-storage/zara-character-portrait_365c4dd1.jpg";

// 5 distinct prompt variants — different framing, emotion, and lighting emphasis
const STILL_PROMPTS = [
  // Still 1: Close-up emotional performance — front-facing
  {
    id: "still-01",
    label: "Close-up emotional, front-facing",
    prompt: "A young woman with long straight jet-black hair and pale porcelain skin, wearing a black leather corset and black leather trench coat, standing centre-stage inside a grand baroque concert hall with ornate gold-leaf architecture and tall arched windows, warm amber god-ray lighting streaming through the windows behind her, orchestra visible in the background, she is singing with intense emotional expression, eyes forward, slight head tilt, mouth open mid-note, cinematic close-up head and shoulders framing, shallow depth of field, film grain, photorealistic, 8K quality, dramatic stage lighting, Air Studios atmosphere",
    negativePrompt: "microphone, pop filter, mic stand, grey background, empty room, green screen, cartoon, illustration, fringe, bangs, brown hair, blonde hair, second person, duplicate character, watermark",
    idWeight: 1.0,
  },
  // Still 2: Three-quarter view, looking slightly left
  {
    id: "still-02",
    label: "Three-quarter view, looking left",
    prompt: "A young woman with long straight jet-black hair and pale porcelain skin, wearing a black leather corset and black leather trench coat, standing on stage inside a grand baroque concert hall with ornate gold-leaf columns and arched windows, warm amber atmospheric lighting, she is singing with eyes slightly closed in emotional intensity, three-quarter face view, head tilted slightly left, cinematic medium close-up, shallow depth of field, film grain, photorealistic, 8K quality, orchestra silhouettes visible in background, Air Studios atmosphere, dramatic stage lighting",
    negativePrompt: "microphone, pop filter, mic stand, grey background, empty room, green screen, cartoon, illustration, fringe, bangs, brown hair, blonde hair, second person, duplicate character, watermark",
    idWeight: 1.0,
  },
  // Still 3: Wide medium shot — full upper body visible
  {
    id: "still-03",
    label: "Medium shot, upper body, arms slightly raised",
    prompt: "A young woman with long straight jet-black hair and pale porcelain skin, wearing a black leather corset and black leather trench coat, standing centre-stage inside a grand baroque concert hall, warm amber god-ray lighting from tall arched windows, orchestra and audience visible in background, she is singing with arms slightly raised at her sides, emotional expression, eyes forward, medium shot showing upper body, cinematic composition, shallow depth of field, film grain, photorealistic, 8K quality, Air Studios atmosphere",
    negativePrompt: "microphone, pop filter, mic stand, grey background, empty room, green screen, cartoon, illustration, fringe, bangs, brown hair, blonde hair, second person, duplicate character, watermark",
    idWeight: 1.0,
  },
  // Still 4: Extreme close-up — face only, maximum emotional intensity
  {
    id: "still-04",
    label: "Extreme close-up, maximum emotional intensity",
    prompt: "A young woman with long straight jet-black hair and pale porcelain skin, wearing a black leather corset, extreme close-up of her face inside a grand baroque concert hall, warm amber stage lighting, she is singing with eyes closed, brow furrowed in emotional intensity, mouth open mid-note, extreme close-up cinematic framing, shallow depth of field, film grain, photorealistic, 8K quality, dramatic stage lighting, Air Studios atmosphere, baroque architecture visible in soft background bokeh",
    negativePrompt: "microphone, pop filter, mic stand, grey background, empty room, green screen, cartoon, illustration, fringe, bangs, brown hair, blonde hair, second person, duplicate character, watermark",
    idWeight: 1.0,
  },
  // Still 5: Silhouette-lit from behind — god-rays framing
  {
    id: "still-05",
    label: "God-ray backlit, dramatic silhouette framing",
    prompt: "A young woman with long straight jet-black hair and pale porcelain skin, wearing a black leather corset and black leather trench coat, standing centre-stage in a grand baroque concert hall, dramatic god-ray lighting streaming through tall arched windows directly behind her, warm amber and gold atmospheric lighting, she is singing facing the camera, emotional expression, cinematic wide medium shot, film grain, photorealistic, 8K quality, orchestra silhouettes in background, Air Studios atmosphere, dramatic backlit halo effect on her hair",
    negativePrompt: "microphone, pop filter, mic stand, grey background, empty room, green screen, cartoon, illustration, fringe, bangs, brown hair, blonde hair, second person, duplicate character, watermark",
    idWeight: 1.0,
  },
];

async function generateStill(
  promptConfig: typeof STILL_PROMPTS[0],
  index: number
): Promise<{ id: string; label: string; url: string; localPath: string }> {
  const apiKey = process.env.FAL_AI_API_KEY;
  if (!apiKey) throw new Error("FAL_AI_API_KEY is not configured");
  fal.config({ credentials: apiKey });

  console.log(`[Gate1] Generating still ${index + 1}/5: ${promptConfig.label}`);

  const result = await fal.subscribe("fal-ai/flux-pulid", {
    input: {
      prompt: promptConfig.prompt,
      reference_image_url: ZARA_PORTRAIT_CDN_URL,
      image_size: "square_hd",
      num_inference_steps: 28,
      guidance_scale: 4.5,
      id_weight: promptConfig.idWeight,
      negative_prompt: promptConfig.negativePrompt,
      seed: 1000 + index * 137,
      enable_safety_checker: false,
    },
    logs: false,
    pollInterval: 3000,
  }) as { data: { images: Array<{ url: string }>; seed: number } };

  const imageUrl = result.data?.images?.[0]?.url;
  if (!imageUrl) throw new Error(`No image URL in result for ${promptConfig.id}`);
  
  console.log(`[Gate1] Still ${index + 1} completed: ${imageUrl.slice(0, 80)}...`);
  const localPath = await downloadAndSave(imageUrl, promptConfig.id);
  return { id: promptConfig.id, label: promptConfig.label, url: imageUrl, localPath };
}

async function downloadAndSave(url: string, id: string): Promise<string> {
  const dir = "/home/ubuntu/zara-audit/gate1-stills";
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  
  const response = await axios.get(url, { responseType: "arraybuffer" });
  const localPath = `${dir}/${id}.jpg`;
  fs.writeFileSync(localPath, response.data);
  console.log(`[Gate1] Still ${id} saved to ${localPath}`);
  return localPath;
}

async function main() {
  console.log("[Gate1] Starting integrated still generation — 5 stills");
  console.log(`[Gate1] Zara portrait: ${ZARA_PORTRAIT_CDN_URL}`);

  // Generate stills sequentially to avoid fal.ai rate limiting
  const results: Array<{ id: string; label: string; url: string; localPath: string }> = [];
  for (let i = 0; i < STILL_PROMPTS.length; i++) {
    const result = await generateStill(STILL_PROMPTS[i], i);
    results.push(result);
    if (i < STILL_PROMPTS.length - 1) {
      console.log(`[Gate1] Waiting 2s before next still...`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log("[Gate1] All 5 stills generated successfully.");

  // Write results manifest
  const manifest = {
    generatedAt: new Date().toISOString(),
    zaraPortrait: ZARA_PORTRAIT_CDN_URL,
    stills: results.map(r => ({
      id: r.id,
      label: r.label,
      url: r.url,
      localPath: r.localPath,
    })),
  };

  fs.writeFileSync(
    "/home/ubuntu/zara-audit/gate1-stills/manifest.json",
    JSON.stringify(manifest, null, 2)
  );

  console.log("\n[Gate1] === RESULTS ===");
  results.forEach((r, i) => {
    console.log(`Still ${i + 1} (${r.id}): ${r.url}`);
  });
  console.log("\n[Gate1] Manifest saved to /home/ubuntu/zara-audit/gate1-stills/manifest.json");
}

main().catch(err => {
  console.error("[Gate1] FAILED:", err.message);
  process.exit(1);
});
