/**
 * CinematicIntroScreen — Programmatic cinematic intro (no video file required).
 *
 * Animation sequence:
 *   0.0s  → black screen
 *   0.4s  → background glow + particles fade in
 *   1.0s  → WIZ AI logo scales & fades in with golden halo
 *   2.4s  → waveform bars animate in + tagline appears
 *   4.4s  → "Enter WIZ AI" CTA slides up
 *   8.5s  → auto-dismiss if user hasn't clicked
 *
 * Session-gated via INTRO_SESSION_KEY (once per device via localStorage).
 */

import { useEffect, useRef, useState, useCallback, type CSSProperties } from "react";
import { ChevronRight } from "@/lib/icons";
import { INTRO_SESSION_KEY } from "@/lib/introReplay";

const LOGO_URL = "/manus-storage/wizai-logo-v3_e7823047_6b9d9155.png";

const GOLD      = "#c4a464";
const GOLD_LITE = "#e8c97a";
const GOLD_DEEP = "#8a6a20";
const BG        = "#04040e";

const PARTICLES: Array<{
  x: number; y: number; size: number; opacity: number;
  dur: number; delay: number; drift: number;
}> = [
  { x: 8,  y: 75, size: 3, opacity: 0.55, dur: 7.2, delay: 0.0, drift:  18 },
  { x: 14, y: 55, size: 2, opacity: 0.40, dur: 9.1, delay: 0.6, drift: -12 },
  { x: 21, y: 82, size: 4, opacity: 0.65, dur: 6.8, delay: 1.2, drift:  22 },
  { x: 28, y: 40, size: 2, opacity: 0.35, dur: 8.4, delay: 0.3, drift: -16 },
  { x: 35, y: 68, size: 3, opacity: 0.50, dur: 7.6, delay: 1.8, drift:  14 },
  { x: 42, y: 88, size: 2, opacity: 0.45, dur: 9.5, delay: 0.9, drift: -20 },
  { x: 48, y: 30, size: 5, opacity: 0.70, dur: 6.2, delay: 0.0, drift:  10 },
  { x: 55, y: 72, size: 2, opacity: 0.38, dur: 8.8, delay: 2.1, drift: -24 },
  { x: 62, y: 50, size: 3, opacity: 0.55, dur: 7.4, delay: 0.7, drift:  18 },
  { x: 68, y: 85, size: 4, opacity: 0.60, dur: 6.9, delay: 1.5, drift: -12 },
  { x: 75, y: 38, size: 2, opacity: 0.42, dur: 9.2, delay: 0.4, drift:  20 },
  { x: 81, y: 65, size: 3, opacity: 0.50, dur: 7.8, delay: 2.4, drift: -18 },
  { x: 88, y: 78, size: 2, opacity: 0.38, dur: 8.6, delay: 1.1, drift:  16 },
  { x: 93, y: 45, size: 4, opacity: 0.62, dur: 6.5, delay: 0.8, drift: -22 },
  { x: 5,  y: 35, size: 2, opacity: 0.35, dur: 9.0, delay: 1.6, drift:  12 },
  { x: 18, y: 20, size: 3, opacity: 0.48, dur: 7.3, delay: 2.0, drift: -14 },
  { x: 32, y: 15, size: 2, opacity: 0.40, dur: 8.2, delay: 0.5, drift:  24 },
  { x: 50, y: 10, size: 5, opacity: 0.72, dur: 6.4, delay: 0.2, drift: -10 },
  { x: 65, y: 22, size: 2, opacity: 0.38, dur: 9.3, delay: 1.9, drift:  20 },
  { x: 78, y: 18, size: 3, opacity: 0.52, dur: 7.1, delay: 0.8, drift: -16 },
  { x: 90, y: 28, size: 2, opacity: 0.42, dur: 8.7, delay: 2.2, drift:  14 },
  { x: 25, y: 92, size: 3, opacity: 0.45, dur: 7.5, delay: 1.3, drift: -20 },
  { x: 58, y: 95, size: 2, opacity: 0.38, dur: 9.4, delay: 0.6, drift:  18 },
  { x: 85, y: 90, size: 4, opacity: 0.58, dur: 6.7, delay: 1.7, drift: -12 },
];

const BARS = Array.from({ length: 32 }, (_, i) => {
  const center = Math.abs(15.5 - i) / 15.5;
  const baseH  = 8  + (1 - center) * 28;
  const peakH  = 18 + (1 - center) * 48;
  const dur    = 0.55 + (i % 5) * 0.09;
  const delay  = (i % 7) * 0.07;
  return { baseH, peakH, dur, delay };
});

type Phase = "black" | "glow" | "logo" | "tagline" | "cta";

export default function CinematicIntroScreen({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase]     = useState<Phase>("black");
  const [visible, setVisible] = useState(true);
  const dismissedRef          = useRef(false);
  const autoTimerRef          = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    localStorage.setItem(INTRO_SESSION_KEY, "1");
    setVisible(false);
    setTimeout(onComplete, 650);
  }, [onComplete]);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("glow"),    400);
    const t2 = setTimeout(() => setPhase("logo"),   1000);
    const t3 = setTimeout(() => setPhase("tagline"),2400);
    const t4 = setTimeout(() => setPhase("cta"),    4400);
    autoTimerRef.current = setTimeout(dismiss,       8500);
    return () => {
      [t1, t2, t3, t4].forEach(clearTimeout);
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    };
  }, [dismiss]);

  const after = (p: Phase, phases: Phase[]) => phases.includes(p);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 10000,
        background: BG,
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.65s ease-in-out",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <style>{`
        @keyframes intro-particle-rise {
          0%   { transform: translateY(0) translateX(0) scale(1); opacity: var(--p-op); }
          50%  { transform: translateY(-38px) translateX(var(--p-drift)) scale(1.2); opacity: calc(var(--p-op) * 1.4); }
          100% { transform: translateY(-80px) translateX(0) scale(0.7); opacity: 0; }
        }
        @keyframes intro-bg-breathe {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50%       { opacity: 0.80; transform: scale(1.08); }
        }
        @keyframes intro-logo-halo {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50%       { opacity: 0.85; transform: scale(1.04); }
        }
        @keyframes intro-bar {
          0%, 100% { height: var(--bar-base); }
          50%       { height: var(--bar-peak); }
        }
        @keyframes intro-scanline {
          0%   { transform: translateY(-100%); opacity: 0; }
          10%  { opacity: 0.6; }
          90%  { opacity: 0.6; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
        @keyframes intro-cta-shimmer {
          0%   { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        @keyframes intro-cta-ring-breathe {
          0%, 100% { transform: scale(1); opacity: 0.55; }
          50%       { transform: scale(1.06); opacity: 0.90; }
        }
        @keyframes intro-cta-ring-pulse {
          0%   { transform: scale(1); opacity: 0.80; }
          100% { transform: scale(1.45); opacity: 0; }
        }
        @keyframes intro-cta-sweep {
          0%   { left: -40%; }
          100% { left: 140%; }
        }
        @keyframes enter-btn-sparkle {
          0%   { transform: translateY(0) scale(1); opacity: 0.9; }
          60%  { transform: translateY(-28px) scale(1.3); opacity: 0.6; }
          100% { transform: translateY(-55px) scale(0.5); opacity: 0; }
        }
      `}</style>

      {/* Background glow */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        opacity: after(phase, ["glow","logo","tagline","cta"]) ? 1 : 0,
        transition: "opacity 1.8s ease",
      }}>
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%,-50%)",
          width: "70vw", height: "70vw", maxWidth: 700, maxHeight: 700,
          borderRadius: "50%",
          background: `radial-gradient(ellipse at center, rgba(196,164,100,0.14) 0%, rgba(196,164,100,0.04) 50%, transparent 75%)`,
          animation: "intro-bg-breathe 4.5s ease-in-out infinite",
        }} />
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%,-50%)",
          width: "100vw", height: "100vh",
          background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(80,40,120,0.10) 0%, transparent 70%)",
        }} />
        <div style={{
          position: "absolute", left: 0, right: 0, height: 1,
          background: `linear-gradient(90deg, transparent 0%, ${GOLD}55 30%, ${GOLD_LITE}88 50%, ${GOLD}55 70%, transparent 100%)`,
          animation: "intro-scanline 6s ease-in-out infinite",
          animationDelay: "1.2s",
        }} />
      </div>

      {/* Particles */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        opacity: after(phase, ["glow","logo","tagline","cta"]) ? 1 : 0,
        transition: "opacity 2s ease",
      }}>
        {PARTICLES.map((p, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              background: i % 3 === 0 ? GOLD_LITE : i % 3 === 1 ? GOLD : "#fff",
              boxShadow: `0 0 ${p.size * 3}px ${p.size}px ${GOLD}66`,
              "--p-op": p.opacity,
              "--p-drift": `${p.drift}px`,
              animation: `intro-particle-rise ${p.dur}s ${p.delay}s ease-in-out infinite`,
            } as CSSProperties}
          />
        ))}
      </div>

      {/* Centre stack */}
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>

        {/* Logo */}
        <div style={{ position: "relative", marginBottom: 28 }}>
          <div style={{
            position: "absolute", inset: -24, borderRadius: "50%",
            background: `radial-gradient(ellipse at center, ${GOLD}22 0%, ${GOLD}08 50%, transparent 75%)`,
            animation: after(phase, ["logo","tagline","cta"]) ? "intro-logo-halo 3s ease-in-out infinite" : "none",
            opacity: after(phase, ["logo","tagline","cta"]) ? 1 : 0,
            transition: "opacity 1s ease",
          }} />
          <img
            src={LOGO_URL}
            alt="WIZ AI"
            style={{
              width: "clamp(120px, 22vw, 220px)",
              height: "auto",
              display: "block",
              filter: after(phase, ["logo","tagline","cta"])
                ? `drop-shadow(0 0 22px ${GOLD}99) drop-shadow(0 0 50px ${GOLD}44)`
                : "none",
              opacity: after(phase, ["logo","tagline","cta"]) ? 1 : 0,
              transform: after(phase, ["logo","tagline","cta"])
                ? "scale(1) translateY(0)"
                : "scale(0.82) translateY(16px)",
              transition: "opacity 0.9s cubic-bezier(0.16,1,0.3,1), transform 0.9s cubic-bezier(0.16,1,0.3,1), filter 1.2s ease",
            }}
          />
        </div>

        {/* Waveform */}
        <div style={{
          display: "flex", alignItems: "flex-end",
          gap: "clamp(2px, 0.5vw, 4px)",
          height: 64, marginBottom: 24,
          opacity: after(phase, ["tagline","cta"]) ? 1 : 0,
          transform: after(phase, ["tagline","cta"]) ? "translateY(0)" : "translateY(12px)",
          transition: "opacity 0.8s ease, transform 0.8s ease",
        }}>
          {BARS.map((bar, i) => (
            <div
              key={i}
              style={{
                width: "clamp(2px, 0.6vw, 5px)",
                borderRadius: 3,
                background: i % 4 === 0
                  ? `linear-gradient(to top, ${GOLD_DEEP}, ${GOLD_LITE})`
                  : i % 4 === 1
                  ? `linear-gradient(to top, ${GOLD_DEEP}, ${GOLD})`
                  : i % 4 === 2
                  ? `linear-gradient(to top, ${GOLD_DEEP}, ${GOLD_LITE}99)`
                  : `linear-gradient(to top, ${GOLD_DEEP}, #fff8)`,
                boxShadow: i % 5 === 0 ? `0 0 6px ${GOLD}88` : "none",
                "--bar-base": `${bar.baseH}px`,
                "--bar-peak": `${bar.peakH}px`,
                height: `${bar.baseH}px`,
                animation: after(phase, ["tagline","cta"])
                  ? `intro-bar ${bar.dur}s ${bar.delay}s ease-in-out infinite`
                  : "none",
              } as CSSProperties}
            />
          ))}
        </div>

        {/* Tagline */}
        <p style={{
          margin: "0 0 48px",
          color: GOLD,
          fontSize: "clamp(0.55rem, 1.4vw, 0.82rem)",
          fontWeight: 600,
          textTransform: "uppercase",
          opacity: after(phase, ["tagline","cta"]) ? 1 : 0,
          letterSpacing: after(phase, ["tagline","cta"]) ? "0.30em" : "0.6em",
          transition: "opacity 1.1s ease, letter-spacing 1.1s ease",
          textShadow: `0 0 20px ${GOLD}88`,
          whiteSpace: "nowrap",
        }}>
          The Future of Music Video Creation
        </p>

        {/* CTA */}
        <div style={{
          opacity: after(phase, ["cta"]) ? 1 : 0,
          transform: after(phase, ["cta"]) ? "translateY(0)" : "translateY(28px)",
          transition: "opacity 0.75s ease, transform 0.75s ease",
          pointerEvents: after(phase, ["cta"]) ? "auto" : "none",
        }}>
          <div style={{ position: "relative" }}>
            {/* Sparkle particles */}
            {[
              { left: "-55px", delay: "0s",   dur: "2.2s", size: 5, color: GOLD_LITE },
              { left: "-28px", delay: "0.4s", dur: "1.8s", size: 3, color: "#fff"    },
              { left:  "10px", delay: "0.8s", dur: "2.5s", size: 4, color: GOLD      },
              { left:  "42px", delay: "0.2s", dur: "2.0s", size: 3, color: GOLD_LITE },
              { left:  "68px", delay: "1.1s", dur: "1.9s", size: 5, color: "#fff"    },
              { left: "-46px", delay: "1.5s", dur: "2.3s", size: 3, color: GOLD      },
              { left:  "22px", delay: "0.6s", dur: "2.1s", size: 4, color: GOLD_LITE },
            ].map((s, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: s.left,
                  bottom: 6,
                  width: s.size,
                  height: s.size,
                  borderRadius: "50%",
                  background: s.color,
                  boxShadow: `0 0 6px 2px ${s.color}88`,
                  animation: `enter-btn-sparkle ${s.dur} ${s.delay} ease-out infinite`,
                  pointerEvents: "none",
                }}
              />
            ))}
            {/* Breathing ring */}
            <div style={{
              position: "absolute", inset: -10, borderRadius: 9999,
              border: "1.5px solid rgba(196,164,100,0.50)",
              animation: "intro-cta-ring-breathe 2.4s ease-in-out infinite",
              pointerEvents: "none",
            }} />
            {/* Pulse ring */}
            <div style={{
              position: "absolute", inset: -6, borderRadius: 9999,
              border: "2px solid rgba(232,201,122,0.65)",
              animation: "intro-cta-ring-pulse 1.8s ease-out infinite",
              pointerEvents: "none",
            }} />
            <button
              onClick={dismiss}
              aria-label="Enter WIZ AI"
              style={{
                display: "flex", alignItems: "center", gap: 16,
                padding: "1rem 3rem",
                borderRadius: 9999,
                border: "none",
                cursor: "pointer",
                background: `linear-gradient(105deg, ${GOLD_DEEP} 0%, ${GOLD} 20%, #f0d98a 45%, ${GOLD_LITE} 55%, ${GOLD} 75%, ${GOLD_DEEP} 100%)`,
                backgroundSize: "300% 100%",
                animation: "intro-cta-shimmer 3s linear infinite",
                boxShadow: [
                  "0 0 0 1px rgba(255,255,255,0.18)",
                  `0 0 28px ${GOLD}88`,
                  `0 0 60px ${GOLD}44`,
                  "inset 0 1px 0 rgba(255,255,255,0.35)",
                  "inset 0 -1px 0 rgba(0,0,0,0.20)",
                ].join(", "),
                color: "#0a0a0f",
                fontWeight: 900,
                fontSize: "clamp(0.8rem, 1.5vw, 0.95rem)",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                overflow: "hidden",
                position: "relative",
              }}
            >
              {/* Light sweep */}
              <span style={{
                position: "absolute", top: 0, bottom: 0, width: "40%",
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.28), transparent)",
                animation: "intro-cta-sweep 2.8s ease-in-out infinite",
                pointerEvents: "none",
              }} />
              <span style={{
                position: "relative",
                textShadow: "0 1px 0 rgba(255,255,255,0.3), 0 -1px 0 rgba(0,0,0,0.15)",
              }}>
                Enter WIZ AI
              </span>
              <ChevronRight style={{ position: "relative", width: 20, height: 20 }} />
            </button>
          </div>
        </div>
      </div>

      {/* Skip Intro — top-right */}
      <button
        onClick={dismiss}
        style={{
          position: "absolute",
          top: "max(env(safe-area-inset-top), 1.25rem)",
          right: "max(env(safe-area-inset-right), 1.25rem)",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "rgba(255,255,255,0.35)",
          fontSize: "0.7rem",
          fontWeight: 500,
          letterSpacing: "0.20em",
          textTransform: "uppercase",
          padding: "0.5rem 0.75rem",
          opacity: after(phase, ["glow","logo","tagline","cta"]) ? 1 : 0,
          transition: "opacity 0.6s ease, color 0.2s ease",
        }}
        onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.75)")}
        onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}
        aria-label="Skip intro"
      >
        Skip Intro
      </button>
    </div>
  );
}
