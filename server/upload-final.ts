import { storagePut } from "./storage";
import { readFileSync } from "fs";

async function main() {
  const data = readFileSync("/tmp/final-assembly-v3/final-full.mp4");
  const { url } = await storagePut(
    "music-videos/final-full-11scenes-" + Date.now() + ".mp4",
    data,
    "video/mp4"
  );
  console.log("URL:", url);
  process.exit(0);
}
main();
