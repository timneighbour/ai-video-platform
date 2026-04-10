// Check both Seedance API keys
const falKey = process.env.FAL_AI_API_KEY;
const seedanceKey = process.env.SEEDANCE_API_KEY;

console.log("=== API Key Status ===");
console.log("FAL_AI_API_KEY present:", !!falKey, "| length:", falKey?.length ?? 0, "| prefix:", falKey?.slice(0,12) ?? "NOT SET");
console.log("SEEDANCE_API_KEY present:", !!seedanceKey, "| length:", seedanceKey?.length ?? 0, "| prefix:", seedanceKey?.slice(0,8) ?? "NOT SET");

// Test the direct Volcengine Seedance API with a minimal request
if (seedanceKey) {
  const { default: axios } = await import("axios");
  try {
    const response = await axios.post(
      "https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks",
      {
        model: "doubao-seedance-2-0-260128",
        content: [{ type: "text", text: "A simple test scene" }],
        generate_audio: false,
      },
      {
        headers: {
          Authorization: `Bearer ${seedanceKey}`,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      }
    );
    console.log("\n✅ Direct Seedance API: OK — task_id:", response.data.id);
  } catch (err) {
    console.log("\n❌ Direct Seedance API error:", err.response?.status, err.response?.data?.error?.message || err.message);
  }
} else {
  console.log("\n⚠️  SEEDANCE_API_KEY not set — cannot test direct API");
}
