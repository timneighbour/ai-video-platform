/**
 * Upload Air Studios reference images to the public S3 bucket
 * so they have permanent, non-expiring, non-signed URLs.
 */
import { readFileSync } from "fs";
import { storagePut } from "./server/storage.js";

const files = [
  {
    localPath: "/home/ubuntu/webdev-static-assets/air-studios-lyndhurst-hall-ref2.jpg",
    key: "venue-refs/air-studios-lyndhurst-hall-ref2.jpg",
    label: "Air Studios Lyndhurst Hall (primary, full colour)",
  },
  {
    localPath: "/home/ubuntu/webdev-static-assets/air-studios-lyndhurst-hall-ref.jpg",
    key: "venue-refs/air-studios-lyndhurst-hall-ref.jpg",
    label: "Air Studios Lyndhurst Hall (secondary)",
  },
];

for (const f of files) {
  const buf = readFileSync(f.localPath);
  const { url } = await storagePut(f.key, buf, "image/jpeg");
  console.log(`✓ ${f.label}`);
  console.log(`  URL: ${url}`);
}
