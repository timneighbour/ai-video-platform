import { checkAllProviders } from './server/provider-health.js';

const summary = await checkAllProviders();
console.log('=== LIVE PROVIDER BALANCE CHECK ===');
for (const r of summary.providers) {
  console.log(`${r.provider}: ${r.status} | ${r.detail ?? 'no detail'}`);
}
process.exit(0);
