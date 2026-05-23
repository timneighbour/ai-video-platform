import { createConnection } from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

const conn = await createConnection(process.env.DATABASE_URL);

const [scenes] = await conn.execute(`
  SELECT 
    id, scene_index, scene_type, mv_scene_status as status,
    lip_sync_status, composite_status,
    CASE WHEN video_url IS NOT NULL THEN 'YES' ELSE 'NO' END as has_video,
    CASE WHEN lip_sync_video_url IS NOT NULL THEN 'YES' ELSE 'NO' END as has_lipsync,
    CASE WHEN composite_video_url IS NOT NULL THEN 'YES' ELSE 'NO' END as has_composite,
    composite_attempts,
    updated_at
  FROM musicVideoScenes
  WHERE jobId = 720001
  ORDER BY scene_index
`);

const [job] = await conn.execute(`
  SELECT id, status, final_video_url IS NOT NULL as has_final
  FROM musicVideoJobs
  WHERE id = 720001
`);

console.log('\n=== JOB 720001 STATUS ===');
console.log('Job status:', job[0].status, '| Has final video:', job[0].has_final ? 'YES' : 'NO');
console.log('\n=== SCENES ===');
console.log('Idx | Type        | Status    | LipSync    | Composite  | Video | LS | Comp | Attempts | Updated');
console.log('----+-------------+-----------+------------+------------+-------+----+------+----------+--------');
for (const s of scenes) {
  const updated = new Date(s.updated_at).toISOString().slice(11, 19);
  console.log(
    String(s.scene_index).padStart(3) + ' | ' +
    String(s.scene_type || 'cinematic').padEnd(11) + ' | ' +
    String(s.status || '').padEnd(9) + ' | ' +
    String(s.lip_sync_status || 'n/a').padEnd(10) + ' | ' +
    String(s.composite_status || 'n/a').padEnd(10) + ' | ' +
    s.has_video.padEnd(5) + ' | ' +
    s.has_lipsync.padEnd(2) + ' | ' +
    s.has_composite.padEnd(4) + ' | ' +
    String(s.composite_attempts || 0).padStart(8) + ' | ' +
    updated
  );
}

// Summary
const total = scenes.length;
const ready = scenes.filter(s => s.composite_status === 'done' || (s.scene_type !== 'performance' && s.status === 'completed')).length;
const compositing = scenes.filter(s => s.scene_type === 'performance' && (s.lip_sync_status === 'processing' || s.composite_status === 'processing' || s.composite_status === 'pending')).length;
const pending = scenes.filter(s => s.status === 'pending').length;
const generating = scenes.filter(s => s.status === 'generating').length;

console.log(`\n=== SUMMARY ===`);
console.log(`Total: ${total} | Ready: ${ready} | Compositing: ${compositing} | Generating: ${generating} | Pending: ${pending}`);

await conn.end();
