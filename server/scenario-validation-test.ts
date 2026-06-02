/**
 * Scenario A/B/C — Character Photo Validation Gate Live Test
 * Run with: npx tsx server/scenario-validation-test.ts
 *
 * Tests the validateCharacterPhoto function against real CDN-hosted images
 * to produce evidence for the subscriber readiness audit.
 */

import { validateCharacterPhoto } from "./character-photo-validator";

const BASE_URL =
  "https://3000-im5wce2u9guvdqctnl724-ae71ddbc.us2.manus.computer";

const TEST_CASES = [
  {
    scenario: "C",
    label: "Poor photo — tiny 1×1 pixel image",
    url: `${BASE_URL}/manus-storage/poor-photo_81b6886e.jpg`,
    expectedOutcome: "REJECT",
    expectedReason: "Resolution too low / no face detected",
  },
  {
    scenario: "C",
    label: "Group photo — multiple people",
    url: `${BASE_URL}/manus-storage/group-photo_5b9360ee.jpg`,
    expectedOutcome: "REJECT",
    expectedReason: "Multiple faces detected",
  },
  {
    scenario: "C",
    label: "Sunglasses photo — face obstruction",
    url: `${BASE_URL}/manus-storage/sunglasses-photo_3299ade3.jpg`,
    expectedOutcome: "REJECT",
    expectedReason: "Sunglasses / face obstruction",
  },
  {
    scenario: "A",
    label: "Good selfie — clean single-person portrait, plain background",
    url: `${BASE_URL}/manus-storage/scenario-a-clean-selfie_c5fd60ea.jpg`,
    expectedOutcome: "PASS",
    expectedReason: "Clear frontal portrait, single person, no obstructions",
  },
];

async function runTests() {
  console.log("=== Character Photo Validation Gate — Scenario Evidence ===\n");
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Base URL: ${BASE_URL}\n`);

  const results: Array<{
    scenario: string;
    label: string;
    expected: string;
    actual: string;
    passed: boolean;
    details: string;
    userMessage: string;
    failedChecks?: string[];
    checks: Record<string, boolean | null>;
  }> = [];

  for (const tc of TEST_CASES) {
    console.log(`\n--- Scenario ${tc.scenario}: ${tc.label} ---`);
    console.log(`URL: ${tc.url}`);
    console.log(`Expected: ${tc.expectedOutcome}`);

    try {
      const result = await validateCharacterPhoto(tc.url);
      const actual = result.passed ? "PASS" : "REJECT";
      const passed = actual === tc.expectedOutcome;

      console.log(`Actual: ${actual} ${passed ? "✓" : "✗ UNEXPECTED"}`);
      if (!result.passed) {
        console.log(`Failed checks: ${result.failedChecks?.join(", ")}`);
        console.log(`User message: ${result.message}`);
      }
      console.log(`Checks:`, JSON.stringify(result.checks, null, 2));

      results.push({
        scenario: tc.scenario,
        label: tc.label,
        expected: tc.expectedOutcome,
        actual,
        passed,
        details: result.failedChecks?.join(", ") ?? "Passed all checks",
        userMessage: result.message ?? "Photo accepted",
        checks: result.checks,
      });
    } catch (err) {
      console.error(`ERROR:`, err);
      results.push({
        scenario: tc.scenario,
        label: tc.label,
        expected: tc.expectedOutcome,
        actual: "ERROR",
        passed: false,
        details: String(err),
        userMessage: "Test error",
        checks: {},
      });
    }
  }

  // Summary
  console.log("\n\n=== SUMMARY ===\n");
  const allPassed = results.every((r) => r.passed);
  console.log(`Overall: ${allPassed ? "ALL PASS ✓" : "FAILURES DETECTED ✗"}\n`);

  for (const r of results) {
    const icon = r.passed ? "✓" : "✗";
    console.log(
      `${icon} Scenario ${r.scenario} | ${r.label}`
    );
    console.log(
      `  Expected: ${r.expected} | Actual: ${r.actual}`
    );
    console.log(`  Details: ${r.details}`);
    console.log(`  User message: "${r.userMessage}"\n`);
  }

  // Write JSON results for the audit report
  const fs = await import("fs");
  fs.writeFileSync(
    "/home/ubuntu/zara-audit/scenario-c-validation-results.json",
    JSON.stringify({ timestamp: new Date().toISOString(), results }, null, 2)
  );
  console.log(
    "\nResults written to /home/ubuntu/zara-audit/scenario-c-validation-results.json"
  );
}

runTests().catch(console.error);
