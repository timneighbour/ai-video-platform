/**
 * Gate 2 — Atlas Cloud Reference-to-Video
 * 
 * Uses Still 05 (integrated Zara-in-baroque-hall) as the reference image.
 * Uses the vocal stem audio for phoneme-accurate lip sync.
 * 
 * This is a SINGLE-PASS approach:
 * - Reference image anchors Zara's identity and the venue
 * - Audio drives lip sync directly from the waveform
 * - No compositing, no separate lip sync pass needed
 */

import axios from "axios";
import * as fs from "fs";
import * as path from "path";

const ATLAS_API_KEY = process.env.ATLAS_CLOUD_API_KEY;
if (!ATLAS_API_KEY) throw new Error("ATLAS_CLOUD_API_KEY not set");

const ATLAS_BASE = "https://api.atlascloud.ai/api/v1";
const OUTPUT_DIR = "/home/ubuntu/zara-audit/gate2-video";

// Still 05 — Zara already inside the baroque hall (best identity + venue match)
const STILL_05_URL = "https://wiz-ai.b-cdn.net/manus-storage/still-05_cd76408a.jpg";

// Vocal stem audio — the isolated vocal track for job 720001
// We'll use the full vocal stem URL from the database
const VOCAL_STEM_URL = "https://wiz-ai.b-cdn.net/manus-storage/vocal_stem_720001.mp3";

// Scene prompt — describes the performance, camera movement, and environment
const PROMPT = "A young woman with long straight jet-black hair and pale skin, wearing a black leather corset and black leather trench coat, performing emotionally inside a grand baroque concert hall with dramatic god-ray lighting streaming through tall arched windows, she is singing with intense emotional expression, eyes forward, head tilting slightly, subtle breathing movement, natural body sway, cinematic camera slowly pushing in toward her face, shallow depth of field, warm amber atmospheric lighting, orchestra audience silhouettes visible in background, film grain, photorealistic, Air Studios atmosphere, music video performance, no microphone";

interface AtlasResponse {
  data?: {
    id?: string;
    status?: string;
    output?: string[];
    error?: string;
  };
  code?: number;
  message?: string;
}

async function submitReferenceToVideo(referenceImageUrl: string, audioUrl: string): Promise<string> {
  console.log("[Gate2] Submitting Atlas Cloud reference-to-video...");
  console.log("[Gate2] Reference image:", referenceImageUrl);
  console.log("[Gate2] Audio:", audioUrl);

  const response = await axios.post<AtlasResponse>(
    `${ATLAS_BASE}/model/generateVideo`,
    {
      model: "bytedance/seedance-2.0/reference-to-video",
      prompt: PROMPT,
      reference_images: [referenceImageUrl],
      reference_audios: [audioUrl],
      duration: 8,
      resolution: "720p",
      generate_audio: false,
    },
    {
      headers: {
        Authorization: `Bearer ${ATLAS_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 30_000,
    }
  );

  const predictionId = response.data?.data?.id;
  if (!predictionId) {
    console.error("Response:", JSON.stringify(response.data).slice(0, 500));
    throw new Error("No prediction ID returned from Atlas Cloud");
  }

  console.log("[Gate2] Job submitted. Prediction ID:", predictionId);
  return predictionId;
}

async function pollPrediction(predictionId: string): Promise<string> {
  console.log("[Gate2] Polling for completion...");

  for (let attempt = 0; attempt < 60; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 10_000));

    const response = await axios.get<AtlasResponse>(
      `${ATLAS_BASE}/model/generateVideo/${predictionId}`,
      {
        headers: { Authorization: `Bearer ${ATLAS_API_KEY}` },
        timeout: 15_000,
      }
    );

    const status = response.data?.data?.status;
    const outputs = response.data?.data?.output;
    const error = response.data?.data?.error;

    console.log(`[Gate2] Attempt ${attempt + 1}: status=${status}`);

    if (status === "completed" && outputs?.length) {
      console.log("[Gate2] Completed! Video URL:", outputs[0]);
      return outputs[0];
    }

    if (status === "failed") {
      throw new Error(`Atlas Cloud job failed: ${error ?? "unknown error"}`);
    }
  }

  throw new Error("Atlas Cloud job timed out after 10 minutes");
}

async function getVocalStemUrl(): Promise<string> {
  // Try to get the vocal stem URL from the database via the project's db
  // For now, use the known URL from the job data
  // The vocal stem was stored as part of job 720001
  
  // First check if we have a local audio clip we can upload
  const localAudioPath = "/home/ubuntu/zara-audit/v2-probes/audio/scene-03.mp3";
  if (fs.existsSync(localAudioPath)) {
    console.log("[Gate2] Found local audio clip:", localAudioPath);
    // Upload it to get a CDN URL
    const { execSync } = require("child_process");
    const result = execSync(
      `cd /home/ubuntu/ai-video-platform && manus-upload-file --webdev ${localAudioPath} 2>&1`,
      { encoding: "utf8" }
    );
    const match = result.match(/Storage Path: (.+)/);
    if (match) {
      const cdnUrl = `https://wiz-ai.b-cdn.net${match[1].trim()}`;
      console.log("[Gate2] Audio uploaded to CDN:", cdnUrl);
      return cdnUrl;
    }
  }
  
  throw new Error("Could not find vocal stem audio. Run get-job-audio.ts first to extract audio clips.");
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Get vocal stem URL
  let audioUrl: string;
  try {
    audioUrl = await getVocalStemUrl();
  } catch (e: any) {
    console.error("[Gate2] Audio error:", e.message);
    console.log("[Gate2] Falling back to image-to-video (no lip sync)...");
    
    // Fall back to image-to-video without audio
    const response = await axios.post<AtlasResponse>(
      `${ATLAS_BASE}/model/generateVideo`,
      {
        model: "bytedance/seedance-2.0/image-to-video",
        prompt: PROMPT,
        image: STILL_05_URL,
        duration: 5,
        resolution: "720p",
        generate_audio: false,
      },
      {
        headers: {
          Authorization: `Bearer ${ATLAS_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 30_000,
      }
    );
    
    const predictionId = response.data?.data?.id;
    if (!predictionId) {
      console.error("Response:", JSON.stringify(response.data).slice(0, 500));
      throw new Error("No prediction ID from Atlas Cloud i2v");
    }
    
    console.log("[Gate2] i2v job submitted. ID:", predictionId);
    
    // Save job ID
    fs.writeFileSync(path.join(OUTPUT_DIR, "job-id.txt"), predictionId);
    
    const videoUrl = await pollPrediction(predictionId);
    
    const outputPath = path.join(OUTPUT_DIR, "gate2-i2v-clip.mp4");
    const dlResponse = await axios.get(videoUrl, { responseType: "arraybuffer" });
    fs.writeFileSync(outputPath, dlResponse.data);
    
    fs.writeFileSync(path.join(OUTPUT_DIR, "manifest.json"), JSON.stringify({
      mode: "image-to-video",
      predictionId,
      videoUrl,
      localPath: outputPath,
      referenceImageUrl: STILL_05_URL,
      completedAt: new Date().toISOString(),
    }, null, 2));
    
    console.log("[Gate2] === COMPLETE (image-to-video fallback) ===");
    console.log("[Gate2] Video:", outputPath);
    return;
  }

  // Full reference-to-video with lip sync
  const predictionId = await submitReferenceToVideo(STILL_05_URL, audioUrl);
  fs.writeFileSync(path.join(OUTPUT_DIR, "job-id.txt"), predictionId);

  const videoUrl = await pollPrediction(predictionId);

  const outputPath = path.join(OUTPUT_DIR, "gate2-r2v-clip.mp4");
  const dlResponse = await axios.get(videoUrl, { responseType: "arraybuffer" });
  fs.writeFileSync(outputPath, dlResponse.data);

  fs.writeFileSync(path.join(OUTPUT_DIR, "manifest.json"), JSON.stringify({
    mode: "reference-to-video",
    predictionId,
    videoUrl,
    localPath: outputPath,
    referenceImageUrl: STILL_05_URL,
    audioUrl,
    completedAt: new Date().toISOString(),
  }, null, 2));

  console.log("[Gate2] === COMPLETE ===");
  console.log("[Gate2] Video:", outputPath);
  console.log("[Gate2] URL:", videoUrl);
}

main().catch(e => {
  console.error("[Gate2] FATAL:", e.message);
  process.exit(1);
});
