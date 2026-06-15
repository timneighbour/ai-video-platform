import { storagePut } from './server/storage';
import axios from 'axios';

async function main() {
  const videoUrl = 'https://atlas-media.oss-us-west-1.aliyuncs.com/videos/cgt-20260611101754-v48h8-0.mp4';
  console.log('Downloading video...');
  const response = await axios.get(videoUrl, { responseType: 'arraybuffer', timeout: 60_000 });
  const buffer = Buffer.from(response.data);
  console.log(`Downloaded ${buffer.length} bytes. Uploading to CDN...`);
  const key = `test-renders/scene10-ref-test-${Date.now()}.mp4`;
  const result = await storagePut(key, buffer, 'video/mp4');
  console.log('CDN URL:', result.url);
}
main().catch(e => console.error('ERROR:', e.message));
