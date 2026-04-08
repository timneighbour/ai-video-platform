/**
 * Stripe Webhook Handler
 * Processes payment events and updates database accordingly
 */

import { stripe } from "./stripe";
import { getDb } from "./db";
import { eq } from "drizzle-orm";
import { subscriptions, creditTransactions, credits } from "../drizzle/schema";
import { notifyOwner } from "./_core/notification";

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
    default:
      return { received: true };
  }
}

async function handleCheckoutSessionCompleted(session: any) {
  const db = await getDb();
  if (!db) return { success: false };

  const userId = parseInt(session.client_reference_id);
  const metadata = session.metadata;

  try {
    if (metadata.type === "credit_purchase") {
      // Handle credit purchase
      const packId = metadata.pack_id;
      const creditAmounts: Record<string, number> = {
        small: 500,
        medium: 1500,
        large: 4000,
      };

      const creditsToAdd = creditAmounts[packId] || 0;

      // Add credits transaction
      await db.insert(creditTransactions).values({
        userId,
        amount: creditsToAdd,
        type: "purchase",
        description: `Credit pack purchase: ${packId}`,
      });

      // Notify owner
      await notifyOwner({
        title: "New Credit Purchase",
        content: `User ${metadata.customer_name} (${metadata.customer_email}) purchased ${creditsToAdd} credits for $${session.amount_total / 100}`,
      });
    } else {
      // Handle subscription
      const planId = metadata.plan_id;
      const planCredits: Record<string, number> = {
        starter: 1000,
        pro: 3000,
        business: 10000,
      };

      const monthlyCredits = planCredits[planId] || 0;

      // Create subscription
      await db.insert(subscriptions).values({
        userId,
        stripeSubscriptionId: session.subscription,
        plan: planId as any,
        status: "active",
      });

      // Add subscription grant transaction
      await db.insert(creditTransactions).values({
        userId,
        amount: monthlyCredits,
        type: "subscription_grant",
        description: `${planId} plan subscription - ${monthlyCredits} credits`,
      });

      // Notify owner
      await notifyOwner({
        title: "New Subscription",
        content: `User ${metadata.customer_name} (${metadata.customer_email}) subscribed to ${planId} plan ($${session.amount_total / 100}/month)`,
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error handling checkout session:", error);
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
