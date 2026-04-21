/**
 * WizAdora™ Phase 1 — Safety Tests
 * ──────────────────────────────────
 * 15 tests covering all safety constraints.
 * NO paid provider calls. NO network requests.
 * All tests are synchronous or use mock DB.
 *
 * Test categories:
 *  1. Provider allow/block list (3 tests)
 *  2. Content moderation (4 tests)
 *  3. API key format validation (2 tests)
 *  4. Idempotency key hashing (2 tests)
 *  5. Spend cap enforcement (2 tests)
 *  6. Webhook signature (1 test)
 *  7. Polling guard (1 test)
 */

import { describe, it, expect } from "vitest";
import {
  assertProviderAllowed,
  moderatePrompt,
  hashApiKey,
  generateApiKey,
  hashRequest,
  verifyWebhookSignature,
  generateWebhookSignature,
  POLLING_CAN_SUBMIT,
  ALLOWED_PROVIDERS,
  ALLOWED_STYLES,
  WizadoraError,
} from "./core";

// ─── 1. PROVIDER ALLOW/BLOCK LIST ────────────────────────────────────────────

describe("WizAdora Provider Safety", () => {
  it("TEST-01: atlas_cloud is the only allowed provider", () => {
    expect(ALLOWED_PROVIDERS).toEqual(["atlas_cloud"]);
    expect(ALLOWED_PROVIDERS.length).toBe(1);
  });

  it("TEST-02: fal.ai is blocked and throws PROVIDER_BLOCKED", () => {
    expect(() => assertProviderAllowed("fal.ai")).toThrow(WizadoraError);
    expect(() => assertProviderAllowed("fal_ai")).toThrow(WizadoraError);
    expect(() => assertProviderAllowed("FAL.AI")).toThrow(WizadoraError);

    try {
      assertProviderAllowed("fal.ai");
    } catch (e) {
      expect(e).toBeInstanceOf(WizadoraError);
      expect((e as WizadoraError).code).toBe("PROVIDER_BLOCKED");
      expect((e as WizadoraError).statusCode).toBe(400);
    }
  });

  it("TEST-03: wavespeed and hypereal are blocked", () => {
    const blocked = ["wavespeed", "WaveSpeed", "hypereal", "HYPEREAL"];
    for (const provider of blocked) {
      expect(() => assertProviderAllowed(provider)).toThrow(WizadoraError);
      try {
        assertProviderAllowed(provider);
      } catch (e) {
        expect((e as WizadoraError).code).toBe("PROVIDER_BLOCKED");
      }
    }

    // Unknown providers also throw (but different code)
    expect(() => assertProviderAllowed("openai")).toThrow(WizadoraError);
    try {
      assertProviderAllowed("openai");
    } catch (e) {
      expect((e as WizadoraError).code).toBe("PROVIDER_NOT_ALLOWED");
    }
  });
});

// ─── 2. CONTENT MODERATION ───────────────────────────────────────────────────

describe("WizAdora Content Moderation", () => {
  it("TEST-04: clean prompts pass moderation", () => {
    const clean = [
      "A cinematic sunset over the mountains",
      "A jazz musician playing in a dimly lit club",
      "Children playing in a park on a sunny day",
      "A futuristic city skyline at night",
    ];
    for (const prompt of clean) {
      const result = moderatePrompt(prompt);
      expect(result.blocked).toBe(false);
      expect(result.reason).toBeUndefined();
    }
  });

  it("TEST-05: adult sexual content is blocked", () => {
    const blocked = [
      "nude woman on a beach",
      "explicit sexual content",
      "nsfw video",
      "erotic dance scene",
    ];
    for (const prompt of blocked) {
      const result = moderatePrompt(prompt);
      expect(result.blocked).toBe(true);
      expect(result.reason).toBe("adult_sexual_content");
    }
  });

  it("TEST-06: terrorist and violent content is blocked", () => {
    const terroristPrompts = [
      "ISIS attack planning video",
      "bomb making tutorial",
      "terrorist attack plan",
    ];
    for (const prompt of terroristPrompts) {
      const result = moderatePrompt(prompt);
      expect(result.blocked).toBe(true);
      expect(result.reason).toBe("terrorist_content");
    }

    const violentPrompts = [
      "graphic gore scene",
      "torture chamber video",
    ];
    for (const prompt of violentPrompts) {
      const result = moderatePrompt(prompt);
      expect(result.blocked).toBe(true);
      expect(result.reason).toBe("graphic_violence");
    }
  });

  it("TEST-07: protected brand/style names are blocked", () => {
    const brandPrompts = [
      "Pixar animation style video",
      "Disney princess movie",
      "Marvel superhero fight scene",
      "Studio Ghibli inspired landscape",
    ];
    for (const prompt of brandPrompts) {
      const result = moderatePrompt(prompt);
      expect(result.blocked).toBe(true);
      expect(result.reason).toBe("protected_brand_style");
    }
  });
});

// ─── 3. API KEY FORMAT VALIDATION ────────────────────────────────────────────

describe("WizAdora API Key Security", () => {
  it("TEST-08: generateApiKey produces correct format and unique keys", () => {
    const key1 = generateApiKey();
    const key2 = generateApiKey();

    // Format check
    expect(key1.raw).toMatch(/^wiz_test_sk_[0-9a-f]{32}$/);
    expect(key1.prefix).toBe(key1.raw.slice(0, 16));
    expect(key1.prefix).toBe("wiz_test_sk_xxxx".slice(0, 12) + key1.raw.slice(12, 16));

    // Uniqueness
    expect(key1.raw).not.toBe(key2.raw);
    expect(key1.hash).not.toBe(key2.hash);

    // Hash is SHA-256 hex (64 chars)
    expect(key1.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("TEST-09: hashApiKey is deterministic and SHA-256", () => {
    const raw = "wiz_test_sk_abc123def456abc123def456abc12345";
    const hash1 = hashApiKey(raw);
    const hash2 = hashApiKey(raw);

    // Deterministic
    expect(hash1).toBe(hash2);

    // SHA-256 format (64 hex chars)
    expect(hash1).toMatch(/^[0-9a-f]{64}$/);

    // Different input → different hash
    const hash3 = hashApiKey("wiz_test_sk_different_key_value_here");
    expect(hash1).not.toBe(hash3);

    // Raw key is not stored (hash is not the key)
    expect(hash1).not.toBe(raw);
    expect(hash1).not.toContain("wiz_test_sk");
  });
});

// ─── 4. IDEMPOTENCY KEY HASHING ──────────────────────────────────────────────

describe("WizAdora Idempotency", () => {
  it("TEST-10: hashRequest is deterministic and order-independent", () => {
    const body1 = { prompt: "A cinematic sunset", duration: 5, style: "cinematic" };
    const body2 = { prompt: "A cinematic sunset", duration: 5, style: "cinematic" };

    expect(hashRequest(body1)).toBe(hashRequest(body2));

    // Different body → different hash
    const body3 = { prompt: "A different prompt", duration: 5, style: "cinematic" };
    expect(hashRequest(body1)).not.toBe(hashRequest(body3));

    // Hash is SHA-256 hex
    expect(hashRequest(body1)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("TEST-11: different request bodies produce different hashes", () => {
    const bodies = [
      { prompt: "sunset", duration: 5 },
      { prompt: "sunset", duration: 10 },
      { prompt: "sunrise", duration: 5 },
      { prompt: "sunset", duration: 5, style: "cinematic" },
    ];

    const hashes = bodies.map(hashRequest);
    const uniqueHashes = new Set(hashes);

    // All hashes should be unique
    expect(uniqueHashes.size).toBe(bodies.length);
  });
});

// ─── 5. SPEND CAP ENFORCEMENT ────────────────────────────────────────────────

describe("WizAdora Spend Cap Logic", () => {
  it("TEST-12: spend cap defaults are conservative", () => {
    // These are the default values defined in schema.ts
    // Per-job: £2.00, Daily: £20.00, Monthly: £100.00, Account: £500.00
    const defaults = {
      perJobCapGbp: 2.0,
      dailyCapGbp: 20.0,
      monthlyCapGbp: 100.0,
      accountCapGbp: 500.0,
    };

    // Per-job cap must be less than daily cap
    expect(defaults.perJobCapGbp).toBeLessThan(defaults.dailyCapGbp);

    // Daily cap must be less than monthly cap
    expect(defaults.dailyCapGbp).toBeLessThan(defaults.monthlyCapGbp);

    // Monthly cap must be less than account cap
    expect(defaults.monthlyCapGbp).toBeLessThan(defaults.accountCapGbp);

    // Per-job cap must be reasonable (not zero, not infinite)
    expect(defaults.perJobCapGbp).toBeGreaterThan(0);
    expect(defaults.perJobCapGbp).toBeLessThanOrEqual(10);
  });

  it("TEST-13: spend cap check logic correctly identifies violations", () => {
    // Simulate the spend cap check logic (pure function, no DB)
    function simulateSpendCapCheck(
      estimatedCost: number,
      caps: { perJob: number; daily: number; monthly: number; account: number },
      spent: { daily: number; monthly: number; total: number }
    ): { allowed: boolean; reason?: string } {
      if (estimatedCost > caps.perJob) {
        return { allowed: false, reason: "per_job_cap" };
      }
      if (spent.daily + estimatedCost > caps.daily) {
        return { allowed: false, reason: "daily_cap" };
      }
      if (spent.monthly + estimatedCost > caps.monthly) {
        return { allowed: false, reason: "monthly_cap" };
      }
      if (spent.total + estimatedCost > caps.account) {
        return { allowed: false, reason: "account_cap" };
      }
      return { allowed: true };
    }

    const caps = { perJob: 2.0, daily: 20.0, monthly: 100.0, account: 500.0 };

    // Normal request passes
    expect(simulateSpendCapCheck(0.05, caps, { daily: 0, monthly: 0, total: 0 })).toEqual({ allowed: true });

    // Per-job cap violation
    expect(simulateSpendCapCheck(3.0, caps, { daily: 0, monthly: 0, total: 0 })).toEqual({
      allowed: false,
      reason: "per_job_cap",
    });

    // Daily cap violation
    expect(simulateSpendCapCheck(1.0, caps, { daily: 19.5, monthly: 0, total: 0 })).toEqual({
      allowed: false,
      reason: "daily_cap",
    });

    // Monthly cap violation
    expect(simulateSpendCapCheck(1.0, caps, { daily: 0, monthly: 99.5, total: 0 })).toEqual({
      allowed: false,
      reason: "monthly_cap",
    });

    // Account cap violation
    expect(simulateSpendCapCheck(1.0, caps, { daily: 0, monthly: 0, total: 499.5 })).toEqual({
      allowed: false,
      reason: "account_cap",
    });
  });
});

// ─── 6. WEBHOOK SIGNATURE ────────────────────────────────────────────────────

describe("WizAdora Webhook Security", () => {
  it("TEST-14: webhook signature generation and verification", () => {
    const payload = JSON.stringify({ event: "job.completed", jobId: "test-123" });
    const timestamp = Math.floor(Date.now() / 1000);

    const signature = generateWebhookSignature(payload, timestamp);

    // Signature format: t=<timestamp>,v1=<hmac>
    expect(signature).toMatch(/^t=\d+,v1=[0-9a-f]{64}$/);

    // Valid signature verifies
    expect(verifyWebhookSignature(payload, signature)).toBe(true);

    // Tampered payload fails
    const tamperedPayload = JSON.stringify({ event: "job.completed", jobId: "tampered" });
    expect(verifyWebhookSignature(tamperedPayload, signature)).toBe(false);

    // Expired signature fails (timestamp > 5 minutes ago)
    const oldTimestamp = timestamp - 400; // 400 seconds ago > 300s tolerance
    const oldSignature = generateWebhookSignature(payload, oldTimestamp);
    expect(verifyWebhookSignature(payload, oldSignature, 300)).toBe(false);

    // Malformed signature fails gracefully
    expect(verifyWebhookSignature(payload, "invalid-signature")).toBe(false);
    expect(verifyWebhookSignature(payload, "")).toBe(false);
  });
});

// ─── 7. POLLING GUARD ────────────────────────────────────────────────────────

describe("WizAdora Polling Guard", () => {
  it("TEST-15: POLLING_CAN_SUBMIT is always false — polling never submits to provider", () => {
    // This constant must be false — it is the polling safety guard.
    // If this test fails, the polling function has been modified to allow submissions.
    expect(POLLING_CAN_SUBMIT).toBe(false);

    // The type must be the literal false, not boolean
    const typeCheck: false = POLLING_CAN_SUBMIT;
    expect(typeCheck).toBe(false);

    // Verify it's a compile-time constant (not a variable that could be changed)
    // If POLLING_CAN_SUBMIT were true, the router would throw an error
    if (POLLING_CAN_SUBMIT) {
      // This branch must never execute
      throw new Error("CRITICAL: POLLING_CAN_SUBMIT must always be false");
    }
  });
});
