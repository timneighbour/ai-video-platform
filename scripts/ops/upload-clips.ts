import { storagePut } from "./server/storage";
import { readFileSync } from "fs";

async function main() {
  const clips = [
    { file: "/tmp/clip-0s.mp3", key: "audio-calibration/clip-0s.mp3", label: "0-6s" },
    { file: "/tmp/clip-6s.mp3", key: "audio-calibration/clip-6s.mp3", label: "6-12s" },
    { file: "/tmp/clip-12s.mp3", key: "audio-calibration/clip-12s.mp3", label: "12-18s" },
    { file: "/tmp/clip-18s.mp3", key: "audio-calibration/clip-18s.mp3", label: "18-24s" },
  ];
  for (const c of clips) {
    const buf = readFileSync(c.file);
    const { url } = await storagePut(c.key, buf, "audio/mpeg");
    console.log(`${c.label}: ${url}`);
  }
}

main().catch(console.error);
