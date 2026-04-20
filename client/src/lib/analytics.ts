/**
 * WIZ AI Analytics — GA4 event tracking helpers
 *
 * Usage:
 *   import { trackEvent } from "@/lib/analytics";
 *   trackEvent("signup_started");
 *   trackEvent("video_generation_started", { tool: "text_to_video" });
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

/** Google Ads tag ID */
const GADS_ID = "AW-18107688120";

/**
 * Fire a Google Ads conversion event.
 * Conversion labels are created in Google Ads → Goals → Conversions.
 * Until labels are set up, this fires the tag-level event which Google Ads
 * can use for audience building and smart bidding signals.
 *
 * @param label  Conversion label from Google Ads (e.g. "abc123/XYZ").
 *               Pass undefined to fire a tag-level event without a label.
 * @param value  Revenue value in GBP (optional, for purchase events)
 */
export function gtagConversion(
  label: string | undefined,
  value?: number
) {
  if (typeof window === "undefined" || !window.gtag) return;
  const sendTo = label ? `${GADS_ID}/${label}` : GADS_ID;
  const params: Record<string, unknown> = { send_to: sendTo };
  if (value !== undefined) {
    params.value = value;
    params.currency = "GBP";
  }
  window.gtag("event", "conversion", params);
}

const GA4_ID = import.meta.env.VITE_GA4_MEASUREMENT_ID as string | undefined;

/** Initialise GA4 — called once on app load */
export function initGA4() {
  if (!GA4_ID || typeof window === "undefined") return;
  if (document.getElementById("ga4-script")) return; // already loaded

  const script = document.createElement("script");
  script.id = "ga4-script";
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function (...args: unknown[]) {
    window.dataLayer!.push(args);
  };
  window.gtag("js", new Date());
  window.gtag("config", GA4_ID, {
    send_page_view: true,
  });
}

/** Track a custom GA4 event */
export function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>
) {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", eventName, params ?? {});
}

/** Track page view (for SPA navigation) */
export function trackPageView(path: string) {
  if (!GA4_ID || typeof window === "undefined" || !window.gtag) return;
  window.gtag("config", GA4_ID, { page_path: path });
}

// ── Typed event helpers ──────────────────────────────────────────────────────

export const analytics = {
  signupStarted: () => trackEvent("signup_started"),
  signupCompleted: (plan?: string) => trackEvent("signup_completed", { plan: plan ?? "free" }),
  videoGenerationStarted: (tool: string) => trackEvent("video_generation_started", { tool }),
  videoGenerationCompleted: (tool: string, durationMs?: number) =>
    trackEvent("video_generation_completed", { tool, duration_ms: durationMs ?? 0 }),
  upgradeClicked: (from: string, to: string) =>
    trackEvent("upgrade_clicked", { from_plan: from, to_plan: to }),
  pricingPageViewed: () => trackEvent("pricing_page_viewed"),
  onboardingStarted: (creatorType: string) =>
    trackEvent("onboarding_started", { creator_type: creatorType }),
  onboardingCompleted: () => trackEvent("onboarding_completed"),
  downloadAttempted: (plan: string) =>
    trackEvent("download_attempted", { plan }),

  /** Fire when any "Generate Video" button is clicked */
  generateVideoClicked: (source: string, extra?: Record<string, string | number | boolean>) =>
    trackEvent("generate_video_click", { source, ...extra }),

  /** Fire when the final "Render Video" button is clicked (post-storyboard) */
  renderVideoClicked: (source: string, extra?: Record<string, string | number | boolean>) =>
    trackEvent("render_video_click", { source, ...extra }),
};
