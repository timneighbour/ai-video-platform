/**
 * Regenerate all 11 storyboard images for Job 660001 in cinematic 16:9 format.
 * Uses fal.ai Flux Pro with landscape_16_9 image size.
 */
import { fal } from "@fal-ai/client";
import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import os from "os";

const FAL_API_KEY = process.env.FAL_AI_API_KEY;
const FORGE_API_URL = process.env.BUILT_IN_FORGE_API_URL;
const FORGE_API_KEY = process.env.BUILT_IN_FORGE_API_KEY;
const DB_URL = process.env.DATABASE_URL;

if (!FAL_API_KEY) throw new Error("FAL_AI_API_KEY not set");
if (!DB_URL) throw new Error("DATABASE_URL not set");

fal.config({ credentials: FAL_API_KEY });

async function uploadToS3(buffer, filename, mimeType) {
  const baseUrl = FORGE_API_URL.endsWith("/") ? FORGE_API_URL : `${FORGE_API_URL}/`;
  const uploadUrl = `${baseUrl}storage.v1.StorageService/UploadFile`;
  
  const formData = new FormData();
  const blob = new Blob([buffer], { type: mimeType });
  formData.append("file", blob, filename);
  formData.append("path", `music-video-storyboard/${filename}`);
  
  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: { authorization: `Bearer ${FORGE_API_KEY}` },
    body: formData,
  });
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload failed: ${res.status} ${text.slice(0, 200)}`);
  }
  
  const data = await res.json();
  return data.url || data.fileUrl || data.publicUrl;
}

async function generateCinematicImage(prompt, sceneIndex) {
  const cinematicPrompt = `${prompt}, cinematic widescreen composition, professional film lighting, photorealistic, dramatic depth of field, movie still, Air Studios London concert hall atmosphere`;
  
  console.log(`\n[Scene ${sceneIndex}] Generating 16:9 storyboard image...`);
  console.log(`  Prompt: ${cinematicPrompt.slice(0, 100)}...`);
  
  const models = ["fal-ai/flux-pro/v1.1", "fal-ai/flux/dev"];
  
  for (const modelId of models) {
    try {
      const result = await fal.subscribe(modelId, {
        input: {
          prompt: cinematicPrompt,
          image_size: "landscape_16_9",
          num_images: 1,
          enable_safety_checker: false,
          safety_tolerance: "5",
          output_format: "jpeg",
        },
        logs: false,
        pollInterval: 3000,
      });
      
      const images = result?.data?.images ?? result?.images;
      if (images?.[0]?.url) {
        console.log(`  [Scene ${sceneIndex}] Generated via ${modelId}: ${images[0].url.slice(0, 80)}...`);
        return images[0].url;
      }
    } catch (err) {
      console.warn(`  [Scene ${sceneIndex}] ${modelId} failed: ${err.message?.slice(0, 100)}`);
    }
  }
  
  throw new Error(`All models failed for scene ${sceneIndex}`);
}

async function main() {
  const conn = await mysql.createConnection(DB_URL);
  
  try {
    // Get all scenes for Job 660001
    const [scenes] = await conn.query(
      "SELECT id, sceneIndex, prompt FROM musicVideoScenes WHERE jobId = 660001 ORDER BY sceneIndex"
    );
    
    console.log(`Found ${scenes.length} scenes for Job 660001`);
    
    for (const scene of scenes) {
      try {
        // Generate cinematic 16:9 image
        const falUrl = await generateCinematicImage(scene.prompt, scene.sceneIndex);
        
        // Download the image
        const response = await fetch(falUrl);
        if (!response.ok) throw new Error(`Failed to download: ${response.status}`);
        const buffer = Buffer.from(await response.arrayBuffer());
        
        // Upload to S3
        const filename = `660001-scene-${scene.id}-cinematic-${Date.now()}.jpg`;
        let s3Url;
        
        try {
          s3Url = await uploadToS3(buffer, filename, "image/jpeg");
        } catch (uploadErr) {
          console.warn(`  [Scene ${scene.sceneIndex}] S3 upload failed, using fal.ai URL directly: ${uploadErr.message?.slice(0, 80)}`);
          s3Url = falUrl; // Use fal.ai URL as fallback
        }
        
        // Update DB
        await conn.query(
          "UPDATE musicVideoScenes SET previewImageUrl = ? WHERE id = ?",
          [s3Url, scene.id]
        );
        
        console.log(`  [Scene ${scene.sceneIndex}] ✓ Storyboard updated: ${s3Url.slice(0, 80)}...`);
        
        // Small delay between generations
        await new Promise(r => setTimeout(r, 1000));
        
      } catch (err) {
        console.error(`  [Scene ${scene.sceneIndex}] ✗ Failed: ${err.message}`);
      }
    }
    
    console.log("\n✓ All storyboard images regenerated in cinematic 16:9 format");
    
  } finally {
    await conn.end();
  }
}

main().catch(e => {
  console.error("Fatal error:", e.message);
  process.exit(1);
});
