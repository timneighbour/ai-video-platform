import { useEffect, useRef, useState, useCallback } from "react";

/* ── Asset URLs ──────────────────────────────────────────────────────────── */
const CDN = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx";

const LOGO_URL  = `${CDN}/wizvid-logo-transparent_fcdb69d6.png`;
const AUDIO_URL = `${CDN}/wizvid_cinema_sting_afce8fbc.mp3`;

// Cinematic clip images — 3 carefully chosen frames
const CLIP_CINEMA  = `${CDN}/style-cinematic-UvoChSsK7xZ9a7MR2bUHeq.webp`;
const CLIP_PIXAR   = `${CDN}/style-pixar3d-eN2z5fKQJJTuTc3Ghd84dV.webp`;
const CLIP_MUSIC   = `${CDN}/whos-it-for-musicians-ezcSAGNTzuKKxG5kyRC8bK.webp`;

// Background for logo reveal
const BG_POSTER = `${CDN}/wizvid-intro-bg-4k-S9fuvpjGgLio3Y2rzSEUfh.webp`;

export const INTRO_SESSION_KEY = "wizvid_intro_seen";

interface Props {
  onComplete: () => void;
}

/**
 * CinematicEntryScreen — Premium cinematic welcome experience.
 *
 * Stage 0 (0–800ms):      Black screen + subtle glow pulse
 * Stage 1 (800–4000ms):   3 cinematic clips, each 1s with 300ms cross-fade
 * Stage 2 (4000–5800ms):  Genre text — MUSIC VIDEOS / CINEMATIC FILMS / PIXAR ANIMATION (fade in/out)
 * Stage 3 (5800ms+):      Logo reveal — slow bloom, WizSound™, "Enter Site →" CTA
 *
 * Total: ~7 seconds before user can click CTA.
 * NO auto-dismiss — user must click "Enter Site →".
 */
export default function CinematicEntryScreen({ onComplete }: Props) {
  // Stage
  const [stage, setStage] = useState<0 | 1 | 2 | 3>(0);

  // Clip state
  const [clipIndex, setClipIndex] = useState(0);
  const [clipVisible, setClipVisible] = useState(false);

  // Category text state
  const [catIndex, setCatIndex] = useState(0);
  const [catVisible, setCatVisible] = useState(false);

  // Logo reveal
  const [logoVisible, setLogoVisible] = useState(false);
  const [wizsoundVisible, setWizsoundVisible] = useState(false);
  const [ctaVisible, setCtaVisible] = useState(false);

  // Audio
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [soundButtonVisible, setSoundButtonVisible] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUnlockedRef = useRef(false);

  // Exit
  const [exiting, setExiting] = useState(false);
  const exitingRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const addTimer = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timersRef.current.push(t);
    return t;
  }, []);

  /* ── Preload images + pre-create audio element ──────────────────────── */
  useEffect(() => {
    [CLIP_CINEMA, CLIP_PIXAR, CLIP_MUSIC, BG_POSTER, LOGO_URL].forEach((src) => {
      const img = new Image();
      img.src = src;
    });
    // Pre-create audio element so it's ready to play on user click
    const audio = new Audio(AUDIO_URL);
    audio.preload = "auto";
    audio.volume = 0;
    audio.muted = true;
    audioRef.current = audio;
    // Attempt silent load to prime the audio context
    audio.load();
  }, []);

  /* ── Unlock audio on first any-click (browser autoplay policy) ───────── */
  useEffect(() => {
    const unlock = () => {
      if (audioUnlockedRef.current) return;
      audioUnlockedRef.current = true;
      const audio = audioRef.current;
      if (!audio) return;
      // Play silently to unlock the audio context, then immediately pause
      audio.muted = true;
      audio.play().then(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.muted = false;
      }).catch(() => {});
    };
    window.addEventListener("click", unlock, { once: true });
    window.addEventListener("touchstart", unlock, { once: true });
    return () => {
      window.removeEventListener("click", unlock);
      window.removeEventListener("touchstart", unlock);
    };
  }, []);

  /* ── Master timeline ─────────────────────────────────────────────────── */
  useEffect(() => {
    // ── Stage 0: black glow (0–800ms) ──
    // Nothing to do — black screen with CSS glow pulse

    // ── Stage 1: cinematic clips ──
    // Clip 1 (800ms): cinematic film
    addTimer(() => {
      setStage(1);
      setClipIndex(0);
      setClipVisible(true);
    }, 800);

    // Clip 2 (2100ms): Pixar animation — fade out clip 1, fade in clip 2
    addTimer(() => setClipVisible(false), 1900);
    addTimer(() => {
      setClipIndex(1);
      setClipVisible(true);
    }, 2100);

    // Clip 3 (3400ms): music video — fade out clip 2, fade in clip 3
    addTimer(() => setClipVisible(false), 3200);
    addTimer(() => {
      setClipIndex(2);
      setClipVisible(true);
    }, 3400);

    // ── Stage 2: genre text (4000ms) ──
    addTimer(() => setClipVisible(false), 3900);
    addTimer(() => {
      setStage(2);
      setCatIndex(0);
      setCatVisible(true);
    }, 4100);

    // MUSIC VIDEOS → fade out
    addTimer(() => setCatVisible(false), 4700);
    // CINEMATIC FILMS → fade in
    addTimer(() => { setCatIndex(1); setCatVisible(true); }, 4950);
    // → fade out
    addTimer(() => setCatVisible(false), 5500);
    // PIXAR ANIMATION → fade in
    addTimer(() => { setCatIndex(2); setCatVisible(true); }, 5700);
    // → fade out
    addTimer(() => setCatVisible(false), 6200);

    // ── Stage 3: logo reveal (6400ms) ──
    addTimer(() => {
      setStage(3);
      setSoundButtonVisible(true);
    }, 6400);
    addTimer(() => setLogoVisible(true), 6600);
    addTimer(() => setWizsoundVisible(true), 7200);
    addTimer(() => setCtaVisible(true), 7800);

    // NO auto-dismiss — user must click CTA

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Sound ───────────────────────────────────────────────────────────── */
  const enableSound = useCallback(() => {
    if (soundEnabled) return;
    setSoundEnabled(true);
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = false;
    audio.volume = 0;
    audio.currentTime = 0;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Fallback: create a fresh Audio element (some browsers need this)
        const freshAudio = new Audio(AUDIO_URL);
        freshAudio.volume = 0;
        audioRef.current = freshAudio;
        freshAudio.play().catch(() => {});
        // Fade in fresh audio
        let v = 0;
        const fi = setInterval(() => {
          v = Math.min(0.9, v + 0.06);
          freshAudio.volume = v;
          if (v >= 0.9) clearInterval(fi);
        }, 50);
      });
    }
    // Fade in
    let vol = 0;
    const fadeIn = setInterval(() => {
      const a = audioRef.current;
      if (!a) { clearInterval(fadeIn); return; }
      vol = Math.min(0.9, vol + 0.06);
      a.volume = vol;
      if (vol >= 0.9) clearInterval(fadeIn);
    }, 50);
  }, [soundEnabled]);

  /* ── Keyboard skip (only at logo stage) ─────────────────────────────── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === "Escape" || e.key === "Enter") && stage === 3 && ctaVisible) {
        e.preventDefault();
        dismiss();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [stage, ctaVisible]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Dismiss ─────────────────────────────────────────────────────────── */
  const dismiss = useCallback(() => {
    if (exitingRef.current) return;
    exitingRef.current = true;
    timersRef.current.forEach(clearTimeout);
    if (audioRef.current) {
      const audio = audioRef.current;
      const fade = setInterval(() => {
        if (audio.volume > 0.06) audio.volume = Math.max(0, audio.volume - 0.08);
        else { audio.pause(); clearInterval(fade); }
      }, 40);
    }
    setExiting(true);
    try { sessionStorage.setItem(INTRO_SESSION_KEY, "true"); } catch { /* noop */ }
    setTimeout(onComplete, 800);
  }, [onComplete]);

  const CLIPS = [
    { src: CLIP_CINEMA, label: "CINEMATIC FILM" },
    { src: CLIP_PIXAR,  label: "PIXAR ANIMATION" },
    { src: CLIP_MUSIC,  label: "MUSIC VIDEO" },
  ];
  const CATS = ["MUSIC VIDEOS", "CINEMATIC FILMS", "PIXAR ANIMATION"];

  const currentClip = CLIPS[clipIndex];
  const currentCat  = CATS[catIndex];

  return (
    <div
      className="fixed inset-0 overflow-hidden select-none"
      style={{
        zIndex: 9999,
        background: "#000",
        opacity: exiting ? 0 : 1,
        transition: "opacity 800ms cubic-bezier(0.4, 0, 0.2, 1)",
        pointerEvents: exiting ? "none" : "auto",
      }}
      role="dialog"
      aria-modal="true"
      aria-label="WizVid cinematic intro"
    >
      {/* ── ANAMORPHIC LETTERBOX ─────────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 bg-black pointer-events-none" style={{ height: "5.5vh", zIndex: 60 }} />
      <div className="absolute bottom-0 left-0 right-0 bg-black pointer-events-none" style={{ height: "5.5vh", zIndex: 60 }} />

      {/* ── STAGE 0: OPENING GLOW ────────────────────────────────────────── */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          zIndex: 2,
          opacity: stage === 0 ? 1 : 0,
          transition: "opacity 600ms ease-out",
        }}
      >
        {/* Subtle radial glow pulse */}
        <div
          style={{
            width: 320,
            height: 320,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(109,40,217,0.18) 0%, transparent 70%)",
            animation: "glowPulse 1.2s ease-in-out infinite alternate",
          }}
        />
      </div>

      {/* ── STAGE 1: CINEMATIC CLIPS ─────────────────────────────────────── */}
      <div
        className="absolute inset-0"
        style={{
          zIndex: 5,
          opacity: stage === 1 ? 1 : 0,
          transition: stage === 1 ? "opacity 500ms ease-in" : "opacity 400ms ease-out",
        }}
      >
        {/* Clip image with smooth cross-fade */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${currentClip.src})`,
            opacity: clipVisible ? 1 : 0,
            transition: "opacity 300ms ease-in-out",
            filter: "brightness(0.72) saturate(1.2)",
          }}
        />
        {/* Cinematic gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />
        {/* Vignette */}
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 35%, rgba(0,0,0,0.72) 100%)" }} />
        {/* Subtle purple bloom */}
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 30% 60%, rgba(109,40,217,0.12) 0%, transparent 60%)" }} />

        {/* Clip label — bottom left */}
        <div
          className="absolute bottom-[8vh] left-8 text-white/55 font-mono text-xs tracking-[0.3em] uppercase"
          style={{ opacity: clipVisible ? 1 : 0, transition: "opacity 300ms ease" }}
        >
          {currentClip.label}
        </div>
        {/* Frame counter — top right */}
        <div className="absolute top-[8vh] right-8 text-white/25 font-mono text-xs tracking-widest">
          {String(clipIndex + 1).padStart(2, "0")} / 03
        </div>
      </div>

      {/* ── STAGE 2: GENRE TEXT ──────────────────────────────────────────── */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          zIndex: 10,
          opacity: stage === 2 ? 1 : 0,
          transition: stage === 2 ? "opacity 400ms ease-in" : "opacity 400ms ease-out",
          background: "radial-gradient(ellipse at 50% 50%, rgba(88,28,235,0.18) 0%, #000 65%)",
        }}
      >
        {/* Subtle particle shimmer */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: "radial-gradient(circle at 20% 80%, rgba(139,92,246,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(217,70,239,0.06) 0%, transparent 50%)",
        }} />

        <div
          style={{
            opacity: catVisible ? 1 : 0,
            transform: catVisible ? "scale(1) translateY(0)" : "scale(0.96) translateY(8px)",
            transition: "opacity 350ms ease, transform 350ms ease",
            textAlign: "center",
          }}
        >
          {/* Genre word */}
          <div
            style={{
              fontSize: "clamp(2.8rem, 8vw, 5.5rem)",
              fontWeight: 900,
              letterSpacing: "0.12em",
              fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
              background: "linear-gradient(135deg, #e9d5ff 0%, #a855f7 40%, #ec4899 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              lineHeight: 1.1,
              textShadow: "none",
              filter: "drop-shadow(0 0 40px rgba(168,85,247,0.55))",
            }}
          >
            {currentCat}
          </div>
          {/* Underline glow bar */}
          <div
            style={{
              height: 3,
              marginTop: 16,
              background: "linear-gradient(90deg, transparent, rgba(168,85,247,0.8), rgba(236,72,153,0.8), transparent)",
              borderRadius: 2,
              opacity: catVisible ? 1 : 0,
              transition: "opacity 400ms ease 150ms",
            }}
          />
        </div>
      </div>

      {/* ── STAGE 3: LOGO REVEAL ─────────────────────────────────────────── */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{
          zIndex: 15,
          opacity: stage === 3 ? 1 : 0,
          transition: stage === 3 ? "opacity 700ms ease-in" : "opacity 300ms ease-out",
        }}
      >
        {/* Background: dark purple bloom */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${BG_POSTER})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "brightness(0.18) saturate(1.4)",
          }}
        />
        {/* Radial bloom overlay */}
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse at 50% 45%, rgba(109,40,217,0.35) 0%, rgba(0,0,0,0.9) 65%)",
        }} />
        {/* Subtle particles */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: "radial-gradient(circle at 15% 85%, rgba(139,92,246,0.12) 0%, transparent 40%), radial-gradient(circle at 85% 15%, rgba(217,70,239,0.08) 0%, transparent 40%)",
        }} />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center gap-6 px-8 text-center">
          {/* Logo */}
          <div
            style={{
              opacity: logoVisible ? 1 : 0,
              transform: logoVisible ? "scale(1) translateY(0)" : "scale(0.88) translateY(20px)",
              transition: "opacity 900ms cubic-bezier(0.16, 1, 0.3, 1), transform 900ms cubic-bezier(0.16, 1, 0.3, 1)",
              filter: logoVisible ? "drop-shadow(0 0 48px rgba(139,92,246,0.7)) drop-shadow(0 0 96px rgba(139,92,246,0.3))" : "none",
            }}
          >
            <img
              src={LOGO_URL}
              alt="WizVid"
              style={{ width: "clamp(180px, 30vw, 320px)", height: "auto" }}
            />
          </div>

          {/* Horizontal glow sweep line */}
          <div
            style={{
              width: logoVisible ? "clamp(200px, 35vw, 380px)" : "0px",
              height: 1,
              background: "linear-gradient(90deg, transparent, rgba(168,85,247,0.9), rgba(236,72,153,0.7), transparent)",
              transition: "width 1200ms cubic-bezier(0.16, 1, 0.3, 1) 300ms",
              borderRadius: 1,
            }}
          />

          {/* WizSound™ badge */}
          <div
            style={{
              opacity: wizsoundVisible ? 1 : 0,
              transform: wizsoundVisible ? "translateY(0)" : "translateY(10px)",
              transition: "opacity 600ms ease, transform 600ms ease",
            }}
          >
            <div className="flex flex-col items-center gap-2">
              <span
                style={{
                  fontSize: "0.65rem",
                  letterSpacing: "0.25em",
                  color: "rgba(255,255,255,0.35)",
                  fontFamily: "'Inter', sans-serif",
                  textTransform: "uppercase",
                }}
              >
                POWERED BY
              </span>
              <span
                style={{
                  fontSize: "clamp(1rem, 2.5vw, 1.35rem)",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  background: "linear-gradient(135deg, #c084fc, #e879f9)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  filter: "drop-shadow(0 0 16px rgba(192,132,252,0.5))",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                WizSound™
              </span>
              {/* Animated EQ waveform */}
              <div className="flex items-center gap-[3px]" style={{ height: 18 }}>
                {[0.4, 0.7, 1.0, 0.8, 0.5, 0.9, 0.6, 0.85, 0.45].map((h, i) => (
                  <div
                    key={i}
                    style={{
                      width: 3,
                      height: `${h * 100}%`,
                      background: `linear-gradient(to top, #7c3aed, #ec4899)`,
                      borderRadius: 2,
                      animation: `eqBar ${0.6 + i * 0.07}s ease-in-out infinite alternate`,
                      animationDelay: `${i * 0.08}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* CTA button */}
          <div
            style={{
              opacity: ctaVisible ? 1 : 0,
              transform: ctaVisible ? "translateY(0) scale(1)" : "translateY(16px) scale(0.95)",
              transition: "opacity 600ms ease, transform 600ms cubic-bezier(0.16, 1, 0.3, 1)",
              marginTop: 8,
            }}
          >
            <button
              onClick={dismiss}
              className="group relative overflow-hidden"
              style={{
                padding: "14px 40px",
                borderRadius: 8,
                background: "linear-gradient(135deg, rgba(109,40,217,0.9), rgba(147,51,234,0.9))",
                border: "1px solid rgba(168,85,247,0.5)",
                color: "#fff",
                fontSize: "1rem",
                fontWeight: 700,
                letterSpacing: "0.06em",
                cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
                boxShadow: "0 0 32px rgba(109,40,217,0.4), 0 4px 16px rgba(0,0,0,0.4)",
                transition: "box-shadow 200ms ease, transform 200ms ease",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 48px rgba(109,40,217,0.65), 0 4px 24px rgba(0,0,0,0.5)";
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 32px rgba(109,40,217,0.4), 0 4px 16px rgba(0,0,0,0.4)";
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
              }}
              aria-label="Enter WizVid"
            >
              <span className="relative z-10 flex items-center gap-2">
                Enter Site
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              {/* Shimmer sweep */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.12) 50%, transparent 70%)",
                  animation: "shimmerSweep 2.5s ease-in-out infinite",
                }}
              />
            </button>

            {/* Skip hint */}
            <p
              style={{
                marginTop: 12,
                fontSize: "0.7rem",
                color: "rgba(255,255,255,0.22)",
                letterSpacing: "0.1em",
                textAlign: "center",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              PRESS ENTER TO CONTINUE
            </p>
          </div>
        </div>
      </div>

      {/* ── ENABLE SOUND BUTTON ──────────────────────────────────────────── */}
      {soundButtonVisible && !soundEnabled && (
        <button
          onClick={enableSound}
          className="absolute top-[7vh] left-6 z-50 flex items-center gap-2 px-4 py-2 rounded-full text-white/70 hover:text-white transition-all"
          style={{
            background: "rgba(255,255,255,0.06)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.1)",
            fontSize: "0.75rem",
            letterSpacing: "0.08em",
            fontFamily: "'Inter', sans-serif",
            cursor: "pointer",
            animation: "soundPulse 2s ease-in-out infinite",
          }}
          aria-label="Enable cinematic sound"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          </svg>
          Enable Sound
        </button>
      )}
      {soundEnabled && soundButtonVisible && (
        <div
          className="absolute top-[7vh] left-6 z-50 flex items-center gap-2 px-4 py-2 rounded-full text-violet-300/70"
          style={{
            background: "rgba(109,40,217,0.12)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(109,40,217,0.2)",
            fontSize: "0.75rem",
            letterSpacing: "0.08em",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          </svg>
          Sound On
        </div>
      )}

      {/* ── SKIP (always visible, subtle) ────────────────────────────────── */}
      <button
        onClick={dismiss}
        className="absolute top-[7vh] right-6 z-50 flex items-center gap-1.5 text-white/25 hover:text-white/60 transition-colors"
        style={{
          fontSize: "0.7rem",
          letterSpacing: "0.15em",
          fontFamily: "'Inter', sans-serif",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "8px 4px",
        }}
        aria-label="Skip intro"
      >
        SKIP
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* ── KEYFRAME STYLES ──────────────────────────────────────────────── */}
      <style>{`
        @keyframes glowPulse {
          from { opacity: 0.4; transform: scale(0.95); }
          to   { opacity: 1;   transform: scale(1.05); }
        }
        @keyframes eqBar {
          from { transform: scaleY(0.3); }
          to   { transform: scaleY(1);   }
        }
        @keyframes shimmerSweep {
          0%   { transform: translateX(-100%); }
          60%  { transform: translateX(100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes soundPulse {
          0%, 100% { opacity: 0.7; }
          50%       { opacity: 1;   }
        }
      `}</style>
    </div>
  );
}
