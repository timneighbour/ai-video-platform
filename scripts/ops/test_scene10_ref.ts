import { submitAtlasImageToVideo, pollAtlasVideo } from './server/ai-apis/atlascloud';

async function main() {
  // Provider-safe prompt — no venue names, no Air Studios, no Lyndhurst Hall
  const prompt = `Extreme close-up on a young woman's face with long dark hair, lit from directly above by a single brilliant white spotlight. Her features are sculpted by the light — cheekbones, the curve of her lips, the shimmer of her eyes. She holds the final note, eyes closed, then slowly opens them — looking directly into the camera with calm, resolved certainty. The camera begins a slow, smooth pull-back, gradually revealing her full figure in a flowing white gown, then the stage, then a grand premium orchestral recording hall glowing around her. Vaulted gothic-style ceiling, ornate dark wood panelling, warm ivory and amber studio lighting, full orchestra visible in background, cinematic haze, elegant live recording atmosphere, premium cinematic music-video production. 16:9 cinematic composition.`;

  // Lyndhurst Hall reference image as the visual environment anchor
  const referenceImageUrl = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/manus-storage/air-studios-lyndhurst-hall-official_bda72299.jpg';

  console.log('Submitting Scene 10 reference-guided test render...');
  console.log('Reference image:', referenceImageUrl.substring(0, 80));
  
  const job = await submitAtlasImageToVideo(prompt, referenceImageUrl, 6);
  console.log('Submitted! predictionId:', job.predictionId);
  
  // Poll for up to 15 minutes
  const start = Date.now();
  while (Date.now() - start < 15 * 60 * 1000) {
    await new Promise(r => setTimeout(r, 20_000));
    const result = await pollAtlasVideo(job.predictionId);
    const elapsed = Math.round((Date.now() - start) / 1000);
    console.log(`[${elapsed}s] Status: ${result.status}${result.videoUrl ? ' → VIDEO READY: ' + result.videoUrl.substring(0, 100) : ''}${result.error ? ' ERROR: ' + result.error : ''}`);
    if (result.status === 'completed' && result.videoUrl) {
      console.log('\n✅ TEST RENDER COMPLETE');
      console.log('Video URL:', result.videoUrl);
      break;
    }
    if (result.status === 'failed') {
      console.log('\n❌ TEST RENDER FAILED:', result.error);
      break;
    }
  }
}
main().catch(e => console.error('ERROR:', e.message, e.response?.data));
