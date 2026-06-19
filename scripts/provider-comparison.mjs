/**
 * Provider Comparison Script
 * Generates the same Lyndhurst Hall / Zara prompt through:
 *   1. BFL FLUX.1 Pro Ultra (direct API)
 *   2. Grok grok-imagine-image-quality
 *   3. GPT-Image-2 (OpenAI)
 *
 * Run: node scripts/provider-comparison.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Load env from project root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const BFL_API_KEY = process.env.BFL_API_KEY;
const XAI_API_KEY = process.env.XAI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const LYNDHURST_HALL_DNA = `grand Victorian concert hall interior, soaring vaulted ceiling painted deep midnight blue with gold leaf star motifs, ornate Gothic arched clerestory windows with amber stained glass casting warm honeyed light, rich dark mahogany wood panelling on walls, tiered gallery balconies with carved wooden balustrades, a full symphony orchestra seated on a raised wooden stage, conductor's podium centre-stage, warm amber and gold stage lighting, polished parquet hardwood floor, massive pipe organ visible at the far end, atmospheric haze, cinematic depth of field`;

// The test scene prompt (Zara performance scene)
const RAW_SCENE_PROMPT = `Zara stands centre-stage at a grand piano in Lyndhurst Hall, Air Studios. She wears an elegant black gown with subtle gold accents. Warm amber spotlights illuminate her from above. The full orchestra is seated behind her. She faces the camera directly, singing with emotional intensity. Close-up cinematic framing, shallow depth of field, film grain.`;

const CINEMATIC_PROMPT = `${RAW_SCENE_PROMPT}

VENUE: ${LYNDHURST_HALL_DNA}

CINEMATOGRAPHY: cinematic 35mm film, anamorphic lens, shallow depth of field, warm golden-hour lighting, no text, no watermarks, photorealistic, ultra-detailed, 8K`;

const OUTPUT_DIR = path.join(__dirname, "../comparison-output");
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

async function downloadImage(url, filename) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const filepath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(filepath, buffer);
  console.log(`  ✓ Saved: ${filename} (${Math.round(buffer.length / 1024)}KB)`);
  return filepath;
}

// ── BFL FLUX.1 Pro Ultra ─────────────────────────────────────────────────────
async function generateBfl() {
  if (!BFL_API_KEY) { console.log("[BFL] No BFL_API_KEY — skipping"); return null; }
  console.log("\n[BFL] Submitting FLUX.1 Pro Ultra request...");
  
  const submitRes = await fetch("https://api.bfl.ml/v1/flux-pro-1.1-ultra", {
    method: "POST",
    headers: { "x-key": BFL_API_KEY, "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({
      prompt: CINEMATIC_PROMPT,
      width: 1344,
      height: 768,
      steps: 40,
      guidance: 3.5,
      seed: 42,
      output_format: "jpeg",
      safety_tolerance: 6,
      raw: false,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!submitRes.ok) {
    const err = await submitRes.text().catch(() => "");
    console.error(`[BFL] Submit failed HTTP ${submitRes.status}: ${err.slice(0, 200)}`);
    return null;
  }

  const { id: taskId } = await submitRes.json();
  if (!taskId) { console.error("[BFL] No task ID returned"); return null; }
  console.log(`[BFL] Task submitted: ${taskId}`);

  // Poll for result
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 3000));
    process.stdout.write(`  polling (${i + 1}/40)...\r`);
    
    const pollRes = await fetch(`https://api.bfl.ml/v1/get_result?id=${taskId}`, {
      headers: { "x-key": BFL_API_KEY, "Accept": "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
    
    if (!pollRes.ok) continue;
    const poll = await pollRes.json();
    
    if (poll.status === "Ready") {
      const imageUrl = poll.result?.sample ?? poll.result?.url;
      if (imageUrl) {
        console.log(`\n[BFL] ✓ Ready after ${i + 1} polls`);
        return await downloadImage(imageUrl, "1-bfl-flux-pro-ultra.jpg");
      }
    } else if (["Error", "Content Moderated", "Request Moderated"].includes(poll.status)) {
      console.error(`\n[BFL] Task ended with status: ${poll.status}`);
      return null;
    }
  }
  console.error("\n[BFL] Timed out");
  return null;
}

// ── Grok grok-imagine-image-quality ──────────────────────────────────────────
async function generateGrok() {
  if (!XAI_API_KEY) { console.log("[Grok] No XAI_API_KEY — skipping"); return null; }
  console.log("\n[Grok] Submitting grok-imagine-image-quality request...");
  
  const res = await fetch("https://api.x.ai/v1/images/generations", {
    method: "POST",
    headers: { "Authorization": `Bearer ${XAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "grok-imagine-image-quality",
      prompt: CINEMATIC_PROMPT,
      n: 1,
      response_format: "url",
    }),
    signal: AbortSignal.timeout(90_000),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    console.error(`[Grok] HTTP ${res.status}: ${err.slice(0, 200)}`);
    return null;
  }

  const json = await res.json();
  const url = json?.data?.[0]?.url;
  if (!url) { console.error("[Grok] No URL in response"); return null; }
  
  console.log("[Grok] ✓ Image ready");
  return await downloadImage(url, "2-grok-imagine-quality.jpg");
}

// ── GPT-Image-2 ───────────────────────────────────────────────────────────────
async function generateGptImage2() {
  if (!OPENAI_API_KEY) { console.log("[GPT-Image-2] No OPENAI_API_KEY — skipping"); return null; }
  console.log("\n[GPT-Image-2] Submitting gpt-image-2 request...");
  
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Authorization": `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-image-2",
      prompt: CINEMATIC_PROMPT,
      n: 1,
      size: "1536x1024",
      quality: "high",
      response_format: "b64_json",
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    console.error(`[GPT-Image-2] HTTP ${res.status}: ${err.slice(0, 200)}`);
    return null;
  }

  const json = await res.json();
  const b64 = json?.data?.[0]?.b64_json;
  if (!b64) { console.error("[GPT-Image-2] No b64_json in response"); return null; }
  
  const buffer = Buffer.from(b64, "base64");
  const filepath = path.join(OUTPUT_DIR, "3-gpt-image-2.png");
  fs.writeFileSync(filepath, buffer);
  console.log(`[GPT-Image-2] ✓ Image ready (${Math.round(buffer.length / 1024)}KB)`);
  return filepath;
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log("=== Provider Comparison: Lyndhurst Hall / Zara Performance Scene ===");
console.log(`Prompt: "${RAW_SCENE_PROMPT.slice(0, 80)}..."`);
console.log(`Output dir: ${OUTPUT_DIR}`);

const results = {};
const startTime = Date.now();

// Run all three in parallel
const [bflPath, grokPath, gptPath] = await Promise.allSettled([
  generateBfl(),
  generateGrok(),
  generateGptImage2(),
]);

results.bfl = bflPath.status === "fulfilled" ? bflPath.value : null;
results.grok = grokPath.status === "fulfilled" ? grokPath.value : null;
results.gpt = gptPath.status === "fulfilled" ? gptPath.value : null;

const elapsed = Math.round((Date.now() - startTime) / 1000);

console.log("\n=== Results ===");
console.log(`BFL FLUX.1 Pro Ultra: ${results.bfl ? "✓ " + path.basename(results.bfl) : "✗ Failed/Skipped"}`);
console.log(`Grok Imagine Quality: ${results.grok ? "✓ " + path.basename(results.grok) : "✗ Failed/Skipped"}`);
console.log(`GPT-Image-2:          ${results.gpt ? "✓ " + path.basename(results.gpt) : "✗ Failed/Skipped"}`);
console.log(`Total time: ${elapsed}s`);

// Save metadata
const meta = {
  generatedAt: new Date().toISOString(),
  prompt: RAW_SCENE_PROMPT,
  cinematicPrompt: CINEMATIC_PROMPT,
  results: {
    bfl: { file: results.bfl ? path.basename(results.bfl) : null, model: "flux-pro-1.1-ultra", resolution: "1344x768", steps: 40, guidance: 3.5 },
    grok: { file: results.grok ? path.basename(results.grok) : null, model: "grok-imagine-image-quality", resolution: "1344x768" },
    gpt: { file: results.gpt ? path.basename(results.gpt) : null, model: "gpt-image-2", resolution: "1536x1024", quality: "high" },
  },
  elapsedSeconds: elapsed,
};
fs.writeFileSync(path.join(OUTPUT_DIR, "comparison-meta.json"), JSON.stringify(meta, null, 2));
console.log("\nMetadata saved to comparison-meta.json");
