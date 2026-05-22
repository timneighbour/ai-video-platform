import { config } from 'dotenv';
config();

const key = process.env.WAVESPEED_API_KEY;
console.log('WaveSpeed key present:', key ? 'YES (length=' + key.length + ')' : 'NO');

if (!key) {
  console.error('No WAVESPEED_API_KEY found in environment');
  process.exit(1);
}

// Check balance endpoint
try {
  const res = await fetch('https://api.wavespeed.ai/api/v3/user/balance', {
    headers: { 'Authorization': 'Bearer ' + key }
  });
  const text = await res.text();
  console.log('Balance HTTP status:', res.status);
  console.log('Balance response:', text.substring(0, 500));
} catch (e) {
  console.error('Balance check error:', e.message);
}

// Also try a minimal text-to-video call to see if credits are accepted
console.log('\nTesting a minimal Seedance 2.0 call...');
try {
  const res = await fetch('https://api.wavespeed.ai/api/v3/bytedance/seedance-2.0/text-to-video', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + key,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt: 'A simple test scene',
      duration: 5,
      size: '1280*720'
    })
  });
  const text = await res.text();
  console.log('Test call HTTP status:', res.status);
  console.log('Test call response:', text.substring(0, 500));
} catch (e) {
  console.error('Test call error:', e.message);
}
