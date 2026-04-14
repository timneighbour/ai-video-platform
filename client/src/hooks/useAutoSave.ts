/**
 * useAutoSave — auto-saves working state every 5 seconds to the server.
 * On page load, checks for existing auto-save and offers resume.
 */
import { useEffect, useRef, useCallback, useState } from "react";
import { trpc } from "@/lib/trpc";

type ToolType = "text_to_video" | "music_video" | "kids_video" | "wizpilot";

interface AutoSaveOptions {
  toolType: ToolType;
  /** Function that returns the current state as a JSON-serializable object */
  getState: () => Record<string, unknown>;
  /** Function to restore state from a saved object */
  restoreState: (state: Record<string, unknown>) => void;
  /** Whether auto-save is enabled (disable during render, etc.) */
  enabled?: boolean;
  /** Interval in ms (default 5000) */
  intervalMs?: number;
}

export interface AutoSaveData {
  id: number;
  toolType: string;
  stateJson: string;
  title: string | null;
  sourceJobId: number | null;
  updatedAt: Date;
}

export function useAutoSave({
  toolType,
  getState,
  restoreState,
  enabled = true,
  intervalMs = 5000,
}: AutoSaveOptions) {
  const [pendingSave, setPendingSave] = useState<AutoSaveData | null>(null);
  const [showResumeBanner, setShowResumeBanner] = useState(false);
  const lastSaveRef = useRef<string>("");
  const getStateRef = useRef(getState);
  getStateRef.current = getState;
  const restoreStateRef = useRef(restoreState);
  restoreStateRef.current = restoreState;

  // Query for existing auto-save on mount
  const { data: existingSave } = trpc.engine.getAutoSave.useQuery(
    { toolType },
    { refetchOnWindowFocus: false }
  );

  const saveMutation = trpc.engine.saveAutoSave.useMutation();
  const clearMutation = trpc.engine.clearAutoSave.useMutation();

  // Show resume banner if there's a saved state
  useEffect(() => {
    if (existingSave && existingSave.stateJson) {
      setPendingSave(existingSave as AutoSaveData);
      setShowResumeBanner(true);
    }
  }, [existingSave]);

  // Auto-save interval
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      try {
        const state = getStateRef.current();
        const json = JSON.stringify(state);

        // Only save if state actually changed
        if (json !== lastSaveRef.current && json !== "{}") {
          lastSaveRef.current = json;
          saveMutation.mutate({
            toolType,
            stateJson: json,
          });
        }
      } catch {
        // Silently ignore serialization errors
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [enabled, toolType, intervalMs, saveMutation]);

  const resumeSave = useCallback(() => {
    if (pendingSave) {
      try {
        const state = JSON.parse(pendingSave.stateJson);
        restoreStateRef.current(state);
      } catch {
        // ignore parse errors
      }
    }
    setShowResumeBanner(false);
  }, [pendingSave]);

  const dismissSave = useCallback(() => {
    setShowResumeBanner(false);
    clearMutation.mutate({ toolType });
  }, [toolType, clearMutation]);

  const clearSave = useCallback(() => {
    lastSaveRef.current = "";
    clearMutation.mutate({ toolType });
  }, [toolType, clearMutation]);

  return {
    showResumeBanner,
    pendingSave,
    resumeSave,
    dismissSave,
    clearSave,
  };
}
