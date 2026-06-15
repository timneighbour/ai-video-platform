import fetch from 'node-fetch';

const response = await fetch('http://localhost:3000/api/admin/trigger-heartbeat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
});

const result = await response.json();
console.log('Heartbeat triggered:', result);
