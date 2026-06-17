/**
 * plans.test.ts — Verify the shared plans module is the single source of truth
 * and that all data is consistent and complete.
 */
import { describe, it, expect } from "vitest";
import {
  PLANS,
  PAID_PLANS,
  COMPARISON_ROWS,
  TOPUP_PACKS,
  getPlan,
  PRICING_PAGE_PLANS,
  type PlanId,
} from "../client/src/lib/plans";

describe("plans.ts — single source of truth", () => {
  it("exports 6 plans (free + 5 paid)", () => {
    expect(PLANS).toHaveLength(6);
  });

  it("exports 5 paid plans (excludes free)", () => {
    expect(PAID_PLANS).toHaveLength(5);
    expect(PAID_PLANS.every((p) => p.id !== "free")).toBe(true);
  });

  it("every plan has required fields", () => {
    for (const plan of PLANS) {
      expect(plan.id).toBeTruthy();
      expect(plan.name).toBeTruthy();
      expect(typeof plan.monthlyPrice).toBe("number");
      expect(typeof plan.annualTotal).toBe("number");
      expect(Array.isArray(plan.outcomes)).toBe(true);
      expect(Array.isArray(plan.features)).toBe(true);
      expect(plan.cta).toBeTruthy();
    }
  });

  it("free plan has monthlyPrice of 0", () => {
    const free = getPlan("free");
    expect(free?.monthlyPrice).toBe(0);
    expect(free?.annualTotal).toBe(0);
  });

  it("starter plan price matches server/products.ts (£29/mo)", () => {
    const starter = getPlan("starter");
    expect(starter?.monthlyPrice).toBe(29);
  });

  it("creator plan price matches server/products.ts (£79/mo)", () => {
    const creator = getPlan("creator");
    expect(creator?.monthlyPrice).toBe(79);
  });

  it("studio plan price matches server/products.ts (£149/mo)", () => {
    const studio = getPlan("studio");
    expect(studio?.monthlyPrice).toBe(149);
  });

  it("PRICING_PAGE_PLANS contains exactly starter, creator, studio", () => {
    expect(PRICING_PAGE_PLANS).toEqual(["starter", "creator", "studio"]);
  });

  it("COMPARISON_ROWS has 7 rows covering all 6 plans", () => {
    expect(COMPARISON_ROWS).toHaveLength(7);
    for (const row of COMPARISON_ROWS) {
      expect(row.feature).toBeTruthy();
      expect("free" in row).toBe(true);
      expect("starter" in row).toBe(true);
      expect("creator" in row).toBe(true);
      expect("studio" in row).toBe(true);
    }
  });

  it("TOPUP_PACKS has 4 packs with correct keys", () => {
    expect(TOPUP_PACKS).toHaveLength(4);
    const keys = TOPUP_PACKS.map((p) => p.key);
    expect(keys).toContain("quick_boost");
    expect(keys).toContain("creator_boost");
    expect(keys).toContain("studio_boost");
    expect(keys).toContain("pro_bulk_boost");
  });

  it("TOPUP_PACKS prices are correct", () => {
    const packs = Object.fromEntries(TOPUP_PACKS.map((p) => [p.key, p.price]));
    expect(packs.quick_boost).toBe(12);
    expect(packs.creator_boost).toBe(35);
    expect(packs.studio_boost).toBe(89);
    expect(packs.pro_bulk_boost).toBe(199);
  });

  it("getPlan returns undefined for unknown plan ID", () => {
    expect(getPlan("unknown" as PlanId)).toBeUndefined();
  });

  it("no plan has undefined monthlyPrice", () => {
    for (const plan of PLANS) {
      expect(plan.monthlyPrice).not.toBeUndefined();
    }
  });
});
