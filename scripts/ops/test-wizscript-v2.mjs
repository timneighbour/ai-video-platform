/**
 * WizScript World-Lock V2 Test
 * Tests the upgraded exact character specification system
 * Reports all 10 character spec fields + final image prompts + preview images
 */
import { createRequire } from "module";
import { writeFileSync, mkdirSync } from "fs";
import path from "path";

const require = createRequire(import.meta.url);

// Load env
const dotenv = require("dotenv");
dotenv.config({ path: "/home/ubuntu/ai-video-platform/.env" });

const FORGE_API_URL = process.env.BUILT_IN_FORGE_API_URL;
const FORGE_API_KEY = process.env.BUILT_IN_FORGE_API_KEY;

if (!FORGE_API_URL || !FORGE_API_KEY) {
  console.error("Missing BUILT_IN_FORGE_API_URL or BUILT_IN_FORGE_API_KEY");
  process.exit(1);
}

const OUTPUT_DIR = "/home/ubuntu/wizscript-test-v2";
mkdirSync(OUTPUT_DIR, { recursive: true });

async function invokeLLM(messages, responseFormat) {
  const baseUrl = FORGE_API_URL.endsWith("/") ? FORGE_API_URL : `${FORGE_API_URL}/`;
  const url = new URL("v1/chat/completions", baseUrl).toString();
  const body = { messages };
  if (responseFormat) body.response_format = responseFormat;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${FORGE_API_KEY}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LLM error ${res.status}: ${err}`);
  }
  return res.json();
}

async function generateImage(prompt) {
  const baseUrl = FORGE_API_URL.endsWith("/") ? FORGE_API_URL : `${FORGE_API_URL}/`;
  const url = new URL("images.v1.ImageService/GenerateImage", baseUrl).toString();
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "accept": "application/json",
      "content-type": "application/json",
      "connect-protocol-version": "1",
      Authorization: `Bearer ${FORGE_API_KEY}`,
    },
    body: JSON.stringify({ prompt, original_images: [] }),
  });
  const rawText = await res.text().catch(() => "");
  if (!res.ok) {
    throw new Error(`Image error ${res.status}: ${rawText.slice(0, 200)}`);
  }
  let data;
  try { data = JSON.parse(rawText); } catch { throw new Error(`Non-JSON image response: ${rawText.slice(0, 200)}`); }
  const b64 = data?.image?.b64Json;
  if (!b64) throw new Error(`No image data in response: ${JSON.stringify(data).slice(0, 200)}`);
  return Buffer.from(b64, "base64");
}

async function runTest(testNum, prompt, style = "cinematic") {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`TEST ${testNum}: ${prompt}`);
  console.log("=".repeat(70));

  // ── Pass 1: World-lock with exact character spec ──────────────────────────
  console.log("\n[Pass 1] Extracting exact character specification...");
  const worldLockResponse = await invokeLLM(
    [
      {
        role: "system",
        content: `You are a film director's assistant. Your job is to extract a precise, locked "world bible" and exact character specification from a user's video prompt.
You must identify and lock EVERY visual detail so that an image AI can reproduce the EXACT same character in every scene with zero drift.
Be hyper-specific. Do not use vague terms like "standard" or "typical". Infer plausible specific details if not stated.
Examples of the level of detail required:
- face_identity: "young woman, early 20s, pale skin, sharp cheekbones, dark brown eyes, no visible makeup"
- age_range: "early 20s"
- body_proportions: "slender build, average height, slight frame"
- clothing_details: "oversized bright yellow PVC raincoat, double-breasted with large collar, knee-length"
- colour_accents: "bright canary yellow coat, black buttons, white shirt collar visible at neck"
- footwear_details: "tall black rubber Wellington boots, knee-high, matte finish, no visible branding"
- headwear_state: "no hat, hood of raincoat down, wet dark hair plastered to face"
- props_accessories: "no bag, hands at sides, no umbrella"
- companion_details: "none" (or e.g. "black warhorse, full barding armour, dark mane")
Return ONLY valid JSON. No commentary.`,
      },
      {
        role: "user",
        content: `Extract the complete world bible and exact character specification for this video prompt: "${prompt}"`,
      },
    ],
    {
      type: "json_schema",
      json_schema: {
        name: "world_bible",
        strict: true,
        schema: {
          type: "object",
          properties: {
            main_subject: { type: "string" },
            face_identity: { type: "string" },
            age_range: { type: "string" },
            body_proportions: { type: "string" },
            clothing_details: { type: "string" },
            colour_accents: { type: "string" },
            footwear_details: { type: "string" },
            headwear_state: { type: "string" },
            props_accessories: { type: "string" },
            companion_details: { type: "string" },
            setting: { type: "string" },
            tone: { type: "string" },
            camera_style: { type: "string" },
            action_progression: { type: "array", items: { type: "string" } },
          },
          required: [
            "main_subject", "face_identity", "age_range", "body_proportions",
            "clothing_details", "colour_accents", "footwear_details", "headwear_state",
            "props_accessories", "companion_details", "setting", "tone",
            "camera_style", "action_progression",
          ],
          additionalProperties: false,
        },
      },
    }
  );

  const wb = JSON.parse(worldLockResponse.choices[0].message.content);

  console.log("\n📖 LOCKED WORLD BIBLE + EXACT CHARACTER SPEC:");
  console.log(`  Subject:           ${wb.main_subject}`);
  console.log(`  Face/identity:     ${wb.face_identity}`);
  console.log(`  Age range:         ${wb.age_range}`);
  console.log(`  Body proportions:  ${wb.body_proportions}`);
  console.log(`  Clothing details:  ${wb.clothing_details}`);
  console.log(`  Colour accents:    ${wb.colour_accents}`);
  console.log(`  Footwear details:  ${wb.footwear_details}`);
  console.log(`  Headwear state:    ${wb.headwear_state}`);
  console.log(`  Props/accessories: ${wb.props_accessories}`);
  console.log(`  Companion:         ${wb.companion_details}`);
  console.log(`  Setting:           ${wb.setting}`);
  console.log(`  Tone:              ${wb.tone}`);
  console.log(`  Camera style:      ${wb.camera_style}`);
  console.log(`  Action progression: ${wb.action_progression.join(" → ")}`);

  // Build rich consistency anchor
  const consistencyAnchor = [
    `Subject: ${wb.main_subject}.`,
    `Face/identity: ${wb.face_identity}.`,
    `Age: ${wb.age_range}.`,
    `Build: ${wb.body_proportions}.`,
    `Clothing: ${wb.clothing_details}.`,
    `Colours: ${wb.colour_accents}.`,
    `Footwear: ${wb.footwear_details}.`,
    `Headwear/helmet: ${wb.headwear_state}.`,
    `Props/accessories: ${wb.props_accessories}.`,
    wb.companion_details && wb.companion_details !== "none"
      ? `Companion: ${wb.companion_details}.`
      : "",
    `Setting: ${wb.setting}.`,
    `Tone: ${wb.tone}.`,
    `Camera: ${wb.camera_style}.`,
  ]
    .filter(Boolean)
    .join(" ");

  // ── Pass 2: Scene generation ──────────────────────────────────────────────
  console.log("\n[Pass 2] Generating scenes from locked spec...");
  const actionSteps = wb.action_progression.slice(0, 3);
  while (actionSteps.length < 3) actionSteps.push(`Continue the narrative (scene ${actionSteps.length + 1})`);

  const scenesResponse = await invokeLLM(
    [
      {
        role: "system",
        content: `You are a film director breaking a single continuous scene into sequential shots for a storyboard.
You have a locked world bible with an exact character specification. Every scene MUST:
- Use the EXACT same face/identity, age, build, clothing, colours, footwear, headwear state, props, and companion as locked below
- Stay in the EXACT same setting
- NEVER change the character's costume, footwear, or helmet state between scenes unless the action explicitly requires it
- NEVER introduce new characters, new locations, or symbolic cutaways unless the user explicitly asked for them
- Each scene description MUST explicitly name the locked costume/footwear/headwear details so the image AI cannot drift
Each scene should feel like the next shot in the same film — same world, same character, continuous narrative.
Return ONLY valid JSON. No commentary.`,
      },
      {
        role: "user",
        content: `LOCKED CHARACTER SPECIFICATION (must be repeated explicitly in every scene description):
${consistencyAnchor}

Original prompt: "${prompt}"
Style: ${style}

Generate exactly 3 sequential storyboard scenes. Each scene must:
1. Feature the EXACT same character with the EXACT same face, clothing (${wb.clothing_details}), footwear (${wb.footwear_details}), and headwear state (${wb.headwear_state})
2. Stay in the EXACT same setting: ${wb.setting}
3. Progress the action logically: ${actionSteps.join(" → ")}
4. Include a specific camera shot type and movement
5. In the scene description, explicitly name the character's clothing, footwear, and headwear — do NOT just say "same as before"

Action steps to cover: ${actionSteps.map((s, i) => `Scene ${i + 1}: ${s}`).join(", ")}`,
      },
    ],
    {
      type: "json_schema",
      json_schema: {
        name: "storyboard_scenes",
        strict: true,
        schema: {
          type: "object",
          properties: {
            scenes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  visualNotes: { type: "string" },
                  duration: { type: "string" },
                },
                required: ["title", "description", "visualNotes", "duration"],
                additionalProperties: false,
              },
            },
          },
          required: ["scenes"],
          additionalProperties: false,
        },
      },
    }
  );

  const { scenes } = JSON.parse(scenesResponse.choices[0].message.content);

  console.log("\n🎬 GENERATED SCENES:");
  const finalPrompts = [];
  for (let i = 0; i < scenes.length; i++) {
    const s = scenes[i];
    const finalPrompt = `${consistencyAnchor} ${s.visualNotes} ${s.description}`;
    finalPrompts.push(finalPrompt);
    console.log(`\n  Scene ${i + 1}: ${s.title}`);
    console.log(`  Description: ${s.description}`);
    console.log(`  Visual notes: ${s.visualNotes}`);
    console.log(`\n  FINAL IMAGE PROMPT SENT TO AI:`);
    console.log(`  "${finalPrompt}"`);
  }

  // ── Pass 3: Generate preview images ──────────────────────────────────────
  console.log("\n[Pass 3] Generating preview images...");
  const imageFiles = [];
  for (let i = 0; i < finalPrompts.length; i++) {
    console.log(`  Generating scene ${i + 1} image...`);
    try {
      const imgBuffer = await generateImage(finalPrompts[i]);
      const filename = path.join(OUTPUT_DIR, `test${testNum}-scene${i + 1}.png`);
      writeFileSync(filename, imgBuffer);
      imageFiles.push(filename);
      console.log(`  ✅ Saved: ${filename}`);
    } catch (err) {
      console.error(`  ❌ Image ${i + 1} failed: ${err.message}`);
      imageFiles.push(null);
    }
  }

  return { wb, scenes, finalPrompts, imageFiles };
}

// Run only Test 3 (retry after transient LLM error)
const prompts = [
  "A young girl in a yellow raincoat standing in a flooded neon city street at night",
];

const results = [];
for (let i = 0; i < prompts.length; i++) {
  const result = await runTest(3, prompts[i]);
  results.push(result);
}

// Save full results JSON
writeFileSync(
  path.join(OUTPUT_DIR, "results.json"),
  JSON.stringify(results, null, 2)
);

console.log("\n\n✅ All tests complete. Results saved to", OUTPUT_DIR);
console.log("\nImage files:");
results.forEach((r, i) => {
  r.imageFiles.forEach((f, j) => {
    console.log(`  Test ${i + 1} Scene ${j + 1}: ${f || "FAILED"}`);
  });
});
