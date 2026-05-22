/**
 * Upload the locked Zara portrait (scene1 storyboard) to CloudFront
 * for use as the canonical InfiniteTalk portrait for all performance scenes.
 * Uses the same pattern as server/storage.ts storagePut()
 */
import { readFileSync } from 'fs';
import { config } from 'dotenv';
config();

const FORGE_API_URL = process.env.BUILT_IN_FORGE_API_URL?.replace(/\/+$/, '');
const FORGE_API_KEY = process.env.BUILT_IN_FORGE_API_KEY;

if (!FORGE_API_URL || !FORGE_API_KEY) {
  throw new Error('Missing BUILT_IN_FORGE_API_URL or BUILT_IN_FORGE_API_KEY');
}

const imageBuffer = readFileSync('/tmp/storyboard-720001/scene1.png');
const relKey = '310519663500868908/ALJHDNsuNA7bExFuoQZUsx/characters/zara-locked-portrait-720001.png';

// Build upload URL with path query param (matches storage.ts pattern)
const uploadUrl = new URL(`${FORGE_API_URL}/v1/storage/upload`);
uploadUrl.searchParams.set('path', relKey);

// Build FormData with Blob (matches storage.ts toFormData pattern)
const blob = new Blob([imageBuffer], { type: 'image/png' });
const formData = new FormData();
formData.append('file', blob, 'zara-locked-portrait-720001.png');

console.log('Uploading portrait to Forge storage...');
console.log('URL:', uploadUrl.toString());

const res = await fetch(uploadUrl.toString(), {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${FORGE_API_KEY}`,
  },
  body: formData,
});

const text = await res.text();
console.log('Response status:', res.status);
console.log('Response:', text);

if (res.ok) {
  const data = JSON.parse(text);
  console.log('SUCCESS! Portrait URL:', data.url);
}
