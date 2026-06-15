import { fal } from "@fal-ai/client";
import * as fs from "fs";
import axios from "axios";

const ZARA_PORTRAIT_CDN_URL = "https://wiz-ai.b-cdn.net/manus-storage/zara-character-portrait_365c4dd1.jpg";

const PROMPT_1 = "A young woman with long straight jet-black hair and pale porcelain skin, wearing a black leather corset and black leather trench coat, standing centre-stage inside a grand baroque concert hall with ornate gold-leaf architecture and tall arched windows, warm amber god-ray lighting streaming through the windows behind her, orchestra visible in the background, she is singing with intense emotional expression, eyes forward, slight head tilt, mouth open mid-note, cinematic close-up head and shoulders framing, shallow depth of field, film grain, photorealistic, 8K quality, dramatic stage lighting, Air Studios atmosphere";

const NEG_PROMPT = "microphone, pop filter, mic stand, grey background, empty room, green screen, cartoon, illustration, fringe, bangs, brown hair, blonde hair, second person, duplicate character, watermark";

async function main() {
  const apiKey = process.env.FAL_AI_API_KEY;
  if (!apiKey) throw new Error("FAL_AI_API_KEY not set");
  fal.config({ credentials: apiKey });

  try {
    console.log("Submitting still 1 with full prompt...");
    const result = await fal.subscribe("fal-ai/flux-pulid", {
      input: {
        prompt: PROMPT_1,
        reference_image_url: ZARA_PORTRAIT_CDN_URL,
        image_size: "square_hd",
        num_inference_steps: 28,
        guidance_scale: 4.5,
        id_weight: 1.4,
        negative_prompt: NEG_PROMPT,
        seed: 1000,
        enable_safety_checker: false,
      },
      logs: true,
      pollInterval: 3000,
      onQueueUpdate: (update) => {
        console.log("Status:", update.status);
      },
    }) as any;
    console.log("SUCCESS:", JSON.stringify(result).slice(0, 300));
    
    // Download and save
    const imageUrl = result.data?.images?.[0]?.url;
    if (imageUrl) {
      const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
      fs.mkdirSync("/home/ubuntu/zara-audit/gate1-stills", { recursive: true });
      fs.writeFileSync("/home/ubuntu/zara-audit/gate1-stills/still-01.jpg", response.data);
      console.log("Saved to /home/ubuntu/zara-audit/gate1-stills/still-01.jpg");
    }
  } catch (e: any) {
    console.error("ERROR:", e.message);
    console.error("STATUS:", e.status);
    console.error("BODY:", JSON.stringify(e.body ?? "").slice(0, 500));
  }
}

main().catch(e => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
