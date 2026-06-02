/**
 * WIZ-SHOWCASE-001 — Priority 1: Generate Fully Integrated Zara-in-Baroque-Hall Stills
 * 
 * Uses FluxPuLID to place Zara naturally inside the locked baroque hall.
 * No chromakey. No grey rectangle. Zara is generated as part of the scene.
 * 
 * Reference: Zara portrait (locked identity) + baroque hall venue description
 * Output: 4 integrated stills (one per performance scene variant)
 */

import { fal } from "@fal-ai/client";
import * as fs from "fs";
import * as path from "path";
import axios from "axios";

const FAL_API_KEY = process.env.FAL_AI_API_KEY;
if (!FAL_API_KEY) throw new Error("FAL_AI_API_KEY not set");
fal.config({ credentials: FAL_API_KEY });

// Locked Zara portrait URL (uploaded to CDN)
const ZARA_PORTRAIT_URL = "https://wiz-ai.b-cdn.net/manus-storage/zara-character-portrait_a4529985.jpg";

// Output directory
const OUTPUT_DIR = "/home/ubuntu/zara-audit/v3-integrated-stills";
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Venue lock description (from VENUE-LOCK-MANIFEST.md)
const VENUE_BASE = "inside a grand baroque concert hall, three tall arched windows with amber god-rays streaming through, polished warm wooden floor reflecting the light, atmospheric floor haze, dark baroque balcony sections on both sides, dramatic warm amber and golden lighting, cinematic depth of field, photorealistic";

// Scene-specific prompts — each variant has a different framing and emotional context
const scenes = [
  {
    id: "s03-verse",
    label: "Verse performance — medium full-body",
    prompt: `A young woman with long straight jet-black hair centre-parted, pale skin, wearing a black leather corset and black leather floor-length trench coat and black leather trousers and black platform boots, standing on the stage ${VENUE_BASE}, facing the camera, mouth slightly open singing, arms at sides, spotlight on her from above, no microphone, no pop filter, cinematic film still`,
    imageSize: "landscape_16_9" as const,
    idWeight: 1.3,
  },
  {
    id: "s07-chorus",
    label: "Chorus performance — medium with orchestra",
    prompt: `A young woman with long straight jet-black hair centre-parted, pale skin, wearing a black leather corset and black leather floor-length trench coat and black leather trousers and black platform boots, standing centre stage ${VENUE_BASE}, orchestra musicians visible in the background, facing the camera, mouth open singing passionately, arms slightly raised, no microphone, cinematic film still, dramatic performance`,
    imageSize: "landscape_16_9" as const,
    idWeight: 1.3,
  },
  {
    id: "s09-closeup",
    label: "Close-up emotional — head and shoulders",
    prompt: `Close-up head and shoulders portrait of a young woman with long straight jet-black hair centre-parted, pale skin, wearing a black leather corset, ${VENUE_BASE} visible as bokeh background behind her, facing the camera, eyes open looking into camera, mouth slightly open singing, subtle emotion, no microphone, cinematic portrait, shallow depth of field, dramatic amber rim lighting`,
    imageSize: "portrait_4_3" as const,
    idWeight: 1.4,
  },
  {
    id: "s12-climax",
    label: "Climactic held note — close-up emotional",
    prompt: `Close-up head and shoulders portrait of a young woman with long straight jet-black hair centre-parted, no fringe no bangs, pale skin, wearing a black leather corset, ${VENUE_BASE} visible as bokeh background behind her, head slightly tilted back, eyes closed, mouth open in a sustained powerful note, emotional climax, no microphone, cinematic portrait, shallow depth of field, dramatic amber god-ray lighting from above`,
    imageSize: "portrait_4_3" as const,
    idWeight: 1.4,
  },
];

async function downloadImage(url: string, filepath: string): Promise<void> {
  const response = await axios.get(url, { responseType: "arraybuffer" });
  fs.writeFileSync(filepath, Buffer.from(response.data));
}

async function generateIntegratedStill(scene: typeof scenes[0]): Promise<string> {
  console.log(`\nGenerating: ${scene.id} — ${scene.label}`);
  console.log(`  ID weight: ${scene.idWeight}, Size: ${scene.imageSize}`);
  
  const result = await fal.subscribe("fal-ai/flux-pulid", {
    input: {
      prompt: scene.prompt,
      reference_image_url: ZARA_PORTRAIT_URL,
      image_size: scene.imageSize,
      num_inference_steps: 28,
      guidance_scale: 4.5,
      id_weight: scene.idWeight,
      negative_prompt: "microphone, pop filter, microphone stand, grey background, fringe, bangs, blurry face, deformed, ugly, bad anatomy, watermark, text, logo",
      seed: -1,
      enable_safety_checker: false,
    },
    logs: false,
  }) as any;

  const imageUrl = result.data?.images?.[0]?.url;
  if (!imageUrl) throw new Error(`No image URL for ${scene.id}`);
  
  const outputPath = path.join(OUTPUT_DIR, `${scene.id}.jpg`);
  await downloadImage(imageUrl, outputPath);
  
  const stats = fs.statSync(outputPath);
  console.log(`  ✓ Saved: ${outputPath} (${Math.round(stats.size / 1024)}KB)`);
  console.log(`  ✓ Source URL: ${imageUrl}`);
  
  return imageUrl;
}

async function main() {
  console.log("=== WIZ-SHOWCASE-001: Integrated Still Generation ===");
  console.log(`Reference portrait: ${ZARA_PORTRAIT_URL}`);
  console.log(`Output: ${OUTPUT_DIR}`);
  
  const results: Record<string, string> = {};
  
  for (const scene of scenes) {
    try {
      const url = await generateIntegratedStill(scene);
      results[scene.id] = url;
    } catch (err) {
      console.error(`  ✗ FAILED: ${scene.id}:`, err);
    }
  }
  
  // Save results
  const resultsPath = path.join(OUTPUT_DIR, "still-results.json");
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\n=== Complete ===`);
  console.log(`Results saved: ${resultsPath}`);
  console.log(JSON.stringify(results, null, 2));
}

main().catch(console.error);
