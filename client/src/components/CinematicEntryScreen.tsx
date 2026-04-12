/**
 * CinematicEntryScreen
 *
 * Universal fullscreen immersive entry experience shown once per session.
 * 4 rotating creator scenes — broad appeal across music, social, kids, cinematic.
 * - Scene 1: Lyric appears → visual reacts (core USP)
 * - Scene 2: Short-form social clip (vertical / TikTok/Reels style)
 * - Scene 3: Kids animation (Pixar-style)
 * - Scene 4: Cinematic emotional scene
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "wouter";

const SESSION_KEY = "wizvid_entry_shown";

// CDN background videos for the cinematic sequence
const CDN = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx";
const BG_VIDEOS = [
  `${CDN}/hero-nightclub-web_3a88ea3e.mp4`,
  `${CDN}/hero-concert-web_2f9db1a6.mp4`,
  `${CDN}/hero-abstract-web_ed099aea.mp4`,
];

// 4 universal creator scenes
const CREATOR_SCENES = [
  {
    id: "lyric-visual",
    label: "Music Video",
    tag: "Lyric → Visual",
    tagColor: "text-purple-300",
    tagBg: "bg-purple-500/10 border-purple-500/20",
    lyric: '"Walking through fire, the world falls away..."',
    description: "Your words become the scene",
    accentColor: "rgba(139,92,246,0.9)",
    accentGlow: "rgba(139,92,246,0.5)",
    icon: "🎵",
  },
  {
    id: "social-clip",
    label: "Social Clip",
    tag: "Vertical · 9:16",
    tagColor: "text-pink-300",
    tagBg: "bg-pink-500/10 border-pink-500/20",
    lyric: '"This is my moment, I own the stage..."',
    description: "Built for TikTok, Reels & Shorts",
    accentColor: "rgba(236,72,153,0.9)",
    accentGlow: "rgba(236,72,153,0.5)",
    icon: "📱",
  },
  {
    id: "kids-animation",
    label: "Kids Animation",
    tag: "Pixar-style",
    tagColor: "text-yellow-300",
    tagBg: "bg-yellow-500/10 border-yellow-500/20",
    lyric: '"The stars are dancing, one two three..."',
    description: "Magical animated worlds for children",
    accentColor: "rgba(234,179,8,0.9)",
    accentGlow: "rgba(234,179,8,0.5)",
    icon: "✨",
  },
  {
    id: "cinematic",
    label: "Cinematic",
    tag: "Emotional · 4K",
    tagColor: "text-blue-300",
    tagBg: "bg-blue-500/10 border-blue-500/20",
    lyric: '"Every goodbye leaves a scar on the soul..."',
    description: "Hollywood-grade emotional storytelling",
    accentColor: "rgba(59,130,246,0.9)",
    accentGlow: "rgba(59,130,246,0.5)",
    icon: "🎬",
  },
] as const;

interface CinematicEntryScreenProps {
  onDismiss?: () => void;
}

export default function CinematicEntryScreen({ onDismiss }: CinematicEntryScreenProps) {
  const [, navigate] = useLocation();
  const [phase, setPhase] = useState<0 | 1 | 2 | 3 | 4 | 5>(0);
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [beatPulse, setBeatPulse] = useState(false);
  const [activeScene, setActiveScene] = useState(0);
  const [sceneTransitioning, setSceneTransitioning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Phase sequence timing (ms)
  const PHASE_TIMINGS = [600, 1200, 1800, 2400, 3200, 4000];

  // Advance through phases
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    PHASE_TIMINGS.forEach((delay, i) => {
      timers.push(setTimeout(() => setPhase(i as 0 | 1 | 2 | 3 | 4 | 5), delay));
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  // Beat pulse illusion — fires every ~600ms to simulate a 100bpm beat
  useEffect(() => {
    const interval = setInterval(() => {
      setBeatPulse(true);
      setTimeout(() => setBeatPulse(false), 120);
    }, 600);
    return () => clearInterval(interval);
  }, []);

  // Auto-cycle through scenes every 3.5 seconds
  useEffect(() => {
    if (phase < 3) return;
    const interval = setInterval(() => {
      setSceneTransitioning(true);
      setTimeout(() => {
        setActiveScene(prev => (prev + 1) % CREATOR_SCENES.length);
        setSceneTransitioning(false);
      }, 300);
    }, 3500);
    return () => clearInterval(interval);
  }, [phase]);

  // Mouse parallax
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 2;
    const y = (e.clientY / window.innerHeight - 0.5) * 2;
    setMousePos({ x, y });
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);

  // Auto-play background video
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.play().catch(() => {});
  }, []);

  const handleCTA = () => {
    setExiting(true);
    sessionStorage.setItem(SESSION_KEY, "1");
    requestAnimationFrame(() => {
      setTimeout(() => {
        setVisible(false);
        onDismiss?.();
        navigate("/onboarding");
      }, 700);
    });
  };

  const handleSkip = () => {
    setExiting(true);
    sessionStorage.setItem(SESSION_KEY, "1");
    requestAnimationFrame(() => {
      setTimeout(() => {
        setVisible(false);
        onDismiss?.();
        navigate("/");
      }, 500);
    });
  };

  if (!visible) return null;

  const px = mousePos.x;
  const py = mousePos.y;
  const scene = CREATOR_SCENES[activeScene];

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-[9999] overflow-hidden bg-black ${
        exiting ? "opacity-0" : "opacity-100"
      }`}
      style={{
        willChange: "transform, opacity",
        transform: exiting ? "scale(1.15)" : "scale(1)",
        transition: "transform 0.8s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.7s ease-out",
      }}
    >
      {/* ── Background video layer ── */}
      <video
        ref={videoRef}
        src={BG_VIDEOS[0]}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          transform: `translate(${px * -12}px, ${py * -8}px) scale(1.08)`,
          transition: "transform 0.15s ease-out",
          opacity: phase >= 1 ? 0.7 : 0,
          transitionProperty: "transform, opacity",
          transitionDuration: "0.15s, 1.2s",
        }}
      />

      {/* ── Parallax ambient layer — colour shifts with active scene ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          transform: `translate(${px * 20}px, ${py * 15}px)`,
          transition: "transform 0.2s ease-out",
        }}
      >
        <div
          className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full"
          style={{
            background: `radial-gradient(circle, ${scene.accentGlow.replace("0.5", "0.2")} 0%, transparent 70%)`,
            filter: "blur(60px)",
            opacity: phase >= 1 ? 1 : 0,
            transition: "opacity 1.5s ease, background 1s ease",
          }}
        />
      </div>

      {/* ── Beat burst ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at center, ${scene.accentGlow.replace("0.5", "0.12")} 0%, transparent 60%)`,
          opacity: beatPulse && phase >= 1 ? 1 : 0,
          transition: "opacity 0.08s ease",
        }}
      />

      {/* ── Dark gradient overlays ── */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-black/35 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 pointer-events-none" />

      {/* ── Cinematic vignette ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)",
        }}
      />

      {/* ── Film grain overlay ── */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundSize: "128px 128px",
        }}
      />

      {/* ── Main content ── */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 text-center">

        {/* WizVid badge */}
        <div
          className="mb-8 transition-all duration-700"
          style={{
            opacity: phase >= 0 ? 1 : 0,
            transform: phase >= 0 ? "translateY(0)" : "translateY(20px)",
          }}
        >
          <span className="inline-flex items-center gap-2 bg-white/5 border border-white/10 backdrop-blur-md rounded-full px-5 py-2 text-sm text-purple-300 font-medium tracking-wide">
            <span
              className="w-2 h-2 rounded-full bg-purple-400"
              style={{
                boxShadow: beatPulse ? "0 0 8px 3px rgba(167,139,250,0.8)" : "0 0 4px 1px rgba(167,139,250,0.4)",
                transition: "box-shadow 0.08s ease",
              }}
            />
            WizVid · AI Video Creator
          </span>
        </div>

        {/* Universal headline */}
        <h1
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight mb-6 max-w-4xl transition-all duration-1000"
          style={{
            opacity: phase >= 1 ? 1 : 0,
            transform: phase >= 1 ? "translateY(0) scale(1)" : "translateY(30px) scale(0.97)",
          }}
        >
          <span className="text-white">Your ideas don't just exist</span>
          <br />
          <span
            style={{
              background: "linear-gradient(135deg, #a78bfa 0%, #818cf8 40%, #60a5fa 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            — they become videos
          </span>
        </h1>

        {/* Universal subheadline */}
        <p
          className="text-lg sm:text-xl text-white/60 max-w-2xl leading-relaxed mb-6 transition-all duration-1000"
          style={{
            opacity: phase >= 2 ? 1 : 0,
            transform: phase >= 2 ? "translateY(0)" : "translateY(20px)",
          }}
        >
          Music videos, social clips, kids animations, cinematic stories — all from your words
        </p>

        {/* Scene type tabs */}
        <div
          className="mb-6 transition-all duration-1000"
          style={{
            opacity: phase >= 2 ? 1 : 0,
            transform: phase >= 2 ? "translateY(0)" : "translateY(15px)",
          }}
        >
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {CREATOR_SCENES.map((s, i) => (
              <button
                key={s.id}
                onClick={() => {
                  setSceneTransitioning(true);
                  setTimeout(() => { setActiveScene(i); setSceneTransitioning(false); }, 200);
                }}
                className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-3 py-1.5 border transition-all duration-300 ${
                  activeScene === i
                    ? `${s.tagBg} ${s.tagColor} border-current/30 scale-105`
                    : "bg-white/5 border-white/10 text-white/40 hover:text-white/60"
                }`}
              >
                <span>{s.icon}</span>
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Rotating scene preview */}
        <div
          className="mb-10 transition-all duration-1000"
          style={{
            opacity: phase >= 3 ? 1 : 0,
            transform: phase >= 3 ? "translateY(0)" : "translateY(15px)",
          }}
        >
          <div
            className="inline-flex items-center gap-3 bg-white/4 border border-white/8 backdrop-blur-sm rounded-2xl px-6 py-3 max-w-sm sm:max-w-md"
            style={{
              opacity: sceneTransitioning ? 0 : 1,
              transform: sceneTransitioning ? "translateY(6px)" : "translateY(0)",
              transition: "opacity 0.3s ease, transform 0.3s ease",
            }}
          >
            <span className="text-white/30 text-sm font-mono">♪</span>
            <span className="text-white/70 text-sm italic truncate">{scene.lyric}</span>
            <span className={`text-xs font-medium border rounded-full px-2 py-0.5 flex-shrink-0 ${scene.tagBg} ${scene.tagColor}`}>
              {scene.tag}
            </span>
          </div>
          <p
            className="mt-2 text-white/35 text-xs"
            style={{
              opacity: sceneTransitioning ? 0 : 1,
              transition: "opacity 0.3s ease",
            }}
          >
            {scene.description}
          </p>
        </div>

        {/* CTA */}
        <div
          className="transition-all duration-1000"
          style={{
            opacity: phase >= 4 ? 1 : 0,
            transform: phase >= 4 ? "translateY(0) scale(1)" : "translateY(20px) scale(0.95)",
          }}
        >
          <button
            onClick={handleCTA}
            className="group relative inline-flex items-center gap-3 text-white font-bold text-lg px-10 py-4 rounded-2xl overflow-hidden transition-all duration-300 hover:scale-105"
            style={{
              background: "linear-gradient(135deg, rgba(139,92,246,0.9) 0%, rgba(99,102,241,0.9) 50%, rgba(59,130,246,0.9) 100%)",
              boxShadow: beatPulse
                ? "0 0 40px rgba(139,92,246,0.7), 0 0 80px rgba(139,92,246,0.3), inset 0 1px 0 rgba(255,255,255,0.15)"
                : "0 0 20px rgba(139,92,246,0.4), 0 0 40px rgba(139,92,246,0.15), inset 0 1px 0 rgba(255,255,255,0.15)",
              transition: "box-shadow 0.08s ease, transform 0.3s ease",
            }}
          >
            {/* Animated border pulse */}
            <span
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{
                border: "1px solid rgba(167,139,250,0.5)",
                animation: "ctaBorderPulse 2s ease-in-out infinite",
              }}
            />
            {/* Shimmer sweep */}
            <span
              className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.12) 50%, transparent 60%)",
                backgroundSize: "200% 100%",
                animation: "shimmerSweep 1.5s ease infinite",
              }}
            />
            <svg className="w-5 h-5 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
            </svg>
            <span className="relative z-10">Start Creating Free</span>
            <svg className="w-4 h-4 relative z-10 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </button>

          {/* Skip link */}
          <div className="mt-5">
            <button
              onClick={handleSkip}
              className="text-white/30 hover:text-white/60 text-sm transition-colors duration-200 underline underline-offset-4"
            >
              Skip intro
            </button>
          </div>
        </div>

        {/* Phase 5: Universal social proof */}
        <div
          className="absolute bottom-8 left-0 right-0 flex justify-center transition-all duration-1000"
          style={{
            opacity: phase >= 5 ? 1 : 0,
            transform: phase >= 5 ? "translateY(0)" : "translateY(10px)",
          }}
        >
          <div className="flex items-center gap-4 sm:gap-6 text-white/25 text-xs flex-wrap justify-center px-4">
            <span>🎵 Music Videos</span>
            <span>📱 Social Clips</span>
            <span>✨ Kids Animation</span>
            <span>🎬 Cinematic Stories</span>
          </div>
        </div>
      </div>

      {/* ── Keyframe styles ── */}
      <style>{`
        @keyframes ctaBorderPulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.01); }
        }
        @keyframes shimmerSweep {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}
