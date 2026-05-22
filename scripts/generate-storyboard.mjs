/**
 * Generate storyboard for the showcase job via the local tRPC API.
 * Usage: node scripts/generate-storyboard.mjs
 */
import { SignJWT } from "jose";

const JOB_ID = 690005;
const OWNER_OPEN_ID = "MPtNk7V8XUiyp7GcfLr2KS";
const OWNER_NAME = "Tim Neighbour";
const APP_ID = process.env.VITE_APP_ID || "";
const JWT_SECRET = process.env.JWT_SECRET;
const API_BASE = "http://localhost:3000";
const COOKIE_NAME = "app_session_id";
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

if (!JWT_SECRET) {
  console.error("JWT_SECRET not set");
  process.exit(1);
}

const secretKey = new TextEncoder().encode(JWT_SECRET);
const expirationSeconds = Math.floor((Date.now() + ONE_YEAR_MS) / 1000);

const token = await new SignJWT({
  openId: OWNER_OPEN_ID,
  appId: APP_ID,
  name: OWNER_NAME,
})
  .setProtectedHeader({ alg: "HS256", typ: "JWT" })
  .setExpirationTime(expirationSeconds)
  .sign(secretKey);

console.log(`Calling generateStoryboard for job ${JOB_ID}...`);
console.log(`(This calls the LLM and may take 20-40 seconds)`);

const response = await fetch(
  `${API_BASE}/api/trpc/musicVideo.generateStoryboard?batch=1`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `${COOKIE_NAME}=${token}`,
    },
    body: JSON.stringify({
      "0": {
        json: { jobId: JOB_ID },
      },
    }),
  }
);

const text = await response.text();
console.log(`\nStatus: ${response.status}`);

if (response.status === 200) {
  try {
    const data = JSON.parse(text);
    const result = data[0]?.result?.data?.json;
    if (result) {
      console.log(`\nStoryboard generated!`);
      console.log(`Scene count: ${result.scenes?.length ?? "unknown"}`);
      console.log(`Job status: ${result.status ?? "unknown"}`);
      if (result.scenes) {
        result.scenes.forEach((s, i) => {
          console.log(`  Scene ${i + 1}: [${s.sceneType}] ${s.startTime}s-${s.endTime}s — ${s.description?.substring(0, 80)}...`);
        });
      }
    } else {
      console.log("Response:", text.substring(0, 500));
    }
  } catch {
    console.log("Response:", text.substring(0, 500));
  }
} else {
  console.log("Error response:", text.substring(0, 800));
}
