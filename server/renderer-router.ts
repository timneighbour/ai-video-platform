/**
 * WIZ AI Renderer Router
 *
 * Implements the WIZ AI System Controller cost-optimised rendering logic.
 * Routes each classified scene to the appropriate renderer based on:
 *   1. Scene importance (hero / performance / narrative / filler)
 *   2. Plan tier (starter / pro / creator_plus / free)
 *   3. Remaining premium scene allocation for this video
 *   4. Running cost estimate vs plan hard stop
 *
 * Renderer priority:
 *   HERO        → Kling (premium), fallback Seedance if over budget
 *   PERFORMANCE → Kling if within allocation, else Seedance
 *   NARRATIVE   → Seedance (default)
 *   FILLER      → Seedance (cheapest path)
 *
 * Starter plan: Seedance only — no Kling or Runway regardless of scene type.
 */

import type { SubscriptionPlan, RendererType, SceneImportance } from "./products";
import {
  PLAN_COST_TARGETS,
  RENDERER_COSTS,
  SUBSCRIPTION_PLANS,
} from "./products";
import type { ClassifiedScene } from "./scene-classifier";

export interface RendererDecision {
  sceneIndex: number;
  renderer: RendererType;
  reason: string;
  estimatedCostGBP: number;
}

export interface RoutingPlan {
  decisions: RendererDecision[];
  totalEstimatedCostGBP: number;
  premiumScenesUsed: number;
  premiumScenesAllowed: number;
  withinBudget: boolean;
  hardStopGBP: number;
  targetGBP: number;
}

/**
 * Determine the renderer for a single scene given the current state.
 */
function routeScene(
  scene: ClassifiedScene,
  plan: SubscriptionPlan,
  premiumScenesUsed: number,
  runningCostGBP: number,
  hardStopGBP: number
): RendererDecision {
  const planConfig = SUBSCRIPTION_PLANS[plan];
  const maxPremium = planConfig.maxPremiumScenesPerVideo;
  const remainingBudget = hardStopGBP - runningCostGBP;

  // Starter and free plans: Seedance only, no exceptions
  if (plan === "starter" || plan === "free") {
    return {
      sceneIndex: scene.sceneIndex,
      renderer: "seedance",
      reason: `${plan} plan — standard renderer only`,
      estimatedCostGBP: RENDERER_COSTS.seedance,
    };
  }

  // If we've already hit the hard stop, force Seedance for all remaining scenes
  if (remainingBudget <= RENDERER_COSTS.seedance) {
    return {
      sceneIndex: scene.sceneIndex,
      renderer: "seedance",
      reason: "hard stop reached — forced to cheap renderer",
      estimatedCostGBP: RENDERER_COSTS.seedance,
    };
  }

  const importance: SceneImportance = scene.importance;

  switch (importance) {
    case "hero": {
      // Hero scenes get premium if: within allocation AND budget allows
      if (
        premiumScenesUsed < maxPremium &&
        remainingBudget >= RENDERER_COSTS.kling_standard
      ) {
        return {
          sceneIndex: scene.sceneIndex,
          renderer: "kling_standard",
          reason: "hero scene — premium renderer",
          estimatedCostGBP: RENDERER_COSTS.kling_standard,
        };
      }
      // Over allocation or budget: fallback to Seedance
      return {
        sceneIndex: scene.sceneIndex,
        renderer: "seedance",
        reason:
          premiumScenesUsed >= maxPremium
            ? "hero scene — premium allocation exhausted, fallback to Seedance"
            : "hero scene — budget constraint, fallback to Seedance",
        estimatedCostGBP: RENDERER_COSTS.seedance,
      };
    }

    case "performance": {
      // Performance scenes get premium only if within allocation AND budget allows
      if (
        premiumScenesUsed < maxPremium &&
        remainingBudget >= RENDERER_COSTS.kling_standard
      ) {
        return {
          sceneIndex: scene.sceneIndex,
          renderer: "kling_standard",
          reason: "performance scene — premium within allocation",
          estimatedCostGBP: RENDERER_COSTS.kling_standard,
        };
      }
      return {
        sceneIndex: scene.sceneIndex,
        renderer: "seedance",
        reason: "performance scene — allocation or budget limit, using Seedance",
        estimatedCostGBP: RENDERER_COSTS.seedance,
      };
    }

    case "narrative":
    case "filler":
    default: {
      // All narrative and filler scenes use Seedance
      return {
        sceneIndex: scene.sceneIndex,
        renderer: "seedance",
        reason: `${importance} scene — standard renderer`,
        estimatedCostGBP: RENDERER_COSTS.seedance,
      };
    }
  }
}

/**
 * Build a full routing plan for all scenes in a video.
 * Processes scenes in order, tracking running cost and premium allocation.
 * Hero scenes are prioritised first within the premium budget.
 */
export function buildRoutingPlan(
  scenes: ClassifiedScene[],
  plan: SubscriptionPlan
): RoutingPlan {
  const costTargets = PLAN_COST_TARGETS[plan];
  const planConfig = SUBSCRIPTION_PLANS[plan];
  const maxPremium = planConfig.maxPremiumScenesPerVideo;

  // Sort: process hero scenes first to ensure they get premium allocation,
  // then restore original order for rendering
  const heroFirst = [...scenes].sort((a, b) => {
    const priority: Record<SceneImportance, number> = {
      hero: 0,
      performance: 1,
      narrative: 2,
      filler: 3,
    };
    return priority[a.importance] - priority[b.importance];
  });

  // First pass: assign renderers in priority order
  const decisionMap = new Map<number, RendererDecision>();
  let premiumScenesUsed = 0;
  let runningCost = 0;

  for (const scene of heroFirst) {
    const decision = routeScene(
      scene,
      plan,
      premiumScenesUsed,
      runningCost,
      costTargets.hardStopGBP
    );
    decisionMap.set(scene.sceneIndex, decision);
    runningCost += decision.estimatedCostGBP;
    if (decision.renderer !== "seedance") {
      premiumScenesUsed++;
    }
  }

  // Restore original scene order
  const decisions = scenes
    .map((s) => decisionMap.get(s.sceneIndex)!)
    .filter(Boolean);

  return {
    decisions,
    totalEstimatedCostGBP: runningCost,
    premiumScenesUsed,
    premiumScenesAllowed: maxPremium,
    withinBudget: runningCost <= costTargets.hardStopGBP,
    hardStopGBP: costTargets.hardStopGBP,
    targetGBP: costTargets.targetGBP,
  };
}

/**
 * Downgrade the routing plan until it fits within the hard stop.
 * Demotes performance scenes first, then hero scenes, to Seedance.
 * Returns the adjusted plan.
 */
export function enforceHardStop(plan: RoutingPlan): RoutingPlan {
  if (plan.withinBudget) return plan;

  // Work on a mutable copy
  const decisions = plan.decisions.map((d) => ({ ...d }));

  // Downgrade performance scenes first (they're less critical than hero)
  for (const d of decisions) {
    if (plan.totalEstimatedCostGBP <= plan.hardStopGBP) break;
    if (d.renderer !== "seedance" && !d.reason.includes("hero")) {
      const saving = d.estimatedCostGBP - RENDERER_COSTS.seedance;
      d.renderer = "seedance";
      d.reason = "downgraded — hard stop enforcement";
      d.estimatedCostGBP = RENDERER_COSTS.seedance;
      plan = { ...plan, totalEstimatedCostGBP: plan.totalEstimatedCostGBP - saving };
    }
  }

  // If still over budget, downgrade hero scenes too
  for (const d of decisions) {
    if (plan.totalEstimatedCostGBP <= plan.hardStopGBP) break;
    if (d.renderer !== "seedance") {
      const saving = d.estimatedCostGBP - RENDERER_COSTS.seedance;
      d.renderer = "seedance";
      d.reason = "hero scene downgraded — hard stop enforcement";
      d.estimatedCostGBP = RENDERER_COSTS.seedance;
      plan = { ...plan, totalEstimatedCostGBP: plan.totalEstimatedCostGBP - saving };
    }
  }

  const premiumUsed = decisions.filter((d) => d.renderer !== "seedance").length;

  return {
    ...plan,
    decisions,
    premiumScenesUsed: premiumUsed,
    withinBudget: plan.totalEstimatedCostGBP <= plan.hardStopGBP,
  };
}

/**
 * Estimate the total render cost for a set of scenes under a given plan,
 * without full classification. Uses a conservative estimate based on scene count
 * and plan premium allocation.
 *
 * Useful for a quick pre-check before running the full classifier.
 */
export function estimateVideoCostGBP(
  sceneCount: number,
  plan: SubscriptionPlan
): { estimatedGBP: number; worstCaseGBP: number } {
  const planConfig = SUBSCRIPTION_PLANS[plan];
  const maxPremium = Math.min(planConfig.maxPremiumScenesPerVideo, sceneCount);
  const standardScenes = sceneCount - maxPremium;

  const estimated =
    maxPremium * RENDERER_COSTS.kling_standard +
    standardScenes * RENDERER_COSTS.seedance;

  const worstCase = sceneCount * RENDERER_COSTS.kling_standard;

  return { estimatedGBP: estimated, worstCaseGBP: worstCase };
}

/**
 * Check if a video job is within the plan's monthly video count.
 * Returns true if the user can still create a video this month.
 */
export function isWithinMonthlyLimit(
  videosCreatedThisMonth: number,
  plan: SubscriptionPlan
): boolean {
  const max = SUBSCRIPTION_PLANS[plan].maxVideosPerMonth;
  return videosCreatedThisMonth < max;
}

/**
 * Check if the requested audio duration is within the plan's video length limit.
 */
export function isWithinLengthLimit(
  audioDurationSeconds: number,
  plan: SubscriptionPlan
): boolean {
  return audioDurationSeconds <= SUBSCRIPTION_PLANS[plan].maxVideoSeconds;
}
