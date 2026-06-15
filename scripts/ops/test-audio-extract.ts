import { extractSceneAudioClip } from './server/audio-clip-extractor';

const audioUrl = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-audio/1-1778788890320.mp3';

console.log('Testing audio extraction for scene 600001 (startTime=0, duration=5)...');
try {
  const clipUrl = await extractSceneAudioClip(audioUrl, 0, 5, 600001);
  console.log('SUCCESS! Clip URL:', clipUrl);
} catch (err: any) {
  console.error('FAILED:', err.message);
  console.error(err.stack);
}
