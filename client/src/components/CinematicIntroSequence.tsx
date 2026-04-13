/**
 * CinematicIntroSequence V5 — Ultra-Premium IMAX Cinematic Experience
 *
 * A full-screen video player with real AI-generated cinematic footage
 * and an orchestral soundtrack processed through the WizSound cinematic pipeline.
 *
 * VIDEO: 17s composed from 5 ultra-cinematic clips with crossfade transitions
 *        (volumetric open → concert → noir city → Pixar animation → logo reveal)
 * AUDIO: Real orchestral soundtrack baked into the video file
 *        (sub-bass → strings → brass crescendo → impact hit → reverb tail)
 * TEXT:  CSS-only overlays synced to video currentTime (no baked-in text)
 * CTA:   "Enter Experience →" button appears on final frame with 2–3s hold
 */
import { useRef, useState, useEffect, useCallback } from "react";

const INTRO_VIDEO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/v6-intro-final_92a6af28.mp4";

const WIZVID_LOGO =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizvid-logo-transparent_fcdb69d6.png";

/* ── timing map (seconds) — matched to 5-clip composition ── */
const T = {
  /* Scene boundaries (with 0.8s crossfades between each) */
  SCENE1_END: 3.2,       // volumetric open
  SCENE2_START: 3.2,     // concert performance
  SCENE2_END: 6.4,
  SCENE3_START: 6.4,     // cinematic film noir
  SCENE3_END: 9.6,
  SCENE4_START: 9.6,     // Pixar animation
  SCENE4_END: 12.8,
  SCENE5_START: 12.8,    // logo reveal (light convergence)

  /* Logo + CTA timing */
  LOGO_SHOW: 13.5,
  USP_SHOW: 14.2,
  CTA_SHOW: 15.0,
  VIDEO_END: 17.0,
};

/* ── genre labels — appear once per scene, CSS-only, positioned within the frame ── */
const GENRE_LABELS: Array<{
  text: string;
  start: number;
  end: number;
  color: string;
}> = [
  { text: "Music Videos", start: 3.5, end: 5.8, color: "#f59e0b" },
  { text: "Cinematic Films", start: 6.8, end: 9.0, color: "#06b6d4" },
  { text: "Animation", start: 10.0, end: 12.2, color: "#34d399" },
];

interface Props {
  onComplete: () => void;
}

export default function CinematicIntroSequence({ onComplete }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  const [currentTime, setCurrentTime] = useState(0);
  const [videoReady, setVideoReady] = useState(false);
  const [audioUnmuted, setAudioUnmuted] = useState(false);
  const [showCTA, setShowCTA] = useState(false);
  const [showLogo, setShowLogo] = useState(false);
  const [showUSP, setShowUSP] = useState(false);
  const [impactFired, setImpactFired] = useState(false);

  /* ── video time sync loop ── */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const syncLoop = () => {
      const t = video.currentTime;
      setCurrentTime(t);

      if (t >= T.LOGO_SHOW && !showLogo) setShowLogo(true);
      if (t >= T.USP_SHOW && !showUSP) setShowUSP(true);
      if (t >= T.CTA_SHOW && !showCTA) setShowCTA(true);
      // Impact flash at logo reveal moment
      if (t >= T.LOGO_SHOW - 0.2 && t <= T.LOGO_SHOW + 0.5 && !impactFired) {
        setImpactFired(true);
      }

      if (!video.paused && !video.ended) {
        rafRef.current = requestAnimationFrame(syncLoop);
      }
    };

    const onPlay = () => {
      rafRef.current = requestAnimationFrame(syncLoop);
    };
    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    video.addEventListener("play", onPlay);
    video.addEventListener("timeupdate", onTimeUpdate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("timeupdate", onTimeUpdate);
    };
  }, [showLogo, showUSP, showCTA, impactFired]);

  /* ── pause video at end for CTA hold ── */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handleEnd = () => {
      setShowCTA(true);
      setShowLogo(true);
      setShowUSP(true);
    };
    video.addEventListener("ended", handleEnd);
    return () => video.removeEventListener("ended", handleEnd);
  }, []);

  /* ── unmute audio on user interaction ── */
  const handleInteraction = useCallback(() => {
    if (!audioUnmuted && videoRef.current) {
      videoRef.current.muted = false;
      videoRef.current.volume = 1.0;
      setAudioUnmuted(true);
    }
  }, [audioUnmuted]);

  /* ── skip / enter ── */
  const handleSkip = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    cancelAnimationFrame(rafRef.current);
    onComplete();
  }, [onComplete]);

  const handleEnter = useCallback(() => {
    handleSkip();
  }, [handleSkip]);

  /* ── keyboard ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleSkip();
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        handleInteraction();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleSkip, handleInteraction]);

  /* ── genre label helpers ── */
  const labelOpacity = (start: number, end: number) => {
    if (currentTime < start) return 0;
    if (currentTime < start + 0.5) return (currentTime - start) / 0.5;
    if (currentTime > end - 0.5) return Math.max(0, (end - currentTime) / 0.5);
    return 1;
  };
  const labelTranslateY = (start: number, end: number) => {
    if (currentTime < start) return 30;
    if (currentTime < start + 0.5) return 30 * (1 - (currentTime - start) / 0.5);
    if (currentTime > end - 0.5) return -20 * (1 - (end - currentTime) / 0.5);
    return 0;
  };

  const videoEnded = currentTime >= T.VIDEO_END - 0.5 || showCTA;

  return (
    <div
      ref={containerRef}
      onClick={handleInteraction}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "#000",
        overflow: "hidden",
        cursor: audioUnmuted ? "default" : "pointer",
      }}
    >
      {/* ── VIDEO ELEMENT (with real orchestral audio baked in) ── */}
      <video
        ref={videoRef}
        src={INTRO_VIDEO_URL}
        autoPlay
        muted
        playsInline
        preload="auto"
        onCanPlay={() => setVideoReady(true)}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: videoReady ? 1 : 0,
          transition: "opacity 0.8s ease",
        }}
      />

      {/* ── LOADING STATE ── */}
      {!videoReady && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              border: "3px solid rgba(255,255,255,0.1)",
              borderTopColor: "#a78bfa",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          />
          <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em" }}>
            Loading cinematic experience...
          </span>
        </div>
      )}

      {/* ── CINEMATIC LETTERBOX BARS (IMAX feel) ── */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "5%",
          background: "linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)",
          pointerEvents: "none",
          zIndex: 5,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "5%",
          background: "linear-gradient(to top, rgba(0,0,0,0.6), transparent)",
          pointerEvents: "none",
          zIndex: 5,
        }}
      />

      {/* ── GENRE TEXT OVERLAYS (CSS-only, centred, one at a time) ── */}
      {GENRE_LABELS.map((label) => (
        <div
          key={label.text}
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: `translate(-50%, -50%) translateY(${labelTranslateY(label.start, label.end)}px)`,
            opacity: labelOpacity(label.start, label.end),
            pointerEvents: "none",
            zIndex: 10,
            textAlign: "center",
          }}
        >
          <span
            style={{
              fontSize: "clamp(2rem, 5vw, 5rem)",
              fontWeight: 800,
              color: "#fff",
              textShadow: `
                0 0 40px ${label.color},
                0 0 80px ${label.color}80,
                0 0 120px ${label.color}40,
                0 4px 20px rgba(0,0,0,0.9)
              `,
              letterSpacing: "0.12em",
              fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
              textTransform: "uppercase",
            }}
          >
            {label.text}
          </span>
        </div>
      ))}

      {/* ── IMPACT FLASH (at logo reveal) ── */}
      {impactFired && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(circle at center, rgba(255,255,255,0.5) 0%, rgba(167,139,250,0.3) 30%, transparent 70%)",
            opacity: 0,
            animation: "impactFlash 1s ease-out forwards",
            pointerEvents: "none",
            zIndex: 11,
          }}
        />
      )}

      {/* ── LOGO + TAGLINE + CTA (final frame — clean, no overlap) ── */}
      {showLogo && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 20,
            pointerEvents: videoEnded ? "auto" : "none",
          }}
        >
          {/* Dark overlay for final frame readability */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: videoEnded
                ? "radial-gradient(ellipse at center, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.92) 100%)"
                : "radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.6) 100%)",
              transition: "background 1.2s ease",
            }}
          />

          {/* Logo image */}
          <img
            src={WIZVID_LOGO}
            alt="WizVid"
            style={{
              width: "clamp(180px, 25vw, 380px)",
              height: "auto",
              position: "relative",
              zIndex: 1,
              opacity: 0,
              transform: "scale(0.85)",
              animation: showLogo ? "logoReveal 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards" : "none",
              filter: "drop-shadow(0 0 50px rgba(167,139,250,0.7)) drop-shadow(0 0 100px rgba(124,58,237,0.4))",
            }}
          />

          {/* Glow sweep line across logo */}
          {showLogo && (
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "-100%",
                width: "50%",
                height: "2px",
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)",
                transform: "translateY(-50%)",
                animation: "glowSweep 1.5s ease-in-out 0.5s forwards",
                pointerEvents: "none",
                zIndex: 2,
              }}
            />
          )}

          {/* Tagline */}
          <p
            style={{
              position: "relative",
              zIndex: 1,
              fontSize: "clamp(0.9rem, 1.8vw, 1.4rem)",
              color: "rgba(255,255,255,0.9)",
              marginTop: "1.5rem",
              letterSpacing: "0.2em",
              fontWeight: 300,
              textTransform: "uppercase",
              opacity: showUSP ? 1 : 0,
              transform: `translateY(${showUSP ? "0" : "15px"})`,
              transition: "opacity 0.8s ease 0.3s, transform 0.8s ease 0.3s",
              textShadow: "0 2px 15px rgba(0,0,0,0.9)",
            }}
          >
            Cinematic AI Video Creation
          </p>

          {/* WizSound USP */}
          <p
            style={{
              position: "relative",
              zIndex: 1,
              fontSize: "clamp(0.7rem, 1.1vw, 0.9rem)",
              color: "rgba(167,139,250,0.95)",
              marginTop: "0.6rem",
              letterSpacing: "0.12em",
              fontWeight: 400,
              opacity: showUSP ? 1 : 0,
              transform: `translateY(${showUSP ? "0" : "10px"})`,
              transition: "opacity 0.8s ease 0.6s, transform 0.8s ease 0.6s",
              textShadow: "0 0 25px rgba(167,139,250,0.5)",
            }}
          >
            Powered by WizSound™ &middot; Cinematic Spatial Audio
          </p>

          {/* CTA Button */}
          {videoEnded && (
            <button
              onClick={handleEnter}
              aria-label="Enter WizVid Experience"
              style={{
                position: "relative",
                zIndex: 1,
                marginTop: "2.5rem",
                padding: "1rem 3rem",
                fontSize: "clamp(1rem, 1.5vw, 1.2rem)",
                fontWeight: 600,
                color: "#fff",
                background: "linear-gradient(135deg, #7c3aed 0%, #a78bfa 50%, #7c3aed 100%)",
                backgroundSize: "200% 200%",
                border: "1px solid rgba(167,139,250,0.4)",
                borderRadius: "9999px",
                cursor: "pointer",
                letterSpacing: "0.06em",
                boxShadow:
                  "0 0 40px rgba(124,58,237,0.5), 0 0 80px rgba(124,58,237,0.25), inset 0 1px 0 rgba(255,255,255,0.15)",
                opacity: 0,
                transform: "translateY(20px)",
                animation: "ctaAppear 0.8s ease forwards 0.3s",
              }}
              onMouseEnter={(e) => {
                const btn = e.currentTarget;
                btn.style.boxShadow =
                  "0 0 60px rgba(124,58,237,0.7), 0 0 120px rgba(124,58,237,0.35), inset 0 1px 0 rgba(255,255,255,0.2)";
                btn.style.transform = "translateY(0) scale(1.03)";
              }}
              onMouseLeave={(e) => {
                const btn = e.currentTarget;
                btn.style.boxShadow =
                  "0 0 40px rgba(124,58,237,0.5), 0 0 80px rgba(124,58,237,0.25), inset 0 1px 0 rgba(255,255,255,0.15)";
                btn.style.transform = "translateY(0) scale(1)";
              }}
            >
              Enter Experience →
            </button>
          )}
        </div>
      )}

      {/* ── SKIP BUTTON ── */}
      {!videoEnded && (
        <button
          onClick={handleSkip}
          aria-label="Skip intro"
          style={{
            position: "absolute",
            top: "1.5rem",
            right: "1.5rem",
            zIndex: 30,
            padding: "0.5rem 1.25rem",
            fontSize: "0.8rem",
            fontWeight: 500,
            color: "rgba(255,255,255,0.6)",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "9999px",
            cursor: "pointer",
            backdropFilter: "blur(12px)",
            transition: "all 0.2s ease",
            letterSpacing: "0.04em",
          }}
          onMouseEnter={(e) => {
            const btn = e.currentTarget;
            btn.style.color = "#fff";
            btn.style.background = "rgba(255,255,255,0.12)";
            btn.style.borderColor = "rgba(255,255,255,0.2)";
          }}
          onMouseLeave={(e) => {
            const btn = e.currentTarget;
            btn.style.color = "rgba(255,255,255,0.6)";
            btn.style.background = "rgba(255,255,255,0.06)";
            btn.style.borderColor = "rgba(255,255,255,0.1)";
          }}
        >
          Skip →
        </button>
      )}

      {/* ── CLICK TO UNMUTE HINT ── */}
      {!audioUnmuted && videoReady && !videoEnded && (
        <div
          style={{
            position: "absolute",
            bottom: "2.5rem",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 25,
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.5rem 1.25rem",
            background: "rgba(0,0,0,0.5)",
            borderRadius: "9999px",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(12px)",
            animation: "fadeInUp 0.6s ease forwards",
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(167,139,250,0.9)"
            strokeWidth="2"
          >
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </svg>
          <span
            style={{
              fontSize: "0.75rem",
              color: "rgba(255,255,255,0.6)",
              letterSpacing: "0.04em",
            }}
          >
            Click for immersive audio
          </span>
        </div>
      )}

      {/* ── PROGRESS BAR ── */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          height: 2,
          width: `${Math.min(100, (currentTime / T.VIDEO_END) * 100)}%`,
          background: "linear-gradient(90deg, #7c3aed, #a78bfa, #c4b5fd)",
          zIndex: 25,
          transition: "width 0.15s linear",
          boxShadow: "0 0 12px rgba(124,58,237,0.6)",
        }}
      />

      {/* ── KEYFRAME ANIMATIONS ── */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes impactFlash {
          0% { opacity: 0; }
          10% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes logoReveal {
          0% { opacity: 0; transform: scale(0.85); }
          60% { opacity: 1; transform: scale(1.02); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes glowSweep {
          0% { left: -50%; opacity: 0; }
          20% { opacity: 1; }
          100% { left: 150%; opacity: 0; }
        }
        @keyframes ctaAppear {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
