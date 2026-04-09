/**
 * Probe multiple Seedance proxy platforms to find which one the sk- key belongs to
 */
import axios from "axios";

const key = process.env.SEEDANCE_API_KEY;
console.log("Key prefix:", key?.substring(0, 20), "length:", key?.length);

const headers = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

const platforms = [
  // fal.ai
  {
    name: "fal.ai",
    method: "GET",
    url: "https://fal.run/fal-ai/seedance-1-5/requests",
    headers: { ...headers, "fal-key": key },
    body: null,
  },
  // piapi.ai
  {
    name: "piapi.ai",
    method: "GET",
    url: "https://api.piapi.ai/api/v1/task",
    headers: { ...headers, "x-api-key": key },
    body: null,
  },
  // 302.ai
  {
    name: "302.ai",
    method: "POST",
    url: "https://api.302.ai/v1/video/seedance",
    headers,
    body: { prompt: "test" },
  },
  // replicate.com
  {
    name: "replicate.com",
    method: "GET",
    url: "https://api.replicate.com/v1/account",
    headers: { Authorization: `Token ${key}` },
    body: null,
  },
  // openrouter
  {
    name: "openrouter.ai",
    method: "GET",
    url: "https://openrouter.ai/api/v1/auth/key",
    headers,
    body: null,
  },
  // together.ai
  {
    name: "together.ai",
    method: "GET",
    url: "https://api.together.xyz/v1/models",
    headers,
    body: null,
  },
  // wavespeed.ai
  {
    name: "wavespeed.ai",
    method: "POST",
    url: "https://api.wavespeed.ai/api/v2/bytedance/seedance-1-5-pro/t2v",
    headers,
    body: { prompt: "test", duration: 5 },
  },
  // segmind
  {
    name: "segmind.com",
    method: "POST",
    url: "https://api.segmind.com/v1/seedance-1-5-pro-t2v",
    headers,
    body: { prompt: "test" },
  },
];

for (const p of platforms) {
  try {
    const config = {
      method: p.method,
      url: p.url,
      headers: p.headers,
      timeout: 10000,
    };
    if (p.body) config.data = p.body;
    const res = await axios(config);
    console.log(`✅ ${p.name}:`, res.status, JSON.stringify(res.data).substring(0, 100));
  } catch (e) {
    const s = e.response?.status;
    const d = JSON.stringify(e.response?.data ?? e.message).substring(0, 100);
    if (s === 400 || s === 422 || s === 402 || s === 404) {
      console.log(`✅ ${p.name} (auth OK):`, s, d);
    } else if (s === 401 || s === 403) {
      console.log(`❌ ${p.name} (auth fail):`, s, d.substring(0, 60));
    } else {
      console.log(`? ${p.name}:`, s ?? "net", d.substring(0, 60));
    }
  }
}
