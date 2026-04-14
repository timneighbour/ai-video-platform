/**
 * useProjectResume — Session + Progress Save (Production Audit Item 3)
 *
 * Auto-saves project progress every 5 seconds to localStorage.
 * On return, detects if a project exists and provides resume data.
 *
 * Persisted fields:
 * - prompt / theme
 * - storyboard step
 * - selected style
 * - uploaded audio URL (not the file itself)
 * - jobId (if storyboard was generated)
 * - lastSavedAt timestamp
 */

import { useState, useEffect, useCallback, useRef } from "react";

const RESUME_KEY = "wizvid_project_resume";
const AUTOSAVE_INTERVAL = 5000; // 5 seconds

export interface ResumeData {
  title: string;
  themePrompt: string;
  genre: string;
  mood: string;
  selectedStyle: string;
  audioUrl?: string;
  audioDuration?: number;
  jobId?: number;
  step: string;
  lastSavedAt: number;
}

/**
 * Check if a saved project exists (can be called outside React)
 */
export function hasSavedProject(): boolean {
  try {
    const raw = localStorage.getItem(RESUME_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw) as ResumeData;
    // Only show resume if there's meaningful content
    return !!(data.title || data.themePrompt || data.jobId);
  } catch {
    return false;
  }
}

/**
 * Get saved project data (can be called outside React)
 */
export function getSavedProject(): ResumeData | null {
  try {
    const raw = localStorage.getItem(RESUME_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ResumeData;
  } catch {
    return null;
  }
}

/**
 * Clear saved project data
 */
export function clearSavedProject(): void {
  try {
    localStorage.removeItem(RESUME_KEY);
  } catch {}
}

/**
 * Hook: auto-save project state every 5 seconds
 */
export function useProjectAutoSave(data: Partial<ResumeData> | null) {
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    if (!data) return;

    const save = () => {
      const current = dataRef.current;
      if (!current) return;
      try {
        const toSave: ResumeData = {
          title: current.title || "",
          themePrompt: current.themePrompt || "",
          genre: current.genre || "",
          mood: current.mood || "",
          selectedStyle: current.selectedStyle || "cinematic",
          audioUrl: current.audioUrl,
          audioDuration: current.audioDuration,
          jobId: current.jobId,
          step: current.step || "upload",
          lastSavedAt: Date.now(),
        };
        localStorage.setItem(RESUME_KEY, JSON.stringify(toSave));
      } catch {}
    };

    // Save immediately on mount
    save();

    // Then every 5 seconds
    const interval = setInterval(save, AUTOSAVE_INTERVAL);
    return () => clearInterval(interval);
  }, [!!data]); // Only re-setup when data presence changes
}

/**
 * Hook: detect if a resumable project exists
 */
export function useProjectResume() {
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [showResume, setShowResume] = useState(false);

  useEffect(() => {
    const data = getSavedProject();
    if (data && (data.title || data.themePrompt || data.jobId)) {
      setResumeData(data);
      setShowResume(true);
    }
  }, []);

  const dismissResume = useCallback(() => {
    setShowResume(false);
  }, []);

  const clearAndDismiss = useCallback(() => {
    clearSavedProject();
    setShowResume(false);
    setResumeData(null);
  }, []);

  return { resumeData, showResume, dismissResume, clearAndDismiss };
}
