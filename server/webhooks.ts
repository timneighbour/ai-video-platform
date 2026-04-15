/**
 * Stripe Webhook Handler
 * Processes payment events and updates database accordingly
 */

import Stripe from "stripe";
import { getDb } from "./db";
import { eq } from "drizzle-orm";
import { subscriptions, creditTransactions, credits } from "../drizzle/schema";
import { notifyOwner } from "./_core/notification";
import { addCredits } from "./credit-service";
import {
  emailCreditPurchase,
  emailNewSubscription,
  emailFailedPayment,
} from "./email";

// Lazy-init Stripe client (avoids crash if key not set at import time)
function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || "");
}

export async function handleStripeWebhook(event: any) {
  switch (event.type) {
    case "checkout.session.completed":
      return await handleCheckoutSessionCompleted(event.data.object);
    case "customer.subscription.updated":
      return await handleSubscriptionUpdated(event.data.object);
    case "customer.subscription.deleted":
      return await handleSubscriptionDeleted(event.data.object);
    case "invoice.paid":
      return await handleInvoicePaid(event.data.object);
    case "invoice.payment_failed":
      return await handleInvoicePaymentFailed(event.data.object);
    default:
      return { received: true };
  }
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

      // TODO: Trigger actual re-render / enhancement pipeline based on purchased add-ons
      // For now, the purchase is recorded via Stripe and the owner is notified.
      // Future: update musicVideoJobs with upsell flags and trigger re-processing.

      return { success: true, type: "upsell", addons };
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
        // Legacy fallback using pack_id
        const packId = metadata.pack_id || metadata.pack;
        const legacyCreditAmounts: Record<string, number> = {
          small: 300,
          medium: 900,
          large: 2400,
          starter: 300,
          creator: 900,
          pro: 2400,
          cinematic_10: 200,
          cinematic_25: 500,
          cinematic_50: 1000,
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
      // Email notification to timneighbour@wizvid.ai
      await emailCreditPurchase({
        name: metadata.customer_name || "Unknown",
        email: metadata.customer_email || "",
        credits: creditsToAdd,
        amount: session.amount_total ?? 0,
        packLabel: metadata.pack_label || metadata.pack || metadata.pack_id,
        stripeSessionId: session.id,
      }).catch(() => {});
    } else {
      // Handle subscription — metadata.plan from billing router
      const planId = metadata.plan || metadata.plan_id;
      const planCredits: Record<string, number> = {
        starter: 1000,
        pro: 3000,
        business: 10000,
      };

      const monthlyCredits = planCredits[planId] || 0;

      // Upsert subscription (ignore duplicate key errors)
      try {
        await db.insert(subscriptions).values({
          userId,
          stripeSubscriptionId: session.subscription || null,
          plan: planId as any,
          status: "active",
        });
      } catch (dupErr: any) {
        // Subscription already exists — update it
        if (session.subscription) {
          await db.update(subscriptions)
            .set({ plan: planId as any, status: "active", updatedAt: new Date() })
            .where(eq(subscriptions.stripeSubscriptionId, session.subscription));
        }
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

      console.log(`[Stripe Webhook] Subscription activated for user ${userId}: plan=${planId}, credits=${monthlyCredits}`);

      // Notify owner
      await notifyOwner({
        title: "New Subscription",
        content: `User ${metadata.customer_name} (${metadata.customer_email}) subscribed to ${planId} plan (£${(session.amount_total ?? 0) / 100}/month)`,
      }).catch(() => {}); // non-fatal
      // Email notification to timneighbour@wizvid.ai
      await emailNewSubscription({
        name: metadata.customer_name || "Unknown",
        email: metadata.customer_email || "",
        plan: planId || "unknown",
        amount: session.amount_total ?? 0,
        interval: "month",
        stripeSessionId: session.id,
      }).catch(() => {});
    }

    return { success: true };
  } catch (error) {
    console.error("[Stripe Webhook] Error handling checkout session:", error);
    return { success: false, error };
  }
}

async function handleSubscriptionUpdated(subscription: any) {
  const db = await getDb();
  if (!db) return { success: false };

  try {
    // Update subscription status
    await db
      .update(subscriptions)
      .set({
        status: subscription.status as any,
      })
      .where(eq(subscriptions.stripeSubscriptionId, subscription.id));

    return { success: true };
  } catch (error) {
    console.error("Error updating subscription:", error);
    return { success: false, error };
  }
}

async function handleSubscriptionDeleted(subscription: any) {
  const db = await getDb();
  if (!db) return { success: false };

  try {
    // Mark subscription as canceled
    await db
      .update(subscriptions)
      .set({
        status: "canceled",
      })
      .where(eq(subscriptions.stripeSubscriptionId, subscription.id));

    return { success: true };
  } catch (error) {
    console.error("Error deleting subscription:", error);
    return { success: false, error };
  }
}

async function handleInvoicePaymentFailed(invoice: any) {
  try {
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
      await db
        .update(subscriptions)
        .set({
          status: "active",
        })
        .where(eq(subscriptions.stripeSubscriptionId, invoice.subscription));
    }

    return { success: true };
  } catch (error) {
    console.error("Error handling invoice paid:", error);
    return { success: false, error };
  }
}
