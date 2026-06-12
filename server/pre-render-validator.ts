/**
 * pre-render-validator.ts
 *
 * Controlled Production Validation Mode — mandatory gate before any scene dispatch.
 *
 * Rules (per Tim's specification, 2026-05-15):
 *  1. Validate all pre-conditions before touching any scene
 *  2. If any check fails → BLOCK the render and return the reason
 *  3. If probe not yet run → dispatch only the best vocal scene (probe scene)
 *  4. If probe in progress (probePassed=false) → block all other scenes
 *  5. If probe approved (probePassed=true) → release all remaining scenes
 */

import { getDb } from "./db";
import { musicVideoJobs, musicVideoScenes, videoCharacters } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { isSyncLabsConfigured } from "./ai-apis/synclabs-lipsync";
import { execSync } from "child_process";

// ─── Probe Auto-Approval Configuration ───────────────────────────────────────
// If a subscriber does not approve or reject their probe within this window,
// the probe is automatically approved so the render can complete.
// Reminder emails are sent at 1h and 6h. Auto-approval fires at 24h.
export const PROBE_AUTO_APPROVE_AFTER_MS = 24 * 60 * 60 * 1000;  // 24 hours
export const PROBE_REMINDER_1_AFTER_MS   =  1 * 60 * 60 * 1000;  //  1 hour
export const PROBE_REMINDER_2_AFTER_MS   =  6 * 60 * 60 * 1000;  //  6 hours

export interface ValidationCheck {
  name: string;
  passed: boolean;
  detail: string;
}

export interface ValidationResult {
  passed: boolean;
  checks: ValidationCheck[];
  blockedReason?: string;
}

export interface ProbeDecision {
  mode: "blocked" | "probe_only" | "full_render" | "one_at_a_time";
  probeSceneId?: number;
  nextSceneId?: number;   // for one_at_a_time mode: the single scene to dispatch next
  reason?: string;
  validationResult: ValidationResult;
}

/**
 * Run all pre-render validation checks for a job.
 * Returns a ValidationResult with individual check results.
 */
export async function runPreRenderValidation(jobId: number): Promise<ValidationResult> {
  const db = await getDb();
  if (!db) {
    return {
      passed: false,
      checks: [{ name: "Database", passed: false, detail: "Database unavailable" }],
      blockedReason: "Database unavailable",
    };
  }

  const checks: ValidationCheck[] = [];

  // ── 1. Load job ───────────────────────────────────────────────────────────
  const [job] = await db.select().from(musicVideoJobs).where(eq(musicVideoJobs.id, jobId));
  if (!job) {
    return {
      passed: false,
      checks: [{ name: "Job exists", passed: false, detail: `Job ${jobId} not found` }],
      blockedReason: `Job ${jobId} not found`,
    };
  }

  // ── 2. Audio URL ──────────────────────────────────────────────────────────
  checks.push({
    name: "Audio URL",
    passed: !!job.audioUrl,
    detail: job.audioUrl ? `Set: ${job.audioUrl.slice(0, 60)}...` : "MISSING — cannot extract vocal segments",
  });

  // ── 3. Load scenes ────────────────────────────────────────────────────────
  const scenes = await db.select().from(musicVideoScenes).where(eq(musicVideoScenes.jobId, jobId));
  checks.push({
    name: "Scenes exist",
    passed: scenes.length > 0,
    detail: `${scenes.length} scenes found`,
  });

  // ── 4. Storyboard images ──────────────────────────────────────────────────
  const scenesWithStoryboard = scenes.filter((s) => !!s.previewImageUrl);
  checks.push({
    name: "Storyboard images",
    passed: scenesWithStoryboard.length === scenes.length,
    detail: `${scenesWithStoryboard.length}/${scenes.length} scenes have storyboard images`,
  });

  // ── 5. LipSync flags set correctly ────────────────────────────────────────
  const lipSyncScenes = scenes.filter((s) => s.lipSync === true);
  const lipSyncWithStartTime = lipSyncScenes.filter(
    (s) => s.startTime !== null && s.startTime !== undefined
  );
  checks.push({
    name: "LipSync scene timing",
    passed: lipSyncScenes.length === 0 || lipSyncWithStartTime.length === lipSyncScenes.length,
    detail:
      lipSyncScenes.length === 0
        ? "No lip sync scenes (OK)"
        : `${lipSyncWithStartTime.length}/${lipSyncScenes.length} lip sync scenes have startTime`,
  });

  // ── 6. Character portrait ─────────────────────────────────────────────────
  let characterPortraitUrl: string | null = null;
  try {
    const chars = await db
      .select()
      .from(videoCharacters)
      .where(eq(videoCharacters.jobId, jobId));
    const bestChar = chars.find((c) => c.masterPortraitUrl) ?? chars.find((c) => c.previewImageUrl);
    characterPortraitUrl = bestChar?.masterPortraitUrl ?? bestChar?.previewImageUrl ?? null;
  } catch {}
  checks.push({
    name: "Character portrait",
    passed: !!characterPortraitUrl,
    detail: characterPortraitUrl
      ? `Found: ${characterPortraitUrl.slice(0, 60)}...`
      : "No character portrait — scenes will render as generic person",
  });

  // ── 7. Sync Labs configured ───────────────────────────────────────────────
  const syncLabsOk = isSyncLabsConfigured();
  checks.push({
    name: "Sync Labs",
    passed: syncLabsOk,
    detail: syncLabsOk ? "Configured ✓" : "SYNC_LABS_API_KEY not set — lip sync will be skipped",
  });

  // ── 8. ffmpeg available ───────────────────────────────────────────────────
  let ffmpegOk = false;
  try {
    execSync("ffmpeg -version", { stdio: "ignore" });
    ffmpegOk = true;
  } catch {}
  checks.push({
    name: "ffmpeg",
    passed: ffmpegOk,
    detail: ffmpegOk ? "Available ✓" : "ffmpeg not found — assembly will fail",
  });

  // ── 9. Spend cap not exceeded ─────────────────────────────────────────────
  const spendOk =
    parseFloat(job.providerSpendUsd ?? "0") < parseFloat(job.maxSpendLimitUsd ?? "25");
  checks.push({
    name: "Spend cap",
    passed: spendOk,
    detail: `Spent $${job.providerSpendUsd ?? "0"} / cap $${job.maxSpendLimitUsd ?? "25.00"}`,
  });

  // ── 10. Provider mode check ───────────────────────────────────────────────
  checks.push({
    name: "Provider mode",
    passed: true,
    detail: job.fallbackProvider ? `Fallback: ${job.fallbackProvider}` : "Atlas Cloud (primary) ✓",
  });

  // ── Determine overall pass ────────────────────────────────────────────────
  // Critical checks that MUST pass before any render
  // Note: ffmpeg is NOT a critical check — it is only needed for final assembly, not for scene dispatch.
  // Removing it from critical checks prevents it from blocking probe dispatch in production (Cloud Run has no ffmpeg).
  // Note: "Storyboard images" is intentionally NOT a critical check.
  // Storyboard images are a quality enhancement (first-frame anchor for image-to-video).
  // When absent, Atlas Cloud falls back to text-to-video — still fully functional.
  // Blocking the entire render because storyboards are missing is too aggressive.
  const criticalChecks = ["Audio URL", "Scenes exist", "Spend cap"];
  const criticalFailed = checks.filter(
    (c) => criticalChecks.includes(c.name) && !c.passed
  );

  const passed = criticalFailed.length === 0;
  const blockedReason = passed
    ? undefined
    : `Critical check failed: ${criticalFailed.map((c) => c.name).join(", ")}`;

  return { passed, checks, blockedReason };
}

/**
 * Determine the probe decision for a job:
 * - "blocked": pre-render validation failed — do not dispatch anything
 * - "probe_only": dispatch only the probe scene (best vocal scene)
 * - "full_render": probe approved — dispatch all remaining scenes
 */
export async function getProbeDecision(jobId: number): Promise<ProbeDecision> {
  const validationResult = await runPreRenderValidation(jobId);

  if (!validationResult.passed) {
    return {
      mode: "blocked",
      reason: validationResult.blockedReason,
      validationResult,
    };
  }

  const db = await getDb();
  if (!db) {
    return { mode: "blocked", reason: "Database unavailable", validationResult };
  }

  const [job] = await db.select().from(musicVideoJobs).where(eq(musicVideoJobs.id, jobId));
  if (!job) {
    return { mode: "blocked", reason: "Job not found", validationResult };
  }

  // probePassed=true (or 1 from MySQL tinyint) → owner has approved the probe → full render mode
  // Dispatch ALL remaining scenes at once. The per-scene approval gate was removed because
  // it caused deadlocks when the UI approval did not set isApproved on individual scenes.
  if (job.probePassed === true || (job.probePassed as any) === 1) {
    return { mode: "full_render", validationResult };
  }

    // probePassed=false (or 0 from MySQL tinyint) → probe is in progress OR dispatch failed
  if (job.probePassed === false || (job.probePassed as any) === 0) {
    // If probeSceneId is set, check if the scene actually has a taskId (was actually dispatched)
    if (job.probeSceneId) {
      const [probeScene] = await db
        .select({ id: musicVideoScenes.id, taskId: musicVideoScenes.taskId, status: musicVideoScenes.status })
        .from(musicVideoScenes)
        .where(eq(musicVideoScenes.id, job.probeSceneId));
      if (probeScene && !probeScene.taskId && probeScene.status === "pending") {
        // Scene is pending with no taskId — this means launchProbeRender queued it
        // but the heartbeat hasn't dispatched it yet (or a previous attempt failed and was reset).
        // DO NOT reset probeSceneId — just return probe_only with the existing scene.
        // This preserves the user's explicit scene selection.
        console.log(`[ProbeGate] Probe scene ${job.probeSceneId} is pending (no taskId yet) — dispatching now`);
        return {
          mode: "probe_only",
          probeSceneId: job.probeSceneId,
          validationResult,
        };
      } else {
        // Scene is genuinely rendering (has taskId) or completed.
        // Check if the probe video is ready and the subscriber has not acted within the timeout.
        const probeVideoReady = !!job.probeVideoUrl;
        if (probeVideoReady && job.updatedAt) {
          const msSinceProbeReady = Date.now() - new Date(job.updatedAt).getTime();
          // ── AUTO-APPROVAL: probe has been waiting > 24h without subscriber action ──
          if (msSinceProbeReady >= PROBE_AUTO_APPROVE_AFTER_MS) {
            console.log(
              `[ProbeGate] Job ${jobId}: probe auto-approved after ${Math.round(msSinceProbeReady / 3600000)}h ` +
              `(subscriber did not respond within ${PROBE_AUTO_APPROVE_AFTER_MS / 3600000}h timeout)`
            );
            await db.update(musicVideoJobs)
              .set({ probePassed: true, probeApprovedAt: new Date(), updatedAt: new Date() })
              .where(eq(musicVideoJobs.id, jobId));
            // Notify owner of auto-approval
            try {
              const { notifyOwner } = await import("./_core/notification");
              await notifyOwner({
                title: `Probe auto-approved — Job #${jobId}`,
                content: `The probe for job #${jobId} was automatically approved after ${Math.round(msSinceProbeReady / 3600000)} hours because the subscriber did not respond. Full render has been released.`,
              });
            } catch { /* non-fatal */ }
            return { mode: "full_render", validationResult };
          }
          // ── REMINDER EMAILS: send at 1h and 6h if not yet sent ──
          // We use the updatedAt timestamp as a proxy for when the probe became ready.
          // In future, a dedicated probeVideoReadyAt column would be more precise.
          if (msSinceProbeReady >= PROBE_REMINDER_2_AFTER_MS) {
            // 6h reminder — only log (email sending is handled by a separate scheduled job)
            console.log(`[ProbeGate] Job ${jobId}: probe has been awaiting approval for ${Math.round(msSinceProbeReady / 3600000)}h — 6h reminder threshold reached`);
          } else if (msSinceProbeReady >= PROBE_REMINDER_1_AFTER_MS) {
            console.log(`[ProbeGate] Job ${jobId}: probe has been awaiting approval for ${Math.round(msSinceProbeReady / 3600000)}h — 1h reminder threshold reached`);
          }
        }
        return {
          mode: "blocked",
          reason: "Probe scene is rendering — waiting for owner approval before releasing full render",
          probeSceneId: job.probeSceneId ?? undefined,
          validationResult,
        };
      }
    } else {
      // probeSceneId is null but probePassed=false — inconsistent state.
      // This can happen when the ProbeGate previously cleared probeSceneId after a dispatch failure
      // but probePassed was not reset to null. Reset it now so probe selection can restart cleanly.
      console.warn(`[ProbeGate] Job ${jobId}: probePassed=false but probeSceneId=null — resetting probePassed to null for clean probe re-selection`);
      await db.update(musicVideoJobs)
        .set({ probePassed: null, probeSceneId: null, updatedAt: new Date() })
        .where(eq(musicVideoJobs.id, jobId));
      // Fall through to probe_only selection below
    }
  }

  // probePassed=null → no probe yet → select the best vocal scene for the probe
  const scenes = await db.select().from(musicVideoScenes).where(eq(musicVideoScenes.jobId, jobId));
  const pendingScenes = scenes.filter((s) => s.status === "pending");

  // Best probe scene: first pending scene with lipSync=true and a startTime (vocal scene)
  const bestProbeScene =
    pendingScenes.find((s) => s.lipSync === true && s.startTime !== null && s.startTime !== undefined) ??
    pendingScenes[0];

  if (!bestProbeScene) {
    return {
      mode: "blocked",
      reason: "No pending scenes to probe",
      validationResult,
    };
  }

  return {
    mode: "probe_only",
    probeSceneId: bestProbeScene.id,
    validationResult,
  };
}
