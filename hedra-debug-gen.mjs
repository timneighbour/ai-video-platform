import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require('dotenv').config();

const GENERATION_ID = '2699119f-17ee-4588-b633-2a42537911ba';
const HEDRA_BASE_URL = 'https://api.hedra.com/web-app/public';
const key = process.env.HEDRA_API_KEY;

async function storagePut(relKey, buffer, contentType) {
  const baseUrl = (process.env.BUILT_IN_FORGE_API_URL || '').replace(/\/+$/, '');
  const apiKey = process.env.BUILT_IN_FORGE_API_KEY;
  const normalizedKey = relKey.replace(/^\/+/, '');
  const uploadUrl = new URL('v1/storage/upload', baseUrl + '/');
  uploadUrl.searchParams.set('path', normalizedKey);
  const blob = new Blob([buffer], { type: contentType });
  const formData = new FormData();
  formData.append('file', blob, normalizedKey.split('/').pop() || 'file');
  const res = await fetch(uploadUrl.toString(), {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });
  if (!res.ok) throw new Error(`Storage upload failed: ${res.status} ${await res.text()}`);
  return (await res.json()).url;
}

(async () => {
  // Try individual generation endpoint
  console.log('=== Individual generation endpoint ===');
  const r1 = await fetch(`${HEDRA_BASE_URL}/generations/${GENERATION_ID}`, {
    headers: { 'X-API-Key': key }
  });
  console.log('Status:', r1.status);
  const d1 = await r1.json();
  console.log(JSON.stringify(d1, null, 2));

  // Try asset endpoint
  console.log('\n=== Asset endpoint ===');
  const r2 = await fetch(`${HEDRA_BASE_URL}/generations/${GENERATION_ID}/asset`, {
    headers: { 'X-API-Key': key }
  });
  console.log('Status:', r2.status);
  const d2 = await r2.json();
  console.log(JSON.stringify(d2, null, 2));

  // Check if there's a download URL anywhere
  const allUrls = JSON.stringify(d1).match(/https?:\/\/[^\s"]+\.mp4[^\s"]*/g);
  if (allUrls) {
    console.log('\n=== MP4 URLs found ===');
    allUrls.forEach(u => console.log(u));
    
    // Try to download the first one
    const dlRes = await fetch(allUrls[0]);
    console.log('Download status:', dlRes.status);
    if (dlRes.ok) {
      const buf = Buffer.from(await dlRes.arrayBuffer());
      console.log('Downloaded:', (buf.length/1024).toFixed(0) + 'KB');
      const url = await storagePut('test-lipsync/hedra-zara-recovered-' + Date.now() + '.mp4', buf, 'video/mp4');
      console.log('SAVED TO S3:', url);
    }
  }
})().catch(e => console.error('FAILED:', e.message));
