/**
 * introReplay — utility to trigger the WIZ AI intro screen replay.
 * Kept in a separate file so IntroScreen.tsx only exports a single default
 * component (required for Vite Fast Refresh compatibility).
 *
 * Uses localStorage (not sessionStorage) so the intro only shows on the
 * very first visit per browser. Return visits skip it automatically.
 * The "Watch Intro" replay button calls triggerIntroReplay() to re-show it.
 */

export const INTRO_SESSION_KEY = "wizai_intro_seen";

/** Clears the localStorage flag and dispatches a replay event to App.tsx */
export function triggerIntroReplay() {
  try {
    localStorage.removeItem(INTRO_SESSION_KEY);
  } catch {
    // localStorage unavailable — continue anyway
  }
  window.dispatchEvent(new CustomEvent("wizai:replay-intro"));
}
