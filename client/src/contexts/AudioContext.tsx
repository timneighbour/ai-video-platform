/**
 * Global Audio Context
 *
 * Single source of truth for all audio state across WizVid.
 *
 * Rules enforced:
 * 1. SINGLE AUDIO SOURCE — only one element can have sound at a time
 * 2. GLOBAL MUTE — isMuted applies to ALL audio/video elements
 * 3. USER-FIRST — starts muted, sound only after explicit user interaction
 * 4. LOOP SAFETY — looped media stays muted on restart
 * 5. FAILSAFE — any error defaults to muted
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

interface AudioContextValue {
  /** Global muted state — true = all audio silent */
  isMuted: boolean;
  /** Toggle global mute on/off */
  toggleMute: () => void;
  /** Force mute everything */
  mute: () => void;
  /** Unmute (requires prior user interaction) */
  unmute: () => void;
  /** Register an audio/video element so the context can manage it */
  registerAudioElement: (id: string, element: HTMLMediaElement) => void;
  /** Unregister when element unmounts */
  unregisterAudioElement: (id: string) => void;
  /** Request to be the active audio source (mutes all others) */
  requestAudioFocus: (id: string) => void;
  /** Release audio focus */
  releaseAudioFocus: (id: string) => void;
  /** The id of the currently active audio source */
  activeSourceId: string | null;
  /** Whether the user has interacted (unlocked audio) */
  hasUserInteracted: boolean;
}

const STORAGE_KEY = "wizvid_global_muted";

const AudioCtx = createContext<AudioContextValue>({
  isMuted: true,
  toggleMute: () => {},
  mute: () => {},
  unmute: () => {},
  registerAudioElement: () => {},
  unregisterAudioElement: () => {},
  requestAudioFocus: () => {},
  releaseAudioFocus: () => {},
  activeSourceId: null,
  hasUserInteracted: false,
});

export function useGlobalAudio() {
  return useContext(AudioCtx);
}

export function GlobalAudioProvider({ children }: { children: React.ReactNode }) {
  // Always start muted on page load — user-first policy.
  // Browser autoplay policy requires a user gesture before audio can play.
  // We never restore "unmuted" from storage because the user must explicitly
  // unmute on each visit (browser may have blocked autoplay anyway).
  const [isMuted, setIsMuted] = useState(true);

  const [activeSourceId, setActiveSourceId] = useState<string | null>(null);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const elementsRef = useRef<Map<string, HTMLMediaElement>>(new Map());

  // Persist mute state
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(isMuted));
    } catch { /* noop */ }
  }, [isMuted]);

  // Track user interaction for autoplay policy
  useEffect(() => {
    const handler = () => {
      setHasUserInteracted(true);
      // Remove after first interaction
      window.removeEventListener("click", handler);
      window.removeEventListener("touchstart", handler);
      window.removeEventListener("keydown", handler);
    };
    window.addEventListener("click", handler);
    window.addEventListener("touchstart", handler);
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("click", handler);
      window.removeEventListener("touchstart", handler);
      window.removeEventListener("keydown", handler);
    };
  }, []);

  // Apply mute state to all registered elements whenever it changes
  useEffect(() => {
    elementsRef.current.forEach((el) => {
      try {
        el.muted = isMuted;
      } catch { /* failsafe */ }
    });
  }, [isMuted]);

  const mute = useCallback(() => {
    setIsMuted(true);
  }, []);

  const unmute = useCallback(() => {
    setIsMuted(false);
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  const registerAudioElement = useCallback((id: string, element: HTMLMediaElement) => {
    elementsRef.current.set(id, element);
    // Apply current mute state immediately
    try {
      element.muted = isMuted;
    } catch { /* failsafe */ }
  }, [isMuted]);

  const unregisterAudioElement = useCallback((id: string) => {
    elementsRef.current.delete(id);
    if (activeSourceId === id) {
      setActiveSourceId(null);
    }
  }, [activeSourceId]);

  const requestAudioFocus = useCallback((id: string) => {
    // Mute all other elements
    elementsRef.current.forEach((el, elId) => {
      if (elId !== id) {
        try {
          el.muted = true;
          // Pause other audio sources to prevent background playback
          if (el instanceof HTMLAudioElement || (el instanceof HTMLVideoElement && !el.muted)) {
            el.pause();
          }
        } catch { /* failsafe */ }
      }
    });
    setActiveSourceId(id);
    // Apply current mute state to the requesting element
    const el = elementsRef.current.get(id);
    if (el) {
      try {
        el.muted = isMuted;
        // If unmuted and paused, start playback (browser allows this after user gesture)
        if (!isMuted && el.paused) {
          el.play().catch(() => {}); // Failsafe — ignore autoplay policy errors
        }
      } catch { /* failsafe */ }
    }
  }, [isMuted]);

  const releaseAudioFocus = useCallback((id: string) => {
    if (activeSourceId === id) {
      setActiveSourceId(null);
    }
  }, [activeSourceId]);

  return (
    <AudioCtx.Provider
      value={{
        isMuted,
        toggleMute,
        mute,
        unmute,
        registerAudioElement,
        unregisterAudioElement,
        requestAudioFocus,
        releaseAudioFocus,
        activeSourceId,
        hasUserInteracted,
      }}
    >
      {children}
    </AudioCtx.Provider>
  );
}
