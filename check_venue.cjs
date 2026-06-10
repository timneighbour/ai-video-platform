const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Check job-level venue/setting
  const [jobs] = await conn.execute(
    "SELECT id, title, sceneSetting, themePrompt, characterImageUrl FROM musicVideoJobs WHERE id = 1020003"
  );
  const job = jobs[0];
  console.log('Job title:', job.title);
  console.log('Scene setting:', job.sceneSetting);
  console.log('Theme prompt:', job.themePrompt);
  console.log('Character image:', job.characterImageUrl);
  
  // Check first 3 scene prompts
  const [scenes] = await conn.execute(
    "SELECT sceneIndex, prompt FROM musicVideoScenes WHERE jobId = 1020003 ORDER BY sceneIndex LIMIT 4"
  );
  console.log('\nFirst 4 scene prompts:');
  scenes.forEach(s => {
    console.log(`\n  Scene ${s.sceneIndex}:\n  ${s.prompt}`);
  });
  
  await conn.end();
}

main().catch(console.error);
