/**
 * Test seedances.app API (https://api.seedance.ai/v1)
 */
import axios from "axios";

const key = process.env.SEEDANCE_API_KEY;
const headers = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

const endpoints = [
  // List videos (GET)
  ["GET", "https://api.seedance.ai/v1/videos", null],
  // Text to video
  ["POST", "https://api.seedance.ai/v1/generate/text-to-video", {
    prompt: "A beautiful sunset over mountains",
    duration: 5,
    style: "cinematic",
    resolution: "1080p",
  }],
];

for (const [method, url, body] of endpoints) {
  try {
    const res = await axios({ method, url, headers, data: body, timeout: 15000 });
    console.log(`✅ ${url}:`, res.status, JSON.stringify(res.data).substring(0, 200));
  } catch (e) {
    const s = e.response?.status;
    const d = JSON.stringify(e.response?.data ?? e.message).substring(0, 200);
    if (s === 400 || s === 422 || s === 402 || s === 404) {
      console.log(`✅ (auth OK) ${url}:`, s, d);
    } else if (s === 401 || s === 403) {
      console.log(`❌ (auth fail) ${url}:`, s, d.substring(0, 100));
    } else {
      console.log(`? ${url}:`, s ?? "net", d.substring(0, 100));
    }
  }
}
