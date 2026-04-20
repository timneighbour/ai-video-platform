/**
 * WIZ AI Mixpanel Analytics
 *
 * Centralised module for all Mixpanel event tracking.
 * Token is read from VITE_MIXPANEL_TOKEN env var.
 * Falls back to a no-op when the token is absent (dev/test).
 *
 * Usage:
 *   import { mp } from "@/lib/mixpanel";
 *   mp.track("Hero CTA Clicked");
 *   mp.identify(userId, { name, email });
 */
import mixpanel from "mixpanel-browser";
import { gtagConversion } from "@/lib/analytics";

const TOKEN = import.meta.env.VITE_MIXPANEL_TOKEN as string | undefined;

let initialised = false;

/** Call once at app startup (main.tsx) */
export function initMixpanel() {
  if (!TOKEN || typeof window === "undefined") return;
  if (initialised) return;
  mixpanel.init(TOKEN, {
    track_pageview: true,
    persistence: "localStorage",
    ignore_dnt: false,
    // EU data residency — matches the api_host in Tim's snippet
    api_host: "https://api-eu.mixpanel.com",
    // Autocapture disabled — requires project-level enablement in Mixpanel dashboard.
    // All key events are tracked explicitly via mp.* helpers instead.
    autocapture: false,
    // Session replay — enable once project is on a Growth/Enterprise plan
    // record_sessions_percent: 100,
  });
  initialised = true;
}

/** Safe wrapper — silently no-ops if Mixpanel is not initialised */
function track(event: string, props?: Record<string, unknown>) {
  if (!initialised) return;
  try {
    mixpanel.track(event, props);
  } catch {
    // Never let analytics errors break the app
  }
}

/** Identify a logged-in user and set their profile properties */
export function identifyUser(
  userId: string | number,
  props?: { name?: string; email?: string; plan?: string; role?: string }
) {
  if (!initialised) return;
  try {
    mixpanel.identify(String(userId));
    if (props) {
      mixpanel.people.set({
        $name: props.name,
        $email: props.email,
        plan: props.plan,
        role: props.role ?? "Musician",
      });
    }
  } catch {
    // no-op
  }
}

/** Reset identity on logout */
export function resetIdentity() {
  if (!initialised) return;
  try {
    mixpanel.reset();
  } catch {
    // no-op
  }
}

// ── Typed event helpers ──────────────────────────────────────────────────────

export const mp = {
  // ── Acquisition / Page views ─────────────────────────────────────────────
  heroCTAClicked: () => track("Hero CTA Clicked"),
  homepageViewed: () => track("Homepage Viewed"),
  pricingPageViewed: () => {
    track("Pricing Page Viewed");
    // Google Ads: ViewContent signal — no label until conversion is created in Google Ads
    gtagConversion(undefined);
  },
  productCardClicked: (product: string) => track("Product Card Clicked", { product }),
  startCreatingClicked: (source: string) => {
    track("Start Creating Clicked", { source });
    // Google Ads: engagement signal for smart bidding
    gtagConversion(undefined);
  },
  exploreProdcutsClicked: () => track("Explore Products Clicked"),
  watchDemoClicked: () => track("Watch Demo Clicked"),

  // ── Auth funnel ───────────────────────────────────────────────────────────
  signUpCompleted: (props?: { method?: string }) => {
    track("Sign Up Completed", props);
    // Google Ads: CompleteRegistration conversion
    // TODO: Replace undefined with your conversion label once created in Google Ads
    // e.g. gtagConversion("AbCdEfGhIjK");
    gtagConversion(undefined);
  },
  onboardingStarted: () => track("Onboarding Started"),
  onboardingCompleted: (product?: string) =>
    track("Onboarding Completed", { product }),

  // ── Project creation ──────────────────────────────────────────────────────
  projectCreated: (product: string) => track("Project Created", { product }),

  // ── Build / Render ────────────────────────────────────────────────────────
  buildStarted: (product: string, quality?: string) =>
    track("Build Started", { product, quality }),
  buildCompleted: (product: string, durationSeconds?: number) =>
    track("Build Completed", { product, duration_seconds: durationSeconds }),
  buildFailed: (product: string, reason?: string) =>
    track("Build Failed", { product, reason }),
  downloadClicked: (product: string) => track("Download Clicked", { product }),

  // ── Checkout / Payments ───────────────────────────────────────────────────
  checkoutStarted: (plan: string, price?: number) => {
    track("Checkout Started", { plan, price });
    // Google Ads: InitiateCheckout conversion signal
    // TODO: Replace undefined with your conversion label once created in Google Ads
    gtagConversion(undefined);
  },
  purchaseCompleted: (plan: string, price?: number, currency?: string) => {
    track("Purchase Completed", { plan, price, currency: currency ?? "GBP" });
    // Google Ads: Purchase conversion — passes revenue value for ROAS bidding
    // TODO: Replace undefined with your conversion label once created in Google Ads
    gtagConversion(undefined, price);
  },

  // ── Demo engagement ───────────────────────────────────────────────────────
  demoVideoPlayed: () => track("Demo Video Played"),
  demoVideoPaused: (timeSeconds?: number) =>
    track("Demo Video Paused", { time_seconds: timeSeconds }),
  demoVideoCompleted: () => track("Demo Video Completed"),
  wizSoundDemoInteracted: (tier: string) =>
    track("WizSound Demo Interacted", { tier }),
  wizLuminaDemoInteracted: (action: string) =>
    track("WizLumina Demo Interacted", { action }),

  // ── Creation funnel ───────────────────────────────────────────────────────
  storyboardGenerated: (sceneCount?: number) =>
    track("Storyboard Generated", { scene_count: sceneCount }),
  storyboardRegenerated: (sceneCount?: number) =>
    track("Storyboard Regenerated", { scene_count: sceneCount }),

  // ── Audio upgrade ─────────────────────────────────────────────────────────
  wizSoundUpgraded: (tier: "enhanced" | "cinematic") =>
    track("WizSound Upgraded", { tier }),

  // ── Cinematic Pack ────────────────────────────────────────────────────────
  cinematicPackOffered: (source: "paywall" | "post_render") =>
    track("CinematicPack_Offered", { source }),
  cinematicPackPurchased: (price: number, source: "paywall" | "post_render") =>
    track("CinematicPack_Purchased", { price, source }),
  cinematicPackSkipped: (source: "paywall" | "post_render") =>
    track("CinematicPack_Skipped", { source }),

  // ── Subscription ─────────────────────────────────────────────────────────
  planSelected: (plan: string, billingInterval?: "monthly" | "annual") =>
    track("Plan Selected", { plan, billing_interval: billingInterval }),

  // ── Render paywall ────────────────────────────────────────────────────────
  renderPaywallOpened: () => track("Render Paywall Opened"),
  renderStarted: (quality: string, audioTier: string, price: number) =>
    track("Render Started", { quality, audio_tier: audioTier, price }),

  // ── Generic passthrough ───────────────────────────────────────────────────
  track,
};
