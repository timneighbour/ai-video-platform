/**
 * WizVid Profitability Engine Tests
 * Tests for scene classifier, renderer router, and cost guardrail logic.
 */
import { describe, it, expect } from "vitest";
import { classifySceneSync } from "./scene-classifier";
import {
  buildRoutingPlan,
  enforceHardStop,
  estimateVideoCostGBP,
  isWithinMonthlyLimit,
  isWithinLengthLimit,
} from "./renderer-router";
import { RENDERER_COSTS, PLAN_COST_TARGETS, SUBSCRIPTION_PLANS } from "./products";
import type { ClassifiedScene } from "./scene-classifier";

// ─── Scene Classifier Tests ───────────────────────────────────────────────────

describe("classifySceneSync (heuristic)", () => {
  it("classifies chorus/climax scenes as hero", () => {
    expect(
      classifySceneSync({ sceneIndex: 0, prompt: "Epic chorus moment with dramatic music", lyrics: null, startTime: 0, duration: 8 })
    ).toBe("hero");
    expect(
      classifySceneSync({ sceneIndex: 1, prompt: "The climax of the story, triumphant finale", lyrics: null, startTime: 8, duration: 8 })
    ).toBe("hero");
  });

  it("classifies singing/performance scenes as performance", () => {
    expect(
      classifySceneSync({ sceneIndex: 2, prompt: "Close-up of character singing on stage", lyrics: "La la la", startTime: 16, duration: 8 })
    ).toBe("performance");
    expect(
      classifySceneSync({ sceneIndex: 3, prompt: "Character dancing in spotlight", lyrics: null, startTime: 24, duration: 8 })
    ).toBe("performance");
  });

  it("classifies establishing/aerial shots as filler", () => {
    expect(
      classifySceneSync({ sceneIndex: 4, prompt: "Wide aerial shot of the city at dawn", lyrics: null, startTime: 32, duration: 8 })
    ).toBe("filler");
    expect(
      classifySceneSync({ sceneIndex: 5, prompt: "Transition fade to next scene", lyrics: null, startTime: 40, duration: 8 })
    ).toBe("filler");
  });

  it("classifies normal story scenes as narrative", () => {
    expect(
      classifySceneSync({ sceneIndex: 6, prompt: "A young boy walks through the forest", lyrics: null, startTime: 48, duration: 8 })
    ).toBe("narrative");
  });
});

// ─── Renderer Router Tests ────────────────────────────────────────────────────

function makeScene(
  sceneIndex: number,
  importance: ClassifiedScene["importance"]
): ClassifiedScene {
  return {
    sceneIndex,
    prompt: `Scene ${sceneIndex}`,
    lyrics: null,
    startTime: sceneIndex * 8,
    duration: 8,
    importance,
    classificationReason: "test",
  };
}

describe("buildRoutingPlan — Starter plan", () => {
  it("routes ALL scenes to Seedance regardless of importance", () => {
    const scenes: ClassifiedScene[] = [
      makeScene(0, "hero"),
      makeScene(1, "performance"),
      makeScene(2, "narrative"),
      makeScene(3, "filler"),
    ];
    const plan = buildRoutingPlan(scenes, "starter");
    expect(plan.decisions.every((d) => d.renderer === "seedance")).toBe(true);
    expect(plan.premiumScenesUsed).toBe(0);
  });

  it("stays within hard stop cost", () => {
    const scenes = Array.from({ length: 8 }, (_, i) => makeScene(i, "narrative"));
    const plan = buildRoutingPlan(scenes, "starter");
    expect(plan.totalEstimatedCostGBP).toBeLessThanOrEqual(PLAN_COST_TARGETS.starter.hardStopGBP);
  });
});

describe("buildRoutingPlan — Pro plan", () => {
  it("routes hero scenes to Kling within premium allocation", () => {
    const scenes: ClassifiedScene[] = [
      makeScene(0, "hero"),
      makeScene(1, "hero"),
      makeScene(2, "narrative"),
      makeScene(3, "narrative"),
    ];
    const plan = buildRoutingPlan(scenes, "pro");
    const heroDecisions = plan.decisions.filter((d) => d.sceneIndex === 0 || d.sceneIndex === 1);
    expect(heroDecisions.every((d) => d.renderer === "kling_standard")).toBe(true);
  });

  it("falls back to Seedance when premium allocation exhausted", () => {
    // Pro allows maxPremiumScenesPerVideo = 4
    const scenes: ClassifiedScene[] = Array.from({ length: 8 }, (_, i) => makeScene(i, "hero"));
    const plan = buildRoutingPlan(scenes, "pro");
    expect(plan.premiumScenesUsed).toBe(SUBSCRIPTION_PLANS.pro.maxPremiumScenesPerVideo);
    // Remaining scenes should be Seedance
    const seedanceCount = plan.decisions.filter((d) => d.renderer === "seedance").length;
    expect(seedanceCount).toBe(8 - SUBSCRIPTION_PLANS.pro.maxPremiumScenesPerVideo);
  });

  it("narrative and filler scenes always use Seedance", () => {
    const scenes: ClassifiedScene[] = [
      makeScene(0, "narrative"),
      makeScene(1, "filler"),
      makeScene(2, "narrative"),
    ];
    const plan = buildRoutingPlan(scenes, "pro");
    expect(plan.decisions.every((d) => d.renderer === "seedance")).toBe(true);
  });
});

describe("buildRoutingPlan — Creator+ plan", () => {
  it("allows up to 8 premium scenes", () => {
    const scenes: ClassifiedScene[] = Array.from({ length: 10 }, (_, i) => makeScene(i, "hero"));
    const plan = buildRoutingPlan(scenes, "creator_plus");
    expect(plan.premiumScenesUsed).toBe(SUBSCRIPTION_PLANS.creator_plus.maxPremiumScenesPerVideo);
  });
});

// ─── Hard Stop Enforcement Tests ──────────────────────────────────────────────

describe("enforceHardStop", () => {
  it("returns plan unchanged if already within budget", () => {
    const scenes: ClassifiedScene[] = [makeScene(0, "narrative"), makeScene(1, "filler")];
    const plan = buildRoutingPlan(scenes, "starter");
    const enforced = enforceHardStop(plan);
    expect(enforced.withinBudget).toBe(true);
    expect(enforced.totalEstimatedCostGBP).toBe(plan.totalEstimatedCostGBP);
  });

  it("downgrades scenes until within hard stop", () => {
    // Manually construct an over-budget plan
    const overBudgetPlan = {
      decisions: [
        { sceneIndex: 0, renderer: "kling_standard" as const, reason: "hero", estimatedCostGBP: RENDERER_COSTS.kling_standard },
        { sceneIndex: 1, renderer: "kling_standard" as const, reason: "performance", estimatedCostGBP: RENDERER_COSTS.kling_standard },
        { sceneIndex: 2, renderer: "kling_standard" as const, reason: "hero", estimatedCostGBP: RENDERER_COSTS.kling_standard },
      ],
      totalEstimatedCostGBP: RENDERER_COSTS.kling_standard * 3, // £1.59 — over starter hard stop £1.25
      premiumScenesUsed: 3,
      premiumScenesAllowed: 0,
      withinBudget: false,
      hardStopGBP: PLAN_COST_TARGETS.starter.hardStopGBP,
      targetGBP: PLAN_COST_TARGETS.starter.targetGBP,
    };

    const enforced = enforceHardStop(overBudgetPlan);
    expect(enforced.totalEstimatedCostGBP).toBeLessThanOrEqual(PLAN_COST_TARGETS.starter.hardStopGBP);
  });
});

// ─── Cost Estimation Tests ────────────────────────────────────────────────────

describe("estimateVideoCostGBP", () => {
  it("estimates correctly for all-Seedance (0 premium scenes)", () => {
    // 8 scenes, 0 premium → all Seedance
    const estimatedGBP = 0 * RENDERER_COSTS.kling_standard + 8 * RENDERER_COSTS.seedance;
    expect(estimatedGBP).toBeCloseTo(8 * RENDERER_COSTS.seedance, 4);
  });

  it("estimates correctly for hybrid (4 premium + 4 standard)", () => {
    const estimatedGBP = 4 * RENDERER_COSTS.kling_standard + 4 * RENDERER_COSTS.seedance;
    const expected = 4 * RENDERER_COSTS.kling_standard + 4 * RENDERER_COSTS.seedance;
    expect(estimatedGBP).toBeCloseTo(expected, 4);
  });

  it("worst case is all-Kling", () => {
    const worstCaseGBP = 8 * RENDERER_COSTS.kling_standard;
    expect(worstCaseGBP).toBeCloseTo(8 * RENDERER_COSTS.kling_standard, 4);
  });

  it("Seedance is always cheaper than Kling per scene", () => {
    expect(RENDERER_COSTS.seedance).toBeLessThan(RENDERER_COSTS.kling_standard);
  });
});

// ─── Plan Limit Tests ─────────────────────────────────────────────────────────

describe("isWithinMonthlyLimit", () => {
  it("allows creation when under limit", () => {
    expect(isWithinMonthlyLimit(9, "starter")).toBe(true); // starter: max 10
    expect(isWithinMonthlyLimit(0, "free")).toBe(true);    // free: max 2
  });

  it("blocks creation when at or over limit", () => {
    expect(isWithinMonthlyLimit(10, "starter")).toBe(false); // starter: max 10
    expect(isWithinMonthlyLimit(2, "free")).toBe(false);     // free: max 2
    expect(isWithinMonthlyLimit(25, "pro")).toBe(false);     // pro: max 25
  });
});

describe("isWithinLengthLimit", () => {
  it("allows audio within plan length", () => {
    expect(isWithinLengthLimit(60, "starter")).toBe(true);      // starter: max 60s
    expect(isWithinLengthLimit(120, "pro")).toBe(true);         // pro: max 120s
    expect(isWithinLengthLimit(180, "creator_plus")).toBe(true); // creator+: max 180s
  });

  it("blocks audio exceeding plan length", () => {
    expect(isWithinLengthLimit(61, "starter")).toBe(false);
    expect(isWithinLengthLimit(121, "pro")).toBe(false);
    expect(isWithinLengthLimit(181, "creator_plus")).toBe(false);
  });
});

// ─── Renderer Cost Constants Sanity Check ────────────────────────────────────

describe("RENDERER_COSTS sanity", () => {
  it("Seedance is cheaper than Kling standard", () => {
    expect(RENDERER_COSTS.seedance).toBeLessThan(RENDERER_COSTS.kling_standard);
  });

  it("Kling standard is cheaper than Kling pro", () => {
    expect(RENDERER_COSTS.kling_standard).toBeLessThan(RENDERER_COSTS.kling_pro);
  });

  it("Runway is between Seedance and Kling", () => {
    expect(RENDERER_COSTS.runway).toBeGreaterThan(RENDERER_COSTS.seedance);
    expect(RENDERER_COSTS.runway).toBeLessThan(RENDERER_COSTS.kling_pro);
  });
});
