import https from 'https';

const key = process.env.ATLAS_CLOUD_API_KEY;

function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.atlascloud.ai',
      path,
      method,
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
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Submit a safe, neutral test job
console.log('Submitting test job with safe prompt...');
const submitRes = await makeRequest('/api/v1/model/generateVideo', 'POST', {
  model: 'bytedance/seedance-2.0/text-to-video',
  prompt: 'A mountain landscape at sunrise with gentle clouds moving across the sky, cinematic wide shot, natural lighting',
  duration: 4,
  resolution: '720p'
});

console.log('Submit status:', submitRes.status);
const submitData = JSON.parse(submitRes.body);
console.log('Submit response:', JSON.stringify(submitData?.data, null, 2));

const predictionId = submitData?.data?.id;
if (!predictionId) {
  console.log('ERROR: No prediction ID returned');
  process.exit(1);
}

console.log(`\nPolling job: ${predictionId}`);
console.log('Checking every 10 seconds...\n');

let attempts = 0;
const maxAttempts = 30;

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
    console.log('Video URL:', outputs?.[0] || outputs);
    console.log('Execution time:', execTime, 'seconds');
    process.exit(0);
  }
  
  if (status === 'failed' || status === 'error') {
    console.log('\n❌ JOB FAILED');
    console.log('Error:', error);
    process.exit(1);
  }
  
  await sleep(10000);
}

console.log('\n⏱ Polling timed out after', maxAttempts * 10, 'seconds');
