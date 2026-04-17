import { storageGet } from './server/storage';

const key = 'suno-trimmed/1/7b504';
const result = await storageGet(key);
console.log('Presigned URL:', result.url);

// Test if it's accessible
const res = await fetch(result.url);
console.log('HTTP status:', res.status);
console.log('Content-Type:', res.headers.get('content-type'));
console.log('Content-Length:', res.headers.get('content-length'));
