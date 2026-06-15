import { submitAtlasImageToVideo } from "./server/ai-apis/atlascloud";
import mysql from "mysql2/promise";

const VENUE_REF_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/venue-refs/lyndhurst-hall-main.jpg";

// Wider shot prompt — medium close-up so HeyGen can detect the face
const prompt = `Medium close-up on a young woman with long dark hair, lit by a warm overhead spotlight in a grand premium orchestral recording hall. Vaulted gothic-style ceiling, ornate dark wood panelling, warm ivory and amber studio lighting. She wears a flowing white gown, looking directly at the camera with quiet emotional intensity as she begins to sing. Camera holds still then begins a slow gentle push-in. 16:9, cinematic depth of field, intimate and still.`;

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  
  // Get the storyboard image for Scene 1
  const [rows] = await conn.execute<any[]>(
    `SELECT previewImageUrl FROM musicVideoScenes WHERE id=900026`
  );
  const storyboardUrl = rows[0]?.previewImageUrl;
  console.log('Storyboard URL:', storyboardUrl);
  
  // Submit with venue reference image as anchor
  const result = await submitAtlasImageToVideo({
    prompt,
    imageUrl: VENUE_REF_URL,
    duration: 6,
    aspectRatio: "16:9",
    resolution: "720p"
  });
  
  console.log('Atlas Cloud task:', JSON.stringify(result, null, 2));
  
  // Store the task ID in the DB
  await conn.execute(
    `UPDATE musicVideoScenes SET mvSceneStatus='generating', taskId=?, videoUrl=NULL, lipSyncStatus='pending', lipSyncTaskId=NULL, updatedAt=NOW() WHERE id=900026`,
    [`atlas:${result.predictionId}`]
  );
  console.log('Scene 1 reset and dispatched → atlas:' + result.predictionId);
  await conn.end();
}
main().catch(e => console.error('ERROR:', e.message));
