/**
 * Retries all failed scenes in a given job via the tRPC API.
 * Usage: node scripts/retry-failed-scenes.mjs <jobId>
 */
import { SignJWT } from "jose";

const BASE_URL = "http://localhost:3000";
const COOKIE_NAME = "app_session_id";
const JOB_ID = parseInt(process.argv[2] ?? "540020", 10);

async function createSessionToken() {
  const ownerOpenId = process.env.OWNER_OPEN_ID;
  const jwtSecret = process.env.JWT_SECRET;
  const appId = process.env.VITE_APP_ID;
  if (!ownerOpenId || !jwtSecret || !appId) {
    throw new Error(`Missing env vars: OWNER_OPEN_ID=${ownerOpenId}, JWT_SECRET=${!!jwtSecret}, VITE_APP_ID=${appId}`);
  }
  const secretKey = new TextEncoder().encode(jwtSecret);
  const expiresAt = Math.floor((Date.now() + 365 * 24 * 60 * 60 * 1000) / 1000);
  return new SignJWT({ openId: ownerOpenId, appId, name: "Tim Neighbour" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expiresAt)
    .sign(secretKey);
}

async function trpcCall(procedure, input, sessionToken, method = "POST") {
  let url = `${BASE_URL}/api/trpc/musicVideo.${procedure}`;
  let body = undefined;
  if (method === "GET") {
    url += `?input=${encodeURIComponent(JSON.stringify({ json: input }))}`;
  } else {
    body = JSON.stringify({ json: input });
  }
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json", Cookie: `${COOKIE_NAME}=${sessionToken}` },
    body,
  });
  const data = await res.json();
  if (data?.error) throw new Error(JSON.stringify(data.error.json?.message ?? data.error));
  return data?.result?.data?.json ?? data?.result?.data;
}

async function main() {
  console.log(`\n🔄 Retrying all failed scenes in Job ${JOB_ID}...\n`);
  const token = await createSessionToken();

  // First check the job status
  const job = await trpcCall("getJob", { jobId: JOB_ID }, token, "GET");
  console.log(`Job: ${job?.title ?? "Unknown"} | Status: ${job?.status ?? "Unknown"}`);

  const result = await trpcCall("retryAllFailedScenes", { jobId: JOB_ID }, token);
  console.log(`\n✅ Retry result:`, JSON.stringify(result, null, 2));
  console.log(`\nMonitor at: https://wiz-ai.io/wizpilot`);
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
