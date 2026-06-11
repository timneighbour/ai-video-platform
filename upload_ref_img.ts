import { storagePut } from './server/storage';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const imgPath = '/home/ubuntu/webdev-static-assets/air-studios-lyndhurst-hall-official.jpg';
  const buffer = fs.readFileSync(imgPath);
  const key = `venue-references/lyndhurst-hall-official-${Date.now()}.jpg`;
  const result = await storagePut(key, buffer, 'image/jpeg');
  console.log('Uploaded! Key:', result.key);
  console.log('URL:', result.url);
}
main().catch(e => console.error('ERROR:', e.message));
