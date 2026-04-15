/**
 * API Health Check Script
 * Run with: npx tsx server/scripts/check-apis.ts
 */
import * as dotenv from "dotenv";
dotenv.config();

interface CheckResult {
  service: string;
  status: "ok" | "error" | "missing_key";
  message: string;
  latency?: number;
}

async function checkWaveSpeed(): Promise<CheckResult> {
  const key = process.env.WAVESPEED_API_KEY;
  if (!key) return { service: "WaveSpeed AI", status: "missing_key", message: "WAVESPEED_API_KEY not set" };
  const start = Date.now();
  try {
    const resp = await fetch("https://api.wavespeed.ai/api/v3/predictions", {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(10000),
    });
    const latency = Date.now() - start;
    if (resp.status === 200 || resp.status === 404) return { service: "WaveSpeed AI", status: "ok", message: "Connected ✓", latency };
    if (resp.status === 401 || resp.status === 403) return { service: "WaveSpeed AI", status: "error", message: `Auth failed (${resp.status}) — check key`, latency };
    return { service: "WaveSpeed AI", status: "ok", message: `Reachable (${resp.status})`, latency };
  } catch (e) { return { service: "WaveSpeed AI", status: "error", message: `Connection failed: ${e}` }; }
}

async function checkFalAI(): Promise<CheckResult> {
  const key = process.env.FAL_AI_API_KEY;
  if (!key) return { service: "fal.ai", status: "missing_key", message: "FAL_AI_API_KEY not set" };
  const start = Date.now();
  try {
    const resp = await fetch("https://queue.fal.run/fal-ai/fast-sdxl", {
      headers: { Authorization: `Key ${key}` },
      signal: AbortSignal.timeout(10000),
    });
    const latency = Date.now() - start;
    if (resp.status === 404 || resp.status === 200 || resp.status === 405) return { service: "fal.ai", status: "ok", message: "Connected ✓", latency };
    if (resp.status === 401 || resp.status === 403) return { service: "fal.ai", status: "error", message: `Auth failed (${resp.status}) — check key`, latency };
    return { service: "fal.ai", status: "ok", message: `Reachable (${resp.status})`, latency };
  } catch (e) { return { service: "fal.ai", status: "error", message: `Connection failed: ${e}` }; }
}

async function checkKlingAI(): Promise<CheckResult> {
  const accessKey = process.env.KLING_AI_ACCESS_KEY;
  const secretKey = process.env.KLING_AI_SECRET_KEY;
  if (!accessKey || !secretKey) return { service: "Kling AI", status: "missing_key", message: "KLING_AI_ACCESS_KEY or KLING_AI_SECRET_KEY not set" };
  const start = Date.now();
  try {
    const { createHmac } = await import("crypto");
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({ iss: accessKey, exp: now + 1800, nbf: now - 5 })).toString("base64url");
    const signature = createHmac("sha256", secretKey).update(`${header}.${payload}`).digest("base64url");
    const token = `${header}.${payload}.${signature}`;
    const resp = await fetch("https://api.klingai.com/v1/videos/text2video", {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
    });
    const latency = Date.now() - start;
    if (resp.status === 200 || resp.status === 404) return { service: "Kling AI", status: "ok", message: "Connected ✓", latency };
    if (resp.status === 401 || resp.status === 403) return { service: "Kling AI", status: "error", message: `Auth failed (${resp.status}) — check keys`, latency };
    return { service: "Kling AI", status: "ok", message: `Reachable (${resp.status})`, latency };
  } catch (e) { return { service: "Kling AI", status: "error", message: `Connection failed: ${e}` }; }
}

async function checkRunwayML(): Promise<CheckResult> {
  const key = process.env.RUNWAY_ML_API_KEY;
  if (!key) return { service: "Runway ML", status: "missing_key", message: "RUNWAY_ML_API_KEY not set" };
  const start = Date.now();
  try {
    const resp = await fetch("https://api.dev.runwayml.com/v1/tasks", {
      headers: { Authorization: `Bearer ${key}`, "X-Runway-Version": "2024-11-06" },
      signal: AbortSignal.timeout(10000),
    });
    const latency = Date.now() - start;
    if (resp.status === 200 || resp.status === 404) return { service: "Runway ML", status: "ok", message: "Connected ✓", latency };
    if (resp.status === 401 || resp.status === 403) return { service: "Runway ML", status: "error", message: `Auth failed (${resp.status}) — check key`, latency };
    return { service: "Runway ML", status: "ok", message: `Reachable (${resp.status})`, latency };
  } catch (e) { return { service: "Runway ML", status: "error", message: `Connection failed: ${e}` }; }
}

async function checkHeyGen(): Promise<CheckResult> {
  const key = process.env.HEYGEN_API_KEY;
  if (!key) return { service: "HeyGen", status: "missing_key", message: "HEYGEN_API_KEY not set" };
  const start = Date.now();
  try {
    const resp = await fetch("https://api.heygen.com/v2/user/remaining_quota", {
      headers: { "X-Api-Key": key },
      signal: AbortSignal.timeout(10000),
    });
    const latency = Date.now() - start;
    if (resp.status === 200) {
      const body = await resp.json().catch(() => ({})) as { data?: Record<string, unknown> };
      return { service: "HeyGen", status: "ok", message: `Connected ✓ | Quota: ${JSON.stringify(body.data ?? "unknown")}`, latency };
    }
    if (resp.status === 401 || resp.status === 403) return { service: "HeyGen", status: "error", message: `Auth failed (${resp.status}) — check key`, latency };
    return { service: "HeyGen", status: "ok", message: `Reachable (${resp.status})`, latency };
  } catch (e) { return { service: "HeyGen", status: "error", message: `Connection failed: ${e}` }; }
}

async function checkSuno(): Promise<CheckResult> {
  const key = process.env.SUNO_API_KEY;
  if (!key) return { service: "Suno AI", status: "missing_key", message: "SUNO_API_KEY not set" };
  // Suno uses a cookie-based auth — just check if key is present and non-empty
  if (key.length < 10) return { service: "Suno AI", status: "error", message: "SUNO_API_KEY appears invalid (too short)" };
  return { service: "Suno AI", status: "ok", message: "Key present ✓ (Suno uses session-based auth)" };
}

async function checkResend(): Promise<CheckResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { service: "Resend (Email)", status: "missing_key", message: "RESEND_API_KEY not set" };
  const start = Date.now();
  try {
    const resp = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(10000),
    });
    const latency = Date.now() - start;
    if (resp.status === 200) {
      const body = await resp.json().catch(() => ({})) as { data?: Array<{ name: string; status: string }> };
      const domains = body.data?.map((d) => `${d.name} (${d.status})`).join(", ") || "none";
      return { service: "Resend (Email)", status: "ok", message: `Connected ✓ | Domains: ${domains}`, latency };
    }
    if (resp.status === 401 || resp.status === 403) return { service: "Resend (Email)", status: "error", message: `Auth failed (${resp.status}) — check key`, latency };
    return { service: "Resend (Email)", status: "ok", message: `Reachable (${resp.status})`, latency };
  } catch (e) { return { service: "Resend (Email)", status: "error", message: `Connection failed: ${e}` }; }
}

async function checkStripe(): Promise<CheckResult> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return { service: "Stripe", status: "missing_key", message: "STRIPE_SECRET_KEY not set" };
  const start = Date.now();
  try {
    const resp = await fetch("https://api.stripe.com/v1/balance", {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(10000),
    });
    const latency = Date.now() - start;
    if (resp.status === 200) {
      const body = await resp.json().catch(() => ({})) as { available?: Array<{ amount: number; currency: string }> };
      const bal = body.available?.map((b) => `${b.currency.toUpperCase()} ${(b.amount / 100).toFixed(2)}`).join(", ") || "unknown";
      const mode = key.startsWith("sk_test_") ? "TEST MODE" : "LIVE MODE";
      return { service: "Stripe", status: "ok", message: `Connected ✓ | ${mode} | Balance: ${bal}`, latency };
    }
    return { service: "Stripe", status: "error", message: `Auth failed (${resp.status})`, latency };
  } catch (e) { return { service: "Stripe", status: "error", message: `Connection failed: ${e}` }; }
}

async function main() {
  console.log("\n🔍 WizVid API Health Check\n" + "=".repeat(70));
  const checks = await Promise.all([
    checkWaveSpeed(), checkFalAI(), checkKlingAI(), checkRunwayML(),
    checkHeyGen(), checkSuno(), checkResend(), checkStripe(),
  ]);
  let allOk = true;
  for (const result of checks) {
    const icon = result.status === "ok" ? "✅" : result.status === "missing_key" ? "⚠️ " : "❌";
    const latency = result.latency ? ` (${result.latency}ms)` : "";
    console.log(`${icon} ${result.service.padEnd(22)} ${result.message}${latency}`);
    if (result.status !== "ok") allOk = false;
  }
  console.log("\n" + "=".repeat(70));
  console.log(allOk ? "✅ All APIs operational\n" : "⚠️  Some APIs need attention — see above\n");
}

main().catch(console.error);
