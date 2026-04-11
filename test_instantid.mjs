import { fal } from "@fal-ai/client";

fal.config({ credentials: process.env.FAL_AI_API_KEY });

// Use a publicly accessible portrait photo for testing
const testImageUrl = "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Camponotus_flavomarginatus_ant.jpg/320px-Camponotus_flavomarginatus_ant.jpg";

console.log("Testing fal-ai/instantid...");
try {
  const result = await fal.subscribe("fal-ai/instantid", {
    input: {
      face_image_url: testImageUrl,
      prompt: "Close-up portrait photo of a man, head and shoulders, looking at camera, studio lighting",
      style: "Headshot",
      num_inference_steps: 10,
    },
  });
  console.log("SUCCESS - data keys:", Object.keys(result.data || {}));
  console.log("Full response:", JSON.stringify(result.data, null, 2).substring(0, 800));
} catch (err) {
  console.error("ERROR:", err.message || err);
  if (err.body) console.error("Body:", JSON.stringify(err.body, null, 2).substring(0, 500));
  if (err.status) console.error("Status:", err.status);
}
