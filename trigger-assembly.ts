/**
 * Trigger assembly for job 540026 directly from sandbox.
 */
import { assembleMusicVideo } from './server/music-video-service';

console.log('Triggering assembly for job 540026...');
try {
  const finalUrl = await assembleMusicVideo(540026, 'standard' as any);
  console.log('Assembly COMPLETE!');
  console.log('Final video URL:', finalUrl);
} catch (err: any) {
  console.error('Assembly FAILED:', err.message);
  console.error(err.stack);
}
