/**
 * Stripe Webhook Handler
 * Processes payment events and updates database accordingly
 */

import Stripe from "stripe";
import { getDb, getRawConn } from "./db";
import { eq } from "drizzle-orm";
import { subscriptions, creditTransactions, credits, topupPurchases, kidsVideoJobs, users, stripeProcessedEvents } from "../drizzle/schema";
import { notifyOwner } from "./_core/notification";
import { addCredits, resetMonthlyCredits } from "./credit-service";
import {
  emailCreditPurchase,
  emailNewSubscription,
  emailFailedPayment,
  emailSubscriptionCancelled,
} from "./email";
import { trackPurchaseCompleted } from "./mixpanel-server";
import { triggerKidsVideoRender } from "./kids-video-render-service";
import { processUpsellDelivery } from "./upsell-delivery";

// Lazy-init Stripe client (avoids crash if key not set at import time)
function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || "");
}

export async function handleStripeWebhook(event: any) {
  // ── Idempotency guard: skip events we've already processed ──────────────────────
  // Stripe retries on 5xx or timeout, so we must be safe to re-process.
  const db = await getDb();
  if (db && event.id) {
    try {
      const existing = await db.select().from(stripeProcessedEvents)
        .where(eq(stripeProcessedEvents.eventId, event.id)).limit(1);
      if (existing.length > 0) {
        console.log(`[Stripe Webhook] Duplicate event ${event.id} (${event.type}) — skipping`);
        return { received: true, duplicate: true };
      }
    } catch (idempErr) {
      // Non-fatal: if idempotency check fails, still process the event
      console.warn("[Stripe Webhook] Idempotency check failed:", idempErr);
    }
  }

  let result: any;
  switch (event.type) {
    case "checkout.session.completed":
      result = await handleCheckoutSessionCompleted(event.data.object);
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
      result = await upsertSubscription(event.data.object);
      break;
    case "customer.subscription.deleted":
      result = await handleSubscriptionDeleted(event.data.object);
      break;
    case "invoice.paid":
      result = await handleInvoicePaid(event.data.object);
      break;
    case "invoice.payment_failed":
      result = await markPastDue(event.data.object);
      break;
    default:
      return { received: true };
  }

  // Mark event as processed (best-effort)
  if (db && event.id) {
    try {
      await db.insert(stripeProcessedEvents).values({
        eventId: event.id,
        eventType: event.type,
      }).onDuplicateKeyUpdate({ set: { eventType: event.type } });
    } catch (markErr) {
      console.warn("[Stripe Webhook] Failed to mark event as processed:", markErr);
    }
  }

  return result;
}

async function handleCheckoutSessionCompleted(session: any) {
  const db = await getDb();
  if (!db) return { success: false };

  const userId = parseInt(session.client_reference_id);
  if (!userId || isNaN(userId)) {
    console.error("[Stripe Webhook] Missing or invalid client_reference_id:", session.client_reference_id);
    return { success: false, error: "Invalid user ID" };
  }

  const metadata = session.metadata ?? {};

  try {
    // Detect WizAnimate (kids_video) paid render
    if (metadata.job_type === "kids_video") {
      const jobId = parseInt(metadata.kids_video_job_id, 10);
      if (!jobId || isNaN(jobId)) {
        console.error("[Stripe Webhook] Invalid kids_video_job_id:", metadata.kids_video_job_id);
        return { success: false, error: "Invalid kids_video_job_id" };
      }

      const db2 = await getDb();
      if (db2) {
        // Mark payment as paid and queue the render
        await db2.update(kidsVideoJobs)
          .set({ paymentStatus: "paid", renderStatus: "queued", updatedAt: new Date() })
          .where(eq(kidsVideoJobs.id, jobId));
      }

      console.log(`[Stripe Webhook] WizAnimate job ${jobId} payment confirmed — triggering render`);

      // Notify owner
      await notifyOwner({
        title: "WizAnimate Render Queued",
        content: `User ${metadata.customer_name} (${metadata.customer_email}) paid for WizAnimate job #${jobId} (\u00a3${(session.amount_total ?? 0) / 100}). Render starting.`,
      }).catch(() => {});

      // Fire render asynchronously — do NOT await (webhook must return 200 immediately)
      triggerKidsVideoRender(jobId).catch(err =>
        console.error(`[Stripe Webhook] triggerKidsVideoRender(${jobId}) threw:`, err)
      );

      return { success: true, type: "kids_video", jobId };
    }

    // Detect upsell purchase: billing router sends metadata.type === 'upsell'
    if (metadata.type === "upsell") {
      const jobId = parseInt(metadata.job_id, 10);
      const cinematicScenes = metadata.cinematic_scenes === "true";
      const upgrade4K = metadata.upgrade_4k === "true";
      const removeWatermark = metadata.remove_watermark === "true";

      const addons: string[] = [];
      if (cinematicScenes) addons.push("Cinematic Scenes");
      if (upgrade4K) addons.push("4K Upgrade");
      if (removeWatermark) addons.push("Remove Watermark");

      console.log(`[Stripe Webhook] Upsell purchase for user ${userId}, job ${jobId}: ${addons.join(", ")}`);

      // Notify owner about the upsell purchase
      await notifyOwner({
        title: "New Upsell Purchase",
        content: `User ${metadata.customer_name} (${metadata.customer_email}) purchased upsells for job #${jobId}: ${addons.join(", ")} (\u00a3${(session.amount_total ?? 0) / 100})`,
      }).catch(() => {}); // non-fatal

      // ISS-002: Trigger the actual upsell delivery pipeline asynchronously
      // processUpsellDelivery runs in the background — webhook returns immediately
      processUpsellDelivery({ jobId, cinematicScenes, upgrade4K, removeWatermark }).catch((err) => {
        console.error(`[Stripe Webhook] Upsell delivery failed for job ${jobId}:`, err.message);
      });
      // Track purchase in Mixpanel
      await trackPurchaseCompleted({
        userId,
        plan: `upsell:${addons.join("+")}`,
        amount: session.amount_total ?? 0,
        currency: session.currency ?? "gbp",
        purchaseType: "upsell",
      }).catch(() => {});

      return { success: true, type: "upsell", addons };
    }

    // Detect Video Credit top-up purchase (new system)
    if (metadata.type === "video_credit_topup") {
      const packKey = metadata.pack_key;
      const packName = metadata.pack_name || packKey;
      const creditsToAdd = parseInt(metadata.credits, 10) || 0;
      const sessionId = session.id;

      if (creditsToAdd <= 0 || !packKey) {
        console.error("[Stripe Webhook] Invalid topup metadata:", metadata);
        return { success: false, error: "Invalid topup metadata" };
      }

      // Idempotency check: skip if this session was already processed
      const existing = await db.select().from(topupPurchases)
        .where(eq(topupPurchases.stripeSessionId, sessionId)).limit(1);
      if (existing.length > 0) {
        console.log(`[Stripe Webhook] Topup already processed for session ${sessionId}, skipping`);
        return { success: true, type: "video_credit_topup", duplicate: true };
      }

      // Record the purchase (idempotency row)
      await db.insert(topupPurchases).values({
        userId,
        packKey,
        packName,
        creditsAdded: creditsToAdd,
        amountPaid: session.amount_total ?? 0,
        currency: session.currency ?? "gbp",
        stripeSessionId: sessionId,
        stripePaymentIntentId: session.payment_intent || null,
        createdAt: new Date(),
      });

      // Add topup credits to the dedicated topupCredits bucket
      const userCredits = await db.select().from(credits).where(eq(credits.userId, userId)).limit(1);
      if (userCredits.length === 0) {
        await db.insert(credits).values({
          userId,
          balance: creditsToAdd,
          monthlyCredits: 0,
          topupCredits: creditsToAdd,
          totalEarned: creditsToAdd,
          totalSpent: 0,
        });
      } else {
        await db.update(credits).set({
          balance: userCredits[0].balance + creditsToAdd,
          topupCredits: userCredits[0].topupCredits + creditsToAdd,
          totalEarned: userCredits[0].totalEarned + creditsToAdd,
          updatedAt: new Date(),
        }).where(eq(credits.userId, userId));
      }

      // Log transaction
      await db.insert(creditTransactions).values({
        userId,
        amount: creditsToAdd,
        type: "purchase",
        description: `Video Credit top-up: ${packName} (${creditsToAdd} credits)`,
        relatedTransactionId: sessionId,
        createdAt: new Date(),
      });

      console.log(`[Stripe Webhook] Added ${creditsToAdd} Video Credits (topup) to user ${userId} (${packName})`);

      // Notify owner
      await notifyOwner({
        title: "New Video Credit Top-Up",
        content: `User ${metadata.customer_name} (${metadata.customer_email}) purchased ${packName}: ${creditsToAdd} Video Credits for \u00a3${(session.amount_total ?? 0) / 100}`,
      }).catch(() => {});

      // Email notification
      await emailCreditPurchase({
        name: metadata.customer_name || "Unknown",
        email: metadata.customer_email || "",
        credits: creditsToAdd,
        amount: session.amount_total ?? 0,
        packLabel: packName,
      }).catch(() => {});

      return { success: true, type: "video_credit_topup", creditsAdded: creditsToAdd };
    }

    // Detect credit purchase: billing router sends metadata.pack + metadata.credits
    // Also support legacy metadata.type === 'credit_purchase' + metadata.pack_id
    const isCreditPurchase = metadata.pack || metadata.type === "credit_purchase";

    if (isCreditPurchase) {
      // Resolve credits to add — prefer explicit credits field from billing router
      let creditsToAdd = 0;
      if (metadata.credits) {
        creditsToAdd = parseInt(metadata.credits, 10) || 0;
      } else {
        // Legacy fallback using pack_id — includes both Option A keys and old keys
        const packId = metadata.pack_id || metadata.pack;
        const legacyCreditAmounts: Record<string, number> = {
          // Option A packs (new)
          spark: 50,
          boost: 150,
          creator: 350,
          studio: 750,
          pro: 1500,
          elite: 4000,
          // Cinematic packs
          cinematic_10: 200,
          cinematic_25: 500,
          cinematic_50: 1000,
          // Legacy keys (old billing)
          small: 50,
          starter: 50,
          medium: 350,
          large: 1500,
        };
        creditsToAdd = legacyCreditAmounts[packId] || 0;
      }

      if (creditsToAdd <= 0) {
        console.error("[Stripe Webhook] Could not determine credits to add from metadata:", metadata);
        return { success: false, error: "Unknown pack" };
      }

      // Add credits to user balance (updates credits table + inserts transaction)
      await addCredits(
        userId,
        creditsToAdd,
        "purchase",
        `Credit pack purchase: ${metadata.pack_label || metadata.pack || metadata.pack_id || "unknown"}`
      );

      console.log(`[Stripe Webhook] Added ${creditsToAdd} credits to user ${userId} (pack: ${metadata.pack || metadata.pack_id})`);

      // Notify owner
      await notifyOwner({
        title: "New Credit Purchase",
        content: `User ${metadata.customer_name} (${metadata.customer_email}) purchased ${creditsToAdd} credits for £${(session.amount_total ?? 0) / 100}`,
      }).catch(() => {}); // non-fatal
      // Email notification to tim@wiz-ai.io
      await emailCreditPurchase({
        name: metadata.customer_name || "Unknown",
        email: metadata.customer_email || "",
        credits: creditsToAdd,
        amount: session.amount_total ?? 0,
        packLabel: metadata.pack_label || metadata.pack || metadata.pack_id,
      }).catch(() => {});
      // Track purchase in Mixpanel
      await trackPurchaseCompleted({
        userId,
        plan: metadata.pack_label || metadata.pack || "credits",
        amount: session.amount_total ?? 0,
        currency: session.currency ?? "gbp",
        purchaseType: "credits",
        packLabel: metadata.pack_label || metadata.pack,
      }).catch(() => {});
    } else {
      // For subscriptions, Stripe will send customer.subscription.created event
      // We do NOT process subscriptions here — only in handleSubscriptionCreated()
      // This prevents duplicate/orphaned subscription records.
      console.log(`[Stripe Webhook] Checkout session ${session.id} completed (subscription will be handled by customer.subscription.created event)`);
    }

    return { success: true };
  } catch (error) {
    console.error("[Stripe Webhook] Error handling checkout session:", error);
    return { success: false, error };
  }
}

/**
 * Unified upsert for customer.subscription.created and customer.subscription.updated.
 * Resolves user by metadata.user_id or by looking up the Stripe customer ID in users table.
 */
async function upsertSubscription(subscription: any) {
  const db = await getDb();
  if (!db) return { success: false };

  try {
    let userId = parseInt(subscription.metadata?.user_id, 10);
    const planId = subscription.metadata?.plan_id;

    // Fallback: look up user by stripeCustomerId if metadata is missing
    if ((!userId || isNaN(userId)) && subscription.customer) {
      const [userRow] = await db.select().from(users)
        .where(eq(users.stripeCustomerId, subscription.customer)).limit(1);
      if (userRow) userId = userRow.id;
    }

    if (!userId || isNaN(userId)) {
      console.error("[Stripe Webhook] upsertSubscription: cannot resolve userId", {
        metadata: subscription.metadata,
        customer: subscription.customer,
      });
      return { success: false, error: "Cannot resolve userId" };
    }

    const resolvedPlan = planId || "starter";
    const conn = await getRawConn();
    try {
      // Derive billing interval from the subscription's first price item
      const interval = subscription.items?.data?.[0]?.price?.recurring?.interval ?? null;

      await conn.execute(
        `INSERT INTO subscriptions (userId, stripeSubscriptionId, plan, status, currentPeriodStart, currentPeriodEnd, billingInterval)
         VALUES (?, ?, ?, ?, FROM_UNIXTIME(?), FROM_UNIXTIME(?), ?)
         ON DUPLICATE KEY UPDATE
           stripeSubscriptionId = VALUES(stripeSubscriptionId),
           plan = VALUES(plan),
           status = VALUES(status),
           currentPeriodStart = VALUES(currentPeriodStart),
           currentPeriodEnd = VALUES(currentPeriodEnd),
           billingInterval = VALUES(billingInterval),
           updatedAt = NOW()`,
        [
          userId,
          subscription.id,
          resolvedPlan,
          subscription.status,
          subscription.current_period_start,
          subscription.current_period_end,
          interval,
        ]
      );
    } finally {
      await conn.end();
    }

    // Grant credits only on creation (status = active for first time)
    if (subscription.status === "active" && planId) {
      const planCredits: Record<string, number> = {
        starter: 240, basic: 240, creator: 990, pro: 2160, studio: 2160, business: 2160, pro_plus: 2160,
      };
      const monthlyCredits = planCredits[planId] || 0;
      if (monthlyCredits > 0) {
        // Only grant on creation — invoice.paid handles renewal grants
        const [existingSub] = await db.select().from(subscriptions)
          .where(eq(subscriptions.stripeSubscriptionId, subscription.id)).limit(1);
        // If this is a brand new subscription (just inserted), grant credits
        if (!existingSub || existingSub.status !== "active") {
          await addCredits(userId, monthlyCredits, "subscription_grant",
            `${planId} plan subscription activation — ${monthlyCredits} credits`);
          console.log(`[Stripe Webhook] Granted ${monthlyCredits} credits to user ${userId} for ${planId} plan`);
        }
      }

      // Founding Creator bonus (first subscription only)
      try {
        const [userRow] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        if (userRow && !userRow.isFoundingCreator && !userRow.foundingCreatorGrantedAt) {
          const bonusCredits = Math.round((planCredits[planId] || 0) * 0.20);
          if (bonusCredits > 0) {
            await addCredits(userId, bonusCredits, "subscription_grant",
              `Founding Creator bonus — 20% extra on first subscription (${bonusCredits} credits)`);
          }
          await db.update(users)
            .set({ isFoundingCreator: true, foundingCreatorGrantedAt: new Date() })
            .where(eq(users.id, userId));
        }
      } catch (fcErr) {
        console.error("[Stripe Webhook] Founding Creator bonus error:", fcErr);
      }

      // Notify owner of new subscription
      const customerEmail = subscription.metadata?.customer_email || "unknown@example.com";
      const customerName = subscription.metadata?.customer_name || "Unknown";
      await notifyOwner({
        title: "New Subscription",
        content: `User ${customerName} (${customerEmail}) subscribed to ${planId} plan. Stripe ID: ${subscription.id}`,
      }).catch(() => {});
      await emailNewSubscription({
        name: customerName,
        email: customerEmail,
        plan: planId,
        amount: 0,
      }).catch(() => {});
    }

    console.log(`[Stripe Webhook] upsertSubscription: user=${userId} plan=${resolvedPlan} status=${subscription.status} stripeId=${subscription.id}`);
    return { success: true, userId, plan: resolvedPlan, status: subscription.status };
  } catch (error) {
    console.error("[Stripe Webhook] Error in upsertSubscription:", error);
    return { success: false, error };
  }
}

async function handleSubscriptionDeleted(subscription: any) {
  const db = await getDb();
  if (!db) return { success: false };

  try {
    // Mark subscription as canceled
    const [subRow] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.stripeSubscriptionId, subscription.id))
      .limit(1);

    await db
      .update(subscriptions)
      .set({
        status: "canceled",
        canceledAt: new Date(),
      })
      .where(eq(subscriptions.stripeSubscriptionId, subscription.id));

    // ISS-030: Send cancellation notification to owner
    if (subRow) {
      const { getDb: _getDb } = await import("./db");
      const db2 = await _getDb();
      const userRow = db2 ? await db2.select().from((await import("../drizzle/schema")).users)
        .where((await import("drizzle-orm")).eq((await import("../drizzle/schema")).users.id, subRow.userId)).limit(1)
        .then((r: any[]) => r[0]) : null;
      await emailSubscriptionCancelled({
        name: userRow?.name ?? undefined,
        email: userRow?.email ?? undefined,
        plan: subRow.plan,
        stripeSubscriptionId: subscription.id,
      }).catch(() => {});
      await notifyOwner({
        title: `Subscription Cancelled: ${userRow?.name ?? "Unknown"}`,
        content: `User ${userRow?.name ?? "Unknown"} (${userRow?.email ?? "—"}) cancelled their ${subRow.plan} subscription.`,
      }).catch(() => {});
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting subscription:", error);
    return { success: false, error };
  }
}

async function markPastDue(invoice: any) {
  const db = await getDb();
  try {
    // Mark the subscription as past_due in our database
    if (invoice.subscription && db) {
      await db.update(subscriptions)
        .set({ status: "past_due" })
        .where(eq(subscriptions.stripeSubscriptionId, invoice.subscription));
      console.log(`[Stripe Webhook] Marked subscription ${invoice.subscription} as past_due`);
    }
    const customerEmail = invoice.customer_email || invoice.customer_details?.email;
    const customerName = invoice.customer_name || invoice.customer_details?.name;
    await emailFailedPayment({
      name: customerName,
      email: customerEmail,
      amount: invoice.amount_due,
      reason: invoice.last_payment_error?.message || "Payment declined",
    }).catch(() => {});
    await notifyOwner({
      title: "Failed Payment",
      content: `Payment failed for ${customerName || "Unknown"} (${customerEmail || "—"}): £${(invoice.amount_due ?? 0) / 100}`,
    }).catch(() => {});
    return { received: true };
  } catch (error) {
    console.error("[Stripe Webhook] Error handling failed payment:", error);
    return { success: false, error };
  }
}

async function handleInvoicePaid(invoice: any) {
  const db = await getDb();
  if (!db) return { success: false };

  try {
    // Invoice paid - subscription is active
    if (invoice.subscription) {
      // Look up the subscription to find the user and plan
      const [sub] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.stripeSubscriptionId, invoice.subscription))
        .limit(1);

      if (sub) {
        // Update status to active and persist the real amount paid from this invoice
        const amountPaid = invoice.amount_paid ?? invoice.amount_due ?? null;
        const currency = invoice.currency ?? null;
        await db
          .update(subscriptions)
          .set({
            status: "active",
            ...(amountPaid != null ? { amountPaid } : {}),
            ...(currency ? { currency } : {}),
          })
          .where(eq(subscriptions.stripeSubscriptionId, invoice.subscription));

        // Grant monthly renewal credits — skip the very first invoice
        // (checkout.session.completed already handles first-time credit grant)
        // invoice.billing_reason: 'subscription_create' = first, 'subscription_cycle' = renewal
        if (invoice.billing_reason === "subscription_cycle") {
          // Monthly reset: set balance to plan allowance (unused monthly credits expire).
          // Top-up credits are preserved separately in topupCredits column.
          const planCreditMap: Record<string, { credits: number; name: string }> = {
            starter: { credits: 320, name: "Starter" },
            basic:   { credits: 320, name: "Basic" },
            creator: { credits: 1000, name: "Creator" },
            pro:     { credits: 2000, name: "Studio" },
            studio:  { credits: 2000, name: "Studio" },
            business:{ credits: 2000, name: "Studio" },
            pro_plus:{ credits: 2000, name: "Studio" },
          };
          const planData = planCreditMap[sub.plan];
          if (planData) {
            await resetMonthlyCredits(sub.userId, planData.credits, planData.name);
            console.log(`[Stripe Webhook] Monthly reset: userId=${sub.userId}, plan=${sub.plan}, credits=${planData.credits}`);
          }
        }
      } else {
        // Subscription not found in DB — just mark active by stripe ID
        await db
          .update(subscriptions)
          .set({ status: "active" })
          .where(eq(subscriptions.stripeSubscriptionId, invoice.subscription));
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Error handling invoice paid:", error);
    return { success: false, error };
  }
}

/**
 * Handle customer.subscription.created event
 * This is fired by Stripe after a successful checkout for a subscription
 */
async function handleSubscriptionCreated(subscription: any) {
  const db = await getDb();
  if (!db) return { success: false };

  try {
    // Extract user ID from subscription metadata
    // The metadata is set during checkout session creation
    const userId = parseInt(subscription.metadata?.user_id, 10);
    const planId = subscription.metadata?.plan_id;

    if (!userId || isNaN(userId) || !planId) {
      console.error(
        "[Stripe Webhook] customer.subscription.created missing user_id or plan_id:",
        { userId, planId, metadata: subscription.metadata }
      );
      return { success: false, error: "Missing user_id or plan_id in subscription metadata" };
    }

    // Credits granted on subscription activation — must match products.ts SUBSCRIPTION_PLANS
    const planCredits: Record<string, number> = {
      starter: 240,
      basic: 240,
      creator: 990,
      pro: 2160,
      studio: 2160,
      business: 2160,
      pro_plus: 2160,
    };

    const monthlyCredits = planCredits[planId] || 0;

    // ISS-028: True upsert by userId — subscriptions.userId has a unique constraint
    const conn = await getRawConn();
    try {
      // Derive billing interval from the subscription's first price item
      const interval = subscription.items?.data?.[0]?.price?.recurring?.interval ?? null;

      await conn.execute(
        `INSERT INTO subscriptions (userId, stripeSubscriptionId, plan, status, currentPeriodStart, currentPeriodEnd, billingInterval)
         VALUES (?, ?, ?, ?, FROM_UNIXTIME(?), FROM_UNIXTIME(?), ?)
         ON DUPLICATE KEY UPDATE
           stripeSubscriptionId = VALUES(stripeSubscriptionId),
           plan = VALUES(plan),
           status = VALUES(status),
           currentPeriodStart = VALUES(currentPeriodStart),
           currentPeriodEnd = VALUES(currentPeriodEnd),
           billingInterval = VALUES(billingInterval),
           updatedAt = NOW()`,
        [
          userId,
          subscription.id,
          planId,
          subscription.status,
          subscription.current_period_start,
          subscription.current_period_end,
          interval,
        ]
      );
    } finally {
      await conn.end();
    }

    // Grant subscription credits
    if (monthlyCredits > 0) {
      await addCredits(
        userId,
        monthlyCredits,
        "subscription_grant",
        `${planId} plan subscription - ${monthlyCredits} credits`
      );
    }

    // Founding Creator bonus (20% on first subscription)
    try {
      const [userRow] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (userRow && !userRow.isFoundingCreator && !userRow.foundingCreatorGrantedAt) {
        const bonusCredits = Math.round(monthlyCredits * 0.20);
        if (bonusCredits > 0) {
          await addCredits(
            userId,
            bonusCredits,
            "subscription_grant",
            `Founding Creator bonus — 20% extra on first subscription (${bonusCredits} credits)`
          );
        }
        await db.update(users)
          .set({ isFoundingCreator: true, foundingCreatorGrantedAt: new Date() })
          .where(eq(users.id, userId));
        console.log(`[Stripe Webhook] Founding Creator bonus granted to user ${userId}: +${bonusCredits} credits`);
      }
    } catch (fcErr) {
      console.error("[Stripe Webhook] Founding Creator bonus error:", fcErr);
    }

    console.log(
      `[Stripe Webhook] Subscription created for user ${userId}: plan=${planId}, stripeId=${subscription.id}, credits=${monthlyCredits}`
    );

    // Notify owner
    const customerEmail = subscription.metadata?.customer_email || "unknown@example.com";
    const customerName = subscription.metadata?.customer_name || "Unknown";
    await notifyOwner({
      title: "New Subscription",
      content: `User ${customerName} (${customerEmail}) subscribed to ${planId} plan. Stripe ID: ${subscription.id}. Credits: ${monthlyCredits}`,
    }).catch(() => {});

    // Email notification
    await emailNewSubscription({
      name: customerName,
      email: customerEmail,
      plan: planId,
      amount: 0, // Amount is in the invoice, not the subscription object
    }).catch(() => {});

    // Track in Mixpanel
    await trackPurchaseCompleted({
      userId,
      plan: planId,
      amount: 0,
      currency: "gbp",
      purchaseType: "subscription",
    }).catch(() => {});

    return { success: true, type: "subscription_created", userId, plan: planId, credits: monthlyCredits };
  } catch (error) {
    console.error("[Stripe Webhook] Error handling subscription created:", error);
    return { success: false, error };
  }
}
