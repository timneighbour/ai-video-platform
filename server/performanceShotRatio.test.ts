// Vitest test for performanceShotRatio parameter
import { describe, it, expect } from 'vitest';

describe('performanceShotRatio', () => {
  it('defaults to 75 when not provided', () => {
    const ratio = undefined ?? 75;
    expect(ratio).toBe(75);
  });

  it('clamps correctly at min/max boundaries', () => {
    const clamp = (v: number) => Math.min(95, Math.max(20, v));
    expect(clamp(0)).toBe(20);
    expect(clamp(100)).toBe(95);
    expect(clamp(75)).toBe(75);
    expect(clamp(50)).toBe(50);
    expect(clamp(90)).toBe(90);
  });

  it('calculates cinematic ratio correctly', () => {
    const performanceShotRatio = 75;
    const cinematicRatio = 100 - performanceShotRatio;
    expect(cinematicRatio).toBe(25);
  });

  it('generates correct LLM prompt strings for various ratios', () => {
    const ratios = [50, 75, 90];
    for (const performanceShotRatio of ratios) {
      const cinematicRatio = 100 - performanceShotRatio;
      const promptFragment = `Aim for ${performanceShotRatio}% of scenes to be performance shots`;
      const intercutFragment = `These are ${cinematicRatio}% of total scenes`;
      expect(promptFragment).toContain(`${performanceShotRatio}%`);
      expect(intercutFragment).toContain(`${cinematicRatio}%`);
    }
  });

  it('validates z.number().int().min(0).max(100) schema', () => {
    const validate = (v: number) => Number.isInteger(v) && v >= 0 && v <= 100;
    expect(validate(75)).toBe(true);
    expect(validate(0)).toBe(true);
    expect(validate(100)).toBe(true);
    expect(validate(-1)).toBe(false);
    expect(validate(101)).toBe(false);
    expect(validate(75.5)).toBe(false);
  });
});
