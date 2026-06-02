/**
 * Generate a benchmark vocal track via Suno API for Job 870022.
 * The track must have:
 * - Clear vocal entry
 * - Instrumental intro (4-8 bars)
 * - Dynamic build
 * - Usable vocal stem
 * - 60-90 second duration
 * - Realistic music-video structure
 */
import axios from "axios";
import fs from "fs";
import path from "path";
import https from "https";
import http from "http";

const SUNO_API_KEY = process.env.SUNO_API_KEY;
const SUNO_API_BASE = "https://api.sunoapi.org";

if (!SUNO_API_KEY) {
  console.error("SUNO_API_KEY not set");
  process.exit(1);
}

async function generateTrack() {
  console.log("[BenchmarkAudio] Generating vocal track via Suno V4...");
  
    const response = await axios.post(
    `${SUNO_API_BASE}/api/v1/generate`,
    {
      customMode: false,
      prompt: "cinematic pop ballad, female vocalist, instrumental intro 8 bars, emotional build, clear vocals, studio recording, 80 BPM, Air Studios feel, orchestral strings, dynamic crescendo",
      model: "V4",
      instrumental: false,
      callBackUrl: "https://aivideoplatform-aljhdnsu.manus.space/api/suno/callback"
    },
    {
      headers: {
        Authorization: `Bearer ${SUNO_API_KEY}`,
        "Content-Type": "application/json"
      },
      timeout: 30_000
    }
  );
  
  const dataField = response.data?.data;
  const taskData = Array.isArray(dataField) ? dataField[0] : dataField;
  const taskId = taskData?.taskId || response.data?.taskId;
  console.log("[BenchmarkAudio] Task created:", taskId, "| Full response:", JSON.stringify(response.data).slice(0, 200));
  return taskId;
}

async function pollTask(taskId, maxWaitMs = 300_000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    await new Promise(r => setTimeout(r, 10_000));
    
    const response = await axios.get(
      `${SUNO_API_BASE}/api/v1/generate/record-info?taskId=${taskId}`,
      {
        headers: { Authorization: `Bearer ${SUNO_API_KEY}` },
        timeout: 15_000
      }
    );
    
    const data = response.data?.data || {};
    const status = data.status;
    const sunoData = data.response?.sunoData || [];
    console.log(`[BenchmarkAudio] Poll: status=${status}, tracks=${sunoData.length}, raw=${JSON.stringify(response.data).slice(0, 150)}`);
    
    if (status === "SUCCESS" && sunoData.length > 0) {
      const track = sunoData[0];
      return { audioUrl: track.audioUrl, title: track.title, duration: track.duration };
    }
    if (status === "FAILED" || status === "failed") {
      throw new Error("Suno generation failed: " + JSON.stringify(response.data));
    }
  }
  throw new Error("Suno generation timed out after 5 minutes");
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http;
    const file = fs.createWriteStream(dest);
    protocol.get(url, (res) => {
      if (res.statusCode >= 400) {
        reject(new Error(`HTTP ${res.statusCode} downloading ${url}`));
        return;
      }
      res.pipe(file);
      file.on("finish", () => resolve(dest));
      file.on("error", reject);
    }).on("error", reject);
  });
}

try {
  const taskId = await generateTrack();
  console.log("[BenchmarkAudio] Waiting for Suno to generate track (may take 2-4 minutes)...");
  
  const track = await pollTask(taskId);
  console.log("[BenchmarkAudio] Track ready:", track.title, "| URL:", track.audioUrl, "| Duration:", track.duration);
  
  const outputPath = "/home/ubuntu/webdev-static-assets/benchmark-vocal-track.mp3";
  console.log("[BenchmarkAudio] Downloading to:", outputPath);
  await downloadFile(track.audioUrl, outputPath);
  
  const stat = fs.statSync(outputPath);
  console.log("[BenchmarkAudio] ✓ Downloaded:", stat.size, "bytes");
  console.log("[BenchmarkAudio] Track URL:", track.audioUrl);
  console.log("[BenchmarkAudio] Track title:", track.title);
  
  // Save metadata
  fs.writeFileSync("/home/ubuntu/webdev-static-assets/benchmark-track-meta.json", JSON.stringify({
    taskId,
    title: track.title,
    audioUrl: track.audioUrl,
    duration: track.duration,
    localPath: outputPath
  }, null, 2));
  
} catch (err) {
  console.error("[BenchmarkAudio] ✗ Failed:", err.message);
  process.exit(1);
}
