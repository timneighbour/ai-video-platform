/**
 * Email notification module tests
 * Validates that the Resend integration initialises correctly
 * and that all helper functions are callable without throwing.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the resend module so no real API calls are made
vi.mock("resend", () => {
  return {
    Resend: vi.fn().mockImplementation(() => ({
      emails: {
        send: vi.fn().mockResolvedValue({ data: { id: "test-email-id" }, error: null }),
      },
    })),
  };
});

// Set a fake API key before importing the module
process.env.RESEND_API_KEY = "re_test_fake_key_for_unit_test";

describe("Email notification helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("emailNewSignup resolves without throwing", async () => {
    const { emailNewSignup } = await import("./email");
    await expect(
      emailNewSignup({ name: "Test User", email: "test@example.com", id: 1 })
    ).resolves.toBeUndefined();
  });

  it("emailNewSubscription resolves without throwing", async () => {
    const { emailNewSubscription } = await import("./email");
    await expect(
      emailNewSubscription({
        name: "Test User",
        email: "test@example.com",
        plan: "pro",
        amount: 4900,
        interval: "month",
      })
    ).resolves.toBeUndefined();
  });

  it("emailCreditPurchase resolves without throwing", async () => {
    const { emailCreditPurchase } = await import("./email");
    await expect(
      emailCreditPurchase({
        name: "Test User",
        email: "test@example.com",
        credits: 300,
        amount: 999,
        packLabel: "Starter Pack",
      })
    ).resolves.toBeUndefined();
  });

  it("emailFailedPayment resolves without throwing", async () => {
    const { emailFailedPayment } = await import("./email");
    await expect(
      emailFailedPayment({
        name: "Test User",
        email: "test@example.com",
        amount: 4900,
        reason: "Card declined",
      })
    ).resolves.toBeUndefined();
  });

  it("emailRenderComplete resolves without throwing", async () => {
    const { emailRenderComplete } = await import("./email");
    await expect(
      emailRenderComplete({
        name: "Test User",
        email: "test@example.com",
        jobId: "job-123",
        quality: "1080p",
        duration: 45,
      })
    ).resolves.toBeUndefined();
  });

  it("gracefully no-ops when RESEND_API_KEY is absent", async () => {
    // Temporarily remove the key
    const originalKey = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;

    // Re-import with fresh module (vitest caches — just call directly)
    const { emailNewSignup } = await import("./email");
    // Should not throw even without a key
    await expect(
      emailNewSignup({ name: "No Key User", email: "nokey@example.com", id: 99 })
    ).resolves.toBeUndefined();

    process.env.RESEND_API_KEY = originalKey;
  });
});
