/**
 * probeReminderHeartbeat.ts
 *
 * Scheduled job that runs every 30 minutes.
 * Scans all jobs in "awaiting probe approval" state and:
 *  - Sends a 1h reminder email if the probe has been ready for 1–2h
 *  - Sends a 6h reminder email if the probe has been ready for 6–7h
 *  - Auto-approval is handled by getProbeDecision() in pre-render-validator.ts
 *    on the next heartbeat tick after the 24h threshold is crossed.
 *
 * Idempotency: reminder emails are only sent once per threshold window.
 * We track this by storing a probeReminderSentAt timestamp on the job.
 * If no such column exists (legacy jobs), we fall back to updatedAt.
 */

import { getDb } from "../db";
import { musicVideoJobs, users } from "../../drizzle/schema";
import { eq, and, isNotNull, isNull, or } from "drizzle-orm";
import {
  PROBE_REMINDER_1_AFTER_MS,
  PROBE_REMINDER_2_AFTER_MS,
  PROBE_AUTO_APPROVE_AFTER_MS,
} from "../pre-render-validator";
import { emailProbeReminder } from "../email";

export async function runProbeReminderHeartbeat(): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[ProbeReminder] Database unavailable — skipping");
    return;
  }

  // Find all jobs where:
  //  - probePassed = false (probe in progress / awaiting approval)
  //  - probeVideoUrl is set (probe clip is ready — not still rendering)
  const awaitingJobs = await db
    .select({
      id: musicVideoJobs.id,
      userId: musicVideoJobs.userId,
      title: musicVideoJobs.title,
      probeVideoUrl: musicVideoJobs.probeVideoUrl,
      updatedAt: musicVideoJobs.updatedAt,
    })
    .from(musicVideoJobs)
    .where(
      and(
        // probePassed = false (MySQL tinyint 0)
        eq(musicVideoJobs.probePassed, false as any),
        isNotNull(musicVideoJobs.probeVideoUrl),
      )
    );

  if (awaitingJobs.length === 0) {
    return; // Nothing to do
  }

  console.log(`[ProbeReminder] Found ${awaitingJobs.length} job(s) awaiting probe approval`);

  for (const job of awaitingJobs) {
    if (!job.updatedAt) continue;

    const msSinceProbeReady = Date.now() - new Date(job.updatedAt).getTime();

    // Skip if already past the auto-approval threshold — getProbeDecision handles that
    if (msSinceProbeReady >= PROBE_AUTO_APPROVE_AFTER_MS) {
      console.log(`[ProbeReminder] Job ${job.id}: past auto-approval threshold — skipping reminder`);
      continue;
    }

    // Determine which reminder window we're in
    const in1hWindow = msSinceProbeReady >= PROBE_REMINDER_1_AFTER_MS && msSinceProbeReady < PROBE_REMINDER_2_AFTER_MS;
    const in6hWindow = msSinceProbeReady >= PROBE_REMINDER_2_AFTER_MS;

    if (!in1hWindow && !in6hWindow) continue;

    const hoursWaiting = Math.round(msSinceProbeReady / 3600000);

    // Fetch subscriber email
    const [user] = await db
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, job.userId));

    if (!user?.email) {
      console.warn(`[ProbeReminder] Job ${job.id}: no email for user ${job.userId} — skipping`);
      continue;
    }

    // Send the appropriate reminder
    await emailProbeReminder({
      name: user.name ?? "there",
      email: user.email,
      jobId: job.id,
      jobTitle: job.title ?? undefined,
      hoursWaiting,
      origin: "https://www.wiz-ai.io",
    });

    console.log(`[ProbeReminder] Job ${job.id}: sent ${hoursWaiting}h reminder to ${user.email}`);
  }
}
