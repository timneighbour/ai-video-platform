/**
 * CinematicIntroSequence V8 — Energetic Premium Experience
 *
 * Complete overhaul:
 * - New energetic modern soundtrack (electronic + orchestral hybrid, 128 BPM)
 * - 5 new premium video clips (music, cinematic, creator, animation, logo)
 * - Faster pacing: 3.2s per clip with 0.6s transitions
 * - Audio impact hit at logo reveal + WizSound swell
 * - 3.4s final frame hold for CTA absorption
 * - Total: 17s
 *
 * SCENE ORDER: Music Video → Cinematic Film → Creator Video → Animation → Logo Reveal
 */
import { useRef, useState, useEffect, useCallback } from "react";

const INTRO_VIDEO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/v8-intro-final_8f2aa9a3.mp4";

const WIZVID_LOGO =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizvid-logo-transparent_fcdb69d6.png";

/* ── timing map (seconds) — matched to V8 faster pacing ── */
const T = {
  /* Scene boundaries (3.2s each, 0.6s transitions) */
  SCENE1_END: 2.6,       // music video
  SCENE2_START: 2.6,     // cinematic film
  SCENE2_END: 5.2,
  SCENE3_START: 5.2,     // creator video
  SCENE3_END: 7.8,
  SCENE4_START: 7.8,     // animation
  SCENE4_END: 10.4,
  SCENE5_START: 10.4,    // logo reveal

  /* Logo + WizSound + CTA timing */
  LOGO_SHOW: 11.0,       // Logo appears with impact hit
  WIZSOUND_SHOW: 12.0,   // "Powered by WizSound™" with audio swell
  CTA_SHOW: 13.0,        // CTA button appears
  VIDEO_END: 17.0,       // 3.4s hold for absorption
};

/* ── genre labels — appear once per scene, faster timing ── */
const GENRE_LABELS: Array<{
  text: string;
  start: number;
  end: number;
  color: string;
}> = [
  { text: "Music Videos", start: 0.5, end: 2.3, color: "#f59e0b" },
  { text: "Cinematic Films", start: 3.0, end: 4.8, color: "#06b6d4" },
  { text: "Creator Content", start: 5.5, end: 7.3, color: "#f472b6" },
  { text: "Animation", start: 8.2, end: 10.0, color: "#34d399" },
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
  const [showWizSound, setShowWizSound] = useState(false);
  const [impactFired, setImpactFired] = useState(false);
  const [wizSoundPulse, setWizSoundPulse] = useState(false);

  /* ── video time sync loop ── */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const syncLoop = () => {
      const t = video.currentTime;
      setCurrentTime(t);

      if (t >= T.LOGO_SHOW && !showLogo) setShowLogo(true);
      if (t >= T.WIZSOUND_SHOW && !showWizSound) {
        setShowWizSound(true);
        setWizSoundPulse(true);
      }
      if (t >= T.CTA_SHOW && !showCTA) setShowCTA(true);
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
  }, [showLogo, showWizSound, showCTA, impactFired]);

  /* ── pause video at end for CTA hold ── */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handleEnd = () => {
      setShowCTA(true);
      setShowLogo(true);
      setShowWizSound(true);
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
    if (currentTime < start + 0.4) return (currentTime - start) / 0.4;
    if (currentTime > end - 0.4) return Math.max(0, (end - currentTime) / 0.4);
    return 1;
  };
  const labelTranslateY = (start: number, end: number) => {
    if (currentTime < start) return 25;
    if (currentTime < start + 0.4) return 25 * (1 - (currentTime - start) / 0.4);
    if (currentTime > end - 0.4) return -15 * (1 - (end - currentTime) / 0.4);
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
      {/* ── VIDEO ELEMENT ── */}
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
          transition: "opacity 0.6s ease",
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
              animation: "introSpin 1s linear infinite",
            }}
          />
          <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em" }}>
            Loading cinematic experience...
          </span>
        </div>
      )}

      {/* ── CINEMATIC LETTERBOX BARS ── */}
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

      {/* ── GENRE TEXT OVERLAYS ── */}
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
            background: "radial-gradient(circle at center, rgba(255,255,255,0.7) 0%, rgba(167,139,250,0.4) 25%, rgba(124,58,237,0.2) 50%, transparent 75%)",
            opacity: 0,
            animation: "introImpactFlash 1s ease-out forwards",
            pointerEvents: "none",
            zIndex: 11,
          }}
        />
      )}

      {/* ── WIZSOUND VISUAL PULSE ── */}
      {wizSoundPulse && (
        <>
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: 0,
              height: 0,
              transform: "translate(-50%, -50%)",
              borderRadius: "50%",
              border: "2px solid rgba(167,139,250,0.6)",
              boxShadow: "0 0 30px rgba(167,139,250,0.3), inset 0 0 30px rgba(167,139,250,0.1)",
              animation: "introWizSoundRing 1.5s ease-out forwards",
              pointerEvents: "none",
              zIndex: 12,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: 0,
              height: 0,
              transform: "translate(-50%, -50%)",
              borderRadius: "50%",
              border: "1px solid rgba(139,92,246,0.4)",
              animation: "introWizSoundRing 1.8s ease-out 0.2s forwards",
              pointerEvents: "none",
              zIndex: 12,
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "radial-gradient(circle at center, rgba(139,92,246,0.15) 0%, transparent 60%)",
              opacity: 0,
              animation: "introWizSoundPulse 0.8s ease-out forwards",
              pointerEvents: "none",
              zIndex: 12,
            }}
          />
        </>
      )}

      {/* ── LOGO + TAGLINE + WIZSOUND + CTA (final frame) ── */}
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
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: videoEnded
                ? "radial-gradient(ellipse at center, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.94) 100%)"
                : "radial-gradient(ellipse at center, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.65) 100%)",
              transition: "background 1s ease",
            }}
          />

          <img
            src={WIZVID_LOGO}
            alt="WizVid"
            style={{
              width: "clamp(200px, 28vw, 420px)",
              height: "auto",
              position: "relative",
              zIndex: 1,
              opacity: 0,
              transform: "scale(0.85)",
              animation: showLogo ? "introLogoReveal 1s cubic-bezier(0.16, 1, 0.3, 1) forwards" : "none",
              filter: "drop-shadow(0 0 60px rgba(167,139,250,0.8)) drop-shadow(0 0 120px rgba(124,58,237,0.5))",
            }}
          />

          {showLogo && (
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "-100%",
                width: "50%",
                height: "2px",
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent)",
                transform: "translateY(-50%)",
                animation: "introGlowSweep 1.2s ease-in-out 0.4s forwards",
                pointerEvents: "none",
                zIndex: 2,
              }}
            />
          )}

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
              opacity: showLogo ? 1 : 0,
              transform: `translateY(${showLogo ? "0" : "15px"})`,
              transition: "opacity 0.6s ease 0.4s, transform 0.6s ease 0.4s",
              textShadow: "0 2px 15px rgba(0,0,0,0.9)",
            }}
          >
            Cinematic AI Video Creation
          </p>

          <p
            style={{
              position: "relative",
              zIndex: 1,
              fontSize: "clamp(0.75rem, 1.2vw, 1rem)",
              color: "rgba(167,139,250,0.95)",
              marginTop: "0.8rem",
              letterSpacing: "0.15em",
              fontWeight: 500,
              opacity: showWizSound ? 1 : 0,
              transform: `translateY(${showWizSound ? "0" : "12px"}) scale(${showWizSound ? "1" : "0.95"})`,
              transition: "opacity 0.5s ease, transform 0.5s ease",
              textShadow: "0 0 30px rgba(167,139,250,0.6), 0 0 60px rgba(124,58,237,0.3)",
              animation: showWizSound ? "introWizSoundTextGlow 2s ease-in-out infinite alternate" : "none",
            }}
          >
            Powered by WizSound™ &middot; Cinematic Spatial Audio
          </p>

          {videoEnded && (
            <button
              onClick={handleEnter}
              aria-label="Start Creating Your Video"
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
                animation: "introCtaAppear 0.6s ease forwards 0.2s",
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
              Start Creating Your Video &rarr;
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
          Skip &rarr;
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
            animation: "introFadeInUp 0.5s ease forwards",
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
        @keyframes introSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes introImpactFlash {
          0% { opacity: 0; }
          10% { opacity: 1; }
          30% { opacity: 0.5; }
          100% { opacity: 0; }
        }
        @keyframes introLogoReveal {
          0% { opacity: 0; transform: scale(0.85); }
          60% { opacity: 1; transform: scale(1.02); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes introGlowSweep {
          0% { left: -50%; opacity: 0; }
          20% { opacity: 1; }
          100% { left: 150%; opacity: 0; }
        }
        @keyframes introCtaAppear {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes introFadeInUp {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes introWizSoundRing {
          0% { width: 0; height: 0; opacity: 1; }
          100% { width: 80vw; height: 80vw; opacity: 0; }
        }
        @keyframes introWizSoundPulse {
          0% { opacity: 0; }
          20% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes introWizSoundTextGlow {
          0% { text-shadow: 0 0 30px rgba(167,139,250,0.6), 0 0 60px rgba(124,58,237,0.3); }
          100% { text-shadow: 0 0 50px rgba(167,139,250,0.9), 0 0 100px rgba(124,58,237,0.5), 0 0 150px rgba(139,92,246,0.2); }
        }
      `}</style>
    </div>
  );
}
