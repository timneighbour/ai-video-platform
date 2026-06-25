/**
 * Upload head+shoulders crop to S3, then run Flux Kontext Max
 * on the CloudFront URL for photorealistic face enhancement.
 */
import { storagePut } from "../server/storage";
import axios from "axios";
import fs from "fs";

const AIML_API_KEY = process.env.AIML_API_KEY!;
const CROP_PATH = "/tmp/zara-head-shoulders-crop.png";

async function main() {
  // Step 1: Upload crop to S3
  console.log("Uploading crop to S3...");
  const buf = fs.readFileSync(CROP_PATH);
  const { url: cropS3Url } = await storagePut(
    `character-refs/900002/zara-headshot-crop-768-${Date.now()}.png`,
    buf,
    "image/png"
  );
  console.log("Crop S3 URL:", cropS3Url);

  // Step 2: Flux Kontext Max — photorealistic enhancement on the crop
  console.log("\nRunning Flux Kontext Max on crop...");
  const resp = await axios.post(
    "https://api.aimlapi.com/v1/images/generations",
    {
      model: "flux/kontext-max/image-to-image",
      image_url: cropS3Url,
      prompt:
        "Photorealistic portrait enhancement. Keep this exact character — same face, " +
        "same jet-black straight hair, same features, same black sleeveless dress, " +
        "same diamond necklace. Make the skin texture photorealistic, sharpen the eyes " +
        "and facial features so they look like a real photograph. Do not distort the face, " +
        "do not change the eye shape or position. Professional studio portrait quality.",
      aspect_ratio: "1:1",
      safety_tolerance: "2",
      output_format: "png",
    },
    {
      headers: {
        Authorization: `Bearer ${AIML_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 120_000,
    }
  );

  const enhancedUrl: string =
    resp.data?.data?.[0]?.url ||
    resp.data?.images?.[0]?.url ||
    resp.data?.url;

  if (!enhancedUrl) {
    console.error("No URL in response:", JSON.stringify(resp.data).slice(0, 300));
    process.exit(1);
  }
  console.log("Enhanced URL (AI/ML CDN):", enhancedUrl);

  // Step 3: Download and re-upload to S3
  const imgResp = await axios.get(enhancedUrl, { responseType: "arraybuffer", timeout: 60_000 });
  const { url: finalS3Url } = await storagePut(
    `character-refs/900002/zara-headshot-enhanced-kontext-${Date.now()}.png`,
    Buffer.from(imgResp.data),
    "image/png"
  );
  console.log("\n✅ FINAL Enhanced portrait S3 URL:", finalS3Url);
}

main().catch((e) => {
  console.error("FATAL:", e.message);
  if (e.response?.data) console.error(JSON.stringify(e.response.data).slice(0, 500));
  process.exit(1);
});
