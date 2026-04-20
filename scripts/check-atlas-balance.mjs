import axios from "axios";

const key = process.env.ATLAS_CLOUD_API_KEY;
console.log("Atlas Cloud API key present:", !!key, key ? `(length: ${key.length})` : "MISSING");

const headers = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
const BASE = "https://api.atlascloud.ai/api/v1";

async function tryEndpoint(label, url) {
  try {
    const r = await axios.get(url, { headers, timeout: 12000 });
    console.log(`\n=== ${label} ===`);
    console.log(JSON.stringify(r.data, null, 2));
  } catch (e) {
    console.log(`\n${label}: ${e.response?.status ?? "network error"} — ${JSON.stringify(e.response?.data ?? e.message)}`);
  }
}

await tryEndpoint("Account", `${BASE}/account`);
await tryEndpoint("Balance", `${BASE}/balance`);
await tryEndpoint("User", `${BASE}/user`);
await tryEndpoint("Credits", `${BASE}/credits`);
await tryEndpoint("Me", `${BASE}/me`);
await tryEndpoint("Wallet", `${BASE}/wallet`);

// Also check the 2 failed prediction IDs from the audit
const failedIds = [
  "b98311330d0d470f9819a7b4f2a8284b",
  "139c63a72a054b1ba49b667c34ac59e4"
];
for (const id of failedIds) {
  try {
    const r = await axios.get(`${BASE}/model/prediction/${id}`, { headers, timeout: 12000 });
    console.log(`\n=== Prediction ${id} ===`);
    console.log(JSON.stringify(r.data, null, 2));
  } catch (e) {
    console.log(`\nPrediction ${id}: ${e.response?.status ?? "network error"} — ${JSON.stringify(e.response?.data ?? e.message)}`);
  }
}
