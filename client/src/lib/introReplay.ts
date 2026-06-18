/**
 * introReplay — utility to trigger the WIZ AI intro screen replay.
 * Kept in a separate file so IntroScreen.tsx only exports a single default
 * component (required for Vite Fast Refresh compatibility).
 */

export const INTRO_SESSION_KEY = "wizai_intro_seen";

/** Clears the session flag and dispatches a replay event to App.tsx */
export function triggerIntroReplay() {
  try {
    sessionStorage.removeItem(INTRO_SESSION_KEY);
  } catch {
    // sessionStorage unavailable — continue anyway
  }
  window.dispatchEvent(new CustomEvent("wizai:replay-intro"));
}
