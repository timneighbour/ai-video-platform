import * as jose from "jose";

const JWT_SECRET = process.env.JWT_SECRET;
const APP_ID = process.env.VITE_APP_ID;
const OWNER_OPEN_ID = process.env.OWNER_OPEN_ID;
const OWNER_NAME = process.env.OWNER_NAME;
const BASE_URL = "http://localhost:3000";
const COOKIE_NAME = "app_session_id";

const secret = new TextEncoder().encode(JWT_SECRET);
const expirationSeconds = Math.floor((Date.now() + 365 * 24 * 60 * 60 * 1000) / 1000);

const token = await new jose.SignJWT({ 
  openId: OWNER_OPEN_ID,
  appId: APP_ID,
  name: OWNER_NAME || "Tim",
})
  .setProtectedHeader({ alg: "HS256", typ: "JWT" })
  .setExpirationTime(expirationSeconds)
  .sign(secret);

console.log("Triggering render for job 690007...");

const response = await fetch(`${BASE_URL}/api/trpc/musicVideo.startRender`, {
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
  console.log("✅ Render started for job 690007!");
  console.log("   Response:", JSON.stringify(data?.result?.data?.json || data).substring(0, 200));
} else {
  console.error("❌ Render start failed:", response.status, text.substring(0, 800));
}
