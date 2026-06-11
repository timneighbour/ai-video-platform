/**
 * Regenerate Scene 2 (930003) storyboard image in 16:9 (1344×768) with Zara performance prompt.
 * This replaces the incorrect 1024×1024 Pianist storyboard with a correct 16:9 Zara singing image.
 */
import { fal } from "@fal-ai/client";
import mysql from "mysql2/promise";
// Inline storage upload using the Forge API proxy (mirrors server/storage.ts)
const FORGE_API_URL = process.env.BUILT_IN_FORGE_API_URL;
const FORGE_API_KEY = process.env.BUILT_IN_FORGE_API_KEY;

async function storagePut(relKey, data, contentType) {
  const key = relKey.replace(/^\/+/, "");
  const uploadUrl = new URL("v1/storage/upload", FORGE_API_URL.endsWith("/") ? FORGE_API_URL : FORGE_API_URL + "/");
  uploadUrl.searchParams.set("path", key);
  const blob = new Blob([data], { type: contentType });
  const form = new FormData();
  form.append("file", blob, key.split("/").pop() ?? key);
  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${FORGE_API_KEY}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Storage upload failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return { key, url: json.url };
}

const FAL_KEY = process.env.FAL_AI_API_KEY;
if (!FAL_KEY) throw new Error("FAL_AI_API_KEY not set");

fal.config({ credentials: FAL_KEY });

const SCENE_ID = 930003;
const JOB_ID = 1080001;

// Zara's locked description + performance context at 12s (vocal entry)
const ZARA_DESCRIPTION = `A full-length standing figure of Zara, a very attractive young woman in her mid-20s, with an average build and typical physique, exuding pop star vibes. Her long, straight, jet-black hair cascades down her back, framing a face with seductive, bright green eyes and a confident, slightly smirking expression. She wears a sleek, form-fitting black cocktail dress that reaches just above her knees, featuring a subtle side slit on the left thigh.`;

// New performance prompt: Zara begins singing at 12s inside Lyndhurst Hall
const NEW_PROMPT = `Cinematic wide shot, Zara steps forward to the microphone stand at the centre of Lyndhurst Hall as she begins to sing. ${ZARA_DESCRIPTION} She stands tall, mouth slightly open in song, one hand raised expressively. The grand piano is visible behind her, the orchestra seated in the background. The large hexagonal acoustic canopy hangs above. Warm golden light from above, cool blue light from Gothic arched windows. Dramatic, emotional atmosphere. 16:9 widescreen cinematic composition.`;

async function main() {
  console.log("[Regen] Generating 16:9 storyboard for Scene 2 (930003) — Zara performance at 12s");

  // Generate the image using fal.ai flux-pro with landscape_16_9
  const result = await fal.subscribe("fal-ai/flux-pro/v1.1-ultra", {
    input: {
      prompt: NEW_PROMPT,
      aspect_ratio: "16:9",
      output_format: "jpeg",
      safety_tolerance: "5",
    },
    logs: true,
  });

  const imageUrl = result.data?.images?.[0]?.url;
  if (!imageUrl) throw new Error("No image URL in fal response: " + JSON.stringify(result));
  console.log("[Regen] Generated image URL:", imageUrl);

  // Download the image
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`Failed to download image: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  console.log("[Regen] Downloaded image:", buffer.length, "bytes");

  // Upload to S3
  const fileKey = `generated/${Date.now()}-scene2-regen-16x9.jpg`;
  const { url: s3Url } = await storagePut(fileKey, buffer, "image/jpeg");
  console.log("[Regen] Uploaded to S3:", s3Url);

  // Update DB: new prompt + new previewImageUrl + reset to pending for re-render
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  await conn.execute(
    `UPDATE musicVideoScenes SET prompt=?, previewImageUrl=?, previewImageKey=?, mvSceneStatus='pending', videoUrl=NULL, videoKey=NULL, taskId=NULL, errorMessage=NULL, retryCount=0, updatedAt=NOW() WHERE id=? AND jobId=?`,
    [NEW_PROMPT, s3Url, fileKey, SCENE_ID, JOB_ID]
  );
  console.log("[Regen] DB updated — Scene 2 reset to pending with new 16:9 storyboard");
  await conn.end();
}

main().catch(err => { console.error("[Regen] FAILED:", err); process.exit(1); });
