/**
 * IntroScreen — Cinematic intro with showcase video reel.
 *
 * Sequence:
 *   0.0s  → black
 *   0.5s  → ambient: logo reveals + tagline sweeps in
 *   1.8s  → WizVideo™ clip fades in, product label appears
 *   5.4s  → WizAnimate™ clip crossfades
 *   9.0s  → WizScript™ clip + "Enter WIZ AI" CTA slides up, infinite loop begins
 */

import { useEffect, useLayoutEffect, useRef, useState, useCallback, type CSSProperties } from "react";
import { ChevronRight } from "@/lib/icons";
import { INTRO_SESSION_KEY } from "@/lib/introReplay";

const CDN       = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx";
const MUSIC_URL = "/api/audio/lightless-dawn.mp3";

const CLIPS = [
  { url: `${CDN}/showcase-music-video_19324f13.mp4`, product: "WizVideo™",   tagline: "AI Music Video Creation"  },
  { url: `${CDN}/showcase-anime_36099b49.mp4`,       product: "WizAnimate™", tagline: "AI Animation"              },
  { url: `${CDN}/showcase-cinematic_13667434.mp4`,   product: "WizScript™",  tagline: "AI Film Creation"          },
];

const GOLD      = "#c4a464";
const GOLD_LITE = "#e8c97a";
const GOLD_DEEP = "#8a6a20";
const BG        = "#04040e";

const PARTICLES: Array<{ x: number; y: number; size: number; opacity: number; dur: number; delay: number; drift: number }> = [
  { x:  5, y: 74, size: 3, opacity: 0.50, dur: 7.2, delay: 0.0, drift:  16 },
  { x: 14, y: 52, size: 2, opacity: 0.35, dur: 9.1, delay: 0.6, drift: -12 },
  { x: 23, y: 84, size: 4, opacity: 0.58, dur: 6.8, delay: 1.2, drift:  20 },
  { x: 33, y: 37, size: 2, opacity: 0.33, dur: 8.4, delay: 0.3, drift: -14 },
  { x: 43, y: 66, size: 3, opacity: 0.44, dur: 7.6, delay: 1.8, drift:  12 },
  { x: 51, y: 19, size: 5, opacity: 0.62, dur: 6.2, delay: 0.0, drift:  10 },
  { x: 61, y: 79, size: 2, opacity: 0.36, dur: 8.8, delay: 2.1, drift: -20 },
  { x: 70, y: 44, size: 3, opacity: 0.48, dur: 7.4, delay: 0.7, drift:  16 },
  { x: 79, y: 87, size: 4, opacity: 0.54, dur: 6.9, delay: 1.5, drift: -10 },
  { x: 88, y: 31, size: 2, opacity: 0.38, dur: 9.2, delay: 0.4, drift:  18 },
  { x: 11, y: 17, size: 3, opacity: 0.44, dur: 7.3, delay: 2.0, drift: -12 },
  { x: 37, y: 11, size: 2, opacity: 0.36, dur: 8.2, delay: 0.5, drift:  22 },
  { x: 57, y: 91, size: 3, opacity: 0.40, dur: 9.4, delay: 0.6, drift:  16 },
  { x: 75, y: 15, size: 2, opacity: 0.38, dur: 7.1, delay: 0.8, drift: -14 },
  { x: 91, y: 61, size: 4, opacity: 0.53, dur: 6.5, delay: 1.7, drift: -18 },
  { x: 27, y: 56, size: 2, opacity: 0.36, dur: 8.6, delay: 1.1, drift:  14 },
  { x: 46, y:  7, size: 3, opacity: 0.48, dur: 7.9, delay: 2.3, drift: -16 },
  { x: 66, y: 94, size: 2, opacity: 0.33, dur: 9.0, delay: 0.9, drift:  12 },
  { x: 84, y: 76, size: 3, opacity: 0.46, dur: 7.5, delay: 1.4, drift: -20 },
  { x:  2, y: 43, size: 2, opacity: 0.38, dur: 8.3, delay: 0.2, drift:  18 },
  { x: 19, y: 29, size: 2, opacity: 0.32, dur: 9.6, delay: 1.6, drift: -10 },
  { x: 48, y: 48, size: 3, opacity: 0.42, dur: 7.0, delay: 0.4, drift:  14 },
  { x: 93, y: 22, size: 2, opacity: 0.36, dur: 8.7, delay: 1.9, drift: -16 },
  { x: 55, y: 36, size: 4, opacity: 0.56, dur: 6.6, delay: 0.7, drift:  10 },
];

const BARS = Array.from({ length: 36 }, (_, i) => {
  const c = Math.abs(17.5 - i) / 17.5;
  return { baseH: 4 + (1 - c) * 20, peakH: 10 + (1 - c) * 44, dur: 0.45 + (i % 5) * 0.08, delay: (i % 7) * 0.065 };
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
  // Tap-to-begin: shown on first visit to unlock video autoplay in Instagram/WhatsApp browsers
  const [tapReady, setTapReady]         = useState(true);
  const videoRef                        = useRef<HTMLVideoElement>(null);
  const audioRef                        = useRef<HTMLAudioElement>(null);
  const timersRef                       = useRef<ReturnType<typeof setTimeout>[]>([]);
  const dismissedRef                    = useRef(false);
  const startedRef                      = useRef(false);
  const soundOffRef                     = useRef<HTMLButtonElement>(null);
  const logoContainerRef                = useRef<HTMLDivElement>(null);
  const logoImgRef                      = useRef<HTMLImageElement>(null);

  // Pixel-perfect alignment: lock W tip to Sound Off button top border
  useLayoutEffect(() => {
    const align = () => {
      const btn = soundOffRef.current;
      const logo = logoContainerRef.current;
      const img = logoImgRef.current;
      if (!btn || !logo || !img) return;
      const wTipOffset = (514 / 2048) * img.offsetWidth;
      logo.style.top = (btn.offsetTop - wTipOffset) + "px";
    };
    align();
    window.addEventListener("resize", align);
    return () => window.removeEventListener("resize", align);
  }, []);

  const clearAll = () => timersRef.current.forEach(clearTimeout);

  const toggleMute = useCallback(() => {
    setMuted(m => {
      const next = !m;
      const aud = audioRef.current;
      if (aud) {
        aud.muted = next;
        if (!next) aud.play().catch(() => {});
      }
      return next;
    });
  }, []);

  const dismiss = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    clearAll();
    const vid = videoRef.current;
    if (vid) vid.pause();
    const aud = audioRef.current;
    if (aud) { aud.pause(); }
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
      setTimeout(() => setLabelVisible(true), 320);
    }, 480);
    timersRef.current.push(t);
  }, []);

  // Start the full intro sequence — called after user taps the splash screen
  const startIntro = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    setTapReady(false);

    // Pre-load first clip immediately so it's ready when t2 fires
    const vid = videoRef.current;
    if (vid) { vid.src = CLIPS[0].url; vid.load(); }

    const t1 = setTimeout(() => setPhase("ambient"), 500);
    const t2 = setTimeout(() => {
      setPhase("clips");
      if (vid) {
        vid.play().catch(() => {});
      }
      const aud = audioRef.current;
      if (aud) { aud.muted = true; aud.play().catch(() => {}); }
      setVideoVisible(true);
      setLabelKey(k => k + 1);
      setTimeout(() => setLabelVisible(true), 380);
    }, 1800);
    const t3 = setTimeout(() => advanceClip(1), 5400);
    const t4 = setTimeout(() => {
      advanceClip(2);
      setTimeout(() => setPhase("cta"), 580);
      const loopFrom = (idx: number) => {
        const t = setTimeout(() => {
          const next = (idx + 1) % CLIPS.length;
          advanceClip(next);
          loopFrom(next);
        }, 3800);
        timersRef.current.push(t);
      };
      loopFrom(2);
    }, 9000);
    timersRef.current = [t1, t2, t3, t4];
  }, [advanceClip]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearAll();
  }, []);

  const show = (...phases: Phase[]) => phases.includes(phase);

  return (
    <div style={{
      position: "fixed", inset: 0, background: BG, overflow: "hidden",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      opacity: visible ? 1 : 0,
      transition: "opacity 0.65s ease-in-out",
      pointerEvents: visible ? "auto" : "none",
      zIndex: 9999,
      fontFamily: "'Inter', 'Helvetica Neue', system-ui, sans-serif",
    }}>
      <style>{`
        @keyframes wi-particle {
          0%   { transform: translateY(0) translateX(0) scale(1); opacity: var(--p-op); }
          50%  { transform: translateY(-44px) translateX(var(--p-drift)) scale(1.3); opacity: calc(var(--p-op) * 1.5); }
          100% { transform: translateY(-90px) translateX(0) scale(0.5); opacity: 0; }
        }
        @keyframes wi-glow-breathe {
          0%,100% { opacity: 0.40; transform: scale(1);    }
          50%      { opacity: 0.78; transform: scale(1.12); }
        }
        @keyframes wi-halo {
          0%,100% { opacity: 0.40; transform: scale(1);    }
          50%      { opacity: 0.82; transform: scale(1.08); }
        }
        @keyframes wi-bar {
          0%,100% { height: var(--bar-base); }
          50%      { height: var(--bar-peak); }
        }
        @keyframes wi-scan {
          0%   { transform: translateY(-100%); opacity: 0;   }
          6%   { opacity: 0.45; }
          94%  { opacity: 0.45; }
          100% { transform: translateY(100vh);  opacity: 0;   }
        }
        @keyframes wi-ring-breathe {
          0%,100% { transform: scale(1);    opacity: 0.50; }
          50%      { transform: scale(1.08); opacity: 0.90; }
        }
        @keyframes wi-ring-pulse {
          0%   { transform: scale(1);    opacity: 0.75; }
          100% { transform: scale(1.60); opacity: 0;    }
        }
        @keyframes wi-sweep {
          0%   { left: -45%; }
          100% { left: 145%; }
        }
        @keyframes wi-label-in {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes wi-sparkle {
          0%   { transform: translateY(0)    scale(1);    opacity: 1;   }
          75%  { transform: translateY(-30px) scale(0.4); opacity: 0.5; }
          100% { transform: translateY(-38px) scale(0);   opacity: 0;   }
        }
        @keyframes wi-tagline-reveal {
          from { opacity: 0; letter-spacing: 0.50em; }
          to   { opacity: 1; letter-spacing: 0.32em; }
        }
        @keyframes wi-cta-glow-pulse {
          0%,100% { box-shadow: 0 0 28px rgba(196,164,100,0.18), inset 0 0 20px rgba(196,164,100,0.04); }
          50%      { box-shadow: 0 0 44px rgba(196,164,100,0.30), inset 0 0 20px rgba(196,164,100,0.07); }
        }
        @keyframes wi-dot-ping {
          0%   { transform: scale(1);   opacity: 0.7; }
          100% { transform: scale(2.4); opacity: 0;   }
        }
        @keyframes wi-tap-pulse {
          0%,100% { transform: scale(1);    opacity: 0.85; box-shadow: 0 0 0 0 rgba(196,164,100,0.5); }
          50%      { transform: scale(1.06); opacity: 1;    box-shadow: 0 0 0 14px rgba(196,164,100,0); }
        }
        @keyframes wi-tap-fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── Tap-to-begin splash ─────────────────────────────────────────── */}
      {tapReady && (
        <div
          onClick={startIntro}
          style={{
            position: "absolute", inset: 0, zIndex: 10000,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            background: BG,
            cursor: "pointer",
            animation: "wi-tap-fade-in 0.6s ease forwards",
          }}
        >
          {/* Logo */}
          <img
            src="/manus-storage/wizai-logo-v3_e7823047_6b9d9155.png"
            alt="WIZ AI"
            style={{
              width: "clamp(120px, 22vw, 200px)", height: "auto",
              filter: `drop-shadow(0 0 18px ${GOLD}88) drop-shadow(0 0 40px ${GOLD}44)`,
              marginBottom: "2.8rem",
            }}
          />
          {/* Pulsing tap button */}
          <button
            onClick={startIntro}
            style={{
              background: "transparent",
              border: `1.5px solid ${GOLD}99`,
              borderRadius: 40,
              padding: "0.85rem 2.6rem",
              color: GOLD_LITE,
              fontSize: "clamp(0.78rem, 2.2vw, 0.88rem)",
              fontWeight: 600,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              cursor: "pointer",
              animation: "wi-tap-pulse 2.2s ease-in-out infinite",
              marginBottom: "1.4rem",
            }}
          >
            Tap to begin
          </button>
          <p style={{ color: `${GOLD}88`, fontSize: "0.72rem", letterSpacing: "0.14em", textTransform: "uppercase", margin: 0 }}>
            Sound optional
          </p>
        </div>
      )}

      {/* Background music — "Lightless Dawn" by Kevin MacLeod (CC BY 3.0) */}
      <audio ref={audioRef} src={MUSIC_URL} loop preload="auto" style={{ display: "none" }} />

      {/* Full-screen background video */}
      <video
        ref={videoRef}
        muted
        playsInline
        loop
        preload="none"
        onError={() => { /* ignore transient load errors — keep intro running */ }}
        style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          objectFit: "cover", objectPosition: "center",
          opacity: videoVisible ? 1 : 0,
          transition: "opacity 0.65s ease",
          zIndex: 0,
        }}
      />

      {/* Cinematic letterbox — subtle dark fade at top and bottom edges */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "7vh", background: `linear-gradient(to bottom, ${BG} 55%, transparent)`, zIndex: 8, pointerEvents: "none", opacity: show("ambient","clips","cta") ? 1 : 0, transition: "opacity 1.2s ease" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "7vh", background: `linear-gradient(to top, ${BG} 55%, transparent)`, zIndex: 8, pointerEvents: "none", opacity: show("ambient","clips","cta") ? 1 : 0, transition: "opacity 1.2s ease" }} />

      {/* Dark cinematic overlay */}
      <div style={{ position: "absolute", inset: 0, zIndex: 1, background: `linear-gradient(to bottom, rgba(4,4,14,0.72) 0%, rgba(4,4,14,0.40) 30%, rgba(4,4,14,0.44) 60%, rgba(4,4,14,0.88) 100%)` }} />

      {/* Gold edge vignette */}
      <div style={{ position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none", boxShadow: `inset 0 0 110px 32px rgba(4,4,14,0.96), inset 0 0 2px 1px ${GOLD}18` }} />

      {/* Ambient glow + scanline + particles */}
      <div style={{ position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none", opacity: show("ambient","clips","cta") ? 1 : 0, transition: "opacity 2s ease" }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-60%)", width: "70vw", height: "70vw", maxWidth: 700, maxHeight: 700, borderRadius: "50%", background: `radial-gradient(ellipse at center, rgba(196,164,100,0.10) 0%, transparent 68%)`, animation: "wi-glow-breathe 5.2s ease-in-out infinite" }} />
        <div style={{ position: "absolute", left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${GOLD}33 24%, ${GOLD_LITE}55 50%, ${GOLD}33 76%, transparent)`, animation: "wi-scan 8s ease-in-out 1s infinite" }} />
        {PARTICLES.map((p, i) => (
          <div key={i} style={{ position: "absolute", left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, borderRadius: "50%", background: i % 3 === 0 ? GOLD_LITE : i % 3 === 1 ? GOLD : "#ffffffcc", boxShadow: `0 0 ${p.size * 3}px ${p.size}px ${GOLD}44`, "--p-op": p.opacity, "--p-drift": `${p.drift}px`, animation: `wi-particle ${p.dur}s ${p.delay}s ease-in-out infinite` } as CSSProperties} />
        ))}
      </div>

      {/* Logo — top right, W tip JS-aligned to Sound Off border top */}
      <div ref={logoContainerRef} style={{ position: "absolute", top: "-1.43rem", right: "1.4rem", zIndex: 10 }}>
        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", inset: -24, borderRadius: "50%", background: `radial-gradient(ellipse at center, ${GOLD}16 0%, transparent 68%)`, animation: show("ambient","clips","cta") ? "wi-halo 3.5s ease-in-out infinite" : "none", opacity: show("ambient","clips","cta") ? 1 : 0, transition: "opacity 1.2s ease" }} />
          <img
            ref={logoImgRef}
            src="/manus-storage/wizai-logo-v3_e7823047_6b9d9155.png"
            alt="WIZ AI"
            style={{
              width: "clamp(140px, 16vw, 180px)", height: "auto", display: "block",
              filter: show("ambient","clips","cta") ? `drop-shadow(0 0 12px ${GOLD}88) drop-shadow(0 0 28px ${GOLD}44)` : "none",
              opacity: show("ambient","clips","cta") ? 1 : 0,
              transform: show("ambient","clips","cta") ? "scale(1) translateY(0)" : "scale(0.88) translateY(-8px)",
              transition: "opacity 1.1s cubic-bezier(0.16,1,0.3,1), transform 1.1s cubic-bezier(0.16,1,0.3,1), filter 1.4s ease",
              position: "relative",
            }}
          />
        </div>
      </div>

      {/* Ambient tagline — visible only before clips start */}
      {show("ambient") && (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 10, textAlign: "center", whiteSpace: "nowrap" }}>
          <div style={{ color: "rgba(255,255,255,0.22)", fontSize: "clamp(0.55rem, 1.1vw, 0.72rem)", fontWeight: 600, letterSpacing: "0.32em", textTransform: "uppercase", animation: "wi-tagline-reveal 1.4s 0.3s ease forwards", opacity: 0 }}>
            The Future of Music Video Creation
          </div>
          <div style={{ marginTop: 16, display: "flex", justifyContent: "center", gap: 8, alignItems: "center" }}>
            <div style={{ height: 1, width: 40, background: `linear-gradient(to right, transparent, ${GOLD}44)` }} />
            <div style={{ width: 4, height: 4, borderRadius: "50%", background: GOLD, boxShadow: `0 0 8px ${GOLD}` }} />
            <div style={{ height: 1, width: 40, background: `linear-gradient(to left, transparent, ${GOLD}44)` }} />
          </div>
        </div>
      )}

      {/* Lower overlay — labels, waveform, CTA */}
      <div style={{ position: "absolute", bottom: "14vh", left: 0, right: 0, zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center" }}>

        {/* Product label */}
        <div style={{ height: 88, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
          {show("clips","cta") && (
            <div key={labelKey} style={{ textAlign: "center", opacity: labelVisible ? 1 : 0, animation: labelVisible ? "wi-label-in 0.6s ease forwards" : "none" }}>
              <div style={{ color: GOLD_LITE, fontSize: "clamp(1.9rem, 3.9vw, 2.6rem)", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", textShadow: `0 0 48px ${GOLD}cc, 0 0 80px ${GOLD}44`, marginBottom: 12 }}>
                {CLIPS[clipIdx].product}
              </div>
              <div style={{ color: "rgba(255,255,255,0.55)", fontSize: "clamp(0.80rem, 1.55vw, 1.0rem)", fontWeight: 500, letterSpacing: "0.28em", textTransform: "uppercase" }}>
                {CLIPS[clipIdx].tagline}
              </div>
            </div>
          )}
        </div>

        {/* Waveform bars */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: "clamp(2px,0.38vw,3px)", height: 44, marginBottom: 22, opacity: show("clips","cta") ? 0.82 : show("ambient") ? 0.22 : 0, transition: "opacity 1.2s ease" }}>
          {BARS.map((bar, i) => (
            <div key={i} style={{ width: "clamp(2px,0.48vw,3px)", borderRadius: 2, background: i % 4 === 0 ? `linear-gradient(to top,${GOLD_DEEP},${GOLD_LITE})` : i % 4 === 1 ? `linear-gradient(to top,${GOLD_DEEP},${GOLD})` : i % 4 === 2 ? `linear-gradient(to top,${GOLD_DEEP},${GOLD_LITE}aa)` : `linear-gradient(to top,${GOLD_DEEP},#ffffffaa)`, boxShadow: i % 6 === 0 ? `0 0 5px ${GOLD}55` : "none", height: `${bar.baseH}px`, "--bar-base": `${bar.baseH}px`, "--bar-peak": `${bar.peakH}px`, animation: show("clips","cta") ? `wi-bar ${bar.dur}s ${bar.delay}s ease-in-out infinite` : "none" } as CSSProperties} />
          ))}
        </div>

        {/* Enter WIZ AI CTA */}
        <div style={{ opacity: show("cta") ? 1 : 0, transform: show("cta") ? "translateY(0)" : "translateY(28px)", transition: "opacity 0.9s ease, transform 0.9s ease", pointerEvents: show("cta") ? "auto" : "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <div style={{ position: "relative" }}>
            {[
              { left:"-58px", delay:"0s",   dur:"2.2s", size:5, color:GOLD_LITE },
              { left:"-30px", delay:"0.45s",dur:"1.9s", size:3, color:"#fff"    },
              { left: "10px", delay:"0.9s", dur:"2.5s", size:4, color:GOLD      },
              { left: "42px", delay:"0.2s", dur:"2.1s", size:3, color:GOLD_LITE },
              { left: "70px", delay:"1.2s", dur:"1.8s", size:5, color:"#fff"    },
              { left:"-48px", delay:"1.6s", dur:"2.4s", size:3, color:GOLD      },
              { left: "22px", delay:"0.65s",dur:"2.0s", size:4, color:GOLD_LITE },
              { left:"-14px", delay:"1.0s", dur:"2.3s", size:2, color:GOLD      },
              { left: "55px", delay:"0.35s",dur:"1.7s", size:3, color:"#fff"    },
            ].map((s,i) => (
              <div key={i} style={{ position:"absolute", left:s.left, bottom:10, width:s.size, height:s.size, borderRadius:"50%", background:s.color, boxShadow:`0 0 5px 2px ${s.color}77`, animation:`wi-sparkle ${s.dur} ${s.delay} ease-out infinite`, pointerEvents:"none" }} />
            ))}
            <div style={{ position:"absolute", inset:-12, borderRadius:9999, border:`1px solid rgba(196,164,100,0.18)`, animation:"wi-ring-breathe 2.6s ease-in-out infinite", pointerEvents:"none" }} />
            <div style={{ position:"absolute", inset:-5, borderRadius:9999, border:`1px solid rgba(232,201,122,0.22)`, animation:"wi-ring-pulse 2.0s ease-out infinite", pointerEvents:"none" }} />
            <button
              onClick={dismiss}
              aria-label="Enter WIZ AI"
              style={{ display:"flex", alignItems:"center", gap:11, padding:"0.82rem 2.6rem", borderRadius:9999, border:`1.5px solid rgba(196,164,100,0.72)`, cursor:"pointer", background:"rgba(8,8,18,0.90)", color:GOLD_LITE, fontWeight:700, fontSize:"clamp(0.78rem,1.25vw,0.96rem)", letterSpacing:"0.26em", textTransform:"uppercase", overflow:"hidden", position:"relative", animation:"wi-cta-glow-pulse 3.2s ease-in-out infinite", backdropFilter:"blur(8px)", boxShadow:`0 0 28px rgba(196,164,100,0.18), inset 0 0 20px rgba(196,164,100,0.04)` }}
              onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = "rgba(196,164,100,0.15)"; b.style.borderColor = `${GOLD_LITE}cc`; b.style.boxShadow = `0 0 44px rgba(196,164,100,0.34), inset 0 0 20px rgba(196,164,100,0.08)`; }}
              onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = "rgba(8,8,18,0.90)"; b.style.borderColor = "rgba(196,164,100,0.72)"; b.style.boxShadow = `0 0 28px rgba(196,164,100,0.18), inset 0 0 20px rgba(196,164,100,0.04)`; }}
            >
              <span style={{ position:"absolute", top:0, bottom:0, width:"42%", background:"linear-gradient(90deg,transparent,rgba(196,164,100,0.10),transparent)", animation:"wi-sweep 3.4s ease-in-out infinite", pointerEvents:"none" }} />
              <span style={{ position:"relative" }}>Enter WIZ AI</span>
              <ChevronRight style={{ position:"relative", width:18, height:18 }} />
            </button>
          </div>
          <div style={{ color: "rgba(255,255,255,0.26)", fontSize: "clamp(0.50rem, 0.88vw, 0.60rem)", fontWeight: 500, letterSpacing: "0.20em", textTransform: "uppercase" }}>
            No credit card required &nbsp;·&nbsp; Cancel anytime
          </div>
        </div>
      </div>

      {/* Sound toggle */}
      <button
        ref={soundOffRef}
        onClick={toggleMute}
        aria-label={muted ? "Unmute" : "Mute"}
        style={{ position:"absolute", top:"1.4rem", left:"1.4rem", zIndex:20, background:"rgba(4,4,14,0.60)", border:`1px solid ${muted ? "rgba(255,255,255,0.12)" : GOLD + "77"}`, borderRadius:9999, cursor:"pointer", padding:"0.42rem 0.72rem", display:"flex", alignItems:"center", gap:6, opacity:show("clips","cta") ? 1 : 0, transition:"opacity 0.7s ease, border-color 0.3s ease", backdropFilter:"blur(8px)" }}
      >
        {muted ? (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.40)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
          </svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={GOLD_LITE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
          </svg>
        )}
        <span style={{ fontSize:"0.60rem", fontWeight:600, letterSpacing:"0.16em", textTransform:"uppercase", color:muted ? "rgba(255,255,255,0.35)" : GOLD_LITE, transition:"color 0.3s ease" }}>
          {muted ? "Sound off" : "Sound on"}
        </span>
      </button>

      {/* Skip Intro — bottom right, clear of logo */}
      <button
        onClick={dismiss}
        aria-label="Skip intro"
        style={{ position:"absolute", bottom:"2.4rem", right:"1.6rem", zIndex:20, background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.30)", fontSize:"0.62rem", fontWeight:600, letterSpacing:"0.22em", textTransform:"uppercase", padding:"0.5rem 0.8rem", opacity:show("ambient","clips","cta") ? 1 : 0, transition:"opacity 0.7s ease, color 0.2s ease" }}
        onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.70)")}
        onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.30)")}
      >
        Skip Intro
      </button>

      {/* Clip progress dots */}
      {show("clips","cta") && (
        <div style={{ position:"absolute", bottom:"2.2rem", left:"50%", transform:"translateX(-50%)", zIndex:20, display:"flex", gap:10, alignItems:"center" }}>
          {CLIPS.map((_,i) => (
            <div key={i} style={{ position: "relative" }}>
              {i === clipIdx && (
                <div style={{ position: "absolute", inset: -2, borderRadius: 9999, background: GOLD, opacity: 0.3, animation: "wi-dot-ping 1.4s ease-out infinite" }} />
              )}
              <div style={{ width: i === clipIdx ? 22 : 6, height: 6, borderRadius: 9999, background: i === clipIdx ? GOLD : "rgba(255,255,255,0.22)", transition: "width 0.5s ease, background 0.5s ease", boxShadow: i === clipIdx ? `0 0 8px ${GOLD}99` : "none" }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
