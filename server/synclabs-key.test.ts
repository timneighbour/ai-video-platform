/**
 * Validates that SYNC_LABS_API_KEY is configured and accepted by the Sync Labs API.
 * Makes a lightweight status/account call — does NOT submit a lip sync job.
 */
import { describe, it, expect } from "vitest";

describe("SYNC_LABS_API_KEY validation", () => {
  it("should have SYNC_LABS_API_KEY set in environment", () => {
    expect(process.env.SYNC_LABS_API_KEY).toBeTruthy();
    expect(process.env.SYNC_LABS_API_KEY!.length).toBeGreaterThan(10);
  });

  it("should be accepted by Sync Labs API (lightweight check)", async () => {
    const apiKey = process.env.SYNC_LABS_API_KEY;
    if (!apiKey) throw new Error("SYNC_LABS_API_KEY not set");

    // Hit the Sync Labs generations list endpoint — minimal cost, just validates auth
    const res = await fetch("https://api.sync.so/v2/generate?limit=1", {
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
    });

    // 200 = valid key, 401 = invalid key, 403 = expired/revoked
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
    expect([200, 404]).toContain(res.status); // 404 is fine (no jobs yet)
  }, 15000);
});
