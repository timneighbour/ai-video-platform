import * as jose from "jose";

const JWT_SECRET = process.env.JWT_SECRET;
const APP_ID = process.env.VITE_APP_ID;
const OWNER_OPEN_ID = process.env.OWNER_OPEN_ID;
const OWNER_NAME = process.env.OWNER_NAME;
const BASE_URL = "http://localhost:3000";
const COOKIE_NAME = "app_session_id";

// Match the exact SDK signSession format:
// payload: { openId, appId, name }
// secret: JWT_SECRET (raw, not combined with APP_ID)
const secret = new TextEncoder().encode(JWT_SECRET);
const expiresInMs = 365 * 24 * 60 * 60 * 1000;
const expirationSeconds = Math.floor((Date.now() + expiresInMs) / 1000);

const token = await new jose.SignJWT({ 
  openId: OWNER_OPEN_ID,
  appId: APP_ID,
  name: OWNER_NAME || "Tim",
})
  .setProtectedHeader({ alg: "HS256", typ: "JWT" })
  .setExpirationTime(expirationSeconds)
  .sign(secret);

console.log("Token created. Generating storyboard for job 690007...");

const response = await fetch(`${BASE_URL}/api/trpc/musicVideo.generateStoryboard`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Cookie": `${COOKIE_NAME}=${token}`,
  },
  body: JSON.stringify({ json: { jobId: 690007 } }),
});

const text = await response.text();
let data;
try { data = JSON.parse(text); } catch { data = text; }

if (response.ok) {
  const result = data?.result?.data?.json;
  console.log("✅ Storyboard generated!");
  console.log("   Scenes:", result?.scenes?.length || "unknown");
  if (result?.scenes) {
    result.scenes.forEach((s, i) => {
      const type = s.sceneType || s.type || "unknown";
      const start = s.startTime ?? "?";
      const end = s.endTime ?? (s.startTime + s.duration) ?? "?";
      console.log(`   Scene ${i}: [${type}] ${start}s→${end}s | ${(s.prompt || "").substring(0, 90)}`);
    });
  }
} else {
  console.error("❌ Storyboard generation failed:", response.status, text.substring(0, 800));
}
