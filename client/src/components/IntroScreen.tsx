/**
 * IntroScreen — Cinematic intro with showcase video reel.
 *
 * Sequence:
 *   0.0s  → black
 *   0.4s  → ambient glow + particles + logo
 *   1.6s  → WizVideo™ clip fades in as full-screen background
 *   5.2s  → WizAnimate™ clip crossfades
 *   8.8s  → WizScript™ clip crossfades + "Enter WIZ AI" CTA slides up
 *  13.0s  → auto-dismiss
 */

import { useEffect, useRef, useState, useCallback, type CSSProperties } from "react";
import { ChevronRight } from "@/lib/icons";
import { INTRO_SESSION_KEY } from "@/lib/introReplay";

const CDN = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx";

const CLIPS = [
  { url: `${CDN}/showcase-music-video_19324f13.mp4`, product: "WizVideo™",   tagline: "AI Music Videos"  },
  { url: `${CDN}/showcase-anime_36099b49.mp4`,        product: "WizAnimate™", tagline: "AI Animation"      },
  { url: `${CDN}/showcase-cinematic_13667434.mp4`,   product: "WizScript™",  tagline: "AI Film Creation"  },
];

const GOLD      = "#c4a464";
const GOLD_LITE = "#e8c97a";
const GOLD_DEEP = "#8a6a20";
const BG        = "#04040e";

const PARTICLES: Array<{ x: number; y: number; size: number; opacity: number; dur: number; delay: number; drift: number }> = [
  { x:  6, y: 72, size: 3, opacity: 0.50, dur: 7.2, delay: 0.0, drift:  16 },
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
  { x: 28, y: 55, size: 2, opacity: 0.38, dur: 8.6, delay: 1.1, drift:  14 },
  { x: 47, y:  8, size: 3, opacity: 0.50, dur: 7.9, delay: 2.3, drift: -16 },
  { x: 67, y: 95, size: 2, opacity: 0.35, dur: 9.0, delay: 0.9, drift:  12 },
  { x: 85, y: 75, size: 3, opacity: 0.48, dur: 7.5, delay: 1.4, drift: -20 },
  { x:  3, y: 42, size: 2, opacity: 0.40, dur: 8.3, delay: 0.2, drift:  18 },
];

const BARS = Array.from({ length: 28 }, (_, i) => {
  const c = Math.abs(13.5 - i) / 13.5;
  return { baseH: 5 + (1 - c) * 22, peakH: 12 + (1 - c) * 40, dur: 0.50 + (i % 5) * 0.09, delay: (i % 7) * 0.07 };
});

type Phase = "black" | "ambient" | "clips" | "cta";

export default function IntroScreen({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase]               = useState<Phase>("black");
  const [clipIdx, setClipIdx]           = useState(0);
  const [videoVisible, setVideoVisible] = useState(false);
  const [labelKey, setLabelKey]         = useState(0);
  const [labelVisible, setLabelVisible] = useState(false);
  const [muted, setMuted]               = useState(true);
  const [visible, setVisible]           = useState(true);
  const videoRef                        = useRef<HTMLVideoElement>(null);
  const timersRef                       = useRef<ReturnType<typeof setTimeout>[]>([]);
  const dismissedRef                    = useRef(false);

  const clearAll = () => timersRef.current.forEach(clearTimeout);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  const toggleMute = useCallback(() => {
    setMuted(m => {
      const next = !m;
      if (videoRef.current) videoRef.current.muted = next;
      return next;
    });
  }, []);

  const dismiss = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    clearAll();
    const vid = videoRef.current;
    if (vid) vid.pause();
    sessionStorage.setItem(INTRO_SESSION_KEY, "1");
    setVisible(false);
    setTimeout(onComplete, 650);
  }, [onComplete]);

  const advanceClip = useCallback((nextIdx: number) => {
    setLabelVisible(false);
    setVideoVisible(false);
    const t = setTimeout(() => {
      setClipIdx(nextIdx);
      setLabelKey(k => k + 1);
      const vid = videoRef.current;
      if (vid) { vid.src = CLIPS[nextIdx].url; vid.load(); vid.play().catch(() => {}); }
      setVideoVisible(true);
      setTimeout(() => setLabelVisible(true), 350);
    }, 500);
    timersRef.current.push(t);
  }, []);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("ambient"), 400);
    const t2 = setTimeout(() => {
      setPhase("clips");
      const vid = videoRef.current;
      if (vid) { vid.src = CLIPS[0].url; vid.load(); vid.play().catch(() => {}); }
      setVideoVisible(true);
      setLabelKey(k => k + 1);
      setTimeout(() => setLabelVisible(true), 400);
    }, 1600);
    const t3 = setTimeout(() => advanceClip(1), 5200);
    const t4 = setTimeout(() => { advanceClip(2); setTimeout(() => setPhase("cta"), 600); }, 8800);
    const t5 = setTimeout(dismiss, 13000);
    timersRef.current = [t1, t2, t3, t4, t5];
    return () => clearAll();
  }, [dismiss, advanceClip]);

  const show = (...phases: Phase[]) => phases.includes(phase);

  return (
    <div style={{
      position: "fixed", inset: 0, background: BG, overflow: "hidden",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      opacity: visible ? 1 : 0,
      transition: "opacity 0.65s ease-in-out",
      pointerEvents: visible ? "auto" : "none",
      zIndex: 9999,
    }}>
      <style>{`
        @keyframes wi-particle {
          0%   { transform: translateY(0) translateX(0) scale(1); opacity: var(--p-op); }
          50%  { transform: translateY(-40px) translateX(var(--p-drift)) scale(1.25); opacity: calc(var(--p-op) * 1.4); }
          100% { transform: translateY(-85px) translateX(0) scale(0.6); opacity: 0; }
        }
        @keyframes wi-glow-breathe {
          0%,100% { opacity: 0.45; transform: scale(1);    }
          50%      { opacity: 0.80; transform: scale(1.10); }
        }
        @keyframes wi-halo {
          0%,100% { opacity: 0.45; transform: scale(1);    }
          50%      { opacity: 0.85; transform: scale(1.06); }
        }
        @keyframes wi-bar {
          0%,100% { height: var(--bar-base); }
          50%      { height: var(--bar-peak); }
        }
        @keyframes wi-scan {
          0%   { transform: translateY(-100%); opacity: 0;  }
          8%   { opacity: 0.5; }
          92%  { opacity: 0.5; }
          100% { transform: translateY(100vh);  opacity: 0; }
        }
        @keyframes wi-shimmer {
          0%   { background-position: 0%   50%; }
          100% { background-position: 200% 50%; }
        }
        @keyframes wi-ring-breathe {
          0%,100% { transform: scale(1);    opacity: 0.55; }
          50%      { transform: scale(1.07); opacity: 0.90; }
        }
        @keyframes wi-ring-pulse {
          0%   { transform: scale(1);    opacity: 0.80; }
          100% { transform: scale(1.55); opacity: 0;    }
        }
        @keyframes wi-sweep {
          0%   { left: -40%; }
          100% { left: 140%; }
        }
        @keyframes wi-label-in {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes wi-sparkle {
          0%   { transform: translateY(0)     scale(1);   opacity: 1;   }
          80%  { transform: translateY(-28px) scale(0.5); opacity: 0.6; }
          100% { transform: translateY(-36px) scale(0);   opacity: 0;   }
        }
      `}</style>

      {/* Full-screen background video */}
      <video
        ref={videoRef}
        muted={muted}
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

      {/* Cinematic dark overlay */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 1,
        background: `linear-gradient(to bottom, rgba(4,4,14,0.78) 0%, rgba(4,4,14,0.48) 35%, rgba(4,4,14,0.52) 65%, rgba(4,4,14,0.85) 100%)`,
      }} />

      {/* Gold edge vignette */}
      <div style={{ position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none", boxShadow: `inset 0 0 90px 28px rgba(4,4,14,0.95), inset 0 0 2px 1px ${GOLD}22` }} />

      {/* Ambient glow + scanline + particles */}
      <div style={{ position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none", opacity: show("ambient","clips","cta") ? 1 : 0, transition: "opacity 1.6s ease" }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "65vw", height: "65vw", maxWidth: 640, maxHeight: 640, borderRadius: "50%", background: `radial-gradient(ellipse at center, rgba(196,164,100,0.12) 0%, transparent 70%)`, animation: "wi-glow-breathe 4.8s ease-in-out infinite" }} />
        <div style={{ position: "absolute", left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${GOLD}44 28%, ${GOLD_LITE}66 50%, ${GOLD}44 72%, transparent)`, animation: "wi-scan 7s ease-in-out 1.2s infinite" }} />
        {PARTICLES.map((p, i) => (
          <div key={i} style={{ position: "absolute", left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, borderRadius: "50%", background: i % 3 === 0 ? GOLD_LITE : i % 3 === 1 ? GOLD : "#ffffffcc", boxShadow: `0 0 ${p.size * 3}px ${p.size}px ${GOLD}55`, "--p-op": p.opacity, "--p-drift": `${p.drift}px`, animation: `wi-particle ${p.dur}s ${p.delay}s ease-in-out infinite` } as CSSProperties} />
        ))}
      </div>

      {/* Centre overlay — lower third clears singer's face */}
      <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", width: "100%", paddingTop: "36vh" }}>

        {/* Logo */}
        <div style={{ position: "relative", marginBottom: 12 }}>
          <div style={{ position: "absolute", inset: -32, borderRadius: "50%", background: `radial-gradient(ellipse at center, ${GOLD}1A 0%, transparent 70%)`, animation: show("ambient","clips","cta") ? "wi-halo 3.2s ease-in-out infinite" : "none", opacity: show("ambient","clips","cta") ? 1 : 0, transition: "opacity 1s ease" }} />
          <img
            src="/manus-storage/wizai-logo-v3_e7823047_6b9d9155.png"
            alt="WIZ AI"
            style={{
              width: "clamp(160px, 22vw, 260px)", height: "auto", display: "block",
              filter: show("ambient","clips","cta") ? `drop-shadow(0 0 22px ${GOLD}99) drop-shadow(0 0 50px ${GOLD}55)` : "none",
              opacity: show("ambient","clips","cta") ? 1 : 0,
              transform: show("ambient","clips","cta") ? "scale(1) translateY(0)" : "scale(0.84) translateY(14px)",
              transition: "opacity 0.9s cubic-bezier(0.16,1,0.3,1), transform 0.9s cubic-bezier(0.16,1,0.3,1), filter 1.2s ease",
              position: "relative",
            }}
          />
        </div>

        {/* Product label — changes each clip */}
        <div style={{ height: 48, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
          {show("clips","cta") && (
            <div key={labelKey} style={{ textAlign: "center", opacity: labelVisible ? 1 : 0, animation: labelVisible ? "wi-label-in 0.55s ease forwards" : "none" }}>
              <div style={{ color: GOLD_LITE, fontSize: "clamp(1rem, 2.2vw, 1.2rem)", fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", textShadow: `0 0 28px ${GOLD}bb`, marginBottom: 5 }}>
                {CLIPS[clipIdx].product}
              </div>
              <div style={{ color: "rgba(255,255,255,0.50)", fontSize: "clamp(0.6rem, 1.2vw, 0.72rem)", fontWeight: 500, letterSpacing: "0.26em", textTransform: "uppercase" }}>
                {CLIPS[clipIdx].tagline}
              </div>
            </div>
          )}
          {show("ambient") && (
            <div style={{ color: "rgba(255,255,255,0.28)", fontSize: "clamp(0.55rem, 1.1vw, 0.68rem)", fontWeight: 500, letterSpacing: "0.30em", textTransform: "uppercase" }}>
              The Future of Music Video Creation
            </div>
          )}
        </div>

        {/* Waveform bars */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: "clamp(2px,0.45vw,3px)", height: 40, marginBottom: 24, opacity: show("clips","cta") ? 0.80 : show("ambient") ? 0.30 : 0, transition: "opacity 1s ease" }}>
          {BARS.map((bar, i) => (
            <div key={i} style={{ width: "clamp(2px,0.55vw,4px)", borderRadius: 2, background: i % 4 === 0 ? `linear-gradient(to top,${GOLD_DEEP},${GOLD_LITE})` : i % 4 === 1 ? `linear-gradient(to top,${GOLD_DEEP},${GOLD})` : i % 4 === 2 ? `linear-gradient(to top,${GOLD_DEEP},${GOLD_LITE}aa)` : `linear-gradient(to top,${GOLD_DEEP},#ffffffaa)`, boxShadow: i % 6 === 0 ? `0 0 5px ${GOLD}66` : "none", height: `${bar.baseH}px`, "--bar-base": `${bar.baseH}px`, "--bar-peak": `${bar.peakH}px`, animation: show("clips","cta") ? `wi-bar ${bar.dur}s ${bar.delay}s ease-in-out infinite` : "none" } as CSSProperties} />
          ))}
        </div>

        {/* Enter WIZ AI CTA */}
        <div style={{ opacity: show("cta") ? 1 : 0, transform: show("cta") ? "translateY(0)" : "translateY(26px)", transition: "opacity 0.8s ease, transform 0.8s ease", pointerEvents: show("cta") ? "auto" : "none" }}>
          <div style={{ position: "relative" }}>
            {[
              { left:"-54px", delay:"0s",   dur:"2.2s", size:5, color:GOLD_LITE },
              { left:"-27px", delay:"0.4s", dur:"1.8s", size:3, color:"#fff"    },
              { left: "11px", delay:"0.8s", dur:"2.5s", size:4, color:GOLD      },
              { left: "41px", delay:"0.2s", dur:"2.0s", size:3, color:GOLD_LITE },
              { left: "67px", delay:"1.1s", dur:"1.9s", size:5, color:"#fff"    },
              { left:"-45px", delay:"1.5s", dur:"2.3s", size:3, color:GOLD      },
              { left: "21px", delay:"0.6s", dur:"2.1s", size:4, color:GOLD_LITE },
            ].map((s,i) => (
              <div key={i} style={{ position:"absolute", left:s.left, bottom:8, width:s.size, height:s.size, borderRadius:"50%", background:s.color, boxShadow:`0 0 5px 2px ${s.color}88`, animation:`wi-sparkle ${s.dur} ${s.delay} ease-out infinite`, pointerEvents:"none" }} />
            ))}
            <div style={{ position:"absolute", inset:-12, borderRadius:9999, border:`1.5px solid rgba(196,164,100,0.48)`, animation:"wi-ring-breathe 2.4s ease-in-out infinite", pointerEvents:"none" }} />
            <div style={{ position:"absolute", inset:-6, borderRadius:9999, border:`2px solid rgba(232,201,122,0.60)`, animation:"wi-ring-pulse 1.8s ease-out infinite", pointerEvents:"none" }} />
            <button
              onClick={dismiss}
              aria-label="Enter WIZ AI"
              style={{ display:"flex", alignItems:"center", gap:14, padding:"1rem 3rem", borderRadius:9999, border:"none", cursor:"pointer", background:`linear-gradient(105deg,${GOLD_DEEP} 0%,${GOLD} 20%,#f0d98a 45%,${GOLD_LITE} 55%,${GOLD} 75%,${GOLD_DEEP} 100%)`, backgroundSize:"300% 100%", animation:"wi-shimmer 3s linear infinite", boxShadow:`0 0 0 1px rgba(255,255,255,0.18),0 0 30px ${GOLD}88,0 0 64px ${GOLD}44,inset 0 1px 0 rgba(255,255,255,0.35),inset 0 -1px 0 rgba(0,0,0,0.20)`, color:"#0a0a0f", fontWeight:900, fontSize:"clamp(0.8rem,1.5vw,0.95rem)", letterSpacing:"0.22em", textTransform:"uppercase", overflow:"hidden", position:"relative" }}
            >
              <span style={{ position:"absolute", top:0, bottom:0, width:"40%", background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.28),transparent)", animation:"wi-sweep 2.8s ease-in-out infinite", pointerEvents:"none" }} />
              <span style={{ position:"relative", textShadow:"0 1px 0 rgba(255,255,255,0.3),0 -1px 0 rgba(0,0,0,0.18)" }}>Enter WIZ AI</span>
              <ChevronRight style={{ position:"relative", width:20, height:20 }} />
            </button>
          </div>
        </div>
      </div>

      {/* Sound toggle */}
      <button
        onClick={toggleMute}
        aria-label={muted ? "Unmute" : "Mute"}
        style={{ position:"absolute", top:"1.25rem", left:"1.25rem", zIndex:20, background:"rgba(4,4,14,0.55)", border:`1px solid ${muted ? "rgba(255,255,255,0.15)" : GOLD + "88"}`, borderRadius:9999, cursor:"pointer", padding:"0.45rem 0.7rem", display:"flex", alignItems:"center", gap:6, opacity:show("clips","cta") ? 1 : 0, transition:"opacity 0.6s ease, border-color 0.3s ease", backdropFilter:"blur(6px)" }}
      >
        {muted ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GOLD_LITE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
          </svg>
        )}
        <span style={{ fontSize:"0.62rem", fontWeight:600, letterSpacing:"0.14em", textTransform:"uppercase", color:muted ? "rgba(255,255,255,0.38)" : GOLD_LITE, transition:"color 0.3s ease" }}>
          {muted ? "Sound off" : "Sound on"}
        </span>
      </button>

      {/* Skip intro */}
      <button
        onClick={dismiss}
        aria-label="Skip intro"
        style={{ position:"absolute", top:"1.25rem", right:"1.25rem", zIndex:20, background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.32)", fontSize:"0.68rem", fontWeight:500, letterSpacing:"0.20em", textTransform:"uppercase", padding:"0.5rem 0.75rem", opacity:show("ambient","clips","cta") ? 1 : 0, transition:"opacity 0.6s ease, color 0.2s ease" }}
        onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.72)")}
        onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.32)")}
      >
        Skip Intro
      </button>

      {/* Clip progress dots */}
      {show("clips","cta") && (
        <div style={{ position:"absolute", bottom:"1.5rem", left:"50%", transform:"translateX(-50%)", zIndex:20, display:"flex", gap:8 }}>
          {CLIPS.map((_,i) => (
            <div key={i} style={{ width:i === clipIdx ? 20 : 6, height:6, borderRadius:9999, background:i === clipIdx ? GOLD : "rgba(255,255,255,0.25)", transition:"width 0.4s ease, background 0.4s ease" }} />
          ))}
        </div>
      )}
    </div>
  );
}
