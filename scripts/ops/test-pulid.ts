import { fal } from "@fal-ai/client";

async function main() {
  const apiKey = process.env.FAL_AI_API_KEY;
  if (!apiKey) {
    console.error("FAL_AI_API_KEY not set");
    process.exit(1);
  }
  fal.config({ credentials: apiKey });
  console.log("API key present:", apiKey.slice(0, 8) + "...");

  try {
    const result = await fal.subscribe("fal-ai/flux-pulid", {
      input: {
        prompt: "a woman with black hair standing in a concert hall, cinematic, photorealistic",
        reference_image_url: "https://wiz-ai.b-cdn.net/manus-storage/zara-character-portrait_365c4dd1.jpg",
        image_size: "landscape_16_9",
        num_inference_steps: 20,
        guidance_scale: 4,
        id_weight: 1.0,
        enable_safety_checker: false,
      },
      logs: false,
      pollInterval: 3000,
    }) as { data: { images: Array<{ url: string }>; seed: number } };

    console.log("SUCCESS");
    console.log("Image URL:", result.data?.images?.[0]?.url);
  } catch (e: any) {
    console.error("ERROR:", e.message);
    if (e.body) console.error("BODY:", JSON.stringify(e.body).slice(0, 500));
    if (e.status) console.error("STATUS:", e.status);
    if (e.cause) console.error("CAUSE:", e.cause);
  }
}

main();
