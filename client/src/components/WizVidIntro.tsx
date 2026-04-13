/**
 * WizVidIntro — Brand new cinematic intro (Apr 2026)
 *
 * Design principles:
 * - Full-screen cinematic video background (cycling clips)
 * - Large prominent WizVid logo with violet glow
 * - Mute/unmute toggle (sound off by default — browser autoplay policy)
 * - Skip button always visible
 * - Primary CTA navigates to /onboarding
 * - Mounts ONLY when open=true, so it NEVER blocks the page when closed
 * - No Web Audio API — plain <audio> element for ambient music
 * - Exits with a smooth fade-to-black then calls onClose
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { Volume2, VolumeX, X, Sparkles, Play } from "lucide-react";
import { useLocation } from "wouter";

// ── CDN Assets ────────────────────────────────────────────────────────────────
const CDN = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx";
const LOGO = `${CDN}/wizvid-logo-transparent_fcdb69d6.png`;

// Cinematic background clips — cycle through these
const BG_CLIPS = [
  `${CDN}/hero-nightclub-web_3a88ea3e.mp4`,
  `${CDN}/hero-abstract-web_ed099aea.mp4`,
  `${CDN}/hero-concert-web_2f9db1a6.mp4`,
];

// Ambient music track (standard audio — no Web Audio API)
const AMBIENT_AUDIO = `${CDN}/wizsound-standard_31845db2.m4a`;

// localStorage key — set after first visit so intro never auto-shows again
export const INTRO_SEEN_KEY = "wizvid_intro_v3_seen";

// ── Types ─────────────────────────────────────────────────────────────────────
interface WizVidIntroProps {
  onClose: () => void;
}

// ── Phases ────────────────────────────────────────────────────────────────────
type Phase =
  | "fade-in"      // 0–800ms: black → video visible
  | "logo"         // 800ms–2.5s: logo animates in
  | "tagline"      // 2.5s–4.5s: tagline fades in
  | "cta"          // 4.5s–∞: CTA + skip button fully visible
  | "exiting";     // fade-to-black before calling onClose

// ── Component ─────────────────────────────────────────────────────────────────
export default function WizVidIntro({ onClose }: WizVidIntroProps) {
  const [, navigate] = useLocation();
  const [phase, setPhase] = useState<Phase>("fade-in");
  const [clipIdx, setClipIdx] = useState(0);
  const [muted, setMuted] = useState(true); // start muted — browser policy
  const [videoReady, setVideoReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const phaseTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // ── Schedule phase transitions ──────────────────────────────────────────────
  useEffect(() => {
    const schedule = (fn: () => void, ms: number) => {
      const t = setTimeout(fn, ms);
      phaseTimers.current.push(t);
      return t;
    };

    schedule(() => setPhase("logo"), 800);
    schedule(() => setPhase("tagline"), 2500);
    schedule(() => setPhase("cta"), 4500);

    // Auto-dismiss after 14 seconds
    schedule(() => handleClose(), 14000);

    return () => {
      phaseTimers.current.forEach(clearTimeout);
      phaseTimers.current = [];
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Cycle background clips every 5s ────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => {
      setClipIdx((i) => (i + 1) % BG_CLIPS.length);
    }, 5000);
    return () => clearInterval(t);
  }, []);

  // ── Play video when clip changes ────────────────────────────────────────────
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.src = BG_CLIPS[clipIdx];
    v.load();
    v.play().catch(() => {/* autoplay blocked — silent fail */});
  }, [clipIdx]);

  // ── Sync audio mute state ───────────────────────────────────────────────────
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.muted = muted;
    if (!muted) {
      a.play().catch(() => {/* blocked — silent fail */});
    }
  }, [muted]);

  // ── Close handler ───────────────────────────────────────────────────────────
  const handleClose = useCallback(() => {
    if (phase === "exiting") return;
    setPhase("exiting");
    // Mark as seen so it never auto-shows again
    try { localStorage.setItem(INTRO_SEEN_KEY, "1"); } catch { /* ignore */ }
    // Fade out then call onClose
    setTimeout(() => onClose(), 700);
  }, [phase, onClose]);

  // ── CTA click — navigate then close ────────────────────────────────────────
  const handleCTA = useCallback(() => {
    try { localStorage.setItem(INTRO_SEEN_KEY, "1"); } catch { /* ignore */ }
    setPhase("exiting");
    setTimeout(() => {
      onClose();
      navigate("/onboarding");
    }, 700);
  }, [onClose, navigate]);

  // ── Derived visibility flags ────────────────────────────────────────────────
  const showLogo    = phase !== "fade-in";
  const showTagline = phase === "tagline" || phase === "cta" || phase === "exiting";
  const showCTA     = phase === "cta" || phase === "exiting";
  const isExiting   = phase === "exiting";

  return (
    <div
      className="fixed inset-0 z-[9999] overflow-hidden bg-black"
      style={{
        opacity: isExiting ? 0 : 1,
        transition: isExiting ? "opacity 700ms ease" : "opacity 800ms ease",
        pointerEvents: isExiting ? "none" : "auto",
      }}
      role="dialog"
      aria-modal="true"
      aria-label="WizVid cinematic intro"
    >
      {/* ── Background video ── */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          opacity: videoReady ? 1 : 0,
          transition: "opacity 1.2s ease",
        }}
        autoPlay
        muted
        playsInline
        loop
        onCanPlay={() => setVideoReady(true)}
      />

      {/* ── Dark overlay for text readability ── */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 40%, rgba(0,0,0,0.65) 100%)",
        }}
      />

      {/* ── Ambient audio (muted by default) ── */}
      <audio
        ref={audioRef}
        src={AMBIENT_AUDIO}
        loop
        muted={muted}
        preload="none"
      />

      {/* ── Skip button (top-right, always visible) ── */}
      <button
        onClick={handleClose}
        className="absolute top-5 right-5 z-20 flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white/70 hover:text-white text-sm font-medium transition-all duration-200 backdrop-blur-sm"
        aria-label="Skip intro"
      >
        <X className="w-3.5 h-3.5" />
        Skip
      </button>

      {/* ── Mute toggle (top-left) ── */}
      <button
        onClick={() => setMuted((m) => !m)}
        className="absolute top-5 left-5 z-20 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all duration-200 backdrop-blur-sm"
        aria-label={muted ? "Unmute" : "Mute"}
      >
        {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      </button>

      {/* ── Centre content ── */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">

        {/* Logo */}
        <div
          style={{
            opacity: showLogo ? 1 : 0,
            transform: showLogo ? "scale(1) translateY(0)" : "scale(0.85) translateY(20px)",
            transition: "opacity 900ms cubic-bezier(0.16,1,0.3,1), transform 900ms cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          <img
            src={LOGO}
            alt="WizVid"
            className="w-64 sm:w-80 md:w-96 mx-auto"
            style={{
              filter: "drop-shadow(0 0 40px rgba(139,92,246,0.8)) drop-shadow(0 0 80px rgba(139,92,246,0.4))",
            }}
            draggable={false}
          />
        </div>

        {/* Tagline */}
        <div
          className="mt-6"
          style={{
            opacity: showTagline ? 1 : 0,
            transform: showTagline ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 700ms ease 0.1s, transform 700ms ease 0.1s",
          }}
        >
          <p
            className="text-white/90 font-light tracking-[0.25em] uppercase text-sm sm:text-base"
            style={{ textShadow: "0 2px 20px rgba(0,0,0,0.8)" }}
          >
            AI Music Video Creator
          </p>
          <p
            className="mt-2 text-white/55 font-light tracking-widest uppercase text-xs sm:text-sm"
            style={{ textShadow: "0 2px 20px rgba(0,0,0,0.8)" }}
          >
            Cinematic visuals · Immersive sound
          </p>
        </div>

        {/* CTA */}
        <div
          className="mt-10 flex flex-col sm:flex-row items-center gap-4"
          style={{
            opacity: showCTA ? 1 : 0,
            transform: showCTA ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 600ms ease 0.15s, transform 600ms ease 0.15s",
            pointerEvents: showCTA ? "auto" : "none",
          }}
        >
          <button
            onClick={handleCTA}
            className="inline-flex items-center gap-3 bg-white text-black font-bold px-10 py-4 rounded-2xl text-base shadow-[0_0_60px_rgba(255,255,255,0.35)] hover:shadow-[0_0_80px_rgba(255,255,255,0.5)] hover:bg-white/95 transition-all duration-300"
          >
            <Sparkles className="w-5 h-5 flex-shrink-0" />
            Create Your First Video
          </button>
          <button
            onClick={handleClose}
            className="inline-flex items-center gap-2 px-7 py-4 rounded-2xl border border-white/25 bg-white/8 hover:bg-white/15 text-white/80 hover:text-white font-medium text-sm transition-all duration-300"
          >
            <Play className="w-4 h-4 flex-shrink-0" />
            Explore WizVid
          </button>
        </div>

        {/* Progress bar */}
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 w-48 h-0.5 bg-white/15 rounded-full overflow-hidden"
          style={{ opacity: showCTA ? 0.7 : 0, transition: "opacity 500ms ease" }}
        >
          <div
            className="h-full bg-violet-400/70 rounded-full"
            style={{
              animation: showCTA ? "introProgress 9.5s linear forwards" : "none",
            }}
          />
        </div>
      </div>

      {/* Progress bar keyframe */}
      <style>{`
        @keyframes introProgress {
          from { width: 0%; }
          to   { width: 100%; }
        }
      `}</style>
    </div>
  );
}
