/**
 * CinematicIntroSequence V10.1 — Audio Reliability Fix
 *
 * KEY CHANGE from V10: The soundtrack is now played via a SEPARATE Audio() element,
 * completely decoupled from the <video> element. This avoids the Web Audio API
 * createMediaElementSource() trap where the video's audio output is permanently
 * hijacked by the AudioContext graph, causing silence if the context is suspended.
 *
 * Audio architecture:
 *   <video>  → purely visual (muted permanently, no audio track used)
 *   Audio()  → soundtrack playback (native browser audio, unmuted on click)
 *   Web Audio API (optional) → stereo panner on the Audio() element for WizSound sweep
 *
 * This guarantees audio plays via the native browser path regardless of AudioContext state.
 *
 * SCENE ORDER:
 *   0.0–3.5s   → Concert arena (Music Videos)
 *   3.5–9.5s   → Epic city hero SLOW-MO (Cinematic Films) ← HERO MOMENT
 *   9.5–13.5s  → Creator studio (Creator Content)
 *   13.5–20.0s → Logo reveal + WizSound + CTA hold
 */
import { useRef, useState, useEffect, useCallback } from "react";

const INTRO_VIDEO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/v10-intro-final_825d36e4.mp4";

// WizSound™ cinematic audio track — same as used in the A/B demo section
const WIZSOUND_AUDIO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/demo-wizsound-cinematic_5e57de05.mp3";

const WIZVID_LOGO =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizvid-logo-transparent_fcdb69d6.png";

/* ── timing map (seconds) ── */
const T = {
  SCENE1_END: 3.5,
  SCENE2_START: 3.5,
  SCENE2_END: 9.5,
  SCENE3_START: 9.5,
  SCENE3_END: 13.5,
  HERO_ZOOM_START: 3.5,
  HERO_ZOOM_PEAK: 6.5,
  LOGO_SHOW: 13.8,
  WIZSOUND_SHOW: 15.0,
  CTA_SHOW: 16.2,
  VIDEO_END: 20.25,
};

/* ── genre labels ── */
const GENRE_LABELS = [
  { text: "Your Music Videos",    subtext: "Stadium-scale. AI-powered.",            start: 0.5,  end: 3.0,  color: "#f59e0b" },
  { text: "Your Cinematic Films", subtext: "Blockbuster quality. No crew needed.",  start: 4.0,  end: 8.8,  color: "#06b6d4" },
  { text: "Your Creator Content", subtext: "Scroll-stopping. Every time.",          start: 10.0, end: 13.0, color: "#f472b6" },
];

interface Props {
  onComplete: () => void;
}

export default function CinematicIntroSequence({ onComplete }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number>(0);
  const wizSoundStartedRef = useRef(false);

  const [currentTime, setCurrentTime] = useState(0);
  const [videoReady, setVideoReady] = useState(false);
  // Audio starts ON by default — user can mute if they wish
  const [muted, setMuted] = useState(false);
  const [showCTA, setShowCTA] = useState(false);
  const [showLogo, setShowLogo] = useState(false);
  const [showWizSound, setShowWizSound] = useState(false);
  const [impactFired, setImpactFired] = useState(false);
  const [wizSoundPulse, setWizSoundPulse] = useState(false);
  const [heroZoom, setHeroZoom] = useState(false);

  /* ── Create WizSound™ Audio element on mount and autoplay it ── */
  useEffect(() => {
    const audio = new Audio(WIZSOUND_AUDIO_URL);
    audio.preload = "auto";
    audio.loop = true;
    audio.volume = 1.0;
    audioRef.current = audio;

    // Attempt autoplay — works after any prior user interaction on the page
    const tryPlay = () => {
      audio.play().catch(() => {
        // Autoplay blocked by browser — show Unmute button
        setMuted(true);
      });
    };

    if (audio.readyState >= 2) {
      tryPlay();
    } else {
      audio.addEventListener("canplay", tryPlay, { once: true });
    }

    return () => {
      audio.pause();
      audio.src = "";
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── No Web Audio API used ── */
  const initWizSoundStereo = useCallback(async () => {
    // Intentionally empty — stereo widening is visual-only via CSS animation
  }, []);

  /* ── Trigger WizSound visual effect (CSS-only) ── */
  const triggerWizSoundStereo = useCallback(() => {
    if (wizSoundStartedRef.current) return;
    wizSoundStartedRef.current = true;
    // Visual pulse only — no Web Audio
  }, []);

  /* ── Video time sync loop ── */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const syncLoop = () => {
      const t = video.currentTime;
      setCurrentTime(t);

      if (t >= T.HERO_ZOOM_START && t <= T.SCENE2_END && !heroZoom) setHeroZoom(true);
      else if ((t < T.HERO_ZOOM_START || t > T.SCENE2_END) && heroZoom) setHeroZoom(false);

      if (t >= T.LOGO_SHOW && !showLogo) setShowLogo(true);

      if (t >= T.WIZSOUND_SHOW && !showWizSound) {
        setShowWizSound(true);
        setWizSoundPulse(true);
        triggerWizSoundStereo();
      }

      if (t >= T.CTA_SHOW && !showCTA) setShowCTA(true);
      if (t >= T.LOGO_SHOW - 0.2 && t <= T.LOGO_SHOW + 0.5 && !impactFired) setImpactFired(true);

      if (!video.paused && !video.ended) {
        rafRef.current = requestAnimationFrame(syncLoop);
      }
    };

    const onPlay = () => { rafRef.current = requestAnimationFrame(syncLoop); };
    const onTimeUpdate = () => setCurrentTime(video.currentTime);

    video.addEventListener("play", onPlay);
    video.addEventListener("timeupdate", onTimeUpdate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("timeupdate", onTimeUpdate);
    };
  }, [showLogo, showWizSound, showCTA, impactFired, heroZoom, triggerWizSoundStereo]);

  /* ── End of video ── */
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

  /* ── Toggle mute — controls the WizSound™ Audio element ── */
  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const next = !muted;
    if (next) {
      audio.volume = 0;
    } else {
      audio.volume = 1.0;
      // If autoplay was blocked, try playing now (user gesture unlocks it)
      if (audio.paused) {
        audio.play().catch(() => {});
      }
    }
    setMuted(next);
  }, [muted]);

  /* ── Click anywhere: unmute if muted ── */
  const handleInteraction = useCallback(() => {
    if (!muted) return;
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 1.0;
    if (audio.paused) audio.play().catch(() => {});
    setMuted(false);
  }, [muted]);

  /* ── Skip ── */
  const handleSkip = useCallback(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (video) video.pause();
    if (audio) { audio.pause(); audio.src = ""; }
    cancelAnimationFrame(rafRef.current);
    onComplete();
  }, [onComplete]);

  const handleEnter = useCallback(() => handleSkip(), [handleSkip]);

  /* ── Keyboard ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleSkip();
      if (e.key === "m" || e.key === "M") toggleMute();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleSkip, toggleMute]);

  /* ── Label helpers ── */
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

  const heroZoomScale = () => {
    if (currentTime < T.HERO_ZOOM_START) return 1;
    const progress = Math.min(1, (currentTime - T.HERO_ZOOM_START) / (T.HERO_ZOOM_PEAK - T.HERO_ZOOM_START));
    const eased = 1 - Math.pow(1 - progress, 3);
    return 1 + eased * 0.12;
  };

  const videoEnded = currentTime >= T.VIDEO_END - 0.5 || showCTA;

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "#000",
        overflow: "hidden",
        cursor: "default",
      }}
    >
      {/* ── VIDEO — always muted (visual only); WizSound™ audio plays via separate Audio element ── */}
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
          transform: `scale(${heroZoom ? heroZoomScale() : 1})`,
          transformOrigin: "center center",
          transitionProperty: heroZoom ? "opacity" : "opacity, transform",
          transitionDuration: heroZoom ? "0.6s, 3s" : "0.6s, 0.8s",
          transitionTimingFunction: "ease, cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      />

      {/* ── LOADING ── */}
      {!videoReady && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem" }}>
          <div style={{ width: 48, height: 48, border: "3px solid rgba(255,255,255,0.1)", borderTopColor: "#a78bfa", borderRadius: "50%", animation: "introSpin 1s linear infinite" }} />
          <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em" }}>Loading cinematic experience...</span>
        </div>
      )}

      {/* ── LETTERBOX BARS ── */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "6%", background: "linear-gradient(to bottom, rgba(0,0,0,0.75), transparent)", pointerEvents: "none", zIndex: 5 }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "6%", background: "linear-gradient(to top, rgba(0,0,0,0.75), transparent)", pointerEvents: "none", zIndex: 5 }} />

      {/* ── HERO VIGNETTE ── */}
      {heroZoom && (
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.5) 100%)",
          pointerEvents: "none", zIndex: 6,
          opacity: Math.min(1, (currentTime - T.HERO_ZOOM_START) / 1.5),
          transition: "opacity 0.3s ease",
        }} />
      )}

      {/* ── GENRE LABELS ── */}
      {GENRE_LABELS.map((label) => (
        <div
          key={label.text}
          style={{
            position: "absolute", left: "50%", top: "50%",
            transform: `translate(-50%, -50%) translateY(${labelTranslateY(label.start, label.end)}px)`,
            opacity: labelOpacity(label.start, label.end),
            pointerEvents: "none", zIndex: 10, textAlign: "center",
          }}
        >
          <span style={{
            display: "block",
            fontSize: "clamp(2rem, 5vw, 5rem)", fontWeight: 800, color: "#fff",
            textShadow: `0 0 40px ${label.color}, 0 0 80px ${label.color}80, 0 0 120px ${label.color}40, 0 4px 20px rgba(0,0,0,0.9)`,
            letterSpacing: "0.12em", fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
            textTransform: "uppercase", lineHeight: 1.1,
          }}>{label.text}</span>
          <span style={{
            display: "block", fontSize: "clamp(0.85rem, 1.5vw, 1.2rem)", fontWeight: 400,
            color: "rgba(255,255,255,0.75)", letterSpacing: "0.18em", marginTop: "0.5rem",
            textTransform: "uppercase", textShadow: "0 2px 12px rgba(0,0,0,0.8)",
          }}>{label.subtext}</span>
        </div>
      ))}

      {/* ── IMPACT FLASH ── */}
      {impactFired && (
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(circle at center, rgba(255,255,255,0.75) 0%, rgba(167,139,250,0.45) 25%, rgba(124,58,237,0.2) 50%, transparent 75%)",
          opacity: 0, animation: "introImpactFlash 1.2s ease-out forwards",
          pointerEvents: "none", zIndex: 11,
        }} />
      )}

      {/* ── WIZSOUND VISUAL PULSE ── */}
      {wizSoundPulse && (
        <>
          <div style={{ position: "absolute", left: "20%", top: "50%", width: 0, height: 0, transform: "translate(-50%, -50%)", borderRadius: "50%", border: "2px solid rgba(167,139,250,0.7)", animation: "introWizSoundRingLeft 2s ease-out forwards", pointerEvents: "none", zIndex: 12 }} />
          <div style={{ position: "absolute", right: "20%", top: "50%", width: 0, height: 0, transform: "translate(50%, -50%)", borderRadius: "50%", border: "2px solid rgba(139,92,246,0.6)", animation: "introWizSoundRingRight 2s ease-out 0.15s forwards", pointerEvents: "none", zIndex: 12 }} />
          <div style={{ position: "absolute", left: "50%", top: "50%", width: 0, height: 0, transform: "translate(-50%, -50%)", borderRadius: "50%", border: "1.5px solid rgba(196,181,253,0.5)", animation: "introWizSoundRing 2.5s ease-out 0.3s forwards", pointerEvents: "none", zIndex: 12 }} />
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 120% 60% at center, rgba(139,92,246,0.18) 0%, transparent 70%)", opacity: 0, animation: "introWizSoundPulse 1.2s ease-out forwards", pointerEvents: "none", zIndex: 12 }} />
        </>
      )}

      {/* ── LOGO + TAGLINE + WIZSOUND + CTA ── */}
      {showLogo && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 20, pointerEvents: videoEnded ? "auto" : "none" }}>
          <div style={{
            position: "absolute", inset: 0,
            background: videoEnded
              ? "radial-gradient(ellipse at center, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.96) 100%)"
              : "radial-gradient(ellipse at center, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0.68) 100%)",
            transition: "background 1.2s ease",
          }} />

          <img
            src={WIZVID_LOGO}
            alt="WizVid"
            style={{
              width: "clamp(220px, 30vw, 460px)", height: "auto",
              position: "relative", zIndex: 1,
              opacity: 0, transform: "scale(0.85)",
              animation: "introLogoReveal 1s cubic-bezier(0.16, 1, 0.3, 1) forwards",
              filter: "drop-shadow(0 0 70px rgba(167,139,250,0.9)) drop-shadow(0 0 140px rgba(124,58,237,0.55))",
            }}
          />

          {/* Glow sweep */}
          <div style={{
            position: "absolute", top: "50%", left: "-100%", width: "50%", height: "2px",
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.95), transparent)",
            transform: "translateY(-50%)",
            animation: "introGlowSweep 1.4s ease-in-out 0.3s forwards",
            pointerEvents: "none", zIndex: 2,
          }} />

          <p style={{
            position: "relative", zIndex: 1,
            fontSize: "clamp(0.9rem, 1.8vw, 1.4rem)", color: "rgba(255,255,255,0.92)",
            marginTop: "1.5rem", letterSpacing: "0.2em", fontWeight: 300,
            textTransform: "uppercase",
            opacity: showLogo ? 1 : 0,
            transform: `translateY(${showLogo ? "0" : "15px"})`,
            transition: "opacity 0.7s ease 0.35s, transform 0.7s ease 0.35s",
            textShadow: "0 2px 15px rgba(0,0,0,0.9)",
          }}>Create Anything. Cinematic Quality.</p>

          {/* WizSound label */}
          <div style={{
            position: "relative", zIndex: 1, marginTop: "0.9rem",
            display: "flex", alignItems: "center", gap: "0.6rem",
            opacity: showWizSound ? 1 : 0,
            transform: `translateY(${showWizSound ? "0" : "12px"}) scale(${showWizSound ? "1" : "0.95"})`,
            transition: "opacity 0.5s ease, transform 0.5s ease",
          }}>
            <div style={{ display: "flex", gap: "2px", alignItems: "center" }}>
              {[0.4, 0.7, 1.0, 0.7, 0.4].map((h, i) => (
                <div key={i} style={{ width: 3, height: `${h * 16}px`, background: "rgba(167,139,250,0.7)", borderRadius: 2, animation: showWizSound ? `introAudioBar${i} 0.6s ease-in-out ${i * 0.08}s infinite alternate` : "none" }} />
              ))}
            </div>
            <p style={{
              fontSize: "clamp(0.75rem, 1.2vw, 1rem)", color: "rgba(167,139,250,0.97)",
              letterSpacing: "0.15em", fontWeight: 500,
              textShadow: "0 0 30px rgba(167,139,250,0.7), 0 0 60px rgba(124,58,237,0.35)",
              animation: showWizSound ? "introWizSoundTextGlow 2s ease-in-out infinite alternate" : "none",
              margin: 0,
            }}>Powered by WizSound™ &middot; Spatial Cinematic Audio</p>
            <div style={{ display: "flex", gap: "2px", alignItems: "center" }}>
              {[0.4, 0.7, 1.0, 0.7, 0.4].map((h, i) => (
                <div key={i} style={{ width: 3, height: `${h * 16}px`, background: "rgba(167,139,250,0.7)", borderRadius: 2, animation: showWizSound ? `introAudioBar${4 - i} 0.6s ease-in-out ${i * 0.08}s infinite alternate` : "none" }} />
              ))}
            </div>
          </div>

          {/* CTA */}
          {videoEnded && (
            <button
              onClick={handleEnter}
              aria-label="Create Your First Cinematic Video"
              style={{
                position: "relative", zIndex: 1, marginTop: "2.5rem",
                padding: "1rem 3rem",
                fontSize: "clamp(1rem, 1.5vw, 1.2rem)", fontWeight: 600, color: "#fff",
                background: "linear-gradient(135deg, #7c3aed 0%, #a78bfa 50%, #7c3aed 100%)",
                backgroundSize: "200% 200%",
                border: "1px solid rgba(167,139,250,0.4)", borderRadius: "9999px",
                cursor: "pointer", letterSpacing: "0.06em",
                boxShadow: "0 0 40px rgba(124,58,237,0.55), 0 0 80px rgba(124,58,237,0.28), inset 0 1px 0 rgba(255,255,255,0.15)",
                opacity: 0, transform: "translateY(20px)",
                animation: "introCtaAppear 0.7s ease forwards 0.2s",
              }}
              onMouseEnter={(e) => { const b = e.currentTarget; b.style.boxShadow = "0 0 60px rgba(124,58,237,0.75), 0 0 120px rgba(124,58,237,0.4), inset 0 1px 0 rgba(255,255,255,0.2)"; b.style.transform = "translateY(0) scale(1.04)"; }}
              onMouseLeave={(e) => { const b = e.currentTarget; b.style.boxShadow = "0 0 40px rgba(124,58,237,0.55), 0 0 80px rgba(124,58,237,0.28), inset 0 1px 0 rgba(255,255,255,0.15)"; b.style.transform = "translateY(0) scale(1)"; }}
            >
              Create Your First Cinematic Video &rarr;
            </button>
          )}
        </div>
      )}

      {/* ── SKIP BUTTON ── */}
      {!videoEnded && (
        <button
          onClick={(e) => { e.stopPropagation(); handleSkip(); }}
          aria-label="Skip intro"
          style={{
            position: "absolute", top: "1.5rem", right: "1.5rem", zIndex: 100,
            padding: "0.5rem 1.25rem", fontSize: "0.8rem", fontWeight: 500,
            color: "rgba(255,255,255,0.6)", background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)", borderRadius: "9999px",
            cursor: "pointer", backdropFilter: "blur(12px)", transition: "all 0.2s ease",
            letterSpacing: "0.04em",
          }}
          onMouseEnter={(e) => { const b = e.currentTarget; b.style.color = "#fff"; b.style.background = "rgba(255,255,255,0.12)"; b.style.borderColor = "rgba(255,255,255,0.2)"; }}
          onMouseLeave={(e) => { const b = e.currentTarget; b.style.color = "rgba(255,255,255,0.6)"; b.style.background = "rgba(255,255,255,0.06)"; b.style.borderColor = "rgba(255,255,255,0.1)"; }}
        >
          Skip &rarr;
        </button>
      )}

      {/* ── CLICK TO UNMUTE HINT ── */}
      {/* Mute/unmute button — always visible, bottom-right corner */}
      {videoReady && !videoEnded && (
        <button
          onClick={(e) => { e.stopPropagation(); toggleMute(); }}
          aria-label={muted ? "Unmute audio" : "Mute audio"}
          style={{
            position: "absolute", bottom: "2.5rem", right: "1.5rem", zIndex: 100,
            display: "flex", alignItems: "center", gap: "0.4rem",
            padding: "0.45rem 1rem",
            background: "rgba(0,0,0,0.5)", borderRadius: "9999px",
            border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(12px)",
            cursor: "pointer", color: "rgba(255,255,255,0.75)",
            fontSize: "0.75rem", letterSpacing: "0.04em",
            transition: "all 0.2s ease",
            animation: "introFadeInUp 0.5s ease forwards",
          }}
          onMouseEnter={(e) => { const b = e.currentTarget; b.style.background = "rgba(0,0,0,0.7)"; b.style.borderColor = "rgba(255,255,255,0.25)"; b.style.color = "#fff"; }}
          onMouseLeave={(e) => { const b = e.currentTarget; b.style.background = "rgba(0,0,0,0.5)"; b.style.borderColor = "rgba(255,255,255,0.12)"; b.style.color = "rgba(255,255,255,0.75)"; }}
        >
          {muted ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
              <span>Unmute</span>
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(167,139,250,0.9)" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
              <span style={{ color: "rgba(167,139,250,0.9)" }}>WizSound™</span>
            </>
          )}
        </button>
      )}

      {/* ── PROGRESS BAR ── */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, height: 2,
        width: `${Math.min(100, (currentTime / T.VIDEO_END) * 100)}%`,
        background: "linear-gradient(90deg, #7c3aed, #a78bfa, #c4b5fd)",
        zIndex: 25, transition: "width 0.15s linear",
        boxShadow: "0 0 12px rgba(124,58,237,0.6)",
      }} />

      {/* ── KEYFRAME ANIMATIONS ── */}
      <style>{`
        @keyframes introSpin { to { transform: rotate(360deg); } }
        @keyframes introImpactFlash { 0% { opacity: 0; } 8% { opacity: 1; } 25% { opacity: 0.6; } 100% { opacity: 0; } }
        @keyframes introLogoReveal { 0% { opacity: 0; transform: scale(0.85); } 60% { opacity: 1; transform: scale(1.03); } 100% { opacity: 1; transform: scale(1); } }
        @keyframes introGlowSweep { 0% { left: -50%; opacity: 0; } 20% { opacity: 1; } 100% { left: 150%; opacity: 0; } }
        @keyframes introCtaAppear { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes introFadeInUp { from { opacity: 0; transform: translateX(-50%) translateY(10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        @keyframes introWizSoundRing { 0% { width: 0; height: 0; opacity: 1; } 100% { width: 90vw; height: 90vw; opacity: 0; } }
        @keyframes introWizSoundRingLeft { 0% { width: 0; height: 0; opacity: 1; } 100% { width: 70vw; height: 70vw; opacity: 0; } }
        @keyframes introWizSoundRingRight { 0% { width: 0; height: 0; opacity: 1; } 100% { width: 70vw; height: 70vw; opacity: 0; } }
        @keyframes introWizSoundPulse { 0% { opacity: 0; } 20% { opacity: 1; } 100% { opacity: 0; } }
        @keyframes introWizSoundTextGlow {
          0% { text-shadow: 0 0 30px rgba(167,139,250,0.6), 0 0 60px rgba(124,58,237,0.3); }
          100% { text-shadow: 0 0 55px rgba(167,139,250,0.95), 0 0 110px rgba(124,58,237,0.55), 0 0 160px rgba(139,92,246,0.25); }
        }
        @keyframes introAudioBar0 { from { transform: scaleY(0.4); } to { transform: scaleY(1.0); } }
        @keyframes introAudioBar1 { from { transform: scaleY(0.6); } to { transform: scaleY(1.2); } }
        @keyframes introAudioBar2 { from { transform: scaleY(0.8); } to { transform: scaleY(1.4); } }
        @keyframes introAudioBar3 { from { transform: scaleY(0.5); } to { transform: scaleY(1.1); } }
        @keyframes introAudioBar4 { from { transform: scaleY(0.3); } to { transform: scaleY(0.9); } }
      `}</style>
    </div>
  );
}
