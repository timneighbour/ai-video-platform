import { submitAtlasImageToVideo, pollAtlasVideo } from './server/ai-apis/atlascloud';

async function main() {
  const prompt = `Extreme close-up on a young woman with long dark hair, lit from directly above by a single brilliant white spotlight. Her features are sculpted by the light — cheekbones, the curve of her lips, the shimmer of her eyes. She holds the final note, eyes closed, then slowly opens them — looking directly into the camera with calm, resolved certainty. The camera begins a slow, smooth pull-back, gradually revealing her full figure in a flowing white gown, then the stage, then a grand premium orchestral recording hall glowing around her. Vaulted gothic-style ceiling, ornate dark wood panelling, warm ivory and amber studio lighting, full orchestra visible in background, cinematic haze, elegant live recording atmosphere, premium cinematic music-video production. 16:9 cinematic composition.`;

  // Direct CloudFront URL — no redirect, no auth
  const referenceImageUrl = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/venue-references/lyndhurst-hall-official-1781144248423.jpg';

  console.log('Submitting Scene 10 reference-guided test render...');
  const job = await submitAtlasImageToVideo(prompt, referenceImageUrl, 6);
  console.log('Submitted! predictionId:', job.predictionId);

  const start = Date.now();
  while (Date.now() - start < 15 * 60 * 1000) {
    await new Promise(r => setTimeout(r, 20_000));
    const result = await pollAtlasVideo(job.predictionId);
    const elapsed = Math.round((Date.now() - start) / 1000);
    console.log(`[${elapsed}s] Status: ${result.status}${result.videoUrl ? '\nVIDEO: ' + result.videoUrl : ''}${result.error ? '\nERROR: ' + result.error : ''}`);
    if (result.status === 'completed' && result.videoUrl) {
      console.log('\n✅ TEST RENDER COMPLETE');
      break;
    }
    if (result.status === 'failed') {
      console.log('\n❌ TEST RENDER FAILED');
      break;
    }
  }
}
main().catch(e => console.error('FATAL:', e.message, JSON.stringify(e.response?.data)));
