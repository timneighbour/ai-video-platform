/**
 * storageUtils.ts
 * Utilities for managing localStorage state across rendering apps.
 * When a project is opened via URL param, stale state from a previous
 * session should be cleared to prevent state conflicts.
 */

/** All localStorage key prefixes / exact keys used by each rendering app */
const APP_STORAGE_KEYS: Record<string, string[]> = {
  musicVideo: [
    "musicVideo_step",
    "musicVideo_jobId",
    "musicVideo_title",
    "musicVideo_duration",
    "musicVideo_theme",
    "musicVideo_genre",
    "musicVideo_mood",
    "musicVideo_style",
    "musicVideo_sceneSetting",
    "musicVideo_lyrics",
    "musicVideo_characters",
    "musicVideo_audioTab",
    "musicVideo_sunoPrompt",
    "musicVideo_sunoStyle",
    "musicVideo_sunoTaskId",
    "musicVideo_sunoTracks",
    "musicVideo_sunoTrackIdx",
    "musicVideo_sunoAudioUrl",
    "musicVideo_restoredAudioUrl",
    "musicVideo_restoredAudioTitle",
  ],
  wizShorts: ["wizshorts_active_job"],
};

/**
 * Clear all localStorage keys for a given app.
 * Call this when a project is opened via URL param to avoid stale state
 * from a previous session bleeding into the newly opened project.
 *
 * @param appKey - One of the keys in APP_STORAGE_KEYS
 * @param incomingJobId - The job ID being opened (for logging only)
 */
export function clearStaleProjectState(appKey: keyof typeof APP_STORAGE_KEYS, incomingJobId?: number | string): void {
  const keys = APP_STORAGE_KEYS[appKey];
  if (!keys) return;
  keys.forEach((k) => {
    try {
      localStorage.removeItem(k);
    } catch {
      // Silently ignore — storage may be unavailable in private browsing
    }
  });
  if (process.env.NODE_ENV === "development") {
    console.debug(`[storageUtils] Cleared stale ${appKey} state for incoming job ${incomingJobId ?? "unknown"}`);
  }
}

/**
 * Read the stored jobId for a given app (if any).
 * Returns null if no stored job exists or storage is unavailable.
 */
export function getStoredJobId(appKey: "musicVideo"): number | null;
export function getStoredJobId(appKey: "wizShorts"): number | null;
export function getStoredJobId(appKey: string): number | null {
  try {
    if (appKey === "musicVideo") {
      const raw = localStorage.getItem("musicVideo_jobId");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return typeof parsed === "number" ? parsed : null;
    }
    if (appKey === "wizShorts") {
      const raw = localStorage.getItem("wizshorts_active_job");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return typeof parsed?.jobId === "number" ? parsed.jobId : null;
    }
  } catch {
    return null;
  }
  return null;
}
