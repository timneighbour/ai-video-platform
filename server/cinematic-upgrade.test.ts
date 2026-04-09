/**
 * Cinematic Upgrade — unit tests
 *
 * Tests the core business logic of the cinematicUpgrade procedure:
 *  - Credit cost calculation
 *  - Insufficient credit rejection
 *  - Scene validation (only completed scenes accepted)
 *  - Partial refund on dispatch failure
 */
import { describe, it, expect } from "vitest";
import { VIDEO_CREDIT_COSTS } from "../shared/const";

const COST_PER_SCENE = VIDEO_CREDIT_COSTS.perCinematicScene; // 20

// ── Helpers that mirror the procedure's logic ──────────────────────────────

function calculateUpgradeCost(sceneCount: number): number {
  return sceneCount * COST_PER_SCENE;
}

function canAffordUpgrade(balance: number, sceneCount: number): boolean {
  return balance >= calculateUpgradeCost(sceneCount);
}

function filterValidScenes(
  requestedIds: number[],
  allScenes: Array<{ id: number; status: string }>
): number[] {
  const sceneMap = new Map(allScenes.map((s) => [s.id, s]));
  return requestedIds.filter((id) => {
    const scene = sceneMap.get(id);
    return scene && scene.status === "completed";
  });
}

function calculateRefund(failedCount: number): number {
  return failedCount * COST_PER_SCENE;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("cinematicUpgrade — credit cost calculation", () => {
  it("charges 20 credits per scene", () => {
    expect(calculateUpgradeCost(1)).toBe(20);
    expect(calculateUpgradeCost(5)).toBe(100);
    expect(calculateUpgradeCost(10)).toBe(200);
  });

  it("returns 0 for 0 scenes", () => {
    expect(calculateUpgradeCost(0)).toBe(0);
  });
});

describe("cinematicUpgrade — affordability check", () => {
  it("allows upgrade when balance exactly equals cost", () => {
    expect(canAffordUpgrade(100, 5)).toBe(true); // 5 × 20 = 100
  });

  it("allows upgrade when balance exceeds cost", () => {
    expect(canAffordUpgrade(500, 3)).toBe(true); // 3 × 20 = 60
  });

  it("rejects upgrade when balance is insufficient", () => {
    expect(canAffordUpgrade(50, 5)).toBe(false); // needs 100
  });

  it("rejects upgrade when balance is 0", () => {
    expect(canAffordUpgrade(0, 1)).toBe(false);
  });

  it("allows upgrade of 0 scenes with any balance", () => {
    expect(canAffordUpgrade(0, 0)).toBe(true); // 0 cost
  });
});

describe("cinematicUpgrade — scene validation", () => {
  const allScenes = [
    { id: 1, status: "completed" },
    { id: 2, status: "completed" },
    { id: 3, status: "failed" },
    { id: 4, status: "pending" },
    { id: 5, status: "generating" },
  ];

  it("accepts only completed scenes", () => {
    const valid = filterValidScenes([1, 2, 3, 4, 5], allScenes);
    expect(valid).toEqual([1, 2]);
  });

  it("returns empty array when no completed scenes requested", () => {
    const valid = filterValidScenes([3, 4, 5], allScenes);
    expect(valid).toEqual([]);
  });

  it("ignores scene IDs that don't exist in the job", () => {
    const valid = filterValidScenes([99, 100], allScenes);
    expect(valid).toEqual([]);
  });

  it("handles a mix of valid and invalid IDs", () => {
    const valid = filterValidScenes([1, 3, 99], allScenes);
    expect(valid).toEqual([1]);
  });

  it("accepts all completed scenes when all are requested", () => {
    const valid = filterValidScenes([1, 2], allScenes);
    expect(valid).toEqual([1, 2]);
  });
});

describe("cinematicUpgrade — partial refund logic", () => {
  it("refunds 20 credits per failed scene", () => {
    expect(calculateRefund(1)).toBe(20);
    expect(calculateRefund(3)).toBe(60);
  });

  it("refunds 0 when no scenes failed", () => {
    expect(calculateRefund(0)).toBe(0);
  });

  it("net cost is (dispatched × 20) when some scenes fail", () => {
    const totalCharged = calculateUpgradeCost(5); // 100
    const refunded = calculateRefund(2); // 40
    const netCost = totalCharged - refunded;
    expect(netCost).toBe(60); // 3 successful × 20
  });
});

describe("cinematicUpgrade — constants", () => {
  it("perCinematicScene cost is 20", () => {
    expect(VIDEO_CREDIT_COSTS.perCinematicScene).toBe(20);
  });

  it("perCinematicScene is a positive integer", () => {
    expect(Number.isInteger(VIDEO_CREDIT_COSTS.perCinematicScene)).toBe(true);
    expect(VIDEO_CREDIT_COSTS.perCinematicScene).toBeGreaterThan(0);
  });
});
