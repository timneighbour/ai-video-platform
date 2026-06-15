import { storageGet } from './server/storage';
async function main() {
  const result = await storageGet('music-video-scenes/990015-vocal-stem-slice-1749955283.mp3');
  console.log('AUDIO_URL:', result.url);
  const imgResult = await storageGet('310519663500868908/ALJHDNsuNA7bExFuoQZUsx/zara-closeup-lipsync-v2.png');
  console.log('IMAGE_URL:', imgResult.url);
}
main().catch(console.error);
