/*
 * WizAIIntro — Premium MP4 Video Intro (Apr 2026)
 *
 * Plays the provided WIZ AI intro video as a full-screen cinematic experience.
 * Clean implementation: no canvas overlays, no duplicate branding, no old layers.
 *
 * Features:
 *   - Full-screen MP4 playback (muted autoplay, user can enable sound)
 *   - Skip button (top-left)
 *   - Sound toggle (top-right)
 *   - Auto-dismiss when video ends
 *   - Smooth fade-out exit transition
 *   - Works on desktop and mobile
 *   - Does NOT block nav or CTAs after dismissal
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { Volume2, VolumeX, X, ChevronRight } from "lucide-react";

const INTRO_VIDEO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/WizAIIntroVid1_8567671e.mp4";

export const INTRO_SEEN_KEY = "wizai_intro_v3";

interface WizVidIntroProps {
  onClose: () => void;
}

export default function WizAIIntro({ onClose }: WizVidIntroProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isExitingRef = useRef(false);

  const [muted, setMuted] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const [showEnter, setShowEnter] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  // Start playback once video is loaded
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleCanPlay = () => {
      setVideoReady(true);
      video.play().catch(() => {});
    };

    const handleEnded = () => {
      setShowEnter(true);
      // Auto-dismiss 3s after video ends if user hasn't clicked
      setTimeout(() => {
        if (!isExitingRef.current) dismiss();
      }, 3000);
    };

    const handleTimeUpdate = () => {
      // Show "Enter Site" button in the last 2 seconds of the video
      if (video.duration && video.currentTime >= video.duration - 2) {
        setShowEnter(true);
      }
    };

    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("timeupdate", handleTimeUpdate);

    return () => {
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, []);

  const dismiss = useCallback(() => {
    if (isExitingRef.current) return;
    isExitingRef.current = true;
    setIsExiting(true);
    // Pause video during exit
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setTimeout(() => onClose(), 600);
  }, [onClose]);

  // Sync muted state
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = muted;
    }
  }, [muted]);

  return (
    <div
      className="fixed inset-0 z-[9999] overflow-hidden bg-black select-none"
      style={{
        opacity: isExiting ? 0 : 1,
        transition: isExiting ? "opacity 600ms ease" : "opacity 300ms ease",
        pointerEvents: isExiting ? "none" : "auto",
      }}
      role="dialog"
      aria-modal="true"
      aria-label="WIZ AI intro"
    >
      {/* Video */}
      <video
        ref={videoRef}
        src={INTRO_VIDEO_URL}
        muted={muted}
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          zIndex: 1,
          opacity: videoReady ? 1 : 0,
          transition: "opacity 800ms ease",
        }}
      />

      {/* Black background while video loads */}
      {!videoReady && (
        <div className="absolute inset-0 bg-black flex items-center justify-center" style={{ zIndex: 2 }}>
          <div className="w-8 h-8 border-2 border-amber-400/40 border-t-amber-400 rounded-full animate-spin" />
        </div>
      )}

      {/* Enter Site CTA — appears near end of video */}
      <div
        className="absolute inset-x-0 bottom-0 flex flex-col items-center pb-16 sm:pb-20 px-6"
        style={{
          zIndex: 10,
          opacity: showEnter ? 1 : 0,
          transform: showEnter ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 600ms ease, transform 600ms ease",
          pointerEvents: showEnter ? "auto" : "none",
        }}
      >
        <button
          onClick={dismiss}
          style={{
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "1rem 3.5rem",
            borderRadius: "9999px",
            background: "linear-gradient(135deg, rgba(139,92,246,0.98) 0%, rgba(109,40,217,1) 100%)",
            boxShadow: "0 0 50px rgba(139,92,246,0.6), 0 0 100px rgba(139,92,246,0.3), inset 0 1px 0 rgba(255,255,255,0.18)",
            color: "#FFFFFF",
            fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
            fontWeight: 700,
            fontSize: "1rem",
            letterSpacing: "0.08em",
            textTransform: "uppercase" as const,
            border: "none",
            animation: showEnter ? "ctaPulse 2.8s ease-in-out infinite" : "none",
          }}
          aria-label="Enter site"
        >
          Enter Site
          <ChevronRight style={{ width: "1.25rem", height: "1.25rem" }} />
        </button>
      </div>

      {/* Skip (top-left) */}
      <button
        onClick={dismiss}
        className="absolute top-5 left-5 flex items-center gap-1.5 px-4 py-2 rounded-full bg-black/50 hover:bg-black/70 border border-white/20 text-white text-sm font-semibold transition-all duration-200 backdrop-blur-sm"
        style={{ zIndex: 20, cursor: "pointer" }}
        aria-label="Skip intro"
      >
        <X style={{ width: "0.875rem", height: "0.875rem" }} />
        Skip
      </button>

      {/* Sound toggle (top-right) */}
      <button
        onClick={() => setMuted(m => !m)}
        className="absolute top-5 right-5 flex items-center gap-2 px-4 py-2 rounded-full bg-black/50 hover:bg-black/70 border border-white/20 text-white text-sm font-semibold transition-all duration-200 backdrop-blur-sm"
        style={{ zIndex: 20, cursor: "pointer" }}
        aria-label={muted ? "Enable sound" : "Mute"}
      >
        {muted ? (
          <><VolumeX style={{ width: "1rem", height: "1rem" }} /><span className="hidden sm:inline">Enable Sound</span></>
        ) : (
          <><Volume2 style={{ width: "1rem", height: "1rem" }} /><span className="hidden sm:inline">Mute</span></>
        )}
      </button>

      {/* Click anywhere to enter once CTA is visible */}
      {showEnter && (
        <div
          className="absolute inset-0"
          style={{ zIndex: 4, cursor: "pointer" }}
          onClick={dismiss}
        />
      )}

      <style>{`
        @keyframes ctaPulse {
          0%, 100% { box-shadow: 0 0 50px rgba(139,92,246,0.6), 0 0 100px rgba(139,92,246,0.3), inset 0 1px 0 rgba(255,255,255,0.18); }
          50%       { box-shadow: 0 0 80px rgba(139,92,246,0.85), 0 0 150px rgba(139,92,246,0.5), inset 0 1px 0 rgba(255,255,255,0.18); }
        }
      `}</style>
    </div>
  );
}
