/*
 * WizStudioIntro — Blockbuster Studio Style (Apr 2026)
 *
 * Fully programmatic — no AI video clips.
 * Pure canvas particle system + cinematic typography + real logo reveal.
 * Inspired by Universal / Warner Bros / Marvel studio intros.
 *
 * Timeline (15s total):
 *   0.0s  — Pure black, particles begin spawning (subtle, slow)
 *   2.0s  — "Welcome to the world of..." fades in (Inter SemiBold, letter-spacing)
 *   5.0s  — Text fades out. Silence. Particles intensify.
 *   8.0s  — Particles converge to centre. Tension.
 *   9.5s  — IMPACT: logo fades in with gold shimmer sweep
 *   9.5s  — "Wiz AI" text appears below logo
 *  11.0s  — "Enter Site" button fades in
 *  15.0s  — Auto-dismiss if user hasn't clicked
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { Volume2, VolumeX, X, ChevronRight } from "lucide-react";

const SCORE_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wiz-dolby-score_7da7dcfe.mp3";
const LOGO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizai-logo-v3-transparent_2e20782a.png";

export const INTRO_SEEN_KEY = "wizvid_studio_intro_v2_dolby";

interface WizVidIntroProps {
  onClose: () => void;
}

// ─── Particle system ────────────────────────────────────────────────────────

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  life: number;
  maxLife: number;
  converging: boolean;
}

const GOLD_COLORS = [
  "255,215,0",
  "255,200,50",
  "255,180,30",
  "220,160,20",
  "255,240,150",
  "200,150,10",
];

function createParticle(
  w: number,
  h: number,
  converging: boolean,
  t: number
): Particle {
  const life = 120 + Math.random() * 180;
  if (converging) {
    // Spawn from edges, move toward centre
    const edge = Math.floor(Math.random() * 4);
    let x = 0,
      y = 0;
    if (edge === 0) { x = Math.random() * w; y = 0; }
    else if (edge === 1) { x = w; y = Math.random() * h; }
    else if (edge === 2) { x = Math.random() * w; y = h; }
    else { x = 0; y = Math.random() * h; }
    const cx = w / 2, cy = h / 2;
    const dist = Math.hypot(cx - x, cy - y);
    const speed = 0.8 + Math.random() * 1.2;
    return {
      x, y,
      vx: ((cx - x) / dist) * speed,
      vy: ((cy - y) / dist) * speed,
      size: 1 + Math.random() * 2.5,
      alpha: 0.6 + Math.random() * 0.4,
      color: GOLD_COLORS[Math.floor(Math.random() * GOLD_COLORS.length)],
      life, maxLife: life, converging: true,
    };
  } else {
    // Ambient floating particles
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.4,
      vy: -0.2 - Math.random() * 0.5,
      size: 0.5 + Math.random() * 1.5,
      alpha: 0.3 + Math.random() * 0.5,
      color: GOLD_COLORS[Math.floor(Math.random() * GOLD_COLORS.length)],
      life, maxLife: life, converging: false,
    };
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function WizVidIntro({ onClose }: WizVidIntroProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const animRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const logoImgRef = useRef<HTMLImageElement | null>(null);
  const isExitingRef = useRef(false);

  const [muted, setMuted] = useState(true);
  const [audioStarted, setAudioStarted] = useState(false);
  const [phase, setPhase] = useState<"black" | "text1" | "pause" | "impact" | "cta">("black");
  const [text1Alpha, setText1Alpha] = useState(0);
  const [logoAlpha, setLogoAlpha] = useState(0);
  const [logoTextAlpha, setLogoTextAlpha] = useState(0);
  const [ctaAlpha, setCtaAlpha] = useState(0);
  const [shimmerX, setShimmerX] = useState(-1);
  const [isExiting, setIsExiting] = useState(false);

  // Preload logo
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = LOGO_URL;
    img.onload = () => { logoImgRef.current = img; };
  }, []);

  // Canvas particle animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    startTimeRef.current = performance.now();
    let lastSpawn = 0;

    const tick = (now: number) => {
      const elapsed = (now - startTimeRef.current) / 1000; // seconds
      const w = canvas.width;
      const h = canvas.height;

      // Clear
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.fillRect(0, 0, w, h);

      // Spawn new particles
      const converging = elapsed > 7.5;
      const spawnRate = converging ? 8 : elapsed > 1 ? 3 : 1;
      if (now - lastSpawn > 1000 / (spawnRate * 30)) {
        for (let i = 0; i < spawnRate; i++) {
          particlesRef.current.push(createParticle(w, h, converging, elapsed));
        }
        lastSpawn = now;
      }

      // Update + draw particles
      particlesRef.current = particlesRef.current.filter(p => p.life > 0);
      for (const p of particlesRef.current) {
        p.life--;
        const lifeRatio = p.life / p.maxLife;
        const alpha = p.alpha * Math.min(lifeRatio * 3, 1) * Math.min((1 - lifeRatio) * 3, 1);

        if (converging) {
          // Accelerate toward centre
          const cx = w / 2, cy = h / 2;
          const dx = cx - p.x, dy = cy - p.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 5) {
            p.vx += (dx / dist) * 0.05;
            p.vy += (dy / dist) * 0.05;
          }
        }

        p.x += p.vx;
        p.y += p.vy;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color},${alpha.toFixed(3)})`;
        ctx.fill();

        // Glow for larger particles
        if (p.size > 1.5) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${p.color},${(alpha * 0.15).toFixed(3)})`;
          ctx.fill();
        }
      }

      // Phase transitions
      if (elapsed >= 2.0 && elapsed < 5.5) {
        const a = Math.min((elapsed - 2.0) / 0.8, 1) * Math.min((5.5 - elapsed) / 0.8, 1);
        setText1Alpha(a);
        if (phase !== "text1") setPhase("text1");
      } else if (elapsed >= 5.5 && elapsed < 9.5) {
        setText1Alpha(0);
        if (phase !== "pause") setPhase("pause");
      } else if (elapsed >= 9.5) {
        const logoA = Math.min((elapsed - 9.5) / 1.2, 1);
        const logoTextA = Math.min((elapsed - 10.2) / 0.8, 1);
        const ctaA = Math.min((elapsed - 11.5) / 1.0, 1);
        setLogoAlpha(logoA);
        setLogoTextAlpha(Math.max(logoTextA, 0));
        setCtaAlpha(Math.max(ctaA, 0));
        // Shimmer sweep: starts at 10.0s, sweeps across logo over 0.8s
        if (elapsed >= 10.0 && elapsed < 10.8) {
          setShimmerX((elapsed - 10.0) / 0.8);
        }
        if (phase !== "impact" && phase !== "cta") setPhase("impact");
      }

      // Auto-dismiss at 18s
      if (elapsed >= 18 && !isExitingRef.current) {
        dismiss();
        return;
      }

      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const dismiss = useCallback(() => {
    if (isExitingRef.current) return;
    isExitingRef.current = true;
    setIsExiting(true);
    cancelAnimationFrame(animRef.current);
    setTimeout(() => onClose(), 700);
  }, [onClose]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = muted;
    }
  }, [muted]);

  return (
    <div
      className="fixed inset-0 z-[9999] overflow-hidden bg-black select-none"
      style={{
        opacity: isExiting ? 0 : 1,
        transition: isExiting ? "opacity 700ms ease" : "opacity 400ms ease",
        pointerEvents: isExiting ? "none" : "auto",
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Wiz AI studio intro"
    >
      {/* Dolby Cinema score */}
      <audio
        ref={audioRef}
        src={SCORE_URL}
        preload="auto"
        muted={muted}
        style={{ display: "none" }}
      />
      {/* Canvas particle field */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ zIndex: 0 }}
      />

      {/* "Welcome to the world of..." */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ zIndex: 5, pointerEvents: "none" }}
      >
        <p
          style={{
            opacity: text1Alpha,
            transition: "opacity 100ms linear",
            fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
            fontWeight: 300,
            fontSize: "clamp(1.4rem, 3.5vw, 2.4rem)",
            letterSpacing: "0.18em",
            color: "rgba(255,255,255,0.88)",
            textShadow: "0 0 40px rgba(255,215,0,0.25), 0 2px 12px rgba(0,0,0,0.9)",
            textTransform: "uppercase",
          }}
        >
          Welcome to the world of…
        </p>
      </div>

      {/* Logo + "Wiz AI" text reveal */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-6"
        style={{ zIndex: 6, pointerEvents: "none" }}
      >
        {/* Logo image with shimmer overlay */}
        <div
          style={{
            position: "relative",
            width: "clamp(180px, 22vw, 320px)",
            height: "clamp(180px, 22vw, 320px)",
            opacity: logoAlpha,
            transition: "opacity 100ms linear",
            filter: `drop-shadow(0 0 40px rgba(255,215,0,${(logoAlpha * 0.6).toFixed(2)})) drop-shadow(0 0 80px rgba(255,180,0,${(logoAlpha * 0.3).toFixed(2)}))`,
          }}
        >
          <img
            src={LOGO_URL}
            alt="Wiz AI"
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
          {/* Shimmer sweep */}
          {shimmerX >= 0 && shimmerX <= 1 && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: `linear-gradient(105deg, transparent ${shimmerX * 100 - 20}%, rgba(255,255,255,0.35) ${shimmerX * 100}%, rgba(255,255,255,0.55) ${shimmerX * 100 + 5}%, rgba(255,255,255,0.35) ${shimmerX * 100 + 10}%, transparent ${shimmerX * 100 + 30}%)`,
                borderRadius: "50%",
                pointerEvents: "none",
              }}
            />
          )}
        </div>

        {/* "Wiz AI" wordmark */}
        <p
          style={{
            opacity: logoTextAlpha,
            transition: "opacity 100ms linear",
            fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
            fontWeight: 700,
            fontSize: "clamp(2rem, 5vw, 3.5rem)",
            letterSpacing: "0.22em",
            background: "linear-gradient(135deg, #FFD700 0%, #FFF8DC 40%, #FFD700 60%, #B8860B 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            textShadow: "none",
            filter: `drop-shadow(0 0 20px rgba(255,215,0,${(logoTextAlpha * 0.8).toFixed(2)}))`,
          }}
        >
          WIZ AI
        </p>
      </div>

      {/* Enter Site CTA */}
      <div
        className="absolute inset-x-0 bottom-0 flex flex-col items-center pb-16 sm:pb-20 px-6"
        style={{ zIndex: 10 }}
      >
        <button
          onClick={dismiss}
          style={{
            opacity: ctaAlpha,
            transform: ctaAlpha > 0 ? "translateY(0) scale(1)" : "translateY(16px) scale(0.96)",
            transition: "opacity 100ms linear, transform 100ms linear",
            pointerEvents: ctaAlpha > 0.1 ? "auto" : "none",
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
            textTransform: "uppercase",
            border: "none",
            animation: ctaAlpha >= 1 ? "ctaPulse 2.8s ease-in-out infinite" : "none",
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
        onClick={() => {
          setMuted(m => !m);
          if (!audioStarted && audioRef.current) {
            audioRef.current.play().then(() => setAudioStarted(true)).catch(() => {});
          }
        }}
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
      {ctaAlpha >= 0.5 && (
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
