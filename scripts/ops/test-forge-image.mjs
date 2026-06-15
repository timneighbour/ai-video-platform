import { readFileSync } from 'fs';

const forgeUrl = process.env.BUILT_IN_FORGE_API_URL;
const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;
const photoUrl = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/video-characters/1-180007-0-1775951757051-0.png';

if (!forgeUrl || !forgeKey) {
  console.error('Missing BUILT_IN_FORGE_API_URL or BUILT_IN_FORGE_API_KEY');
  process.exit(1);
}

const baseUrl = forgeUrl.endsWith('/') ? forgeUrl : `${forgeUrl}/`;
const fullUrl = new URL('images.v1.ImageService/GenerateImage', baseUrl).toString();

console.log('Testing Forge image generation with reference image...');
console.log('URL:', fullUrl);

// First fetch the reference photo
const photoResp = await fetch(photoUrl);
const photoBuffer = Buffer.from(await photoResp.arrayBuffer());
const b64 = photoBuffer.toString('base64');
console.log('Photo fetched, size:', photoBuffer.length, 'bytes');

// Test with reference image
const body = {
  prompt: 'Portrait of a man, same person as reference image, identical face, same hair, clean studio lighting, front-facing, photorealistic, high detail, headshot',
  original_images: [{
    url: photoUrl,
    mimeType: 'image/png'
  }]
};

console.log('Sending request with original_images URL...');
const resp = await fetch(fullUrl, {
  method: 'POST',
  headers: {
    'accept': 'application/json',
    'content-type': 'application/json',
    'connect-protocol-version': '1',
    'authorization': `Bearer ${forgeKey}`,
  },
  body: JSON.stringify(body),
});

console.log('Status:', resp.status, resp.statusText);
const text = await resp.text();
console.log('Response (first 500 chars):', text.slice(0, 500));

if (resp.ok) {
  try {
    const json = JSON.parse(text);
    if (json.image?.b64Json) {
      console.log('SUCCESS: Got base64 image, length:', json.image.b64Json.length);
    }
  } catch {}
}
