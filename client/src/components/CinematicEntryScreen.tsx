import { useEffect, useRef, useState, useCallback } from "react";
import { useGlobalAudio } from "@/contexts/AudioContext";

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

// MUST match the key used in App.tsx to read intro state
export const INTRO_SESSION_KEY = "wizvid_intro_seen_v2";

interface Props {
  onComplete: () => void;
}

/**
 * CinematicEntryScreen — Premium cinematic welcome experience.
 *
 * Stage 0 (0–800ms):      Black screen + subtle glow pulse
 * Stage 1 (800–4000ms):   3 cinematic clips, each 1s with 300ms cross-fade
 *   → Signature moment at ~70% (5200ms): slow-zoom + audio dip on clip 3
 * Stage 2 (4000–5800ms):  Genre text — MUSIC VIDEOS / CINEMATIC FILMS / PIXAR ANIMATION
 *   → Micro silence before logo hit (6200–6400ms)
 * Stage 3 (6400ms+):      Logo reveal — slow bloom, WizSound™ stereo pulse, CTA
 *
 * Total: ~7.8 seconds before user can click CTA.
 * NO auto-dismiss — user must click CTA.
 */
export default function CinematicEntryScreen({ onComplete }: Props) {
  // Stage
  const [stage, setStage] = useState<0 | 1 | 2 | 3>(0);

  // Clip state
  const [clipIndex, setClipIndex] = useState(0);
  const [clipVisible, setClipVisible] = useState(false);

  // Signature moment: slow-zoom on clip 3 at ~70%
  const [signatureZoom, setSignatureZoom] = useState(false);

  // Category text state
  const [catIndex, setCatIndex] = useState(0);
  const [catVisible, setCatVisible] = useState(false);

  // Logo reveal
  const [logoVisible, setLogoVisible] = useState(false);
  const [wizsoundVisible, setWizsoundVisible] = useState(false);
  const [ctaVisible, setCtaVisible] = useState(false);

  // WizSound stereo pulse animation
  const [wizsoundPulse, setWizsoundPulse] = useState(false);

  const [soundButtonVisible, setSoundButtonVisible] = useState(false);
  const [audioStarted, setAudioStarted] = useState(false);
  const [skipVisible, setSkipVisible] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const lfoRef = useRef<OscillatorNode | null>(null);
  const lfoGainRef = useRef<GainNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);

  // Use global audio context
  const { isMuted, unmute: globalUnmute, mute: globalMute, toggleMute: globalToggleMute, requestAudioFocus, releaseAudioFocus, registerAudioElement, unregisterAudioElement } = useGlobalAudio();

  // Exit
  const [exiting, setExiting] = useState(false);
  const exitingRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const addTimer = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timersRef.current.push(t);
    return t;
  }, []);

  /* ── Preload images + pre-create audio element (MUTED by default) ────── */
  useEffect(() => {
    [CLIP_CINEMA, CLIP_PIXAR, CLIP_MUSIC, BG_POSTER, LOGO_URL].forEach((src) => {
      const img = new Image();
      img.src = src;
    });
    // Pre-create audio element — starts MUTED (user-first)
    const audio = new Audio(AUDIO_URL);
    audio.preload = "auto";
    audio.volume = 0;
    audio.muted = true;
    audioRef.current = audio;
    audio.load();
    registerAudioElement("cinematic-entry", audio);

    // Auto-start audio playback muted as soon as intro begins (800ms)
    // This ensures the audio is "running" so unmuting works instantly
    const startTimer = setTimeout(() => {
      audio.muted = true;
      audio.volume = 0;
      audio.play().catch(() => {}); // Start muted — browser allows this
      setAudioStarted(true);
      // Show sound button as soon as audio is running
      setSoundButtonVisible(true);
    }, 800);

    // Show skip button after 3 seconds
    const skipTimer = setTimeout(() => setSkipVisible(true), 3000);

    return () => {
      clearTimeout(startTimer);
      clearTimeout(skipTimer);
      unregisterAudioElement("cinematic-entry");
      releaseAudioFocus("cinematic-entry");
      // Cleanup Web Audio nodes
      if (lfoRef.current) { try { lfoRef.current.stop(); } catch { /* noop */ } }
      if (audioCtxRef.current) { try { audioCtxRef.current.close(); } catch { /* noop */ } }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Setup Web Audio graph for rhythmic pulse ─────────────────────────── */
  const setupWebAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || audioCtxRef.current) return; // Already set up

    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = ctx;

      // Source node from the audio element
      const source = ctx.createMediaElementSource(audio);
      sourceNodeRef.current = source;

      // Main gain node (controls overall volume)
      const mainGain = ctx.createGain();
      mainGain.gain.value = 0.9;
      gainNodeRef.current = mainGain;

      // LFO for rhythmic pulse (2Hz = 2 beats/sec, subtle depth)
      const lfo = ctx.createOscillator();
      lfo.type = "sine";
      lfo.frequency.value = 1.8; // ~1.8 pulses per second
      lfoRef.current = lfo;

      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.04; // Very subtle — 4% amplitude modulation
      lfoGainRef.current = lfoGain;

      lfo.connect(lfoGain);
      lfoGain.connect(mainGain.gain);

      // Connect: source → mainGain → destination
      source.connect(mainGain);
      mainGain.connect(ctx.destination);

      lfo.start();
    } catch {
      // Web Audio not supported — fall back to plain audio element
    }
  }, []);

  /* ── Audio dip for signature moment ──────────────────────────────────── */
  const audioDip = useCallback((targetGain: number, durationMs: number) => {
    const ctx = audioCtxRef.current;
    const gain = gainNodeRef.current;
    if (!ctx || !gain) {
      // Fallback: directly set audio volume
      const audio = audioRef.current;
      if (audio) audio.volume = targetGain;
      return;
    }
    gain.gain.setTargetAtTime(targetGain, ctx.currentTime, durationMs / 1000 / 3);
  }, []);

  /* ── Logo impact hit — strong gain spike ─────────────────────────────── */
  const logoImpactHit = useCallback(() => {
    const ctx = audioCtxRef.current;
    const gain = gainNodeRef.current;
    if (!ctx || !gain) {
      const audio = audioRef.current;
      if (audio) { audio.volume = 1.0; }
      return;
    }
    // Spike to 1.2 (louder than normal) then settle to 0.9
    gain.gain.cancelScheduledValues(ctx.currentTime);
    gain.gain.setValueAtTime(1.2, ctx.currentTime);
    gain.gain.setTargetAtTime(0.9, ctx.currentTime + 0.05, 0.3);
  }, []);

  // Sync global mute state to local audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isMuted) {
      // Muting: fade out then mute
      let vol = audio.volume;
      const fadeOut = setInterval(() => {
        vol = Math.max(0, vol - 0.08);
        audio.volume = vol;
        if (vol <= 0) {
          audio.muted = true;
          clearInterval(fadeOut);
        }
      }, 30);
    } else {
      // Unmuting: ensure audio is playing, then fade in
      audio.muted = false;
      requestAudioFocus("cinematic-entry");
      setupWebAudio();

      const doFadeIn = () => {
        // Resume AudioContext if suspended (browser autoplay policy)
        if (audioCtxRef.current?.state === "suspended") {
          audioCtxRef.current.resume().catch(() => {});
        }
        let vol = audio.volume;
        const fadeIn = setInterval(() => {
          vol = Math.min(0.9, vol + 0.04);
          audio.volume = vol;
          if (vol >= 0.9) clearInterval(fadeIn);
        }, 40);
      };

      if (audio.paused) {
        // Audio not yet started — play it now
        audio.currentTime = audio.currentTime || 0;
        audio.play().then(doFadeIn).catch(() => {
          // Autoplay blocked — audio will play on next user gesture
        });
      } else {
        doFadeIn();
      }
    }
  }, [isMuted, requestAudioFocus, setupWebAudio]);

  /* ── Master timeline ─────────────────────────────────────────────────── */
  useEffect(() => {
    // ── Stage 0: black glow (0–800ms) ──

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

    // ── SIGNATURE MOMENT at ~70% (5000ms) ──
    // Slow-zoom on clip 3 + audio dip
    addTimer(() => {
      setSignatureZoom(true);
      audioDip(0.45, 600); // Dip audio to 45%
    }, 5000);

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
    // → fade out + micro silence begins (200ms silence before logo hit)
    addTimer(() => {
      setCatVisible(false);
      audioDip(0, 200); // Micro silence — drop to 0
    }, 6100);

    // ── Stage 3: logo reveal (6400ms) — strong cinematic hit ──
    addTimer(() => {
      setStage(3);
      setSignatureZoom(false);
      logoImpactHit(); // Strong gain spike at logo reveal
    }, 6400);
    addTimer(() => setLogoVisible(true), 6600);
    addTimer(() => {
      setWizsoundVisible(true);
      // Start WizSound stereo pulse animation
      setWizsoundPulse(true);
    }, 7200);
    addTimer(() => setCtaVisible(true), 7800);

    // Auto-dismiss safety net — if user doesn't click CTA within 12s, auto-dismiss
    addTimer(() => {
      dismiss();
    }, 12000);

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    // Write to localStorage AND cookie so intro never shows again across visits
    try { localStorage.setItem(INTRO_SESSION_KEY, "true"); } catch { /* noop */ }
    try { document.cookie = `${INTRO_SESSION_KEY}=true; max-age=31536000; path=/; SameSite=Lax`; } catch { /* noop */ }
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

  // WizSound EQ bars — left-to-right wave pattern for stereo widening feel
  const EQ_BARS = [0.35, 0.55, 0.75, 0.95, 1.0, 0.9, 0.7, 0.5, 0.3];

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
        {/* Clip image with smooth cross-fade + signature zoom */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${currentClip.src})`,
            opacity: clipVisible ? 1 : 0,
            // Signature moment: slow zoom in on clip 3
            transform: signatureZoom && clipIndex === 2 ? "scale(1.09)" : "scale(1)",
            transition: signatureZoom && clipIndex === 2
              ? "opacity 300ms ease-in-out, transform 1800ms cubic-bezier(0.25, 0.46, 0.45, 0.94)"
              : "opacity 300ms ease-in-out, transform 300ms ease",
            filter: "brightness(0.72) saturate(1.2)",
          }}
        />
        {/* Cinematic gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />
        {/* Vignette */}
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 35%, rgba(0,0,0,0.72) 100%)" }} />
        {/* Subtle purple bloom */}
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 40%, rgba(109,40,217,0.12) 0%, transparent 60%)" }} />

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

        {/* Signature moment overlay: subtle dark vignette during zoom */}
        {signatureZoom && clipIndex === 2 && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at 50% 50%, transparent 20%, rgba(0,0,0,0.45) 100%)",
              animation: "signatureVignette 1.8s ease-in forwards",
            }}
          />
        )}
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

        {/* Logo impact flash — white bloom that fades quickly */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at 50% 45%, rgba(255,255,255,0.08) 0%, transparent 55%)",
            opacity: logoVisible ? 0 : 1,
            transition: "opacity 600ms ease-out",
          }}
        />

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

          {/* WizSound™ badge — with stereo widening pulse */}
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
              {/* WizSound™ label with stereo sweep animation */}
              <div style={{ position: "relative", overflow: "hidden", borderRadius: 4 }}>
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
                    display: "block",
                    animation: wizsoundPulse ? "wizsoundGlow 1.4s ease-in-out infinite alternate" : "none",
                  }}
                >
                  WizSound™
                </span>
                {/* Stereo sweep: left-to-right shimmer */}
                {wizsoundPulse && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "linear-gradient(90deg, transparent 0%, rgba(192,132,252,0.35) 40%, rgba(236,72,153,0.25) 60%, transparent 100%)",
                      animation: "stereoSweep 1.8s ease-in-out infinite",
                      pointerEvents: "none",
                    }}
                  />
                )}
              </div>

              {/* EQ bars — left-to-right wave for stereo widening effect */}
              <div className="flex items-center gap-[3px]" style={{ height: 20 }}>
                {EQ_BARS.map((h, i) => (
                  <div
                    key={i}
                    style={{
                      width: 3,
                      height: `${h * 100}%`,
                      background: `linear-gradient(to top, #7c3aed, #ec4899)`,
                      borderRadius: 2,
                      // Left-to-right wave: bars on the left animate faster, right slower
                      // Use full animation shorthand including delay to avoid shorthand/longhand conflict
                      animation: wizsoundPulse
                        ? `eqBarStereo ${0.5 + i * 0.06}s ease-in-out ${i * 0.06}s infinite alternate`
                        : `eqBar ${0.6 + i * 0.07}s ease-in-out ${i * 0.06}s infinite alternate`,
                      // Stereo widening: outer bars are slightly brighter
                      opacity: i === 0 || i === EQ_BARS.length - 1 ? 1 : 0.75 + (i / EQ_BARS.length) * 0.25,
                    }}
                  />
                ))}
              </div>

              {/* Stereo width indicator — subtle L/R labels */}
              {wizsoundPulse && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    width: "100%",
                    maxWidth: 80,
                    fontSize: "0.55rem",
                    letterSpacing: "0.15em",
                    color: "rgba(192,132,252,0.4)",
                    fontFamily: "'Inter', monospace",
                    animation: "stereoLabels 1.8s ease-in-out infinite",
                  }}
                >
                  <span>L</span>
                  <span>R</span>
                </div>
              )}
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
              id="enter-site-btn"
              aria-label="Create Your First Cinematic Video"
            >
              <span className="relative z-10 flex items-center gap-2">
                Create Your First Cinematic Video
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

      {/* ── MUTE/UNMUTE BUTTON — uses global audio state ──────────────── */}
      {soundButtonVisible && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (isMuted) {
              // User wants sound — unmute globally (the useEffect will handle play)
              globalUnmute();
            } else {
              globalMute();
            }
          }}
          className="absolute top-[7vh] left-6 z-50 flex items-center gap-2 px-4 py-2 rounded-full text-white/70 hover:text-white transition-all"
          style={{
            background: isMuted ? "rgba(255,255,255,0.06)" : "rgba(109,40,217,0.12)",
            backdropFilter: "blur(12px)",
            border: isMuted ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(109,40,217,0.2)",
            fontSize: "0.75rem",
            letterSpacing: "0.08em",
            fontFamily: "'Inter', sans-serif",
            cursor: "pointer",
            color: isMuted ? undefined : "rgba(196,181,253,0.7)",
            animation: isMuted ? "soundPulse 2s ease-in-out infinite" : "none",
          }}
          aria-label={isMuted ? "Enable sound" : "Mute sound"}
        >
          {isMuted ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
              Unmute
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
              Sound On
            </>
          )}
        </button>
      )}

      {/* ── SKIP INTRO (appears after 3s) ───────────────────────────────── */}
      <button
        onClick={dismiss}
        className="absolute top-[7vh] right-6 z-50 flex items-center gap-1.5 transition-all"
        style={{
          fontSize: "0.72rem",
          letterSpacing: "0.12em",
          fontFamily: "'Inter', sans-serif",
          background: "rgba(255,255,255,0.06)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 20,
          color: "rgba(255,255,255,0.55)",
          cursor: "pointer",
          padding: "8px 16px",
          opacity: skipVisible ? 1 : 0,
          transform: skipVisible ? "translateY(0)" : "translateY(-6px)",
          transition: "opacity 500ms ease, transform 500ms ease, color 200ms ease, background 200ms ease",
          pointerEvents: skipVisible ? "auto" : "none",
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.9)";
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.1)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.55)";
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)";
        }}
        aria-label="Skip intro"
      >
        Skip Intro
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>      {/* ── KEYFRAME STYLES ──────────────────────────────────────────────── */}
      <style>{`
        @keyframes glowPulse {
          from { opacity: 0.4; transform: scale(0.95); }
          to   { opacity: 1;   transform: scale(1.05); }
        }
        @keyframes eqBar {
          from { transform: scaleY(0.3); }
          to   { transform: scaleY(1);   }
        }
        @keyframes eqBarStereo {
          0%   { transform: scaleY(0.2); }
          50%  { transform: scaleY(1.1); }
          100% { transform: scaleY(0.4); }
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
        @keyframes signatureVignette {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes wizsoundGlow {
          from { filter: drop-shadow(0 0 12px rgba(192,132,252,0.4)); }
          to   { filter: drop-shadow(0 0 28px rgba(236,72,153,0.7)) drop-shadow(0 0 8px rgba(192,132,252,0.6)); }
        }
        @keyframes stereoSweep {
          0%   { transform: translateX(-120%); opacity: 0; }
          20%  { opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateX(120%); opacity: 0; }
        }
        @keyframes stereoLabels {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}


