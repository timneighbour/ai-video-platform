import 'dotenv/config';
import fs from 'fs';
import { execSync } from 'child_process';

const API_KEY = process.env.HEDRA_API_KEY;
const GEN_ID = '3f36265b-189a-4d10-8f23-56590e57ee14';

async function main() {
  console.log('Re-polling Hedra generations list for fresh JWT...');
  
  const res = await fetch('https://api.hedra.com/web-app/public/generations', {
    headers: { 'X-API-Key': API_KEY }
  });
  
  if (!res.ok) {
    console.error('Failed to poll:', res.status, await res.text());
    process.exit(1);
  }
  
  const data = await res.json();
  console.log(`Got ${data.data?.length || 0} generations`);
  
  // Find our generation
  const gen = data.data?.find(g => g.id === GEN_ID);
  if (!gen) {
    console.error('Generation not found in list! Checking all IDs:');
    data.data?.slice(0, 10).forEach(g => console.log(`  ${g.id} - ${g.status}`));
    process.exit(1);
  }
  
  console.log(`Found gen: status=${gen.status}`);
  console.log(`Full gen object keys:`, Object.keys(gen));
  
  // Try multiple paths to find the download URL
  let downloadUrl = null;
  
  // Path 1: gen.asset.asset.download_url
  if (gen.asset?.asset?.download_url) {
    downloadUrl = gen.asset.asset.download_url;
    console.log('Found URL at gen.asset.asset.download_url');
  }
  // Path 2: gen.video_url
  else if (gen.video_url) {
    downloadUrl = gen.video_url;
    console.log('Found URL at gen.video_url');
  }
  // Path 3: gen.download_url
  else if (gen.download_url) {
    downloadUrl = gen.download_url;
    console.log('Found URL at gen.download_url');
  }
  // Path 4: gen.result_url
  else if (gen.result_url) {
    downloadUrl = gen.result_url;
    console.log('Found URL at gen.result_url');
  }
  // Path 5: deep search
  else {
    console.log('Searching all paths...');
    console.log(JSON.stringify(gen, null, 2).substring(0, 3000));
  }
  
  if (!downloadUrl) {
    console.error('No download URL found!');
    process.exit(1);
  }
  
  console.log(`\nDownload URL (first 200 chars): ${downloadUrl.substring(0, 200)}`);
  
  // Download IMMEDIATELY with curl (faster than fetch for large files)
  const outPath = '/tmp/hedra-zara-fresh.mp4';
  console.log(`\nDownloading to ${outPath}...`);
  
  try {
    execSync(`curl -sL -o "${outPath}" "${downloadUrl}"`, { timeout: 60000 });
    const stats = fs.statSync(outPath);
    console.log(`Downloaded: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    
    if (stats.size < 100000) {
      // Likely an error response, not a video
      const content = fs.readFileSync(outPath, 'utf8').substring(0, 500);
      console.log('File too small, content:', content);
    } else {
      console.log('SUCCESS! Video downloaded.');
      
      // Upload to S3 via Forge
      const FORGE_URL = process.env.BUILT_IN_FORGE_API_URL;
      const FORGE_KEY = process.env.BUILT_IN_FORGE_API_KEY;
      const key = `test-lipsync/hedra-zara-final-${Date.now()}.mp4`;
      
      console.log(`\nUploading to S3: ${key}`);
      const fileBuffer = fs.readFileSync(outPath);
      const uploadRes = await fetch(`${FORGE_URL}/v1/storage/upload?path=${encodeURIComponent(key)}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${FORGE_KEY}`,
          'Content-Type': 'video/mp4'
        },
        body: fileBuffer
      });
      
      if (uploadRes.ok) {
        const uploadData = await uploadRes.json();
        console.log('Uploaded to CDN:', uploadData.url || uploadData);
      } else {
        console.error('Upload failed:', uploadRes.status, await uploadRes.text());
      }
    }
  } catch (e) {
    console.error('Download failed:', e.message);
  }
}

main().catch(console.error);
