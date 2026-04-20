import https from 'https';

const key = process.env.ATLAS_CLOUD_API_KEY;
const predictionId = '851a733b6c5e463a9aab05fca1da653c';

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.atlascloud.ai',
      path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.end();
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

console.log(`Polling job: ${predictionId}`);
console.log('Checking every 10 seconds...\n');

let attempts = 0;
const maxAttempts = 30; // 5 minutes max

while (attempts < maxAttempts) {
  attempts++;
  const res = await makeRequest(`/api/v1/model/prediction/${predictionId}`);
  
  let parsed;
  try {
    parsed = JSON.parse(res.body);
  } catch (e) {
    console.log(`[${attempts}] Parse error:`, res.body.slice(0, 200));
    await sleep(10000);
    continue;
  }
  
  const status = parsed?.data?.status;
  const outputs = parsed?.data?.outputs;
  const error = parsed?.data?.error;
  const execTime = parsed?.data?.executionTime;
  
  console.log(`[${attempts}] Status: ${status} | ExecTime: ${execTime}s`);
  
  if (status === 'succeeded' || status === 'completed') {
    console.log('\n✅ JOB COMPLETED SUCCESSFULLY');
    console.log('Outputs:', JSON.stringify(outputs, null, 2));
    console.log('Execution time:', execTime, 'seconds');
    process.exit(0);
  }
  
  if (status === 'failed' || status === 'error') {
    console.log('\n❌ JOB FAILED');
    console.log('Error:', error);
    console.log('Full response:', JSON.stringify(parsed?.data, null, 2));
    process.exit(1);
  }
  
  if (status === 'processing' || status === 'queued' || status === 'pending') {
    await sleep(10000);
    continue;
  }
  
  // Unknown status
  console.log('Unknown status:', status, '| Full:', res.body.slice(0, 300));
  await sleep(10000);
}

console.log('\n⏱ Polling timed out after', maxAttempts * 10, 'seconds');
