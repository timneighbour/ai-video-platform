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
    // Google Ads: InitiateCheckout — fires the subscription conversion label as a checkout signal
    gtagConversion("ads_conversion_SUBSCRIBE_PAID_1");
  },
  purchaseCompleted: (plan: string, price?: number, currency?: string) => {
    track("Purchase Completed", { plan, price, currency: currency ?? "GBP" });
    // Google Ads: Purchase — primary conversion with revenue value for ROAS bidding
    gtagConversion("ads_conversion_SUBSCRIBE_PAID_1", price);
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

  // ── Auth gate ─────────────────────────────────────────────────────────────
  /**
   * Fires when the AuthGate modal opens (unauthenticated user hits a gated feature).
   * @param feature  Human-readable feature name, e.g. "generate music"
   * @param sourcePage  URL path where the gate was triggered, e.g. "/music-creator"
   */
  authGateShown: (feature: string, sourcePage: string) =>
    track("Auth Gate Shown", { feature, source_page: sourcePage }),

  /**
   * Fires when the user clicks the sign-in button inside the AuthGate modal.
   */
  authGateSignInClicked: (feature: string, sourcePage: string) =>
    track("Auth Gate Sign In Clicked", { feature, source_page: sourcePage }),

  // ── Studio entry ──────────────────────────────────────────────────────────
  /**
   * Fires once on mount of each studio/application page (authenticated users only).
   * @param product  PascalCase product name, e.g. "WizScore", "MusicCreator"
   * @param entrySource  How the user arrived, e.g. "direct", "product_page", "onboarding"
   */
  studioEntered: (product: string, entrySource?: string) =>
    track("Studio Entered", { product, entry_source: entrySource ?? "direct" }),

  // ── Generation funnel ────────────────────────────────────────────────────
  /**
   * Fires when the user clicks the primary generate/build/render action in a studio.
   * @param product  PascalCase product name
   * @param quality  Optional quality tier, e.g. "standard", "hd", "4k"
   * @param hasPrompt  Whether the user has entered a text prompt
   */
  generationStarted: (product: string, quality?: string, hasPrompt?: boolean) =>
    track("Generation Started", { product, quality, has_prompt: hasPrompt }),

  /**
   * Fires when a generation job completes successfully.
   * @param product  PascalCase product name
   * @param durationSeconds  Wall-clock time from start to completion
   */
  generationCompleted: (product: string, durationSeconds?: number) =>
    track("Generation Completed", { product, duration_seconds: durationSeconds }),

  /**
   * Fires when a generation job fails or is rejected.
   * @param product  PascalCase product name
   * @param reason  snake_case reason, e.g. "insufficient_credits", "api_timeout", "validation_error"
   */
  generationFailed: (product: string, reason?: string) =>
    track("Generation Failed", { product, reason }),

  // ── Upgrade CTA ───────────────────────────────────────────────────────────
  /**
   * Fires when any upgrade CTA button is clicked anywhere on the site.
   * @param source  snake_case location, e.g. "post_render", "paywall", "dashboard", "product_page"
   * @param currentPlan  User's current plan, e.g. "free", "starter"
   * @param targetPlan  Intended upgrade target, e.g. "pro", "business" (if known)
   */
  upgradeCTAClicked: (source: string, currentPlan?: string, targetPlan?: string) =>
    track("Upgrade CTA Clicked", { source, current_plan: currentPlan, target_plan: targetPlan }),

  // ── Generic passthrough ───────────────────────────────────────────────────
  track,
};
