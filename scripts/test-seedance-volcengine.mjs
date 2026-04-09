/**
 * Test Seedance via Volcengine Ark API
 */
import axios from "axios";

const key = process.env.SEEDANCE_API_KEY;
console.log("Key prefix:", key?.substring(0, 15));

const headers = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

// Test: Create a minimal task (expect 200 with task ID, or 400 for validation)
try {
  const res = await axios.post(
    "https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks",
    {
      model: "doubao-seedance-2-0-260128",
      content: [{ type: "text", text: "A serene mountain landscape at sunset" }],
      generate_audio: false,
    },
    { headers, timeout: 30000 }
  );
  console.log("✅ Seedance Volcengine:", res.status, JSON.stringify(res.data).substring(0, 200));
} catch (e) {
  const s = e.response?.status;
  const d = JSON.stringify(e.response?.data ?? e.message).substring(0, 200);
  if (s === 400 || s === 422 || s === 402) {
    console.log("✅ Seedance (auth OK, validation/quota issue):", s, d);
  } else if (s === 401 || s === 403) {
    console.log("❌ Seedance (auth failed):", s, d);
  } else {
    console.log("❌ Seedance:", s ?? "net", d);
  }
}
