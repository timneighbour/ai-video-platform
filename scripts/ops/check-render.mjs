import db from './server/db.ts';

const scene = await db.query.musicVideoScenes.findFirst({
  where: (t, { eq }) => eq(t.id, 'scene_990015')
});
console.log('Scene 990015:', {
  status: scene?.mvSceneStatus,
  videoUrl: scene?.videoUrl ? 'SET' : 'null',
  updatedAt: scene?.updatedAt,
  provider: scene?.provider,
  providerJobId: scene?.providerJobId
});

const job = await db.query.musicVideoJobs.findFirst({
  where: (t, { eq }) => eq(t.id, 'job_1080001')
});
console.log('Job 1080001:', {
  status: job?.status,
  probeVideoUrl: job?.probeVideoUrl ? 'SET' : 'null',
  probePassed: job?.probePassed
});
