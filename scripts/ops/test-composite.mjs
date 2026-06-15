import { compositeCinematicScene } from './server/cinematic-composite-service.ts';

const lipSyncUrl = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-scenes/750027-infinitetalk-1779472213523.mp4';
const seedanceUrl = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-scenes/750027-1779471972725.mp4';

console.log('Starting composite test for scene 750027...');
try {
  const url = await compositeCinematicScene(lipSyncUrl, seedanceUrl, 750027, 6);
  console.log('SUCCESS:', url);
} catch (err) {
  console.error('FAILED:', err.message);
  console.error(err.stack?.slice(0, 800));
}
