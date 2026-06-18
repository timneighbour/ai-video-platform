import { describe, it, expect } from "vitest";
import { isProviderCreditError } from "./_shared";

describe("isProviderCreditError", () => {
  // ── True positives ─────────────────────────────────────────────────────────
  it("detects WaveSpeed 400 Insufficient Credits", () => {
    expect(isProviderCreditError("WaveSpeed API error: 400 Insufficient Credits")).toBe(true);
  });

  it("detects WaveSpeed image-to-video 400 Insufficient Credits", () => {
    expect(isProviderCreditError("WaveSpeed image-to-video API error: 400 Insufficient Credits")).toBe(true);
  });

  it("detects 402 Payment Required", () => {
    expect(isProviderCreditError("HTTP 402 Payment Required")).toBe(true);
  });

  it("detects 402 in error string", () => {
    expect(isProviderCreditError("fal.ai error: 402")).toBe(true);
  });

  it("detects insufficient balance (Atlas Cloud / Kling)", () => {
    expect(isProviderCreditError("Atlas Cloud error: insufficient balance")).toBe(true);
  });

  it("detects insufficient credits", () => {
    expect(isProviderCreditError("Provider returned: insufficient credits to complete request")).toBe(true);
  });

  it("detects balance keyword", () => {
    expect(isProviderCreditError("Your account balance is too low")).toBe(true);
  });

  it("detects payment_required", () => {
    expect(isProviderCreditError("payment_required: please top up your account")).toBe(true);
  });

  it("detects payment required (space)", () => {
    expect(isProviderCreditError("Error: payment required")).toBe(true);
  });

  it("detects credit exhausted", () => {
    expect(isProviderCreditError("credit exhausted for this billing period")).toBe(true);
  });

  it("detects out of credits", () => {
    expect(isProviderCreditError("out of credits")).toBe(true);
  });

  it("detects no credits", () => {
    expect(isProviderCreditError("no credits remaining")).toBe(true);
  });

  it("detects 400 + credit combination", () => {
    expect(isProviderCreditError("HTTP 400: credit limit exceeded")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isProviderCreditError("INSUFFICIENT BALANCE")).toBe(true);
    expect(isProviderCreditError("PAYMENT REQUIRED")).toBe(true);
  });

  // ── True negatives ─────────────────────────────────────────────────────────
  it("does NOT flag generic 400 errors", () => {
    expect(isProviderCreditError("HTTP 400 Bad Request: invalid prompt")).toBe(false);
  });

  it("does NOT flag 500 server errors", () => {
    expect(isProviderCreditError("HTTP 500 Internal Server Error")).toBe(false);
  });

  it("does NOT flag content policy rejections", () => {
    expect(isProviderCreditError("PROVIDER_REJECTED:content_policy:real person detected")).toBe(false);
  });

  it("does NOT flag timeout errors", () => {
    expect(isProviderCreditError("Request timeout after 30000ms")).toBe(false);
  });

  it("does NOT flag network errors", () => {
    expect(isProviderCreditError("ECONNREFUSED 127.0.0.1:3000")).toBe(false);
  });

  it("does NOT flag empty string", () => {
    expect(isProviderCreditError("")).toBe(false);
  });

  it("does NOT flag generic dispatch errors", () => {
    expect(isProviderCreditError("DISPATCH_ERROR: task submission failed")).toBe(false);
  });
});
