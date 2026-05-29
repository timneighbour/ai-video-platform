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

  //  // ── First render celebration ──────────────────────────────────────────
  /**
   * Fires when a user completes their very first render (detected via localStorage flag).
   * @param product  PascalCase product name, e.g. "WizVideo"
   */
  firstRenderCompleted: (product: string) =>
    track("First Render Completed", { product }),

  // ── Credit balance low ────────────────────────────────────────────────────
  /**
   * Fires when the user's credit balance drops below the low-credit threshold (30 credits).
   * @param balance  Current credit balance
   * @param product  Product page where the low balance was detected
   */
  creditBalanceLow: (balance: number, product?: string) =>
    track("Credit Balance Low", { balance, product }),

  // ── Subscription page viewed ──────────────────────────────────────────────
  /**
   * Fires when the user views the /pricing or /subscribe page.
   * @param source  Where the user came from, e.g. "paywall", "nav", "dashboard", "direct"
   * @param currentPlan  User's current plan
   */
  subscriptionViewed: (source?: string, currentPlan?: string) =>
    track("Subscription Viewed", { source, current_plan: currentPlan }),

  //  // ── Quality Guarantee & Director Controls ──────────────────────────────
  /**
   * Fires when a user requests a scene re-render from the Scene Director panel.
   * @param jobId  Music video job ID
   * @param sceneIndex  0-based scene index
   * @param isFree  Whether this is the free re-render (first one) or a paid re-render
   * @param cameraStyle  Camera style selected, e.g. "close-up", "wide", "tracking"
   * @param lipSyncEnabled  Whether lip sync is enabled for this re-render
   */
  sceneRerendered: (props: { jobId: number; sceneIndex: number; isFree: boolean; cameraStyle?: string; lipSyncEnabled?: boolean }) =>
    track("Scene Re-rendered", { job_id: props.jobId, scene_index: props.sceneIndex, is_free: props.isFree, camera_style: props.cameraStyle, lip_sync_enabled: props.lipSyncEnabled }),

  /**
   * Fires when the Scene Director panel is opened but closed without submitting a re-render.
   * Indicates user dissatisfaction but re-render abandonment — useful for prompt UX improvements.
   */
  rerenderAbandoned: (props: { jobId: number; sceneIndex: number }) =>
    track("Re-render Abandoned", { job_id: props.jobId, scene_index: props.sceneIndex }),

  /**
   * Fires when the user watches the full video preview (>90% playback) before confirming download.
   * High-intent signal — users who watch the full preview are more likely to confirm.
   */
  previewWatchCompleted: (props: { jobId: number; sceneCount: number }) =>
    track("Preview Watch Completed", { job_id: props.jobId, scene_count: props.sceneCount }),

  /**
   * Fires when the user clicks "Download & Confirm" and confirms the quality guarantee modal.
   * This is the final conversion event — user has accepted the video.
   */
  downloadConfirmed: (props: { jobId: number; reRenderCount: number; hadFreeRerender: boolean }) =>
    track("Download Confirmed", { job_id: props.jobId, rerender_count: props.reRenderCount, had_free_rerender: props.hadFreeRerender }),

  /**
   * Fires when the user selects a camera style in the Scene Director panel.
   * Useful for understanding which camera styles are most popular.
   */
  cameraStyleSelected: (style: string, sceneIndex?: number) =>
    track("Camera Style Selected", { style, scene_index: sceneIndex }),

  /**
   * Fires when the user toggles lip sync on or off for a scene.
   */
  lipSyncToggled: (enabled: boolean, sceneIndex?: number) =>
    track("Lip Sync Toggled", { enabled, scene_index: sceneIndex }),

  /**
   * Fires when the Quality Guarantee banner is shown to the user (video completed, not yet downloaded).
   */
  qualityGuaranteeShown: (jobId: number) =>
    track("Quality Guarantee Shown", { job_id: jobId }),

  /**
   * Fires when the user opens the Scene Director panel to edit a scene.
   */
  sceneDirectorOpened: (props: { jobId: number; sceneIndex: number; freeReRenderAvailable: boolean }) =>
    track("Scene Director Opened", { job_id: props.jobId, scene_index: props.sceneIndex, free_rerender_available: props.freeReRenderAvailable }),

  // ── Conversion funnel tracking ─────────────────────────────────
  /** Fires when the post-first-render subscription modal is shown. */
  postFirstRenderModalShown: (source?: string) =>
    track("Post First Render Modal Shown", { source }),
  /** Fires when the Founding Creator banner is shown. */
  foundingCreatorBannerShown: () =>
    track("Founding Creator Banner Shown"),
  /** Fires when the Founding Creator banner CTA is clicked. */
  foundingCreatorBannerClicked: (destination: string) =>
    track("Founding Creator Banner Clicked", { destination }),
  /** Fires when the user views the upgrade modal (any source). */
  upgradeModalViewed: (source: string, plan?: string) =>
    track("Upgrade Modal Viewed", { source, plan }),
  /** Fires when the user abandons checkout (closes modal without subscribing). */
  checkoutAbandoned: (source: string, plan?: string) =>
    track("Checkout Abandoned", { source, plan }),
  /** Fires when a subscription is successfully completed. */
  subscriptionCompleted: (plan: string, price?: number, source?: string) =>
    track("Subscription Completed", { plan, price, source }),
  /** Fires when the first render → subscription conversion path is completed. */
  firstRenderToSubscription: (plan: string, hoursAfterRender?: number) =>
    track("First Render to Subscription", { plan, hours_after_render: hoursAfterRender }),

  // ── Music Video creation funnel ─────────────────────────────────────────────
  /**
   * Fires when the user uploads an audio file on the Music Video page.
   * Key funnel step: audio upload → storyboard generation.
   */
  audioUploaded: (props: { durationSeconds?: number; fileSizeMb?: number; format?: string }) =>
    track("Audio Uploaded", props),

  /**
   * Fires when the storyboard is displayed to the user for review.
   * Key funnel step: storyboard generation → render intent.
   */
  storyboardViewed: (props: { sceneCount: number; jobId?: number }) =>
    track("Storyboard Viewed", { scene_count: props.sceneCount, job_id: props.jobId }),

  /**
   * Fires when the user clicks "Start Render" / "Build Video" after reviewing the storyboard.
   * This is the highest-intent pre-render signal.
   */
  storyboardApproved: (props: { sceneCount: number; jobId?: number; creditCost?: number }) =>
    track("Storyboard Approved", { scene_count: props.sceneCount, job_id: props.jobId, credit_cost: props.creditCost }),

  /**
   * Fires when the user navigates away from the render page before completion.
   * Key abandonment signal.
   */
  renderAbandoned: (props: { jobId: number; completedScenes: number; totalScenes: number; elapsedSeconds?: number }) =>
    track("Render Abandoned", { job_id: props.jobId, completed_scenes: props.completedScenes, total_scenes: props.totalScenes, elapsed_seconds: props.elapsedSeconds }),

  /**
   * Fires every time an upgrade prompt / paywall is shown to the user.
   * @param trigger  What triggered the prompt: "render_paywall", "credit_low", "feature_gate", "post_render"
   * @param source  Page/component where it appeared
   */
  upgradePromptShown: (trigger: string, source?: string, currentPlan?: string) =>
    track("Upgrade Prompt Shown", { trigger, source, current_plan: currentPlan }),

  /**
   * Fires when the user scrolls to the bottom of the pricing page without clicking a CTA.
   * Strong abandonment signal for the pricing page.
   */
  pricingPageScrolledToBottom: (currentPlan?: string) =>
    track("Pricing Page Scrolled To Bottom", { current_plan: currentPlan }),

  /**
   * Fires when the exit-intent modal is shown on the pricing page.
   */
  exitIntentShown: (page: string) =>
    track("Exit Intent Shown", { page }),

  /**
   * Fires when the exit-intent modal CTA is clicked.
   */
  exitIntentCTAClicked: (page: string, action: string) =>
    track("Exit Intent CTA Clicked", { page, action }),

  /**
   * Fires when the "Continue where you left off" return banner is shown.
   */
  returnBannerShown: (jobId: number, completedScenes: number) =>
    track("Return Banner Shown", { job_id: jobId, completed_scenes: completedScenes }),

  /**
   * Fires when the first music video job is created (audio uploaded + job record created).
   * Key activation metric: user has committed to creating their first video.
   */
  firstMusicVideoJobCreated: (props: { sceneCount?: number; theme?: string }) =>
    track("First Music Video Job Created", props),

  // ── Generic passthrough ─────────────────────────────────
  track,
};
