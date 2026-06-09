/**
 * Validates that AIVIDEOAPI_API_KEY is set and accepted by the aivideoapi.ai API.
 * Uses the lightweight credits query endpoint — no generation credits consumed.
 */
import { describe, it, expect } from "vitest";

describe("aivideoapi.ai API key validation", () => {
  it("should have AIVIDEOAPI_API_KEY set", () => {
    expect(process.env.AIVIDEOAPI_API_KEY).toBeTruthy();
    expect(process.env.AIVIDEOAPI_API_KEY!.startsWith("sk-")).toBe(true);
  });

  it("should authenticate successfully against the credits endpoint", async () => {
    const key = process.env.AIVIDEOAPI_API_KEY!;
    const res = await fetch("https://api.aivideoapi.ai/v1/credits", {
      headers: { Authorization: `Bearer ${key}` },
    });
    // 200 = valid key, 401 = invalid key
    expect(res.status).not.toBe(401);
    expect(res.status).toBe(200);
    const json = await res.json() as { code: number; data?: { credits: number } };
    expect(json.code).toBe(200);
    console.log(`[aivideoapi] Credits balance: ${json.data?.credits}`);
  }, 15000);
});
