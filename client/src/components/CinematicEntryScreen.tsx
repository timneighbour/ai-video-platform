/**
 * CinematicEntryScreen — Pure Text → Visual Transformation
 *
 * No UI cards. No icons. No feature explanations.
 * Just text appearing and the world reacting around it.
 *
 * Scene 1 (0–2s):   Black. "Your ideas..." fades in.
 * Scene 2 (2–4s):   "...become real" — light pulse, camera push
 * Scene 3 (4–7s):   "Walking through fire" → flames ignite, sparks fly (NO delay)
 * Scene 4 (7–9s):   Same character, 2 environments — no UI, just visual proof
 * Scene 5 (9–11s):  3 rapid visual cuts — cinematic / vertical / kids
 * Scene 6 (11–13s): Zoom out to polished scene, headline + CTA fades in
 * Loop:             Fades seamlessly back to Scene 1
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "wouter";

const SESSION_KEY = "wizvid_entry_shown";

// ─── Particle types ──────────────────────────────────────────────────────────
interface Particle {
  x: number; y: number; vx: number; vy: number;
  size: number; opacity: number; color: string; life: number; maxLife: number;
}

function mkParticle(w: number, h: number, type: "ambient" | "fire" | "spark" | "rain" = "ambient"): Particle {
  if (type === "fire") return {
    x: w * 0.5 + (Math.random() - 0.5) * w * 0.7,
    y: h * 0.85 + Math.random() * h * 0.15,
    vx: (Math.random() - 0.5) * 2,
    vy: -(Math.random() * 4 + 2),
    size: Math.random() * 8 + 3,
    opacity: Math.random() * 0.9 + 0.1,
    color: Math.random() > 0.4 ? "#ff6b35" : Math.random() > 0.5 ? "#ffd700" : "#ff3300",
    life: 0, maxLife: Math.random() * 60 + 30,
  };
  if (type === "spark") return {
    x: w * 0.5 + (Math.random() - 0.5) * w * 0.9,
    y: h * 0.5 + (Math.random() - 0.5) * h * 0.5,
    vx: (Math.random() - 0.5) * 6,
    vy: (Math.random() - 0.5) * 6 - 2,
    size: Math.random() * 2.5 + 0.5,
    opacity: 1,
    color: Math.random() > 0.5 ? "#fff" : "#ffd700",
    life: 0, maxLife: Math.random() * 25 + 10,
  };
  if (type === "rain") return {
    x: Math.random() * w,
    y: -10,
    vx: (Math.random() - 0.5) * 0.5,
    vy: Math.random() * 8 + 6,
    size: Math.random() * 1 + 0.3,
    opacity: Math.random() * 0.4 + 0.1,
    color: "#93c5fd",
    life: 0, maxLife: h / 7,
  };
  return {
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.2,
    vy: -(Math.random() * 0.3 + 0.05),
    size: Math.random() * 1.5 + 0.3,
    opacity: Math.random() * 0.3 + 0.03,
    color: Math.random() > 0.6 ? "#a78bfa" : Math.random() > 0.5 ? "#60a5fa" : "#fff",
    life: 0, maxLife: Math.random() * 300 + 150,
  };
}

interface Props { onDismiss?: () => void; }

export default function CinematicEntryScreen({ onDismiss }: Props) {
  const [, navigate] = useLocation();
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [scene, setScene] = useState(0);
  const [textPhase, setTextPhase] = useState(0); // sub-phase within scene
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animRef = useRef<number>(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // ─── Check session ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) {
      setVisible(false);
    }
  }, []);

  // ─── Scene timeline ────────────────────────────────────────────────────────
  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const addTimer = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timersRef.current.push(t);
    return t;
  }, []);

  const runTimeline = useCallback(() => {
    clearTimers();
    setScene(0); setTextPhase(0);
    // Scene 1: "Your ideas..."
    addTimer(() => { setScene(1); setTextPhase(1); }, 400);
    // Scene 2: "...become real"
    addTimer(() => { setScene(2); setTextPhase(0); }, 2400);
    addTimer(() => setTextPhase(1), 2700);
    // Scene 3: "Walking through fire" → world reacts
    addTimer(() => { setScene(3); setTextPhase(0); }, 4600);
    addTimer(() => setTextPhase(1), 4900); // text appears
    addTimer(() => setTextPhase(2), 5100); // FIRE ignites immediately
    // Scene 4: character consistency
    addTimer(() => { setScene(4); setTextPhase(0); }, 7800);
    addTimer(() => setTextPhase(1), 8100);
    // Scene 5: rapid cuts
    addTimer(() => { setScene(5); setTextPhase(0); }, 9800);
    addTimer(() => setTextPhase(1), 10000);
    addTimer(() => setTextPhase(2), 10600);
    addTimer(() => setTextPhase(3), 11200);
    // Scene 6: zoom out + CTA
    addTimer(() => { setScene(6); setTextPhase(0); }, 12400);
    addTimer(() => setTextPhase(1), 13000);
    // Loop
    addTimer(() => runTimeline(), 16000);
  }, [clearTimers, addTimer]);

  useEffect(() => {
    if (!visible) return;
    runTimeline();
    return clearTimers;
  }, [visible, runTimeline, clearTimers]);

  // ─── Canvas particle engine ────────────────────────────────────────────────
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

    // Seed ambient particles
    for (let i = 0; i < 80; i++) {
      particlesRef.current.push(mkParticle(canvas.width, canvas.height, "ambient"));
    }

    let frame = 0;
    const draw = () => {
      animRef.current = requestAnimationFrame(draw);
      frame++;
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Spawn particles based on current scene
      const currentScene = parseInt(canvas.dataset.scene || "0");
      const currentPhase = parseInt(canvas.dataset.phase || "0");

      if (currentScene === 3 && currentPhase >= 2) {
        // Fire scene — heavy spawn
        if (frame % 2 === 0) {
          for (let i = 0; i < 4; i++) particlesRef.current.push(mkParticle(w, h, "fire"));
          for (let i = 0; i < 2; i++) particlesRef.current.push(mkParticle(w, h, "spark"));
        }
      } else if (currentScene === 2) {
        // Rain scene
        if (frame % 3 === 0) {
          for (let i = 0; i < 3; i++) particlesRef.current.push(mkParticle(w, h, "rain"));
        }
      } else {
        // Ambient
        if (frame % 8 === 0) particlesRef.current.push(mkParticle(w, h, "ambient"));
      }

      // Update + draw particles
      particlesRef.current = particlesRef.current.filter(p => {
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        const t = p.life / p.maxLife;
        const alpha = p.opacity * (t < 0.2 ? t / 0.2 : t > 0.7 ? (1 - t) / 0.3 : 1);
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 - t * 0.5), 0, Math.PI * 2);
        ctx.fill();
        return p.life < p.maxLife && p.x > -20 && p.x < w + 20 && p.y < h + 20;
      });

      ctx.globalAlpha = 1;
    };
    draw();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  // Sync scene/phase to canvas dataset for particle engine
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.dataset.scene = String(scene);
      canvasRef.current.dataset.phase = String(textPhase);
    }
  }, [scene, textPhase]);

  // ─── Mouse parallax ────────────────────────────────────────────────────────
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 12,
      });
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  // ─── Dismiss ───────────────────────────────────────────────────────────────
  const dismiss = useCallback(() => {
    setExiting(true);
    sessionStorage.setItem(SESSION_KEY, "1");
    setTimeout(() => {
      setVisible(false);
      onDismiss?.();
      navigate("/music-video");
    }, 800);
  }, [navigate, onDismiss]);

  if (!visible) return null;

  // ─── Scene backgrounds ─────────────────────────────────────────────────────
  const sceneBg: Record<number, string> = {
    0: "radial-gradient(ellipse at 50% 50%, #0a0a0f 0%, #000 100%)",
    1: "radial-gradient(ellipse at 50% 50%, #0d0a1a 0%, #000 100%)",
    2: "radial-gradient(ellipse at 50% 60%, #0a0f1a 0%, #000 100%)",
    3: "radial-gradient(ellipse at 50% 80%, #1a0800 0%, #0d0500 40%, #000 100%)",
    4: "radial-gradient(ellipse at 30% 50%, #0a0a1a 0%, #000 80%)",
    5: "radial-gradient(ellipse at 50% 50%, #050510 0%, #000 100%)",
    6: "radial-gradient(ellipse at 50% 40%, #0a0a18 0%, #000 100%)",
  };

  const fireActive = scene === 3 && textPhase >= 2;
  const rainActive = scene === 2;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
      style={{
        background: sceneBg[scene] || sceneBg[0],
        transition: "background 1.2s ease",
        opacity: exiting ? 0 : 1,
        transform: exiting ? "scale(1.05)" : "scale(1)",
        transitionProperty: "opacity, transform, background",
        transitionDuration: exiting ? "0.8s" : "1.2s",
      }}
    >
      {/* Canvas — particles */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 1 }}
      />

      {/* Fire glow overlay */}
      {fireActive && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at 50% 90%, rgba(255,107,53,0.35) 0%, rgba(255,50,0,0.15) 40%, transparent 70%)",
            zIndex: 2,
            animation: "fireGlow 0.4s ease-in-out infinite alternate",
          }}
        />
      )}

      {/* Lightning flash */}
      {scene === 3 && textPhase === 2 && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "rgba(255,200,100,0.08)",
            zIndex: 3,
            animation: "lightningFlash 2.5s ease-in-out infinite",
          }}
        />
      )}

      {/* Rain overlay */}
      {rainActive && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(180deg, rgba(30,60,100,0.15) 0%, transparent 100%)",
            zIndex: 2,
          }}
        />
      )}

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.85) 100%)",
          zIndex: 4,
        }}
      />

      {/* Film grain */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E\")",
          backgroundSize: "128px 128px",
          zIndex: 5,
        }}
      />

      {/* Main content — parallax layer */}
      <div
        className="relative flex flex-col items-center justify-center w-full h-full"
        style={{
          transform: `translate(${mousePos.x * 0.5}px, ${mousePos.y * 0.5}px)`,
          transition: "transform 0.3s ease-out",
          zIndex: 10,
        }}
      >
        {/* ── SCENE 1: "Your ideas..." ── */}
        {scene <= 1 && (
          <div
            className="text-center px-8"
            style={{
              opacity: textPhase >= 1 ? 1 : 0,
              transform: textPhase >= 1 ? "translateY(0)" : "translateY(20px)",
              transition: "opacity 1.2s ease, transform 1.2s ease",
            }}
          >
            <p
              className="font-light tracking-[0.3em] uppercase text-sm text-white/40 mb-6"
              style={{ letterSpacing: "0.4em" }}
            >
              WizVid
            </p>
            <h1
              className="text-5xl md:text-7xl lg:text-8xl font-thin text-white"
              style={{
                fontFamily: "'Bebas Neue', 'Arial Narrow', sans-serif",
                letterSpacing: "0.05em",
                textShadow: "0 0 80px rgba(167,139,250,0.3)",
              }}
            >
              Your ideas...
            </h1>
          </div>
        )}

        {/* ── SCENE 2: "...become real" ── */}
        {scene === 2 && (
          <div
            className="text-center px-8"
            style={{
              opacity: textPhase >= 1 ? 1 : 0,
              transform: textPhase >= 1 ? "scale(1)" : "scale(0.95)",
              transition: "opacity 0.8s ease, transform 1.4s ease",
            }}
          >
            <h1
              className="text-5xl md:text-7xl lg:text-8xl font-thin"
              style={{
                fontFamily: "'Bebas Neue', 'Arial Narrow', sans-serif",
                letterSpacing: "0.05em",
                background: "linear-gradient(135deg, #fff 0%, #a78bfa 50%, #60a5fa 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                textShadow: "none",
                filter: "drop-shadow(0 0 40px rgba(167,139,250,0.5))",
              }}
            >
              ...become real
            </h1>
            {/* Beat pulse light */}
            {textPhase >= 1 && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: "radial-gradient(ellipse at 50% 50%, rgba(167,139,250,0.12) 0%, transparent 60%)",
                  animation: "beatPulse 1.2s ease-in-out infinite",
                  zIndex: -1,
                }}
              />
            )}
          </div>
        )}

        {/* ── SCENE 3: "Walking through fire" → world reacts ── */}
        {scene === 3 && (
          <div className="text-center px-8 relative">
            {/* The lyric text */}
            <div
              style={{
                opacity: textPhase >= 1 ? 1 : 0,
                transform: textPhase >= 1 ? "translateY(0)" : "translateY(16px)",
                transition: "opacity 0.5s ease, transform 0.5s ease",
              }}
            >
              <p
                className="text-white/30 text-sm tracking-[0.4em] uppercase mb-4"
              >
                {textPhase < 2 ? "input" : "reacting..."}
              </p>
              <h2
                className="text-4xl md:text-6xl lg:text-7xl font-thin text-white"
                style={{
                  fontFamily: "'Bebas Neue', 'Arial Narrow', sans-serif",
                  letterSpacing: "0.06em",
                  textShadow: textPhase >= 2
                    ? "0 0 60px rgba(255,107,53,0.8), 0 0 120px rgba(255,50,0,0.4)"
                    : "0 0 40px rgba(255,255,255,0.1)",
                  transition: "text-shadow 0.3s ease",
                  color: textPhase >= 2 ? "#ffb347" : "#fff",
                }}
              >
                Walking through fire
              </h2>
            </div>

            {/* Reaction indicator — appears immediately with fire */}
            {textPhase >= 2 && (
              <div
                className="mt-8 flex items-center justify-center gap-3"
                style={{
                  opacity: 1,
                  animation: "fadeInUp 0.3s ease forwards",
                }}
              >
                <div className="w-8 h-px bg-orange-400/60" />
                <span
                  className="text-orange-300/70 text-xs tracking-[0.3em] uppercase"
                >
                  AI understood
                </span>
                <div className="w-8 h-px bg-orange-400/60" />
              </div>
            )}
          </div>
        )}

        {/* ── SCENE 4: Character consistency — pure visual, no UI ── */}
        {scene === 4 && (
          <div
            className="flex items-center justify-center gap-0 w-full max-w-2xl px-8"
            style={{
              opacity: textPhase >= 1 ? 1 : 0,
              transition: "opacity 0.8s ease",
            }}
          >
            {/* Scene A — forest/dark */}
            <div
              className="relative overflow-hidden"
              style={{
                width: "42%",
                aspectRatio: "9/16",
                background: "linear-gradient(160deg, #0d1a0d 0%, #1a2a1a 40%, #0a0f0a 100%)",
                borderRadius: "12px 0 0 12px",
                boxShadow: "inset 0 0 40px rgba(0,0,0,0.8)",
              }}
            >
              {/* Character silhouette */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div style={{ position: "relative" }}>
                  {/* Head */}
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: "linear-gradient(135deg, #c8a882 0%, #a07850 100%)",
                    margin: "0 auto 4px",
                    boxShadow: "0 0 20px rgba(200,168,130,0.3)",
                  }} />
                  {/* Body — dark jacket */}
                  <div style={{
                    width: 56, height: 70,
                    background: "linear-gradient(180deg, #1a1a1a 0%, #111 100%)",
                    borderRadius: "8px 8px 4px 4px",
                    margin: "0 auto",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.6)",
                  }} />
                </div>
              </div>
              {/* Scene label */}
              <div className="absolute bottom-3 left-0 right-0 text-center">
                <span className="text-white/20 text-[10px] tracking-widest uppercase">Scene 1</span>
              </div>
              {/* Forest atmosphere */}
              <div style={{
                position: "absolute", inset: 0,
                background: "radial-gradient(ellipse at 50% 0%, rgba(30,60,30,0.4) 0%, transparent 60%)",
                pointerEvents: "none",
              }} />
            </div>

            {/* Divider */}
            <div style={{
              width: 2, height: "60%", alignSelf: "center",
              background: "linear-gradient(180deg, transparent, rgba(255,255,255,0.15), transparent)",
            }} />

            {/* Scene B — city/neon */}
            <div
              className="relative overflow-hidden"
              style={{
                width: "42%",
                aspectRatio: "9/16",
                background: "linear-gradient(160deg, #0a0a1a 0%, #0d0d2a 40%, #050510 100%)",
                borderRadius: "0 12px 12px 0",
                boxShadow: "inset 0 0 40px rgba(0,0,0,0.8)",
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <div style={{ position: "relative" }}>
                  {/* Same head */}
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: "linear-gradient(135deg, #c8a882 0%, #a07850 100%)",
                    margin: "0 auto 4px",
                    boxShadow: "0 0 20px rgba(167,139,250,0.4)",
                  }} />
                  {/* Same dark jacket */}
                  <div style={{
                    width: 56, height: 70,
                    background: "linear-gradient(180deg, #1a1a1a 0%, #111 100%)",
                    borderRadius: "8px 8px 4px 4px",
                    margin: "0 auto",
                    boxShadow: "0 4px 20px rgba(167,139,250,0.3)",
                  }} />
                </div>
              </div>
              <div className="absolute bottom-3 left-0 right-0 text-center">
                <span className="text-white/20 text-[10px] tracking-widest uppercase">Scene 8</span>
              </div>
              {/* City neon atmosphere */}
              <div style={{
                position: "absolute", inset: 0,
                background: "radial-gradient(ellipse at 50% 0%, rgba(167,139,250,0.2) 0%, transparent 60%)",
                pointerEvents: "none",
              }} />
            </div>
          </div>
        )}

        {/* ── SCENE 5: 3 rapid visual cuts ── */}
        {scene === 5 && (
          <div
            className="flex items-center justify-center gap-3 w-full max-w-3xl px-8"
            style={{
              opacity: textPhase >= 1 ? 1 : 0,
              transition: "opacity 0.4s ease",
            }}
          >
            {/* Cinematic 16:9 */}
            <div
              className="relative overflow-hidden flex-1"
              style={{
                aspectRatio: "16/9",
                background: "linear-gradient(135deg, #0a0a18 0%, #1a1030 50%, #0d0820 100%)",
                borderRadius: 8,
                opacity: textPhase >= 1 ? 1 : 0,
                transform: textPhase >= 1 ? "scale(1)" : "scale(0.9)",
                transition: "opacity 0.4s ease, transform 0.4s ease",
                boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)",
              }}
            >
              {/* Letterbox bars */}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "10%", background: "#000" }} />
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "10%", background: "#000" }} />
              {/* Cinematic light */}
              <div style={{
                position: "absolute", inset: 0,
                background: "radial-gradient(ellipse at 30% 50%, rgba(167,139,250,0.25) 0%, transparent 60%)",
              }} />
              {/* Character silhouette */}
              <div style={{
                position: "absolute", bottom: "15%", left: "25%",
                width: 20, height: 40,
                background: "rgba(0,0,0,0.8)",
                borderRadius: "4px 4px 2px 2px",
              }} />
            </div>

            {/* Vertical 9:16 */}
            <div
              className="relative overflow-hidden"
              style={{
                width: "18%",
                aspectRatio: "9/16",
                background: "linear-gradient(160deg, #1a0a1a 0%, #2a1030 50%, #0d0820 100%)",
                borderRadius: 8,
                opacity: textPhase >= 2 ? 1 : 0,
                transform: textPhase >= 2 ? "scale(1)" : "scale(0.9)",
                transition: "opacity 0.4s ease 0.2s, transform 0.4s ease 0.2s",
                boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)",
              }}
            >
              <div style={{
                position: "absolute", inset: 0,
                background: "radial-gradient(ellipse at 50% 30%, rgba(236,72,153,0.3) 0%, transparent 60%)",
              }} />
              {/* TikTok-style UI hint */}
              <div style={{
                position: "absolute", right: 6, top: "30%",
                display: "flex", flexDirection: "column", gap: 8,
              }}>
                {[1, 2, 3].map(i => (
                  <div key={i} style={{
                    width: 16, height: 16, borderRadius: "50%",
                    background: "rgba(255,255,255,0.15)",
                  }} />
                ))}
              </div>
            </div>

            {/* Kids / animated */}
            <div
              className="relative overflow-hidden flex-1"
              style={{
                aspectRatio: "16/9",
                background: "linear-gradient(135deg, #0a1a0a 0%, #1a2a10 50%, #0d1808 100%)",
                borderRadius: 8,
                opacity: textPhase >= 3 ? 1 : 0,
                transform: textPhase >= 3 ? "scale(1)" : "scale(0.9)",
                transition: "opacity 0.4s ease 0.4s, transform 0.4s ease 0.4s",
                boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)",
              }}
            >
              <div style={{
                position: "absolute", inset: 0,
                background: "radial-gradient(ellipse at 50% 80%, rgba(250,204,21,0.2) 0%, transparent 60%)",
              }} />
              {/* Cartoon-style sun */}
              <div style={{
                position: "absolute", top: "15%", right: "20%",
                width: 24, height: 24, borderRadius: "50%",
                background: "radial-gradient(circle, #fde68a 0%, #f59e0b 100%)",
                boxShadow: "0 0 20px rgba(245,158,11,0.6)",
              }} />
            </div>
          </div>
        )}

        {/* ── SCENE 6: Zoom out + headline + CTA ── */}
        {scene === 6 && (
          <div
            className="text-center px-8 flex flex-col items-center"
            style={{
              opacity: textPhase >= 1 ? 1 : 0,
              transform: textPhase >= 1 ? "scale(1)" : "scale(1.08)",
              transition: "opacity 1s ease, transform 1.5s ease",
            }}
          >
            {/* Polished video frame */}
            <div
              className="relative mb-10 overflow-hidden"
              style={{
                width: "min(560px, 80vw)",
                aspectRatio: "16/9",
                background: "linear-gradient(135deg, #0a0a18 0%, #1a1030 50%, #0d0820 100%)",
                borderRadius: 12,
                boxShadow: "0 0 0 1px rgba(255,255,255,0.08), 0 24px 80px rgba(0,0,0,0.8), 0 0 60px rgba(167,139,250,0.15)",
              }}
            >
              {/* Letterbox */}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "8%", background: "#000", zIndex: 2 }} />
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "8%", background: "#000", zIndex: 2 }} />
              {/* Cinematic scene */}
              <div style={{
                position: "absolute", inset: 0,
                background: "radial-gradient(ellipse at 30% 60%, rgba(167,139,250,0.3) 0%, transparent 50%), radial-gradient(ellipse at 70% 40%, rgba(96,165,250,0.2) 0%, transparent 50%)",
              }} />
              {/* Character */}
              <div style={{
                position: "absolute", bottom: "15%", left: "50%", transform: "translateX(-50%)",
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: "linear-gradient(135deg, #c8a882 0%, #a07850 100%)",
                  margin: "0 auto 3px",
                  boxShadow: "0 0 15px rgba(200,168,130,0.4)",
                }} />
                <div style={{
                  width: 44, height: 55,
                  background: "linear-gradient(180deg, #1a1a1a 0%, #111 100%)",
                  borderRadius: "6px 6px 3px 3px",
                  margin: "0 auto",
                }} />
              </div>
              {/* Scan line */}
              <div style={{
                position: "absolute", inset: 0, zIndex: 3,
                backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.03) 3px, rgba(0,0,0,0.03) 4px)",
              }} />
            </div>

            {/* Headline */}
            <h1
              className="text-3xl md:text-5xl font-thin text-white mb-4"
              style={{
                fontFamily: "'Bebas Neue', 'Arial Narrow', sans-serif",
                letterSpacing: "0.06em",
                textShadow: "0 0 60px rgba(167,139,250,0.3)",
              }}
            >
              Turn your ideas into cinematic video
            </h1>
            <p className="text-white/40 text-sm tracking-widest uppercase mb-10">
              AI that understands your content, lyrics and story
            </p>

            {/* CTA */}
            <button
              onClick={dismiss}
              className="relative px-10 py-4 text-sm font-medium tracking-[0.2em] uppercase text-white overflow-hidden group"
              style={{
                background: "linear-gradient(135deg, rgba(167,139,250,0.2) 0%, rgba(96,165,250,0.2) 100%)",
                border: "1px solid rgba(167,139,250,0.5)",
                borderRadius: 4,
                boxShadow: "0 0 30px rgba(167,139,250,0.2), inset 0 0 20px rgba(167,139,250,0.05)",
                animation: "ctaPulse 3s ease-in-out infinite",
              }}
            >
              <span className="relative z-10">Create Your First Video</span>
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background: "linear-gradient(135deg, rgba(167,139,250,0.3) 0%, rgba(96,165,250,0.3) 100%)",
                }}
              />
            </button>

            {/* Skip */}
            <button
              onClick={dismiss}
              className="mt-6 text-white/20 text-xs tracking-[0.3em] uppercase hover:text-white/40 transition-colors"
            >
              Skip intro
            </button>
          </div>
        )}
      </div>

      {/* Scene progress dots */}
      {scene < 6 && (
        <div
          className="absolute bottom-8 left-0 right-0 flex justify-center gap-2"
          style={{ zIndex: 20 }}
        >
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div
              key={i}
              style={{
                width: i === scene ? 20 : 4,
                height: 2,
                borderRadius: 2,
                background: i === scene ? "rgba(167,139,250,0.8)" : "rgba(255,255,255,0.15)",
                transition: "width 0.4s ease, background 0.4s ease",
              }}
            />
          ))}
        </div>
      )}

      {/* Skip button (always visible in early scenes) */}
      {scene < 6 && (
        <button
          onClick={dismiss}
          className="absolute top-6 right-6 text-white/20 text-xs tracking-[0.3em] uppercase hover:text-white/40 transition-colors"
          style={{ zIndex: 20 }}
        >
          Skip
        </button>
      )}

      {/* Keyframe styles */}
      <style>{`
        @keyframes fireGlow {
          from { opacity: 0.6; }
          to { opacity: 1; }
        }
        @keyframes lightningFlash {
          0%, 100% { opacity: 0; }
          8% { opacity: 1; }
          12% { opacity: 0; }
          16% { opacity: 0.7; }
          20% { opacity: 0; }
          55% { opacity: 0; }
          58% { opacity: 0.5; }
          62% { opacity: 0; }
        }
        @keyframes beatPulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
        @keyframes ctaPulse {
          0%, 100% { box-shadow: 0 0 30px rgba(167,139,250,0.2), inset 0 0 20px rgba(167,139,250,0.05); }
          50% { box-shadow: 0 0 50px rgba(167,139,250,0.4), inset 0 0 30px rgba(167,139,250,0.1); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
