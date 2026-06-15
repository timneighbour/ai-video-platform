import https from 'https';

const key = process.env.ATLAS_CLOUD_API_KEY;
console.log('Atlas Cloud API Key present:', !!key, key ? `(length: ${key.length})` : '(MISSING)');

if (!key) {
  console.log('ERROR: ATLAS_CLOUD_API_KEY not in environment');
  process.exit(1);
}

function makeRequest(hostname, path, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname,
      path,
      method,
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        ...headers
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

// Check account balance
try {
  console.log('\n--- Checking Atlas Cloud account ---');
  const res = await makeRequest('api.atlascloud.ai', '/api/v1/account');
  console.log('Status:', res.status);
  console.log('Response:', res.body.slice(0, 500));
} catch (e) {
  console.log('Account check error:', e.message);
  
  // Try alternate endpoint
  try {
    const res2 = await makeRequest('api.atlascloud.ai', '/api/v1/user/balance');
    console.log('Balance status:', res2.status);
    console.log('Balance response:', res2.body.slice(0, 300));
  } catch (e2) {
    console.log('Balance check error:', e2.message);
  }
}

// Try a minimal video generation to confirm API accepts requests
try {
  console.log('\n--- Testing video generation endpoint ---');
  const res = await makeRequest('api.atlascloud.ai', '/api/v1/model/generateVideo', 'POST', {
    model: 'bytedance/seedance-2.0/text-to-video',
    prompt: 'A single glowing golden orb floating in darkness, cinematic',
    duration: 4,
    resolution: '720p'
  });
  console.log('Generate status:', res.status);
  console.log('Generate response:', res.body.slice(0, 500));
} catch (e) {
  console.log('Generate error:', e.message);
}
