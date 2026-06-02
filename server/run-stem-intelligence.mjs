/**
 * Standalone script to run stem intelligence for job 870022.
 * Run with: node --loader tsx/esm server/run-stem-intelligence.mjs
 * Or via tsx: npx tsx server/run-stem-intelligence.mjs
 */
import { runAndPersistStemIntelligence } from "./stem-intelligence-service.ts";

const JOB_ID = 870022;

console.log(`[StemRunner] Starting stem intelligence for job ${JOB_ID}...`);
console.log(`[StemRunner] This will run Demucs (may take 2-5 minutes)...`);

try {
  await runAndPersistStemIntelligence(JOB_ID);
  console.log(`[StemRunner] ✓ Stem intelligence complete for job ${JOB_ID}`);
} catch (err) {
  console.error(`[StemRunner] ✗ Failed:`, err.message);
  process.exit(1);
}
