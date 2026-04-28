/**
 * LandscapeHint — subtle, non-intrusive rotation nudge.
 * Shown only on mobile/tablet in portrait orientation.
 * Hidden on desktop (md breakpoint and above).
 * Dismissible per session via sessionStorage.
 */

import { useState, useEffect } from "react";
import { X } from "@/lib/icons";

interface LandscapeHintProps {
  /** Optional override label */
  label?: string;
}

export function LandscapeHint({ label = "For the best studio view, rotate your device to landscape." }: LandscapeHintProps) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Only show on mobile/tablet (screen width < 1024px)
    const isMobileOrTablet = window.innerWidth < 1024;
    const isPortrait = window.innerHeight > window.innerWidth;
    const wasDismissed = sessionStorage.getItem("landscape_hint_dismissed") === "1";

    if (isMobileOrTablet && isPortrait && !wasDismissed) {
      setVisible(true);
    }

    const handleOrientationChange = () => {
      const nowPortrait = window.innerHeight > window.innerWidth;
      const nowMobile = window.innerWidth < 1024;
      const stillDismissed = sessionStorage.getItem("landscape_hint_dismissed") === "1";
      if (nowMobile && nowPortrait && !stillDismissed) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    };

    window.addEventListener("resize", handleOrientationChange);
    return () => window.removeEventListener("resize", handleOrientationChange);
  }, []);

  const dismiss = () => {
    sessionStorage.setItem("landscape_hint_dismissed", "1");
    setDismissed(true);
    setVisible(false);
  };

  if (!visible || dismissed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="md:hidden fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-full border border-[--color-gold]/[0.18] bg-black/80 backdrop-blur-md shadow-xl max-w-[calc(100vw-2rem)]"
      style={{ backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}
    >
      {/* Rotation icon */}
      <svg
        viewBox="0 0 20 20"
        fill="none"
        className="w-4 h-4 flex-shrink-0 text-[--color-gold-dark]"
        aria-hidden="true"
      >
        <path
          d="M4 8a6 6 0 0 1 10.928-3.4M16 12a6 6 0 0 1-10.928 3.4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M14.5 4.5 15 8l-3.5-.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M5.5 15.5 5 12l3.5.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <span className="text-[11px] text-white/60 leading-snug">{label}</span>

      <button
        onClick={dismiss}
        aria-label="Dismiss landscape hint"
        className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white/30 hover:text-white/60 transition-colors"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
