/**
 * Stripe Integration Helpers
 * Handles checkout sessions, webhook processing, and payment management
 */

import Stripe from "stripe";
import { SUBSCRIPTION_PLANS, CREDIT_PACKS, TOPUP_PACKS, type TopupPackKey } from "./products";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

export { stripe };

/**
 * Create a checkout session for subscription
 */
export async function createSubscriptionCheckout(
  userId: number,
  planId: keyof typeof SUBSCRIPTION_PLANS,
  customerEmail: string,
  customerName: string | null,
  origin: string,
  billingInterval: "monthly" | "annual" = "monthly"
) {
  const plan = SUBSCRIPTION_PLANS[planId];

  // Free plan has no Stripe price — should not reach here
  if (!plan.stripePriceId) {
    throw new Error("Free plan does not require a checkout session");
  }

  const priceId = billingInterval === "annual" && plan.stripeAnnualPriceId
    ? plan.stripeAnnualPriceId
    : plan.stripePriceId;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: customerEmail,
    client_reference_id: userId.toString(),
    metadata: {
      user_id: userId.toString(),
      customer_email: customerEmail,
      customer_name: customerName || "",
      plan_id: planId,
      billing_interval: billingInterval,
    },
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${origin}/dashboard?subscription=success`,
    cancel_url: `${origin}/pricing?subscription=canceled`,
    allow_promotion_codes: true,
  });

  return session.url;
}

/**
 * Create a checkout session for credit purchase
 */
export async function createCreditCheckout(
  userId: number,
  packId: keyof typeof CREDIT_PACKS,
  customerEmail: string,
  customerName: string | null,
  origin: string
) {
  const pack = CREDIT_PACKS[packId];
  
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: customerEmail,
    client_reference_id: userId.toString(),
    metadata: {
      user_id: userId.toString(),
      customer_email: customerEmail,
      customer_name: customerName || "",
      pack_id: packId,
      type: "credit_purchase",
    },
    line_items: [
      {
        price: pack.stripePriceId,
        quantity: 1,
      },
    ],
    success_url: `${origin}/dashboard?credits=success`,
    cancel_url: `${origin}/credits?purchase=canceled`,
    allow_promotion_codes: true,
  });

  return session.url;
}

/**
 * Create a checkout session for a Video Credit top-up pack (one-time payment, subscribers only)
 */
export async function createTopupCheckout(
  userId: number,
  packKey: TopupPackKey,
  customerEmail: string,
  customerName: string | null,
  origin: string
) {
  const pack = TOPUP_PACKS[packKey];
  if (!pack.stripePriceId) {
    throw new Error(`Top-up pack ${packKey} has no Stripe price ID configured`);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: customerEmail,
    client_reference_id: userId.toString(),
    metadata: {
      user_id: userId.toString(),
      customer_email: customerEmail,
      customer_name: customerName || "",
      type: "video_credit_topup",
      pack_key: packKey,
      pack_name: pack.name,
      credits: pack.credits.toString(),
    },
    line_items: [
      {
        price: pack.stripePriceId,
        quantity: 1,
      },
    ],
    success_url: `${origin}/dashboard?topup=success&credits=${pack.credits}`,
    cancel_url: `${origin}/pricing?topup=canceled`,
    allow_promotion_codes: true,
  });

  return session.url;
}

/**
 * Retrieve customer by email
 */
export async function getOrCreateCustomer(email: string, name: string | null) {
  const customers = await stripe.customers.list({
    email,
    limit: 1,
  });

  if (customers.data.length > 0) {
    return customers.data[0];
  }

  return await stripe.customers.create({
    email,
    name: name || undefined,
  });
}

/**
 * Get subscription details
 */
export async function getSubscription(subscriptionId: string) {
  return await stripe.subscriptions.retrieve(subscriptionId);
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(subscriptionId: string) {
  return await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

/**
 * Get invoice
 */
export async function getInvoice(invoiceId: string) {
  return await stripe.invoices.retrieve(invoiceId);
}

/**
 * Create a one-time Stripe checkout session for pay-per-video rendering.
 * Pricing: £1.50 per scene, minimum £5.00, maximum 12 scenes (£18.00).
 */
export async function createPayPerVideoCheckout(
  userId: number,
  projectId: number,
  sceneCount: number,
  customerEmail: string,
  customerName: string | null,
  origin: string
): Promise<{ url: string; amountPence: number }> {
  const amountPence = Math.max(500, sceneCount * 150); // £1.50/scene, £5 min
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: customerEmail,
    client_reference_id: userId.toString(),
    metadata: {
      type: "pay_per_video",
      user_id: userId.toString(),
      project_id: projectId.toString(),
      scene_count: sceneCount.toString(),
      customer_email: customerEmail,
      customer_name: customerName || "",
    },
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "gbp",
        unit_amount: amountPence,
        product_data: {
          name: `WIZ AI Video Render — ${sceneCount} scene${sceneCount !== 1 ? "s" : ""}`,
          description: `One-time render of your ${sceneCount}-scene video`,
        },
      },
    }],
    success_url: `${origin}/dashboard?render=success&project=${projectId}`,
    cancel_url: `${origin}/dashboard?render=canceled&project=${projectId}`,
  });
  return { url: session.url!, amountPence };
}
