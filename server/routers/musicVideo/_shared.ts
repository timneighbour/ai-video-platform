/**
 * Shared imports for all musicVideo sub-routers.
 * Import from here instead of duplicating across sub-router files.
 */
export { z } from "zod";
export { TRPCError } from "@trpc/server";
export { router, protectedProcedure, publicProcedure } from "../../_core/trpc";
export { getDb } from "../../db";
export {
  musicVideoJobs,
  musicVideoScenes,
  videoCharacterPhotos,
  videoCharacters,
  renderJobs,
  kidsVideoJobs,
  wizShortsJobs,
  characterScenes,
  providerJobLogs,
  sceneActionLogs,
  musicVideoVocalStems,
} from "../../../drizzle/schema";
export { withQuotaGuard, QUOTA_EXHAUSTED_MESSAGE } from "../../_core/quotaError";
export { eq, and, desc, inArray, gte, sql, isNull } from "drizzle-orm";
export { storagePut } from "../../storage";
export {
  generateStoryboard,
  calculateSceneCount,
  calculateCreditCost,
  startSceneRender,
  pollSceneStatus,
  assembleMusicVideo,
  transcribeJobAudio,
  mapModelAssignmentToWaveSpeed,
  pollPerSceneLipSyncJobs,
} from "../../music-video-service";
export { deductCredits, getUserCredits, refundCredits } from "../../credit-service";
export { transcribeAudio } from "../../_core/voiceTranscription";
export { generateImage } from "../../_core/imageGeneration";
export { generateFaceConsistentImage } from "../../_core/fluxPuLID";
export {
  validateSceneFaceConsistency,
  validateFaceConsistency,
  ensureReferencePhotoBase64,
  type CharacterLockData,
} from "../../character-lock";
export { getVocalStemForCharacter } from "../../vocal-isolation-service";
export { getUserSubscription, mapDbPlanToProductPlan, countVideosThisMonth } from "../../db";
export {
  SUBSCRIPTION_PLANS,
  PLAN_COST_TARGETS,
  PLAN_SCENE_LIMITS,
  getPlanMaxScenesPerVideo,
} from "../../products";
export { classifyScenes } from "../../scene-classifier";
export { assertSafeUrl } from "../../ssrf-guard";
export {
  runStage1AutoPrep,
  runStage2EnvironmentPrep,
  selectReferenceForScene,
  sceneTypeToRefType,
} from "../../character-auto-prep";
export { buildRoutingPlan, enforceHardStop } from "../../renderer-router";
export {
  isAnyProviderAvailable,
  checkAllProviders,
  getBestProvider,
  recordProviderOutcome,
  checkJobSpendLimit,
  updateJobSpend,
  PROVIDER_COST_PER_SCENE_USD,
} from "../../provider-health";
export { classifyFailure, isRetryableFailure, resetSceneAttempts } from "../../spend-protection";
export {
  analyseAudioInstruments,
  assignInstrumentsToCharacters,
  buildPerformancePromptBlock,
  type InstrumentAnalysis,
  type CharacterInstrumentAssignment,
  normaliseBpm,
} from "../../instrument-analysis";
export { getCharacterDefaults } from "../../../shared/characterDefaults";
export { generateFluxProPortrait, HEAD_SHOULDERS_FRAMING, PHOTOREALISTIC_PORTRAIT_SUFFIX } from "../../ai-apis/aimlapi-fluxpro";
export {
  runStemIntelligence,
  getStemSections,
  getSectionTypeAtTime,
  stemSectionToSceneType,
  getVocalOnsetTime,
} from "../../stem-intelligence-service";

/** Translate internal error codes to user-friendly messages. */
export function translateErrorMessage(errorMessage: string): string {
  if (!errorMessage) return "Something went wrong. Please try again.";
  if (errorMessage.includes("export_validation_failed")) return "The video could not be verified after rendering. Please retry.";
  if (errorMessage.includes("max_attempts_exceeded")) return "Some scenes failed to generate after multiple attempts.";
  if (errorMessage.includes("spend_cap")) return "Render stopped: spend limit reached. Please contact support.";
  if (errorMessage.includes("insufficient_credits")) return "Insufficient credits to complete this render.";
  if (errorMessage.includes("provider")) return "A generation service was unavailable. Please retry.";
  return "Something went wrong. Please retry or contact support.";
}

/**
 * Detect whether an error message indicates a provider credit/balance exhaustion.
 *
 * Covers all known patterns from WaveSpeed, Atlas Cloud, fal.ai, Hypereal, and Kling:
 *   - HTTP 400 "Insufficient Credits" (WaveSpeed)
 *   - HTTP 402 "Payment Required" (WaveSpeed, fal.ai, Atlas Cloud)
 *   - "insufficient balance" / "insufficient credits" (Atlas Cloud, Kling)
 *   - "balance" keyword (generic provider balance errors)
 *   - "payment_required" / "payment required" (various providers)
 *   - "credit" keyword combined with 400 status
 *
 * Used by the scene dispatch heartbeat and render router to immediately halt
 * retries and transition the job to provider_unavailable when credits run out.
 */
export function isProviderCreditError(errorMessage: string): boolean {
  const msg = errorMessage.toLowerCase();
  return (
    msg.includes('insufficient') ||
    msg.includes('balance') ||
    msg.includes('402') ||
    msg.includes('400 insufficient') ||
    msg.includes('payment_required') ||
    msg.includes('payment required') ||
    msg.includes('credit exhausted') ||
    msg.includes('out of credits') ||
    msg.includes('no credits') ||
    msg.includes('credits remaining') ||
    (msg.includes('400') && msg.includes('credit'))
  );
}
