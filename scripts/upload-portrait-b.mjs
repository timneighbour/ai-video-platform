/**
 * Upload Portrait B (Zara) to S3 via the Forge storage API
 * and update the videoCharacters table for job 720001
 */
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

const _require = createRequire(import.meta.url);
const dotenv = _require('dotenv');
dotenv.config({ path: path.join(process.cwd(), '.env') });

const FORGE_URL = process.env.BUILT_IN_FORGE_API_URL;
const FORGE_KEY = process.env.BUILT_IN_FORGE_API_KEY;

if (!FORGE_URL || !FORGE_KEY) {
  console.error('Missing BUILT_IN_FORGE_API_URL or BUILT_IN_FORGE_API_KEY');
  process.exit(1);
}

async function uploadFile(localPath, remoteKey) {
  const fileBuffer = fs.readFileSync(localPath);
  const fileSize = fileBuffer.length;
  console.log(`Uploading ${localPath} (${fileSize} bytes) to ${remoteKey}...`);

  // Use the Forge storage upload endpoint
  const formData = new FormData();
  const blob = new Blob([fileBuffer], { type: 'image/jpeg' });
  formData.append('file', blob, path.basename(localPath));

  const url = `${FORGE_URL}/v1/storage/upload?path=${encodeURIComponent(remoteKey)}`;
  console.log('POST', url);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${FORGE_KEY}`,
    },
    body: formData,
  });

  const text = await response.text();
  console.log('Response status:', response.status);
  console.log('Response:', text.slice(0, 500));
  
  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status} ${text}`);
  }
  
  const data = JSON.parse(text);
  return data.url || data.cdn_url || data.publicUrl;
}

try {
  const url = await uploadFile('/tmp/zara-portrait-b.png', 'characters/zara-portrait-b-v2.jpg');
  console.log('\n✅ Portrait B uploaded successfully!');
  console.log('Public URL:', url);
} catch (err) {
  console.error('Upload failed:', err.message);
  process.exit(1);
}
