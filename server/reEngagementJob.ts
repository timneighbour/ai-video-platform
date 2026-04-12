/**
 * Re-engagement cron job
 *
 * Runs every hour and checks for users who created a project but never rendered it.
 * Sends in-app notifications at:
 *   - 24 hours after project creation (reminder 1)
 *   - 3 days after project creation (reminder 2)
 *
 * Messaging is friendly, non-pushy, and reinforces value.
 */
import cron from "node-cron";
import { getDb } from "./db";
import {
  musicVideoJobs,
  inAppNotifications,
  reEngagementReminders,
} from "../drizzle/schema";
import { and, eq, isNull, lt, notInArray, sql } from "drizzle-orm";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const REMINDER_MESSAGES: Record<
  1 | 2,
  { title: string; message: string; actionLabel: string; actionUrl: string }
> = {
  1: {
    title: "Your video is waiting ✨",
    message:
      "You started a project but haven't rendered it yet. Pick up where you left off — your scenes are saved and ready to go.",
    actionLabel: "Continue creating",
    actionUrl: "/projects",
  },
  2: {
    title: "Don't let your video go to waste",
    message:
      "Your project is still waiting. It only takes a moment to render your final video — and it could be something amazing.",
    actionLabel: "Finish your video",
    actionUrl: "/projects",
  },
};

async function sendReEngagementReminders() {
  try {
    const db = await getDb();
    if (!db) return; // DB not available
    const now = Date.now();

    // Find jobs that are in draft or storyboard_ready state (never rendered)
    // and were created more than 24 hours ago
    const staleCutoff24h = new Date(now - DAY_MS);
    const staleCutoff3d = new Date(now - 3 * DAY_MS);

    // Get all jobs that have never been rendered (no finalVideoUrl, status not rendering/assembling/completed)
    const staleJobs = await db
      .select({
        id: musicVideoJobs.id,
        userId: musicVideoJobs.userId,
        createdAt: musicVideoJobs.createdAt,
        title: musicVideoJobs.title,
      })
      .from(musicVideoJobs)
      .where(
        and(
          // Only draft or storyboard_ready — never rendered
          sql`${musicVideoJobs.status} IN ('draft', 'storyboard_ready')`,
          // Created at least 24h ago
          lt(musicVideoJobs.createdAt, staleCutoff24h)
        )
      );

    for (const job of staleJobs) {
      const ageMs = now - new Date(job.createdAt).getTime();

      // Determine which reminder to send
      let reminderNumber: 1 | 2 | null = null;
      if (ageMs >= 3 * DAY_MS) {
        reminderNumber = 2;
      } else if (ageMs >= DAY_MS) {
        reminderNumber = 1;
      }

      if (!reminderNumber) continue;

      // Check if this reminder was already sent
      const alreadySent = await db
        .select({ id: reEngagementReminders.id })
        .from(reEngagementReminders)
        .where(
          and(
            eq(reEngagementReminders.userId, job.userId),
            eq(reEngagementReminders.jobId, job.id),
            eq(reEngagementReminders.reminderNumber, reminderNumber)
          )
        )
        .limit(1);

      if (alreadySent.length > 0) continue;

      // Also skip if a higher-numbered reminder was already sent for this job
      if (reminderNumber === 1) {
        const higherSent = await db
          .select({ id: reEngagementReminders.id })
          .from(reEngagementReminders)
          .where(
            and(
              eq(reEngagementReminders.userId, job.userId),
              eq(reEngagementReminders.jobId, job.id),
              eq(reEngagementReminders.reminderNumber, 2)
            )
          )
          .limit(1);
        if (higherSent.length > 0) continue;
      }

      const msg = REMINDER_MESSAGES[reminderNumber];

      // Insert in-app notification
      await db.insert(inAppNotifications).values({
        userId: job.userId,
        title: msg.title,
        message: msg.message,
        type: "reminder",
        actionUrl: msg.actionUrl,
        actionLabel: msg.actionLabel,
        isRead: false,
      });

      // Record that we sent this reminder
      await db.insert(reEngagementReminders).values({
        userId: job.userId,
        jobId: job.id,
        jobType: "music_video",
        reminderNumber,
        channel: "in_app",
      });

      console.log(
        `[ReEngagement] Sent reminder ${reminderNumber} to user ${job.userId} for job ${job.id} ("${job.title}")`
      );
    }
  } catch (err) {
    console.error("[ReEngagement] Cron job error:", err);
  }
}

/**
 * Start the re-engagement cron job.
 * Runs every hour at minute 0.
 */
export function startReEngagementJob() {
  // Run every hour
  cron.schedule("0 * * * *", () => {
    console.log("[ReEngagement] Running hourly check...");
    sendReEngagementReminders();
  });
  console.log("[ReEngagement] Cron job scheduled (hourly)");
}
