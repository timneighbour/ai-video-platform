/**
 * WIZ-SHOWCASE-001 Benchmark v3
 * Phase 1: Generate FluxPuLID integrated stills for all 4 performance scenes
 * 
 * Scenes:
 *   Scene 3  (t12-18s) — verse, medium shot, emotional singing
 *   Scene 7  (t36-42s) — chorus, medium shot, peak emotional intensity
 *   Scene 9  (t48-54s) — bridge, CLOSE-UP head-and-shoulders
 *   Scene 12 (t60-66s) — final chorus, CLOSE-UP head-and-shoulders
 * 
 * All stills: landscape_4_3 (most reliable for FluxPuLID, Seedance will output 16:9)
 * Identity: locked Zara portrait
 * Venue: locked baroque hall god-ray environment
 */

import { generateFaceConsistentImage } from "./server/_core/fluxPuLID";
import * as fs from "fs";
import * as https from "https";
import * as path from "path";

const ZARA_PORTRAIT_URL = "https://wiz-ai.b-cdn.net/manus-storage/zara-character-portrait_365c4dd1.jpg";

const OUTPUT_DIR = "/home/ubuntu/zara-audit/v3-stills";

const NEGATIVE_PROMPT = "microphone, pop filter, mic stand, floating props, fringe, bangs, grey background, chromakey, green screen, cut-out, compositing artefact, letterbox, pillarbox, blurry, low quality, deformed face, extra limbs";

// Scene definitions
const scenes = [
  {
    id: "s03",
    label: "Scene 3 — Verse, medium shot",
    prompt: `A stunning female singer with long straight jet-black hair, pale skin, wearing a black leather corset and black leather trench coat, standing and singing with emotional intensity inside a grand baroque concert hall. The hall has floor-to-ceiling arched windows with warm golden god-rays streaming through them. Orchestra musicians and audience members are visible in the background. Warm amber atmospheric lighting. Cinematic shallow depth of field. The singer faces the camera directly, mouth open in an emotional note, head slightly tilted back. No microphone. Photorealistic, 8K, cinematic music video production quality.`,
    framing: "landscape_4_3" as const,
    seed: 42001,
  },
  {
    id: "s07",
    label: "Scene 7 — Chorus, medium shot, peak intensity",
    prompt: `A stunning female singer with long straight jet-black hair, pale skin, wearing a black leather corset and black leather trench coat, performing with peak emotional intensity inside a grand baroque concert hall. The hall has floor-to-ceiling arched windows with dramatic warm golden god-rays streaming through them. Orchestra musicians visible in the background. Warm amber cinematic lighting. The singer faces the camera, arms slightly raised at her sides, mouth wide open in a powerful note, eyes intense and expressive. No microphone. Photorealistic, 8K, cinematic music video production quality.`,
    framing: "landscape_4_3" as const,
    seed: 42007,
  },
  {
    id: "s09",
    label: "Scene 9 — Bridge, close-up head-and-shoulders",
    prompt: `Close-up head-and-shoulders portrait of a stunning female singer with long straight jet-black hair, pale skin, wearing a black leather corset and black leather trench coat, singing with raw emotional vulnerability inside a grand baroque concert hall. The baroque arched windows with warm golden god-rays are softly blurred in the background. The singer's face is the primary focus — visible eyes showing deep emotion, slightly furrowed brow, mouth open in a sustained note. Cinematic shallow depth of field, warm amber bokeh background. No microphone. Photorealistic, 8K, cinematic music video close-up.`,
    framing: "landscape_4_3" as const,
    seed: 42009,
  },
  {
    id: "s12",
    label: "Scene 12 — Final chorus, close-up head-and-shoulders",
    prompt: `Dramatic close-up head-and-shoulders portrait of a stunning female singer with long straight jet-black hair (no fringe, no bangs), pale skin, wearing a black leather corset and black leather trench coat, delivering a powerful final performance inside a grand baroque concert hall. Warm golden god-rays from baroque arched windows create a halo effect behind her. The singer's face shows maximum emotional intensity — eyes open wide, brow raised, mouth wide open in a climactic note. Cinematic shallow depth of field. No microphone. Photorealistic, 8K, cinematic music video close-up.`,
    framing: "landscape_4_3" as const,
    seed: 42012,
  },
];

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        file.close();
        downloadFile(response.headers.location!, dest).then(resolve).catch(reject);
        return;
      }
      response.pipe(file);
      file.on("finish", () => { file.close(); resolve(); });
    }).on("error", (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  
  const manifest: Record<string, unknown>[] = [];
  
  for (const scene of scenes) {
    console.log(`\n[Phase 1] Generating still for ${scene.id}: ${scene.label}`);
    console.log(`  Framing: ${scene.framing} | Seed: ${scene.seed}`);
    
    try {
      const result = await generateFaceConsistentImage({
        prompt: scene.prompt,
        referenceImageUrl: ZARA_PORTRAIT_URL,
        imageSize: scene.framing,
        idWeight: 1.0,
        guidanceScale: 4,
        numInferenceSteps: 28,
        negativePrompt: NEGATIVE_PROMPT,
        seed: scene.seed,
      });
      
      console.log(`  ✓ Generated: ${result.url}`);
      console.log(`  Seed used: ${result.seed}`);
      
      // Download the image
      const localPath = path.join(OUTPUT_DIR, `${scene.id}.jpg`);
      await downloadFile(result.url, localPath);
      console.log(`  ✓ Saved: ${localPath}`);
      
      manifest.push({
        sceneId: scene.id,
        label: scene.label,
        url: result.url,
        localPath,
        seed: result.seed,
        framing: scene.framing,
        generatedAt: new Date().toISOString(),
      });
      
      // Small delay between generations
      await new Promise(r => setTimeout(r, 2000));
      
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ FAILED for ${scene.id}: ${message}`);
      process.exit(1);
    }
  }
  
  // Save manifest
  const manifestPath = path.join(OUTPUT_DIR, "manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\n✓ All 4 stills generated. Manifest: ${manifestPath}`);
}

main().catch(console.error);
