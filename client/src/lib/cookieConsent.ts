/**
 * WIZ AI Cookie Consent — GDPR/UK PECR compliant
 *
 * Manages cookie consent state with:
 * - Consent Mode v2 (analytics_storage, ad_storage, ad_user_data, ad_personalization)
 * - Per-category consent (Essential, Analytics, Marketing, Functional)
 * - Persistent storage with timestamp and version
 * - Conditional tracker loading (GA4, Clarity, Mixpanel gated behind consent)
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    clarity?: (...args: unknown[]) => void;
    mixpanel?: { opt_in_tracking: () => void; opt_out_tracking: () => void };
  }
}

export const CONSENT_VERSION = "1.0";
const CONSENT_KEY = "wiz_cookie_consent_v1";

export interface ConsentPreferences {
  essential: true; // always true, cannot be disabled
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
  version: string;
  timestamp: number;
}

export type ConsentChoice = "accepted" | "rejected" | "custom" | null;

export interface ConsentState {
  choice: ConsentChoice;
  preferences: ConsentPreferences;
}

const DEFAULT_PREFERENCES: ConsentPreferences = {
  essential: true,
  analytics: false,
  marketing: false,
  functional: false,
  version: CONSENT_VERSION,
  timestamp: 0,
};

/** Read stored consent from localStorage */
export function getStoredConsent(): ConsentState | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentState;
    // Re-validate version — if version changed, re-ask
    if (parsed.preferences?.version !== CONSENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Persist consent decision */
export function saveConsent(state: ConsentState): void {
  try {
    state.preferences.timestamp = Date.now();
    state.preferences.version = CONSENT_VERSION;
    localStorage.setItem(CONSENT_KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable — proceed without persisting
  }
}

/** Check if user has made a consent choice (banner should not show) */
export function hasConsentChoice(): boolean {
  return getStoredConsent()?.choice != null;
}

/** Get current analytics consent */
export function hasAnalyticsConsent(): boolean {
  return getStoredConsent()?.preferences?.analytics === true;
}

/** Get current marketing consent */
export function hasMarketingConsent(): boolean {
  return getStoredConsent()?.preferences?.marketing === true;
}

/** Get current functional consent */
export function hasFunctionalConsent(): boolean {
  return getStoredConsent()?.preferences?.functional === true;
}

// ── Google Consent Mode v2 ──────────────────────────────────────────────────

/**
 * Set Consent Mode v2 defaults — called BEFORE any gtag config calls.
 * All non-essential signals are denied by default until user consents.
 */
export function setConsentModeDefaults(): void {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function (...args: unknown[]) {
    window.dataLayer!.push(args);
  };
  // Set denied defaults BEFORE loading any gtag scripts
  window.gtag("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    wait_for_update: 500, // wait 500ms for consent update before sending hits
  });
}

/**
 * Update Consent Mode v2 based on user preferences.
 * Call this after user makes a consent choice.
 */
export function updateConsentMode(prefs: ConsentPreferences): void {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("consent", "update", {
    analytics_storage: prefs.analytics ? "granted" : "denied",
    ad_storage: prefs.marketing ? "granted" : "denied",
    ad_user_data: prefs.marketing ? "granted" : "denied",
    ad_personalization: prefs.marketing ? "granted" : "denied",
  });
}

// ── Tracker initialisation (consent-gated) ──────────────────────────────────

let clarityLoaded = false;
let mixpanelOptedIn = false;

/** Load Microsoft Clarity — only after analytics consent */
export function loadClarity(): void {
  if (clarityLoaded || typeof window === "undefined") return;
  clarityLoaded = true;
  (function (c: Window, l: Document, a: string, r: string, i: string) {
    type ClarityFn = ((...args: unknown[]) => void) & { q?: unknown[] };
    (c as unknown as Record<string, ClarityFn>)[a] =
      (c as unknown as Record<string, ClarityFn>)[a] ||
      function (...args: unknown[]) {
        ((c as unknown as Record<string, ClarityFn>)[a].q =
          (c as unknown as Record<string, ClarityFn>)[a].q || []).push(args);
      };
    const t = l.createElement(r) as HTMLScriptElement;
    t.async = true;
    t.src = "https://www.clarity.ms/tag/" + i;
    const y = l.getElementsByTagName(r)[0];
    y.parentNode?.insertBefore(t, y);
  })(window, document, "clarity", "script", "wbohukdt58");
}

/** Opt Mixpanel in — only after analytics consent */
export function optInMixpanel(): void {
  if (mixpanelOptedIn) return;
  mixpanelOptedIn = true;
  if (typeof window !== "undefined" && window.mixpanel?.opt_in_tracking) {
    window.mixpanel.opt_in_tracking();
  }
}

/** Opt Mixpanel out — when analytics consent is withdrawn */
export function optOutMixpanel(): void {
  if (typeof window !== "undefined" && window.mixpanel?.opt_out_tracking) {
    window.mixpanel.opt_out_tracking();
  }
}

/**
 * Apply all consent-gated trackers based on current stored preferences.
 * Call this on app load (after reading stored consent) and after any consent update.
 */
export function applyConsentToTrackers(prefs: ConsentPreferences): void {
  // Update Consent Mode v2
  updateConsentMode(prefs);

  // Analytics trackers (GA4 is handled by Consent Mode — no need to block script load)
  if (prefs.analytics) {
    loadClarity();
    optInMixpanel();
  } else {
    optOutMixpanel();
  }
}

/** Accept all cookies */
export function acceptAllCookies(): ConsentState {
  const state: ConsentState = {
    choice: "accepted",
    preferences: {
      essential: true,
      analytics: true,
      marketing: true,
      functional: true,
      version: CONSENT_VERSION,
      timestamp: Date.now(),
    },
  };
  saveConsent(state);
  applyConsentToTrackers(state.preferences);
  return state;
}

/** Reject all non-essential cookies */
export function rejectNonEssentialCookies(): ConsentState {
  const state: ConsentState = {
    choice: "rejected",
    preferences: { ...DEFAULT_PREFERENCES, timestamp: Date.now() },
  };
  saveConsent(state);
  applyConsentToTrackers(state.preferences);
  return state;
}

/** Save custom preferences */
export function saveCustomCookiePreferences(
  analytics: boolean,
  marketing: boolean,
  functional: boolean
): ConsentState {
  const state: ConsentState = {
    choice: "custom",
    preferences: {
      essential: true,
      analytics,
      marketing,
      functional,
      version: CONSENT_VERSION,
      timestamp: Date.now(),
    },
  };
  saveConsent(state);
  applyConsentToTrackers(state.preferences);
  return state;
}

/** Reset consent (for testing or when user wants to change preferences) */
export function resetConsent(): void {
  try {
    localStorage.removeItem(CONSENT_KEY);
  } catch {
    // ignore
  }
}

/**
 * Programmatically open the cookie settings panel.
 * Dispatches a custom event that CookieConsentBanner listens for.
 */
export function openCookieSettings(): void {
  window.dispatchEvent(new CustomEvent("wiz:open-cookie-settings"));
}
