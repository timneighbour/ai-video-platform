/**
 * Test piapi.ai Seedance endpoints - auth seems to work (404 = endpoint not found, not 401)
 */
import axios from "axios";

const key = process.env.SEEDANCE_API_KEY;
const headers = {
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
  "x-api-key": key,
};

const endpoints = [
  // piapi.ai video generation endpoints
  ["POST", "https://api.piapi.ai/api/v1/task", {
    model: "seedance",
    task_type: "text_to_video",
    input: { prompt: "test", duration: 5 },
  }],
  ["POST", "https://api.piapi.ai/api/v1/task", {
    model: "kling",
    task_type: "text_to_video",
    input: { prompt: "test" },
  }],
  ["GET", "https://api.piapi.ai/api/v1/models", null],
  ["GET", "https://api.piapi.ai/v1/models", null],
  ["POST", "https://api.piapi.ai/v1/video/generations", {
    model: "seedance-1-5-pro",
    prompt: "test",
  }],
];

for (const [method, url, body] of endpoints) {
  try {
    const res = await axios({ method, url, headers, data: body, timeout: 15000 });
    console.log(`✅ ${url}:`, res.status, JSON.stringify(res.data).substring(0, 150));
  } catch (e) {
    const s = e.response?.status;
    const d = JSON.stringify(e.response?.data ?? e.message).substring(0, 150);
    if (s === 400 || s === 422 || s === 402) {
      console.log(`✅ (auth OK) ${url}:`, s, d);
    } else if (s === 401 || s === 403) {
      console.log(`❌ (auth fail) ${url}:`, s, d.substring(0, 80));
    } else {
      console.log(`? ${url}:`, s ?? "net", d.substring(0, 80));
    }
  }
}
