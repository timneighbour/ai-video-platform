/**
 * LandscapeHint — subtle, non-intrusive rotation nudge.
 * Shown only on mobile/tablet in portrait orientation.
 * Hidden on desktop (md breakpoint and above).
 * Dismissible per session via sessionStorage.
 *
 * Also renders a persistent mobile back button (top-left) when `backHref` is provided.
 */

import { useState, useEffect } from "react";
import { X, ArrowLeft } from "@/lib/icons";

interface LandscapeHintProps {
  /** Optional override label */
  label?: string;
  /** If provided, renders a back button in the top-left corner on mobile */
  backHref?: string;
  /** Label for the back button (default: "Dashboard") */
  backLabel?: string;
}

export function LandscapeHint({
  label = "For the best studio view, rotate your device to landscape.",
  backHref = "/dashboard",
  backLabel = "Dashboard",
}: LandscapeHintProps) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      return mobile;
    };
    const isMobileOrTablet = checkMobile();
    const isPortrait = window.innerHeight > window.innerWidth;
    const wasDismissed = sessionStorage.getItem("landscape_hint_dismissed") === "1";
    if (isMobileOrTablet && isPortrait && !wasDismissed) {
      setVisible(true);
    }
    const handleOrientationChange = () => {
      const nowMobile = checkMobile();
      const nowPortrait = window.innerHeight > window.innerWidth;
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

  return (
    <>
      {/* Mobile back button — always visible on mobile */}
      {backHref && isMobile && (
        <a
          href={backHref}
          className="md:hidden fixed top-4 left-4 z-50 flex items-center gap-1.5 px-3 py-2 rounded-full border border-white/10 bg-black/70 backdrop-blur-md text-white/60 hover:text-white hover:border-white/20 transition-all text-xs font-medium shadow-lg"
          style={{ backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
          aria-label={`Back to ${backLabel}`}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{backLabel}</span>
        </a>
      )}
      {/* Landscape rotation nudge */}
      {visible && !dismissed && (
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
      )}
    </>
  );
}
