import { storagePut } from "../server/storage.js";
import { readFileSync } from "fs";

const buf = readFileSync("/tmp/infinitetalk-corrected/vocals-12-18s.mp3");
const key = "music-video-audio/probe-vocals-12-18s-v2.mp3";
const { url } = await storagePut(key, buf, "audio/mpeg");
console.log("Uploaded URL:", url);

// Verify content type
const resp = await fetch(url, { method: "HEAD" });
console.log("Content-Type:", resp.headers.get("content-type"));
console.log("HTTP:", resp.status);
