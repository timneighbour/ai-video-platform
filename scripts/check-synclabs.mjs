import { createRequire } from "module";
const require = createRequire(import.meta.url);
require("dotenv").config();

const key = process.env.SYNC_LABS_API_KEY;
console.log("SYNC_LABS_API_KEY configured:", !!key, key ? "(length: " + key.length + ")" : "(MISSING)");

if (!key) {
  console.error("ERROR: SYNC_LABS_API_KEY is not set — lip sync will be silently skipped!");
  process.exit(1);
}

// Test the Sync Labs API with a simple GET request
try {
  const resp = await fetch("https://api.sync.so/v2/generations", {
    method: "GET",
    headers: {
      "x-api-key": key,
      "Content-Type": "application/json",
    },
  });
  console.log("Sync Labs API status:", resp.status, resp.statusText);
  if (resp.ok) {
    const data = await resp.json();
    console.log("Sync Labs API reachable — recent jobs:", JSON.stringify(data).slice(0, 200));
  } else {
    const text = await resp.text();
    console.error("Sync Labs API error:", text.slice(0, 300));
  }
} catch (e) {
  console.error("Sync Labs API fetch failed:", e.message);
}
