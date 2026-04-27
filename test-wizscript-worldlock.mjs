/**
 * WizScript World-Lock Live Test
 * Tests the two-pass AI storyboard generation for 3 prompts.
 * Runs directly against the LLM API using the server env.
 */
import { config } from "dotenv";
import { writeFileSync } from "fs";
config();

const FORGE_URL = (process.env.BUILT_IN_FORGE_API_URL || "").replace(/\/+$/, "");
const FORGE_KEY = process.env.BUILT_IN_FORGE_API_KEY;

if (!FORGE_URL || !FORGE_KEY) {
  console.error("ERROR: BUILT_IN_FORGE_API_URL or BUILT_IN_FORGE_API_KEY not set");
  process.exit(1);
}

const LLM_URL = `${FORGE_URL}/v1/chat/completions`;
const IMAGE_URL = `${FORGE_URL}/images.v1.ImageService/GenerateImage`;
const STORAGE_UPLOAD_URL = `${FORGE_URL}/v1/storage/upload`;

const TEST_PROMPTS = [
  {
    id: 1,
    prompt: "A lone astronaut walking across a red Martian landscape at sunset, cinematic slow motion",
    style: "Cinematic",
  },
  {
    id: 2,
    prompt: "A medieval knight riding through a foggy forest at dawn, dark fantasy, cinematic",
    style: "Dark Fantasy",
  },
  {
    id: 3,
    prompt: "A young girl in a yellow raincoat standing in a flooded neon city street at night",
    style: "Cinematic",
  },
];

async function invokeLLM(messages, responseFormat) {
  const body = {
    model: "gemini-2.5-flash",
    messages,
    ...(responseFormat ? { response_format: responseFormat } : {}),
  };
  const res = await fetch(LLM_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${FORGE_KEY}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LLM error ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

async function generateAndUploadImage(prompt) {
  // Step 1: Generate image via Connect Protocol endpoint
  const res = await fetch(IMAGE_URL, {
    method: "POST",
    headers: {
      "accept": "application/json",
      "content-type": "application/json",
      "connect-protocol-version": "1",
      Authorization: `Bearer ${FORGE_KEY}`,
    },
    body: JSON.stringify({ prompt, original_images: [] }),
  });

  const rawText = await res.text().catch(() => "");
  if (!res.ok) {
    throw new Error(`Image generation failed (${res.status}): ${rawText.slice(0, 200)}`);
  }

  let result;
  try {
    result = JSON.parse(rawText);
  } catch {
    throw new Error(`Image generation returned non-JSON: ${rawText.slice(0, 200)}`);
  }

  const base64Data = result?.image?.b64Json;
  const mimeType = result?.image?.mimeType || "image/png";
  if (!base64Data) {
    throw new Error(`No image data in response: ${JSON.stringify(result).slice(0, 200)}`);
  }

  // Step 2: Upload to S3 via storage proxy
  const buffer = Buffer.from(base64Data, "base64");
  const fileKey = `test-wizscript/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
  const uploadUrl = new URL(`${FORGE_URL}/v1/storage/upload`);
  uploadUrl.searchParams.set("path", fileKey);

  const blob = new Blob([buffer], { type: mimeType });
  const form = new FormData();
  form.append("file", blob, fileKey.split("/").pop());

  const uploadRes = await fetch(uploadUrl.toString(), {
    method: "POST",
    headers: { Authorization: `Bearer ${FORGE_KEY}` },
    body: form,
  });

  if (!uploadRes.ok) {
    const msg = await uploadRes.text().catch(() => uploadRes.statusText);
    throw new Error(`Storage upload failed (${uploadRes.status}): ${msg}`);
  }

  const uploadData = await uploadRes.json();
  return uploadData.url;
}

async function runTest({ id, prompt, style }) {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`TEST ${id}: "${prompt}"`);
  console.log("=".repeat(70));

  // ── Pass 1: World-lock extraction ──────────────────────────────────────
  console.log("\n[Pass 1] Extracting world bible...");
  const worldLockResponse = await invokeLLM(
    [
      {
        role: "system",
        content: `You are a film director's assistant. Your job is to extract a precise, locked "world bible" from a user's video prompt.
You must identify and lock:
- main_subject: the exact subject (person, creature, object) — include age, build, gender if described
- costume: exact clothing, suit, colors, accessories — be specific
- setting: exact location, time of day, weather, atmosphere
- tone: cinematic mood (e.g. "epic slow-motion", "tense thriller", "warm nostalgic")
- camera_style: preferred shot types and movement style
- action_progression: a logical 3-6 step sequence of what happens in the scene from start to finish
Return ONLY valid JSON. No commentary.`,
      },
      {
        role: "user",
        content: `Extract the world bible for this video prompt: "${prompt}"`,
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
            costume: { type: "string" },
            setting: { type: "string" },
            tone: { type: "string" },
            camera_style: { type: "string" },
            action_progression: { type: "array", items: { type: "string" } },
          },
          required: ["main_subject", "costume", "setting", "tone", "camera_style", "action_progression"],
          additionalProperties: false,
        },
      },
    }
  );

  const raw = worldLockResponse.choices[0]?.message?.content ?? "{}";
  const worldBible = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));

  console.log("\n📖 WORLD BIBLE:");
  console.log(`  Subject:     ${worldBible.main_subject}`);
  console.log(`  Costume:     ${worldBible.costume}`);
  console.log(`  Setting:     ${worldBible.setting}`);
  console.log(`  Tone:        ${worldBible.tone}`);
  console.log(`  Camera:      ${worldBible.camera_style}`);
  console.log(`  Progression: ${worldBible.action_progression.join(" → ")}`);

  const consistencyAnchor = [
    `Subject: ${worldBible.main_subject}.`,
    `Costume/appearance: ${worldBible.costume}.`,
    `Setting: ${worldBible.setting}.`,
    `Tone: ${worldBible.tone}.`,
    `Camera style: ${worldBible.camera_style}.`,
  ].join(" ");

  // ── Pass 2: Scene generation ────────────────────────────────────────────
  console.log("\n[Pass 2] Generating 3 locked scenes...");
  const actionSteps = worldBible.action_progression.slice(0, 3);
  while (actionSteps.length < 3) actionSteps.push(`Continue the narrative (scene ${actionSteps.length + 1})`);

  const scenesResponse = await invokeLLM(
    [
      {
        role: "system",
        content: `You are a film director breaking a single continuous scene into sequential shots for a storyboard.
You have a locked world bible. Every scene MUST use the EXACT same subject, costume, setting, and visual identity.
NEVER introduce new characters, new locations, or symbolic cutaways unless the user explicitly asked for them.
Each scene should feel like the next shot in the same film — same world, same subject, same costume, continuous narrative.
Return ONLY valid JSON. No commentary.`,
      },
      {
        role: "user",
        content: `World bible:\n${consistencyAnchor}\n\nOriginal prompt: "${prompt}"\nStyle: ${style}\n\nGenerate exactly 3 sequential storyboard scenes. Each scene must:\n1. Feature the EXACT same subject with the EXACT same costume/appearance as described in the world bible\n2. Stay in the EXACT same setting as described in the world bible\n3. Progress the action logically: ${actionSteps.join(" → ")}\n4. Include a specific camera shot type and movement\n\nAction steps to cover: ${actionSteps.map((s, i) => `Scene ${i + 1}: ${s}`).join(", ")}`,
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

  const rawScenes = scenesResponse.choices[0]?.message?.content ?? "{}";
  const parsedScenes = JSON.parse(typeof rawScenes === "string" ? rawScenes : JSON.stringify(rawScenes));
  const scenes = parsedScenes.scenes.slice(0, 3).map((s, i) => ({
    id: i + 1,
    title: s.title,
    description: s.description,
    visualNotes: `${consistencyAnchor} ${s.visualNotes}`,
    duration: s.duration,
  }));

  console.log("\n🎬 GENERATED SCENES:");
  for (const scene of scenes) {
    console.log(`\n  Scene ${scene.id}: ${scene.title}`);
    console.log(`  Description: ${scene.description}`);
    console.log(`  Duration: ${scene.duration}`);
  }

  // ── Image generation ────────────────────────────────────────────────────
  console.log("\n[Pass 3] Generating preview images (with consistency anchor)...");
  const imageUrls = [];
  for (const scene of scenes) {
    const imagePrompt = [
      `${style} style cinematic video scene.`,
      consistencyAnchor,
      `Scene: ${scene.title}.`,
      scene.description,
      `Visual direction: ${scene.visualNotes}`,
      "High quality, detailed, 16:9 aspect ratio, consistent character appearance throughout.",
    ].join(" ");

    console.log(`  Generating image for Scene ${scene.id}: "${scene.title}"...`);
    try {
      const url = await generateAndUploadImage(imagePrompt);
      imageUrls.push({ sceneId: scene.id, title: scene.title, url });
      console.log(`  ✓ Scene ${scene.id}: ${url}`);
    } catch (err) {
      console.log(`  ✗ Scene ${scene.id} failed: ${err.message}`);
      imageUrls.push({ sceneId: scene.id, title: scene.title, url: null, error: err.message });
    }
  }

  return { id, prompt, worldBible, consistencyAnchor, scenes, imageUrls };
}

async function main() {
  console.log("WizScript World-Lock Live Test");
  console.log(`Forge URL: ${FORGE_URL}`);
  console.log("Running 3 test prompts...\n");

  const results = [];
  for (const test of TEST_PROMPTS) {
    try {
      const result = await runTest(test);
      results.push(result);
    } catch (err) {
      console.error(`\nTest ${test.id} FAILED:`, err.message);
      results.push({ id: test.id, prompt: test.prompt, error: err.message });
    }
  }

  writeFileSync("/home/ubuntu/wizscript-test-results.json", JSON.stringify(results, null, 2));
  console.log("\n\nResults saved to /home/ubuntu/wizscript-test-results.json");

  console.log("\n\n" + "=".repeat(70));
  console.log("CONSISTENCY VERIFICATION SUMMARY");
  console.log("=".repeat(70));
  for (const r of results) {
    if (r.error) {
      console.log(`\nTest ${r.id}: FAILED — ${r.error}`);
      continue;
    }
    const imagesOk = r.imageUrls.filter(i => i.url).length;
    console.log(`\nTest ${r.id}: "${r.prompt.slice(0, 60)}..."`);
    console.log(`  World Bible locked:       ✓`);
    console.log(`  Subject locked:           ${r.worldBible.main_subject}`);
    console.log(`  Costume locked:           ${r.worldBible.costume}`);
    console.log(`  Setting locked:           ${r.worldBible.setting}`);
    console.log(`  All 3 scenes generated:   ${r.scenes.length === 3 ? "✓" : "✗ " + r.scenes.length}`);
    console.log(`  Preview images generated: ${imagesOk}/3 ${imagesOk === 3 ? "✓" : "⚠"}`);
    for (const img of r.imageUrls) {
      console.log(`    Scene ${img.sceneId} (${img.title}): ${img.url || "FAILED: " + img.error}`);
    }
  }
}

main().catch(console.error);
