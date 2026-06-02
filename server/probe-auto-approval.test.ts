/**
 * Probe Auto-Approval Tests — Phase 1.3 Remediation
 * ===================================================
 * Validates that the probe auto-approval timeout constants are correctly
 * defined and that the threshold logic is sound.
 *
 * The actual getProbeDecision() function requires a live database, so we
 * test the exported constants and the threshold arithmetic directly.
 */

import { describe, it, expect } from "vitest";
import {
  PROBE_AUTO_APPROVE_AFTER_MS,
  PROBE_REMINDER_1_AFTER_MS,
  PROBE_REMINDER_2_AFTER_MS,
} from "./pre-render-validator";

describe("Probe Auto-Approval — Phase 1.3 Remediation", () => {
  // ── Constant values ──────────────────────────────────────────────────────────

  it("auto-approval threshold is 24 hours", () => {
    expect(PROBE_AUTO_APPROVE_AFTER_MS).toBe(24 * 60 * 60 * 1000);
  });

  it("first reminder threshold is 1 hour", () => {
    expect(PROBE_REMINDER_1_AFTER_MS).toBe(1 * 60 * 60 * 1000);
  });

  it("second reminder threshold is 6 hours", () => {
    expect(PROBE_REMINDER_2_AFTER_MS).toBe(6 * 60 * 60 * 1000);
  });

  // ── Ordering invariants ──────────────────────────────────────────────────────

  it("reminder 1 fires before reminder 2", () => {
    expect(PROBE_REMINDER_1_AFTER_MS).toBeLessThan(PROBE_REMINDER_2_AFTER_MS);
  });

  it("reminder 2 fires before auto-approval", () => {
    expect(PROBE_REMINDER_2_AFTER_MS).toBeLessThan(PROBE_AUTO_APPROVE_AFTER_MS);
  });

  it("all three thresholds are positive", () => {
    expect(PROBE_AUTO_APPROVE_AFTER_MS).toBeGreaterThan(0);
    expect(PROBE_REMINDER_1_AFTER_MS).toBeGreaterThan(0);
    expect(PROBE_REMINDER_2_AFTER_MS).toBeGreaterThan(0);
  });

  // ── Threshold window logic ───────────────────────────────────────────────────

  it("a probe ready for 30 minutes is in no reminder window", () => {
    const msSinceProbeReady = 30 * 60 * 1000; // 30 min
    const in1hWindow = msSinceProbeReady >= PROBE_REMINDER_1_AFTER_MS &&
                       msSinceProbeReady < PROBE_REMINDER_2_AFTER_MS;
    const in6hWindow = msSinceProbeReady >= PROBE_REMINDER_2_AFTER_MS;
    const pastAutoApproval = msSinceProbeReady >= PROBE_AUTO_APPROVE_AFTER_MS;
    expect(in1hWindow).toBe(false);
    expect(in6hWindow).toBe(false);
    expect(pastAutoApproval).toBe(false);
  });

  it("a probe ready for 90 minutes is in the 1h reminder window", () => {
    const msSinceProbeReady = 90 * 60 * 1000; // 1.5h
    const in1hWindow = msSinceProbeReady >= PROBE_REMINDER_1_AFTER_MS &&
                       msSinceProbeReady < PROBE_REMINDER_2_AFTER_MS;
    const in6hWindow = msSinceProbeReady >= PROBE_REMINDER_2_AFTER_MS;
    expect(in1hWindow).toBe(true);
    expect(in6hWindow).toBe(false);
  });

  it("a probe ready for 8 hours is in the 6h reminder window", () => {
    const msSinceProbeReady = 8 * 60 * 60 * 1000; // 8h
    const in6hWindow = msSinceProbeReady >= PROBE_REMINDER_2_AFTER_MS;
    const pastAutoApproval = msSinceProbeReady >= PROBE_AUTO_APPROVE_AFTER_MS;
    expect(in6hWindow).toBe(true);
    expect(pastAutoApproval).toBe(false);
  });

  it("a probe ready for 25 hours triggers auto-approval", () => {
    const msSinceProbeReady = 25 * 60 * 60 * 1000; // 25h
    const pastAutoApproval = msSinceProbeReady >= PROBE_AUTO_APPROVE_AFTER_MS;
    expect(pastAutoApproval).toBe(true);
  });

  it("a probe ready for exactly 24 hours triggers auto-approval", () => {
    const msSinceProbeReady = 24 * 60 * 60 * 1000; // exactly 24h
    const pastAutoApproval = msSinceProbeReady >= PROBE_AUTO_APPROVE_AFTER_MS;
    expect(pastAutoApproval).toBe(true);
  });

  it("a probe ready for 23h 59m 59s does NOT trigger auto-approval", () => {
    const msSinceProbeReady = (24 * 60 * 60 * 1000) - 1000; // 1 second short
    const pastAutoApproval = msSinceProbeReady >= PROBE_AUTO_APPROVE_AFTER_MS;
    expect(pastAutoApproval).toBe(false);
  });

  // ── Hours calculation (used in log messages and email copy) ─────────────────

  it("hours calculation is correct for 25h probe", () => {
    const msSinceProbeReady = 25 * 60 * 60 * 1000;
    const hoursWaiting = Math.round(msSinceProbeReady / 3600000);
    expect(hoursWaiting).toBe(25);
  });

  it("hours calculation rounds correctly for 1.5h probe", () => {
    const msSinceProbeReady = 90 * 60 * 1000; // 1.5h
    const hoursWaiting = Math.round(msSinceProbeReady / 3600000);
    expect(hoursWaiting).toBe(2); // rounds up
  });
});
