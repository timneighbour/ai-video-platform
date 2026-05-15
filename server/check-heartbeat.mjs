/**
 * check-heartbeat.mjs — check heartbeat job execution status
 * Run: node server/check-heartbeat.mjs
 */
import "dotenv/config";

const FORGE_URL = process.env.BUILT_IN_FORGE_API_URL;
const FORGE_KEY = process.env.BUILT_IN_FORGE_API_KEY;

const resp = await fetch(`${FORGE_URL}/api/v1/cron/list`, {
  method: "GET",
  headers: {
    "Authorization": `Bearer ${FORGE_KEY}`,
    "Content-Type": "application/json",
  },
});

const data = await resp.json();
console.log("Status:", resp.status);

if (data.jobs) {
  const dispatch = data.jobs.find(j => j.name === "scene-dispatch-heartbeat");
  if (dispatch) {
    console.log("\n=== scene-dispatch-heartbeat ===");
    console.log(JSON.stringify(dispatch, null, 2));
  } else {
    console.log("scene-dispatch-heartbeat not found in jobs list");
    console.log("All jobs:", data.jobs.map(j => j.name));
  }
} else {
  console.log("Response:", JSON.stringify(data, null, 2));
}
