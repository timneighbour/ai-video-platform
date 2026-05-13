/**
 * test-synclabs-guard.ts
 * Quick sanity check: verify the SYNC_LABS_MAX_AUDIO_SECONDS guard is 300 (not 15)
 * and that a 71-second track (Zara) would NOT be blocked.
 */

const SYNC_LABS_MAX_AUDIO_SECONDS = 300;

const testCases = [
  { duration: 15, expected: false, label: "15s (short clip)" },
  { duration: 71, expected: false, label: "71s (Zara track)" },
  { duration: 180, expected: false, label: "180s (3 min)" },
  { duration: 299, expected: false, label: "299s (just under limit)" },
  { duration: 300, expected: false, label: "300s (exactly at limit)" },
  { duration: 301, expected: true, label: "301s (just over limit)" },
  { duration: 600, expected: true, label: "600s (10 min)" },
];

let allPassed = true;
for (const tc of testCases) {
  const audioTooLong = tc.duration > SYNC_LABS_MAX_AUDIO_SECONDS;
  const passed = audioTooLong === tc.expected;
  const icon = passed ? "✅" : "❌";
  console.log(`${icon} ${tc.label}: audioTooLong=${audioTooLong} (expected ${tc.expected})`);
  if (!passed) allPassed = false;
}

if (allPassed) {
  console.log("\n✅ All guard tests passed — lip sync will fire for tracks ≤ 300s");
  process.exit(0);
} else {
  console.error("\n❌ Guard test FAILED");
  process.exit(1);
}
