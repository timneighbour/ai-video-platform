/**
 * Server-side Mixpanel event tracking via the Mixpanel HTTP API.
 * Used to fire events from server-side flows (e.g. Stripe webhook) where
 * the client-side SDK is not available.
 *
 * Reference: https://developer.mixpanel.com/reference/track-event
 */

const MIXPANEL_API_URL = "https://api.mixpanel.com/track";

function getMixpanelToken(): string {
  // VITE_ prefixed vars are available on the server at runtime via process.env
  return process.env.VITE_MIXPANEL_TOKEN ?? "";
}

interface ServerTrackOptions {
  /** Mixpanel distinct_id — use the user's database ID as a string */
  distinctId: string;
  /** Event name */
  event: string;
  /** Additional properties */
  properties?: Record<string, unknown>;
}

/**
 * Track a server-side event in Mixpanel.
 * Non-blocking — errors are logged but not thrown.
 */
export async function trackServerEvent(opts: ServerTrackOptions): Promise<void> {
  const token = getMixpanelToken();
  if (!token) {
    console.warn("[Mixpanel Server] VITE_MIXPANEL_TOKEN not set — skipping event:", opts.event);
    return;
  }

  const payload = {
    event: opts.event,
    properties: {
      token,
      distinct_id: opts.distinctId,
      $source: "server",
      ...opts.properties,
    },
  };

  try {
    const body = JSON.stringify([payload]);
    const encoded = Buffer.from(body).toString("base64");
    const response = await fetch(`${MIXPANEL_API_URL}?data=${encodeURIComponent(encoded)}`, {
      method: "GET",
      headers: { "Accept": "text/plain" },
    });
    if (!response.ok) {
      console.warn("[Mixpanel Server] Track failed:", response.status, await response.text());
    }
  } catch (err) {
    // Non-fatal — analytics should never break the main flow
    console.warn("[Mixpanel Server] Track error:", err);
  }
}

/**
 * Fire the "Purchase Completed" event from the Stripe webhook.
 */
export async function trackPurchaseCompleted(opts: {
  userId: number;
  plan: string;
  amount: number;       // in pence/cents
  currency: string;
  purchaseType: "subscription" | "credits" | "upsell" | "pay_per_video";
  packLabel?: string;
}): Promise<void> {
  await trackServerEvent({
    distinctId: String(opts.userId),
    event: "Purchase Completed",
    properties: {
      plan: opts.plan,
      amount_pence: opts.amount,
      amount_gbp: opts.amount / 100,
      currency: opts.currency,
      purchase_type: opts.purchaseType,
      pack_label: opts.packLabel,
    },
  });
}
