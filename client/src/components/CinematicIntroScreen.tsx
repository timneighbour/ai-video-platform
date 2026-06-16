/**
 * CinematicIntroScreen — Premium Netflix-Style 6-Scene Cinematic Intro
 *
 * Pure CSS/canvas implementation — no video file, under 3MB.
 *
 * Scenes:
 *   1. Black fade-in, particles, "Your ideas..." text
 *   2. "...come to life" text transition with beat-pulse light
 *   3. Cause→effect USP moment — flames/sparks particle burst
 *   4. Character consistency demo — same face/outfit across 2 quick cuts
 *   5. Use case montage — cinematic / vertical / kids labels
 *   6. Zoom-out to polished final video output
 *
 * Features:
 *   - Seamless loop (Scene 6 → Scene 1 fade)
 *   - Ken Burns slow zoom on CSS gradient backgrounds
 *   - Beat-pulse lighting illusion (visual rhythm, muted-safe)
 *   - Mouse parallax shift on overlay text
 *   - Skip / Enter CTA with smooth zoom transition
 *   - prefers-reduced-motion: static fallback
 *   - SessionStorage gated (shows once per session)
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { ChevronRight, Volume2, X } from "@/lib/icons";
import { INTRO_SESSION_KEY } from "@/lib/introReplay";

// ── Audio configuration ───────────────────────────────────────────────────
// WizSound cinematic demo track used as intro sting until a dedicated sting is produced
const INTRO_AUDIO_URL = "/manus-storage/wizsound-cinematic_73f24d09.mp3";
// Session key to remember mute preference (shared with IntroScreen)
const MUTE_SESSION_KEY = "wizai_intro_muted";

// ── Scene configuration ────────────────────────────────────────────────────
const SCENE_DURATION_MS = 3200; // each scene visible for 3.2s
const TRANSITION_MS = 600;      // cross-fade between scenes
const TOTAL_SCENES = 6;

interface Scene {
  id: number;
  headline: string;
  subline?: string;
  bgClass: string;
  accentClass: string;
  showParticles?: boolean;
  showFlames?: boolean;
  showCharCuts?: boolean;
  showMontage?: boolean;
  showOutput?: boolean;
}

const SCENES: Scene[] = [
  {
    id: 1,
    headline: "Your ideas...",
    bgClass: "scene-bg-1",
    accentClass: "accent-gold",
    showParticles: true,
  },
  {
    id: 2,
    headline: "...come to life.",
    subline: "AI-directed. Cinematically produced.",
    bgClass: "scene-bg-2",
    accentClass: "accent-blue",
  },
  {
    id: 3,
    headline: "Walk through fire.",
    subline: "Your vision. Exactly as you imagined it.",
    bgClass: "scene-bg-3",
    accentClass: "accent-orange",
    showFlames: true,
  },
  {
    id: 4,
    headline: "Same face. Every scene.",
    subline: "Character Lock™ — identity preserved across every shot.",
    bgClass: "scene-bg-4",
    accentClass: "accent-purple",
    showCharCuts: true,
  },
  {
    id: 5,
    headline: "Any creator. Any style.",
    bgClass: "scene-bg-5",
    accentClass: "accent-teal",
    showMontage: true,
  },
  {
    id: 6,
    headline: "Your finished video.",
    subline: "Ready to share. In minutes.",
    bgClass: "scene-bg-6",
    accentClass: "accent-gold",
    showOutput: true,
  },
];

// ── Particle canvas hook ───────────────────────────────────────────────────
function useParticleCanvas(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  active: boolean,
  type: "dust" | "flames" = "dust"
) {
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !active) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width = canvas.offsetWidth;
    const H = canvas.height = canvas.offsetHeight;

    const count = type === "flames" ? 80 : 60;
    type Particle = {
      x: number; y: number; vx: number; vy: number;
      size: number; opacity: number; life: number; maxLife: number;
      hue: number;
    };

    const particles: Particle[] = Array.from({ length: count }, () => {
      const maxLife = 60 + Math.random() * 80;
      return {
        x: Math.random() * W,
        y: type === "flames" ? H * 0.7 + Math.random() * H * 0.3 : Math.random() * H,
        vx: (Math.random() - 0.5) * (type === "flames" ? 1.5 : 0.4),
        vy: type === "flames" ? -(1 + Math.random() * 2.5) : -(0.2 + Math.random() * 0.6),
        size: type === "flames" ? 2 + Math.random() * 4 : 1 + Math.random() * 2,
        opacity: 0,
        life: Math.random() * maxLife,
        maxLife,
        hue: type === "flames" ? 15 + Math.random() * 30 : 45 + Math.random() * 20,
      };
    });

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      for (const p of particles) {
        p.life += 1;
        if (p.life > p.maxLife) {
          p.life = 0;
          p.x = Math.random() * W;
          p.y = type === "flames" ? H * 0.7 + Math.random() * H * 0.3 : Math.random() * H;
        }
        const progress = p.life / p.maxLife;
        p.opacity = progress < 0.2
          ? progress / 0.2
          : progress > 0.7
          ? 1 - (progress - 0.7) / 0.3
          : 1;
        p.x += p.vx;
        p.y += p.vy;
        if (type === "flames") {
          p.vx += (Math.random() - 0.5) * 0.3;
        }

        const sat = type === "flames" ? "90%" : "60%";
        const light = type === "flames" ? `${50 + (1 - progress) * 30}%` : "80%";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, ${sat}, ${light}, ${p.opacity * (type === "flames" ? 0.85 : 0.6)})`;
        ctx.fill();
      }
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [canvasRef, active, type]);
}

// ── Scene visual sub-components ────────────────────────────────────────────
function ParticleLayer({ active, type = "dust" }: { active: boolean; type?: "dust" | "flames" }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useParticleCanvas(canvasRef, active, type);
  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden
    />
  );
}

function CharCuts() {
  const [cut, setCut] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setCut(c => (c + 1) % 2), 900);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden>
      <div className="relative w-48 h-64 sm:w-56 sm:h-72">
        {/* Cut A */}
        <div
          className="absolute inset-0 rounded-xl overflow-hidden transition-opacity duration-300"
          style={{ opacity: cut === 0 ? 1 : 0 }}
        >
          <div className="w-full h-full bg-gradient-to-br from-[#2a1a0a] via-[#4a2a10] to-[#1a0a04]" />
          {/* Silhouette A */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 h-40 bg-gradient-to-t from-[#c49a3c]/30 to-transparent rounded-t-full" />
          <div className="absolute bottom-32 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-[#c49a3c]/20 border border-[#c49a3c]/30" />
          <div className="absolute top-3 left-3 text-[10px] text-[#c49a3c]/60 font-mono">SCENE 04</div>
          <div className="absolute top-3 right-3 text-[10px] text-[#c49a3c]/60 font-mono">CUT A</div>
        </div>
        {/* Cut B */}
        <div
          className="absolute inset-0 rounded-xl overflow-hidden transition-opacity duration-300"
          style={{ opacity: cut === 1 ? 1 : 0 }}
        >
          <div className="w-full h-full bg-gradient-to-br from-[#0a1a2a] via-[#102a4a] to-[#040a1a]" />
          {/* Silhouette B — same proportions = same character */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 h-40 bg-gradient-to-t from-[#6090c4]/30 to-transparent rounded-t-full" />
          <div className="absolute bottom-32 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-[#6090c4]/20 border border-[#6090c4]/30" />
          <div className="absolute top-3 left-3 text-[10px] text-[#6090c4]/60 font-mono">SCENE 12</div>
          <div className="absolute top-3 right-3 text-[10px] text-[#6090c4]/60 font-mono">CUT B</div>
        </div>
        {/* Consistency badge */}
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] text-[#c49a3c]/70 font-mono tracking-wider">
          ✓ IDENTITY PRESERVED
        </div>
      </div>
    </div>
  );
}

function MontageLabels() {
  const labels = ["Cinematic", "Vertical / Social", "Kids & Animation"];
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActive(a => (a + 1) % labels.length), 900);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden>
      <div className="flex flex-col gap-3">
        {labels.map((label, i) => (
          <div
            key={label}
            className="px-5 py-2 rounded-lg border text-sm font-semibold tracking-wide transition-all duration-400"
            style={{
              opacity: active === i ? 1 : 0.25,
              transform: active === i ? "scale(1.08)" : "scale(1)",
              borderColor: active === i ? "rgba(196,154,60,0.5)" : "rgba(255,255,255,0.1)",
              color: active === i ? "#e8c878" : "rgba(255,255,255,0.4)",
              background: active === i ? "rgba(196,154,60,0.08)" : "transparent",
            }}
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

function OutputFrame() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden>
      <div
        className="relative w-64 h-36 sm:w-80 sm:h-44 rounded-xl overflow-hidden border border-[#c49a3c]/30"
        style={{
          background: "linear-gradient(135deg, #0a0a14 0%, #1a1020 50%, #0a0a14 100%)",
          boxShadow: "0 0 40px rgba(196,154,60,0.15), 0 0 80px rgba(196,154,60,0.05)",
        }}
      >
        {/* Fake video frame content */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a0a04]/80 via-transparent to-[#040a1a]/80" />
        <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-[#c49a3c]/80 flex items-center justify-center">
            <div className="w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[7px] border-l-[#1a0a04] ml-0.5" />
          </div>
          <div className="flex-1 h-1 rounded-full bg-white/10">
            <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-[#c49a3c] to-[#e8c878]" />
          </div>
          <span className="text-[10px] text-white/50 font-mono">3:42</span>
        </div>
        {/* WIZ AI watermark */}
        <div className="absolute top-3 right-3 text-[10px] text-[#c49a3c]/50 font-semibold tracking-widest">
          WIZ AI
        </div>
        {/* Scan line effect */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)",
          }}
        />
      </div>
    </div>
  );
}

// ── Beat pulse hook ────────────────────────────────────────────────────────
function useBeatPulse(bpm = 120) {
  const [beat, setBeat] = useState(false);
  useEffect(() => {
    const interval = (60 / bpm) * 1000;
    const t = setInterval(() => {
      setBeat(true);
      setTimeout(() => setBeat(false), 120);
    }, interval);
    return () => clearInterval(t);
  }, [bpm]);
  return beat;
}

// ── Mouse parallax hook ────────────────────────────────────────────────────
function useMouseParallax(strength = 12) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      setOffset({
        x: ((e.clientX - cx) / cx) * strength,
        y: ((e.clientY - cy) / cy) * strength,
      });
    };
    window.addEventListener("mousemove", handle, { passive: true });
    return () => window.removeEventListener("mousemove", handle);
  }, [strength]);
  return offset;
}

// ── Main component ─────────────────────────────────────────────────────────
interface CinematicIntroScreenProps {
  onComplete: () => void;
}

export default function CinematicIntroScreen({ onComplete }: CinematicIntroScreenProps) {
  const [currentScene, setCurrentScene] = useState(0);
  const [nextScene, setNextScene] = useState<number | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [visible, setVisible] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  // Mute state — starts muted (autoplay policy); persisted in sessionStorage
  const [isMuted, setIsMuted] = useState(() => {
    const stored = sessionStorage.getItem(MUTE_SESSION_KEY);
    // Default to muted unless user explicitly unmuted in this session
    return stored !== "0";
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const beat = useBeatPulse(118);
  const parallax = useMouseParallax(10);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ── Sync muted state to audio element ──────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = isMuted;
    if (!isMuted && audio.paused && INTRO_AUDIO_URL) {
      audio.play().catch(() => setIsMuted(true));
    }
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      sessionStorage.setItem(MUTE_SESSION_KEY, next ? "1" : "0");
      return next;
    });
  }, []);

  const dismiss = useCallback(() => {
    if (dismissed) return;
    setDismissed(true);
    localStorage.setItem(INTRO_SESSION_KEY, "1");
    if (audioRef.current) audioRef.current.pause();
    setVisible(false);
    setTimeout(() => onComplete(), 600);
  }, [dismissed, onComplete]);

  // Scene advance loop
  const advanceScene = useCallback(() => {
    setTransitioning(true);
    const next = (currentScene + 1) % TOTAL_SCENES;
    setNextScene(next);
    setTimeout(() => {
      setCurrentScene(next);
      setNextScene(null);
      setTransitioning(false);
    }, TRANSITION_MS);
  }, [currentScene]);

  useEffect(() => {
    if (prefersReducedMotion) return; // static in reduced-motion mode
    timerRef.current = setTimeout(advanceScene, SCENE_DURATION_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [advanceScene, prefersReducedMotion]);

  const scene = SCENES[currentScene];
  const nScene = nextScene !== null ? SCENES[nextScene] : null;

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] overflow-hidden"
      style={{
        background: "#000",
        transition: dismissed ? "opacity 0.6s ease" : undefined,
        opacity: dismissed ? 0 : 1,
      }}
      role="dialog"
      aria-label="WIZ AI cinematic intro"
    >
      {/* ── Scene backgrounds ─────────────────────────────────────────── */}
      {/* Current scene */}
      <SceneBg scene={scene} active={!transitioning} beat={beat} />
      {/* Next scene (fading in) */}
      {nScene && (
        <SceneBg scene={nScene} active={transitioning} beat={beat} fading />
      )}

      {/* ── Grain overlay ─────────────────────────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`,
          backgroundSize: "200px 200px",
          opacity: 0.35,
          mixBlendMode: "overlay",
        }}
        aria-hidden
      />

      {/* ── Vignette ──────────────────────────────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background: "radial-gradient(ellipse 80% 80% at 50% 50%, transparent 40%, rgba(0,0,0,0.7) 100%)",
        }}
        aria-hidden
      />

      {/* ── Overlay text (with parallax) ──────────────────────────────── */}
      <div
        className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-6 pointer-events-none"
        style={{
          transform: prefersReducedMotion
            ? undefined
            : `translate(${parallax.x * 0.4}px, ${parallax.y * 0.4}px)`,
          transition: "transform 0.15s ease-out",
        }}
      >
        <div
          key={scene.id}
          className="flex flex-col items-center gap-4"
          style={{ animation: prefersReducedMotion ? undefined : "scene-text-in 0.5s ease-out forwards" }}
        >
          <h1
            className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight"
            style={{
              fontFamily: "'Sora', system-ui, sans-serif",
              background: "linear-gradient(160deg, #f2dfa0 0%, #e8c878 40%, #c49a3c 70%, #7a5820 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter: beat && !prefersReducedMotion
                ? "drop-shadow(0 0 20px rgba(196,154,60,0.6)) brightness(1.1)"
                : "drop-shadow(0 0 12px rgba(196,154,60,0.3))",
              transition: "filter 0.12s ease",
            }}
          >
            {scene.headline}
          </h1>
          {scene.subline && (
            <p
              className="text-base sm:text-lg text-white/60 max-w-sm"
              style={{ fontFamily: "'Open Sans', system-ui, sans-serif" }}
            >
              {scene.subline}
            </p>
          )}
        </div>
      </div>

      {/* ── Scene progress dots ───────────────────────────────────────── */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 flex gap-2" aria-hidden>
        {SCENES.map((_, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === currentScene ? 20 : 6,
              height: 6,
              background: i === currentScene
                ? "linear-gradient(90deg, #c49a3c, #e8c878)"
                : "rgba(255,255,255,0.2)",
            }}
          />
        ))}
      </div>

      {/* ── Optional audio element (plays intro sting when URL is set) ──── */}
      {INTRO_AUDIO_URL && (
        <audio
          ref={audioRef}
          src={INTRO_AUDIO_URL}
          muted={isMuted}
          loop
          autoPlay
          preload="auto"
          aria-hidden
        />
      )}

      {/* ── Mute / unmute toggle ──────────────────────────────────────── */}
      <button
        onClick={toggleMute}
        aria-label={isMuted ? "Unmute audio" : "Mute audio"}
        className="absolute top-5 right-5 z-40 flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-sm transition-all duration-300 hover:scale-105"
        style={{
          animation: isMuted ? "unmute-pulse 2s ease-in-out infinite" : "none",
          background: isMuted
            ? "rgba(196,164,100,0.12)"
            : "rgba(196,164,100,0.08)",
          border: isMuted
            ? "1px solid rgba(196,164,100,0.55)"
            : "1px solid rgba(196,164,100,0.25)",
          boxShadow: isMuted
            ? "0 0 16px rgba(196,164,100,0.30), inset 0 0 8px rgba(196,164,100,0.08)"
            : "none",
        }}
      >
        {isMuted ? (
          <>
            {/* Animated sound wave bars */}
            <div className="flex items-end gap-[2px] h-4">
              {[
                { anim: "sound-bar-1 0.6s 0s ease-in-out infinite" },
                { anim: "sound-bar-2 0.6s 0.1s ease-in-out infinite" },
                { anim: "sound-bar-3 0.6s 0.2s ease-in-out infinite" },
                { anim: "sound-bar-4 0.6s 0.3s ease-in-out infinite" },
                { anim: "sound-bar-5 0.6s 0.15s ease-in-out infinite" },
              ].map((b, i) => (
                <div
                  key={i}
                  style={{
                    animation: b.anim,
                    width: "3px",
                    borderRadius: "2px",
                    background: "#c4a464",
                    minHeight: "4px",
                  }}
                />
              ))}
            </div>
            <span className="text-[#c4a464] text-[10px] tracking-[0.18em] uppercase font-semibold">Tap for Sound</span>
          </>
        ) : (
          <>
            <Volume2 className="w-4 h-4 text-[#c4a464]/80" />
            <span className="text-[#c4a464]/80 text-[10px] tracking-[0.18em] uppercase font-semibold">Sound On</span>
          </>
        )}
      </button>

      {/* ── Skip button ───────────────────────────────────────────────── */}
      <button
        onClick={dismiss}
        className="absolute top-5 left-5 z-40 flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
        aria-label="Skip intro"
      >
        <X className="w-3.5 h-3.5" />
        <span>Skip</span>
      </button>

      {/* ── Enter CTA ─────────────────────────────────────────────────── */}
      <button
        onClick={dismiss}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-[#1a0f00] transition-all duration-200 hover:scale-105 active:scale-95"
        style={{
          background: "linear-gradient(180deg, #f0d878 0%, #d4a832 40%, #a07828 100%)",
          boxShadow: beat && !prefersReducedMotion
            ? "0 0 24px rgba(196,154,60,0.5), 0 4px 16px rgba(0,0,0,0.4)"
            : "0 0 12px rgba(196,154,60,0.25), 0 4px 16px rgba(0,0,0,0.4)",
          transition: "box-shadow 0.12s ease",
        }}
      >
        Enter WIZ AI
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* ── CSS keyframes ─────────────────────────────────────────────── */}
      <style>{`
        @keyframes scene-text-in {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes ken-burns {
          from { transform: scale(1.0); }
          to   { transform: scale(1.08); }
        }
        @keyframes ken-burns-reverse {
          from { transform: scale(1.08); }
          to   { transform: scale(1.0); }
        }
        @keyframes beat-light {
          0%   { opacity: 0; }
          5%   { opacity: 0.6; }
          15%  { opacity: 0; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ── Scene background component ─────────────────────────────────────────────
const SCENE_BG_CONFIGS: Record<number, { from: string; via: string; to: string }> = {
  1: { from: "#000000", via: "#0a0508", to: "#050208" },
  2: { from: "#020510", via: "#050a1a", to: "#020510" },
  3: { from: "#100402", via: "#1a0804", to: "#0a0200" },
  4: { from: "#080210", via: "#100418", to: "#060110" },
  5: { from: "#021010", via: "#041818", to: "#020a0a" },
  6: { from: "#080604", via: "#120e06", to: "#080604" },
};

function SceneBg({
  scene,
  active,
  beat,
  fading = false,
}: {
  scene: Scene;
  active: boolean;
  beat: boolean;
  fading?: boolean;
}) {
  const cfg = SCENE_BG_CONFIGS[scene.id] ?? SCENE_BG_CONFIGS[1];
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <div
      className="absolute inset-0 z-0"
      style={{
        opacity: fading ? (active ? 1 : 0) : active ? 1 : 0,
        transition: `opacity ${fading ? 0.6 : 0.6}s ease`,
      }}
    >
      {/* Gradient background */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 120% 120% at 50% 60%, ${cfg.via} 0%, ${cfg.from} 50%, ${cfg.to} 100%)`,
          animation: prefersReducedMotion ? undefined : `${scene.id % 2 === 0 ? "ken-burns" : "ken-burns-reverse"} ${SCENE_DURATION_MS}ms ease-in-out forwards`,
        }}
      />

      {/* Beat-pulse light flash */}
      {!prefersReducedMotion && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 60% 60% at 50% 40%, ${scene.accentClass === "accent-gold" ? "rgba(196,154,60,0.12)" : scene.accentClass === "accent-blue" ? "rgba(80,120,220,0.12)" : scene.accentClass === "accent-orange" ? "rgba(220,100,30,0.12)" : scene.accentClass === "accent-purple" ? "rgba(140,80,200,0.12)" : "rgba(40,180,160,0.12)"} 0%, transparent 70%)`,
            opacity: beat ? 1 : 0,
            transition: "opacity 0.12s ease",
          }}
          aria-hidden
        />
      )}

      {/* Scene-specific overlays */}
      {scene.showParticles && <ParticleLayer active={active} type="dust" />}
      {scene.showFlames && <ParticleLayer active={active} type="flames" />}
      {scene.showCharCuts && <CharCuts />}
      {scene.showMontage && <MontageLabels />}
      {scene.showOutput && <OutputFrame />}
    </div>
  );
}
