/**
 * Golden Validation Heartbeat Handler
 *
 * Registered at: POST /api/scheduled/golden-validation
 * Triggered by:  Manus Heartbeat cron (daily at 03:00 UTC)
 *
 * This is a project-level heartbeat (§4a in periodic-updates.md).
 * It runs the Golden Validation fixture end-to-end and writes the result
 * to the validationRuns table. The owner is notified on failure.
 *
 * Auth: isCron check via x-manus-cron-task-uid header (no SDK patch needed
 *       since we read the header directly — see periodic-updates.md §4b note).
 */

import type { Request, Response } from "express";
import { runGoldenValidation } from "../golden-validation";

export async function goldenValidationHandler(req: Request, res: Response) {
  // Verify this is a legitimate cron call
  const taskUid = req.headers["x-manus-cron-task-uid"] as string | undefined;
  if (!taskUid) {
    return res.status(403).json({ error: "cron-only endpoint" });
  }

  console.log(`[GoldenValidation] Heartbeat triggered — task_uid=${taskUid}`);

  try {
    const result = await runGoldenValidation();
    return res.json({
      ok: result.ok,
      runId: result.runId,
      status: result.status,
      message: result.message,
      durationMs: result.durationMs,
      jobId: result.jobId,
    });
  } catch (err) {
    const errMsg = (err as Error).message;
    console.error(`[GoldenValidation] Handler threw:`, errMsg);
    return res.status(500).json({
      error: errMsg,
      stack: (err as Error).stack,
      context: { taskUid },
      timestamp: new Date().toISOString(),
    });
  }
}
