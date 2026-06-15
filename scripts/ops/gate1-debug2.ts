import { fal } from "@fal-ai/client";

async function main() {
  const apiKey = process.env.FAL_AI_API_KEY;
  if (!apiKey) throw new Error("FAL_AI_API_KEY not set");
  fal.config({ credentials: apiKey });
  console.log("API key:", apiKey.slice(0, 8) + "...");

  // Check if flux-pulid model is accessible
  try {
    console.log("Testing flux-pulid availability...");
    const result = await fal.subscribe("fal-ai/flux-pulid", {
      input: {
        prompt: "a woman with black hair in a concert hall",
        reference_image_url: "https://wiz-ai.b-cdn.net/manus-storage/zara-character-portrait_365c4dd1.jpg",
        image_size: "square_hd",
        num_inference_steps: 20,
        guidance_scale: 4,
        id_weight: 1.0,
        enable_safety_checker: false,
      },
      logs: true,
      pollInterval: 5000,
      onQueueUpdate: (update) => {
        console.log("Queue update:", update.status);
      },
    }) as any;
    console.log("SUCCESS:", JSON.stringify(result).slice(0, 300));
  } catch (e: any) {
    console.error("ERROR type:", e.constructor.name);
    console.error("ERROR message:", e.message);
    console.error("ERROR status:", e.status);
    console.error("ERROR body:", JSON.stringify(e.body ?? "").slice(0, 500));
    console.error("FULL ERROR:", JSON.stringify(e, Object.getOwnPropertyNames(e)).slice(0, 1000));
  }
}

main().catch(e => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
