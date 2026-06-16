/**
 * IntroScreen — Hybrid cinematic intro.
 *
 * Sequence:
 *   0.0s  → black screen
 *   0.4s  → ambient glow + particles + logo fade-in
 *   1.6s  → first showcase clip fades in as background; product label appears
 *   5.2s  → second clip crossfades; label transitions
 *   8.8s  → third clip crossfades; label transitions; Enter CTA slides up
 *  13.0s  → auto-dismiss
 */
import {
  useEffect, useRef, useState, useCallback, type CSSProperties,
} from "react";
import { ChevronRight } from "@/lib/icons";
import { INTRO_SESSION_KEY } from "@/lib/introReplay";
// ── Assets ────────────────────────────────────────────────────────────────────
const LOGO_URL = "/manus-storage/wizai-logo-v3_e7823047_6b9d9155.png";
const CDN      = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx";
const CLIPS = [
  { url: `${CDN}/showcase-music-video_19324f13.mp4`, product: "WizVideo™",   tagline: "AI Music Videos"   },
  { url: `${CDN}/showcase-anime_36099b49.mp4`,        product: "WizAnimate™", tagline: "AI Animation"       },
  { url: `${CDN}/showcase-cinematic_13667434.mp4`,   product: "WizScript™",  tagline: "AI Film Creation"   },
];
// ── Brand colours ─────────────────────────────────────────────────────────────
const GOLD      = "#c4a464";
const GOLD_LITE = "#e8c97a";
const GOLD_DEEP = "#8a6a20";
const BG        = "#04040e";
// ── Static particles ──────────────────────────────────────────────────────────
const PARTICLES: Array<{ x: number; y: number; size: number; opacity: number; dur: number; delay: number; drift: number }> = [
  { x: 6,  y: 72, size: 3, opacity: 0.50, dur: 7.2, delay: 0.0, drift:  16 },
  { x: 15, y: 50, size: 2, opacity: 0.38, dur: 9.1, delay: 0.6, drift: -12 },
  { x: 24, y: 85, size: 4, opacity: 0.60, dur: 6.8, delay: 1.2, drift:  20 },
  { x: 34, y: 38, size: 2, opacity: 0.35, dur: 8.4, delay: 0.3, drift: -14 },
  { x: 44, y: 65, size: 3, opacity: 0.45, dur: 7.6, delay: 1.8, drift:  12 },
  { x: 52, y: 20, size: 5, opacity: 0.65, dur: 6.2, delay: 0.0, drift:  10 },
  { x: 62, y: 78, size: 2, opacity: 0.38, dur: 8.8, delay: 2.1, drift: -20 },
  { x: 71, y: 45, size: 3, opacity: 0.50, dur: 7.4, delay: 0.7, drift:  16 },
  { x: 80, y: 88, size: 4, opacity: 0.55, dur: 6.9, delay: 1.5, drift: -10 },
  { x: 89, y: 32, size: 2, opacity: 0.40, dur: 9.2, delay: 0.4, drift:  18 },
  { x: 12, y: 18, size: 3, opacity: 0.45, dur: 7.3, delay: 2.0, drift: -12 },
  { x: 38, y: 12, size: 2, opacity: 0.38, dur: 8.2, delay: 0.5, drift:  22 },
  { x: 58, y: 92, size: 3, opacity: 0.42, dur: 9.4, delay: 0.6, drift:  16 },
  { x: 76, y: 16, size: 2, opacity: 0.40, dur: 7.1, delay: 0.8, drift: -14 },
  { x: 92, y: 60, size: 4, opacity: 0.55, dur: 6.5, delay: 1.7, drift: -18 },
];
// ── Waveform bars ─────────────────────────────────────────────────────────────
const BARS = Array.from({ length: 24 }, (_, i) => {
  const c = Math.abs(11.5 - i) / 11.5;
  return { baseH: 6 + (1 - c) * 20, peakH: 14 + (1 - c) * 36, dur: 0.5 + (i % 5) * 0.09, delay: (i % 7) * 0.07 };
});
// ── Types ─────────────────────────────────────────────────────────────────────
type Phase = "black" | "ambient" | "clips" | "cta";
export default function IntroScreen({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase]               = useState<Phase>("black");
  const [clipIdx, setClipIdx]           = useState(0);
  const [videoVisible, setVideoVisible] = useState(false);
  const [labelVisible, setLabelVisible] = useState(false);
  const [visible, setVisible]           = useState(true);
  const videoRef                        = useRef<HTMLVideoElement>(null);
  const dismissedRef                    = useRef(false);
  const autoTimerRef                    = useRef<ReturnType<typeof setTimeout> | null>(null);
  // ── Dismiss ──────────────────────────────────────────────────────────────
  const dismiss = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    localStorage.setItem(INTRO_SESSION_KEY, "1");
    setVisible(false);
    setTimeout(onComplete, 650);
  }, [onComplete]);
  // ── Advance clip (crossfade) ──────────────────────────────────────────────
  const advanceClip = useCallback((nextIdx: number) => {
    setLabelVisible(false);
    setVideoVisible(false);
    setTimeout(() => {
      setClipIdx(nextIdx);
      const vid = videoRef.current;
      if (vid) {
        vid.src = CLIPS[nextIdx].url;
        vid.load();
        vid.play().catch(() => {});
      }
      setVideoVisible(true);
      setTimeout(() => setLabelVisible(true), 300);
    }, 500);
  }, []);
  // ── Main timeline ─────────────────────────────────────────────────────────
  useEffect(() => {
    // Phase 1 — ambient glow + logo
    const t1 = setTimeout(() => setPhase("ambient"), 400);
    // Phase 2 — first clip
    const t2 = setTimeout(() => {
      setPhase("clips");
      const vid = videoRef.current;
      if (vid) {
        vid.src = CLIPS[0].url;
        vid.load();
        vid.play().catch(() => {});
      }
      setVideoVisible(true);
      setTimeout(() => setLabelVisible(true), 400);
    }, 1600);
    // Clip 2
    const t3 = setTimeout(() => advanceClip(1), 5200);
    // Clip 3 + CTA
    const t4 = setTimeout(() => {
      advanceClip(2);
      setTimeout(() => setPhase("cta"), 600);
    }, 8800);
    // Auto-dismiss
    autoTimerRef.current = setTimeout(dismiss, 13000);
    return () => {
      [t1, t2, t3, t4].forEach(clearTimeout);
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    };
  }, [dismiss, advanceClip]);
  const show = (...phases: Phase[]) => phases.includes(phase);
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 10000, background: BG, overflow: "hidden",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      opacity: visible ? 1 : 0, transition: "opacity 0.65s ease-in-out",
      pointerEvents: visible ? "auto" : "none",
    }}>
      <style>{`
        @keyframes intro-particle-rise {
          0%   { transform: translateY(0) translateX(0) scale(1); opacity: var(--p-op); }
          50%  { transform: translateY(-38px) translateX(var(--p-drift)) scale(1.2); opacity: calc(var(--p-op) * 1.35); }
          100% { transform: translateY(-80px) translateX(0) scale(0.6); opacity: 0; }
        }
        @keyframes intro-glow-breathe {
          0%,100% { opacity: 0.5; transform: scale(1); }
          50%      { opacity: 0.8; transform: scale(1.08); }
        }
        @keyframes intro-halo {
          0%,100% { opacity: 0.5; transform: scale(1); }
          50%      { opacity: 0.85; transform: scale(1.05); }
        }
        @keyframes intro-bar {
          0%,100% { height: var(--bar-base); }
          50%      { height: var(--bar-peak); }
        }
        @keyframes intro-scan {
          0%   { transform: translateY(-100%); opacity: 0; }
          8%   { opacity: 0.5; }
          92%  { opacity: 0.5; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
        @keyframes intro-shimmer {
          0%   { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        @keyframes intro-ring-breathe {
          0%,100% { transform: scale(1); opacity: 0.55; }
          50%      { transform: scale(1.06); opacity: 0.9; }
        }
        @keyframes intro-ring-pulse {
          0%   { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes intro-sweep {
          0%   { left: -40%; }
          100% { left: 140%; }
        }
        @keyframes intro-label-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      {/* ── Showcase video (background) ───────────────────────────────────── */}
      <video
        ref={videoRef}
        muted
        playsInline
        loop
        preload="none"
        style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          objectFit: "cover", objectPosition: "center",
          opacity: videoVisible ? 1 : 0,
          transition: "opacity 0.55s ease",
          zIndex: 0,
        }}
      />
      {/* Dark overlay on top of video — preserves readability of overlay content */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 1,
        background: `linear-gradient(to bottom, rgba(4,4,14,0.72) 0%, rgba(4,4,14,0.50) 40%, rgba(4,4,14,0.60) 70%, rgba(4,4,14,0.82) 100%)`,
      }} />
      {/* Gold vignette border */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none",
        boxShadow: `inset 0 0 80px 20px rgba(4,4,14,0.9), inset 0 0 2px 1px ${GOLD}33`,
      }} />
      {/* ── Ambient glow + particles ──────────────────────────────────────── */}
      <div style={{ position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none", opacity: show("ambient","clips","cta") ? 1 : 0, transition: "opacity 1.6s ease" }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "60vw", height: "60vw", maxWidth: 600, maxHeight: 600, borderRadius: "50%", background: `radial-gradient(ellipse at center, rgba(196,164,100,0.10) 0%, transparent 70%)`, animation: "intro-glow-breathe 4.5s ease-in-out infinite" }} />
        <div style={{ position: "absolute", left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${GOLD}44 30%, ${GOLD_LITE}66 50%, ${GOLD}44 70%, transparent)`, animation: "intro-scan 7s ease-in-out infinite", animationDelay: "1s" }} />
        {PARTICLES.map((p, i) => (
          <div key={i} style={{ position: "absolute", left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, borderRadius: "50%", background: i % 3 === 0 ? GOLD_LITE : i % 3 === 1 ? GOLD : "#fff", boxShadow: `0 0 ${p.size * 3}px ${p.size}px ${GOLD}55`, "--p-op": p.opacity, "--p-drift": `${p.drift}px`, animation: `intro-particle-rise ${p.dur}s ${p.delay}s ease-in-out infinite` } as CSSProperties} />
        ))}
      </div>
      {/* ── Centre content ────────────────────────────────────────────────── */}
      <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: 0, width: "100%" }}>
        {/* Logo */}
        <div style={{ position: "relative", marginBottom: 20 }}>
          <div style={{ position: "absolute", inset: -20, borderRadius: "50%", background: `radial-gradient(ellipse at center, ${GOLD}1A 0%, transparent 70%)`, animation: show("ambient","clips","cta") ? "intro-halo 3s ease-in-out infinite" : "none", opacity: show("ambient","clips","cta") ? 1 : 0, transition: "opacity 1s ease" }} />
          <img
            src={LOGO_URL} alt="WIZ AI"
            style={{
              width: "clamp(100px, 18vw, 180px)", height: "auto", display: "block",
              filter: show("ambient","clips","cta") ? `drop-shadow(0 0 20px ${GOLD}99) drop-shadow(0 0 44px ${GOLD}44)` : "none",
              opacity: show("ambient","clips","cta") ? 1 : 0,
              transform: show("ambient","clips","cta") ? "scale(1) translateY(0)" : "scale(0.84) translateY(14px)",
              transition: "opacity 0.9s cubic-bezier(0.16,1,0.3,1), transform 0.9s cubic-bezier(0.16,1,0.3,1), filter 1.2s ease",
            }}
          />
        </div>
        {/* Product label — changes with each clip */}
        <div style={{ height: 52, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
          {show("clips","cta") && (
            <div key={clipIdx} style={{ textAlign: "center", animation: labelVisible ? "intro-label-in 0.5s ease forwards" : "none", opacity: labelVisible ? 1 : 0 }}>
              <div style={{ color: GOLD_LITE, fontSize: "clamp(0.9rem, 2vw, 1.1rem)", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", textShadow: `0 0 24px ${GOLD}99`, marginBottom: 4 }}>
                {CLIPS[clipIdx].product}
              </div>
              <div style={{ color: "rgba(255,255,255,0.55)", fontSize: "clamp(0.6rem, 1.2vw, 0.72rem)", fontWeight: 500, letterSpacing: "0.22em", textTransform: "uppercase" }}>
                {CLIPS[clipIdx].tagline}
              </div>
            </div>
          )}
        </div>
        {/* Waveform — visible during clips and cta phases */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: "clamp(2px,0.4vw,3px)", height: 48, marginBottom: 28, opacity: show("clips","cta") ? 0.75 : 0, transition: "opacity 0.8s ease" }}>
          {BARS.map((bar, i) => (
            <div key={i} style={{ width: "clamp(2px,0.5vw,4px)", borderRadius: 2, background: i % 3 === 0 ? `linear-gradient(to top,${GOLD_DEEP},${GOLD_LITE})` : `linear-gradient(to top,${GOLD_DEEP},${GOLD})`, height: `${bar.baseH}px`, "--bar-base": `${bar.baseH}px`, "--bar-peak": `${bar.peakH}px`, animation: show("clips","cta") ? `intro-bar ${bar.dur}s ${bar.delay}s ease-in-out infinite` : "none" } as CSSProperties} />
          ))}
        </div>
        {/* CTA */}
        <div style={{ opacity: show("cta") ? 1 : 0, transform: show("cta") ? "translateY(0)" : "translateY(24px)", transition: "opacity 0.75s ease, transform 0.75s ease", pointerEvents: show("cta") ? "auto" : "none" }}>
          <div style={{ position: "relative" }}>
            {[
              { left:"-52px", delay:"0s",   dur:"2.2s", size:5, color:GOLD_LITE },
              { left:"-26px", delay:"0.4s", dur:"1.8s", size:3, color:"#fff"    },
              { left: "10px", delay:"0.8s", dur:"2.5s", size:4, color:GOLD      },
              { left: "40px", delay:"0.2s", dur:"2.0s", size:3, color:GOLD_LITE },
              { left: "66px", delay:"1.1s", dur:"1.9s", size:5, color:"#fff"    },
              { left:"-44px", delay:"1.5s", dur:"2.3s", size:3, color:GOLD      },
              { left: "20px", delay:"0.6s", dur:"2.1s", size:4, color:GOLD_LITE },
            ].map((s,i) => (
              <div key={i} style={{ position:"absolute", left:s.left, bottom:6, width:s.size, height:s.size, borderRadius:"50%", background:s.color, boxShadow:`0 0 6px 2px ${s.color}88`, animation:`enter-btn-sparkle ${s.dur} ${s.delay} ease-out infinite`, pointerEvents:"none" }} />
            ))}
            <div style={{ position:"absolute", inset:-10, borderRadius:9999, border:`1.5px solid rgba(196,164,100,0.50)`, animation:"intro-ring-breathe 2.4s ease-in-out infinite", pointerEvents:"none" }} />
            <div style={{ position:"absolute", inset:-6, borderRadius:9999, border:`2px solid rgba(232,201,122,0.65)`, animation:"intro-ring-pulse 1.8s ease-out infinite", pointerEvents:"none" }} />
            <button
              onClick={dismiss}
              aria-label="Enter WIZ AI"
              style={{ display:"flex", alignItems:"center", gap:16, padding:"1rem 3rem", borderRadius:9999, border:"none", cursor:"pointer", background:`linear-gradient(105deg,${GOLD_DEEP} 0%,${GOLD} 20%,#f0d98a 45%,${GOLD_LITE} 55%,${GOLD} 75%,${GOLD_DEEP} 100%)`, backgroundSize:"300% 100%", animation:"intro-shimmer 3s linear infinite", boxShadow:`0 0 0 1px rgba(255,255,255,0.18),0 0 28px ${GOLD}88,0 0 60px ${GOLD}44,inset 0 1px 0 rgba(255,255,255,0.35),inset 0 -1px 0 rgba(0,0,0,0.20)`, color:"#0a0a0f", fontWeight:900, fontSize:"clamp(0.8rem,1.5vw,0.95rem)", letterSpacing:"0.22em", textTransform:"uppercase", overflow:"hidden", position:"relative" }}
            >
              <span style={{ position:"absolute", top:0, bottom:0, width:"40%", background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.28),transparent)", animation:"intro-sweep 2.8s ease-in-out infinite", pointerEvents:"none" }} />
              <span style={{ position:"relative", textShadow:"0 1px 0 rgba(255,255,255,0.3),0 -1px 0 rgba(0,0,0,0.15)" }}>Enter WIZ AI</span>
              <ChevronRight style={{ position:"relative", width:20, height:20 }} />
            </button>
          </div>
        </div>
      </div>
      {/* ── Skip ─────────────────────────────────────────────────────────── */}
      <button
        onClick={dismiss}
        aria-label="Skip intro"
        style={{ position:"absolute", top:"max(env(safe-area-inset-top),1.25rem)", right:"max(env(safe-area-inset-right),1.25rem)", zIndex:20, background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.35)", fontSize:"0.7rem", fontWeight:500, letterSpacing:"0.20em", textTransform:"uppercase", padding:"0.5rem 0.75rem", opacity:show("ambient","clips","cta") ? 1 : 0, transition:"opacity 0.6s ease, color 0.2s ease" }}
        onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.75)")}
        onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}
      >
        Skip Intro
      </button>
    </div>
  );
}
