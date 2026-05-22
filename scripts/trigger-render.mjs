/**
 * Trigger startRender for the showcase job via the local tRPC API.
 * Uses jose (same library as the server) to create a valid session cookie.
 *
 * Usage: node scripts/trigger-render.mjs
 */
import { SignJWT } from "jose";

const JOB_ID = 690005;
const OWNER_OPEN_ID = "MPtNk7V8XUiyp7GcfLr2KS"; // Tim Neighbour
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

// Create a session token using the same format as sdk.createSessionToken
const secretKey = new TextEncoder().encode(JWT_SECRET);
const issuedAt = Date.now();
const expirationSeconds = Math.floor((issuedAt + ONE_YEAR_MS) / 1000);

const token = await new SignJWT({
  openId: OWNER_OPEN_ID,
  appId: APP_ID,
  name: OWNER_NAME,
})
  .setProtectedHeader({ alg: "HS256", typ: "JWT" })
  .setExpirationTime(expirationSeconds)
  .sign(secretKey);

console.log(`Created session token for openId=${OWNER_OPEN_ID}`);
console.log(`APP_ID: ${APP_ID}`);
console.log(`Calling startRender for job ${JOB_ID}...`);

// Call startRender via tRPC
const response = await fetch(
  `${API_BASE}/api/trpc/musicVideo.startRender?batch=1`,
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
console.log(`Response: ${text.substring(0, 1000)}`);
