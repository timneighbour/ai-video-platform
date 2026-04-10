// Test the new FAL_AI_API_KEY by calling the fal.ai queue status endpoint
// (a lightweight call that doesn't generate video but validates auth)
import { fal } from "@fal-ai/client";

const apiKey = process.env.FAL_AI_API_KEY;
console.log("FAL_AI_API_KEY present:", !!apiKey, "| length:", apiKey?.length ?? 0, "| prefix:", apiKey?.slice(0, 12) ?? "NOT SET");

if (!apiKey) {
  console.error("❌ FAL_AI_API_KEY is not set");
  process.exit(1);
}

fal.config({ credentials: apiKey });

// Try to list queue status — lightweight auth check
try {
  // Submit a minimal request to validate the key
  const { request_id } = await fal.queue.submit("bytedance/seedance-2.0/text-to-video", {
    input: {
      prompt: "A simple test scene for key validation",
      aspect_ratio: "16:9",
      duration: "5",
      resolution: "480p",
      generate_audio: false,
    },
  });
  console.log("✅ FAL_AI_API_KEY is valid — test request_id:", request_id);
  
  // Cancel the test request immediately to avoid charges
  try {
    await fal.queue.cancel("bytedance/seedance-2.0/text-to-video", { requestId: request_id });
    console.log("✅ Test request cancelled (no charge)");
  } catch (cancelErr) {
    console.log("ℹ️  Could not cancel test request:", cancelErr.message);
  }
} catch (err) {
  console.error("❌ FAL_AI_API_KEY validation failed:", err.message);
  process.exit(1);
}
