/**
 * Enhance the cropped Zara headshot via Flux SRPO image-to-image (AI/ML API)
 * Model: flux/srpo/image-to-image — super-resolution photorealistic output
 * Input:  768x768 cropped headshot (manus CDN URL)
 * Output: photorealistic enhanced portrait
 */
import axios from "axios";
import { storagePut } from "../server/storage";

const AIML_API_KEY = process.env.AIML_API_KEY;
// Use manus CDN URL — CloudFront is blocked by some AI/ML API models
const CROPPED_HEADSHOT_URL =
  "https://files.manuscdn.com/user_upload_by_module/session_file/310519663500868908/AWrUcFhonxKiQOFs.png";

async function main() {
  if (!AIML_API_KEY) throw new Error("AIML_API_KEY not set");

  console.log("=== Flux SRPO image-to-image (AI/ML API) ===");
  console.log("Input:", CROPPED_HEADSHOT_URL);

  const response = await axios.post(
    "https://api.aimlapi.com/v1/images/generations",
    {
      model: "flux/srpo/image-to-image",
      image_url: CROPPED_HEADSHOT_URL,
      prompt: "photorealistic portrait, sharp facial features, high resolution, professional studio lighting, detailed skin texture, natural looking face, 4K quality",
      num_inference_steps: 30,
      guidance_scale: 7.5,
      image_size: "1024x1024",
    },
    {
      headers: {
        Authorization: `Bearer ${AIML_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 180_000,
    }
  );

  console.log("API response status:", response.status);
  console.log("Response keys:", Object.keys(response.data));

  // Extract the enhanced image URL
  const enhancedUrl: string =
    response.data?.data?.[0]?.url ||
    response.data?.images?.[0]?.url ||
    response.data?.output?.image_url ||
    response.data?.url;

  if (!enhancedUrl) {
    console.error("Full response:", JSON.stringify(response.data, null, 2));
    throw new Error("No image URL in response");
  }

  console.log("\nEnhanced image URL (AI/ML API CDN):", enhancedUrl);

  // Download and re-upload to S3 for permanence
  console.log("\nDownloading and uploading to S3...");
  const imgResp = await axios.get(enhancedUrl, { responseType: "arraybuffer", timeout: 120_000 });
  const imgBuf = Buffer.from(imgResp.data);
  console.log(`Downloaded: ${imgBuf.length} bytes`);

  const { url: s3Url } = await storagePut(
    `character-refs/900002/zara-headshot-srpo-enhanced-${Date.now()}.png`,
    imgBuf,
    "image/png"
  );

  console.log("\n✅ Enhanced portrait S3 URL:", s3Url);
}

main().catch((e) => {
  console.error("FATAL:", e.message);
  if (e.response?.data) {
    console.error("API error:", JSON.stringify(e.response.data, null, 2).slice(0, 1000));
  }
  process.exit(1);
});
