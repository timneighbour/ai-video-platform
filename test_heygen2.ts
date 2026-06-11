import { createConnection } from 'mysql2/promise';
import { submitHeyGenLipSyncV3, pollHeyGenLipSyncV3 } from './server/ai-apis/heygen-lipsync';

async function main() {
  const conn = await createConnection(process.env.DATABASE_URL as string);
  
  // Get job audio/vocals URL
  const [cols] = await conn.query(`SHOW COLUMNS FROM musicVideoJobs LIKE '%vocal%'`);
  console.log('Vocal columns:', JSON.stringify(cols));
  
  const [jobs] = await conn.query(`SELECT audioUrl FROM musicVideoJobs WHERE id = 1020003`);
  const job = (jobs as any[])[0];
  console.log('Audio URL:', job.audioUrl?.substring(0, 100));
  
  await conn.end();
  
  // Test HeyGen submission with Scene 0 video
  const videoUrl = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-scenes/900025-1781057663435.mp4';
  console.log('\nTesting HeyGen submission with Scene 0 video...');
  try {
    const taskId = await submitHeyGenLipSyncV3({
      videoUrl,
      audioUrl: job.audioUrl,
      title: 'TEST Scene 0 Direct',
      mode: 'precision',
      keepSameFormat: true,
    });
    console.log('HeyGen task submitted:', taskId);
    
    await new Promise(r => setTimeout(r, 5000));
    const status = await pollHeyGenLipSyncV3(taskId);
    console.log('HeyGen status:', JSON.stringify(status));
  } catch (e: any) {
    console.error('HeyGen error:', e.message);
    if (e.response) console.error('Response:', JSON.stringify(e.response.data));
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
