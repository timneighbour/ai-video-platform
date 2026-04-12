/**
 * HeroCinematicBg — Premium 4-scene CSS-animated homepage background
 *
 * Cycles through 4 subtle scenes every 5 seconds:
 *   1. Storyboard / UI preview  — animated scene cards
 *   2. Scene generation         — prompt → progress → image materialising
 *   3. Cinematic output         — deep gradient with volumetric light rays
 *   4. Lyric → visual moment    — text fades in, environment colour-shifts
 *
 * Pure CSS/React animation. No video file. ~0KB media. Seamless loop.
 * Text overlay always readable (dark veil + low visual noise).
 */

import { useEffect, useState, useRef } from "react";

const SCENE_DURATION = 5000; // ms per scene
const FADE_DURATION  = 1200; // ms crossfade

// ── Scene 1: Storyboard preview ─────────────────────────────────────────────
function StoryboardScene({ active }: { active: boolean }) {
  const cards = [
    { label: "Scene 1", tag: "Intro",   delay: 0   },
    { label: "Scene 2", tag: "Verse",   delay: 0.3 },
    { label: "Scene 3", tag: "Chorus",  delay: 0.6 },
    { label: "Scene 4", tag: "Bridge",  delay: 0.9 },
    { label: "Scene 5", tag: "Outro",   delay: 1.2 },
    { label: "Scene 6", tag: "Verse",   delay: 1.5 },
  ];

  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{ opacity: active ? 1 : 0, transition: `opacity ${FADE_DURATION}ms ease` }}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(139,92,246,0.12) 0%, transparent 70%)", filter: "blur(60px)" }}
        />
      </div>

      {/* Storyboard grid */}
      <div
        className="grid grid-cols-3 gap-3 sm:gap-4 px-8 max-w-2xl w-full"
        style={{ opacity: active ? 1 : 0, transform: active ? "scale(1)" : "scale(0.97)", transition: `opacity ${FADE_DURATION}ms ease, transform ${FADE_DURATION}ms ease` }}
      >
        {cards.map((card, i) => (
          <div
            key={i}
            className="relative rounded-xl overflow-hidden border border-white/8"
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(139,92,246,0.06) 100%)",
              backdropFilter: "blur(8px)",
              aspectRatio: "16/9",
              opacity: active ? 1 : 0,
              transform: active ? "translateY(0)" : "translateY(12px)",
              transition: `opacity 0.6s ease ${card.delay}s, transform 0.6s ease ${card.delay}s`,
            }}
          >
            {/* Scene thumbnail gradient */}
            <div
              className="absolute inset-0"
              style={{
                background: [
                  "linear-gradient(135deg, rgba(30,27,75,0.8) 0%, rgba(49,46,129,0.4) 100%)",
                  "linear-gradient(135deg, rgba(20,40,80,0.8) 0%, rgba(30,64,175,0.4) 100%)",
                  "linear-gradient(135deg, rgba(60,20,60,0.8) 0%, rgba(124,58,237,0.4) 100%)",
                  "linear-gradient(135deg, rgba(20,50,40,0.8) 0%, rgba(16,185,129,0.2) 100%)",
                  "linear-gradient(135deg, rgba(60,30,20,0.8) 0%, rgba(239,68,68,0.2) 100%)",
                  "linear-gradient(135deg, rgba(30,27,75,0.8) 0%, rgba(99,102,241,0.4) 100%)",
                ][i],
              }}
            />
            {/* Subtle animated shimmer on active card */}
            {i === 2 && active && (
              <div
                className="absolute inset-0"
                style={{
                  background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.06) 50%, transparent 60%)",
                  backgroundSize: "200% 100%",
                  animation: "bgShimmer 3s ease-in-out infinite",
                }}
              />
            )}
            {/* Card label */}
            <div className="absolute bottom-0 inset-x-0 p-1.5 flex items-center justify-between">
              <span className="text-white/40 text-[9px] font-medium">{card.label}</span>
              <span
                className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ background: "rgba(139,92,246,0.25)", color: "rgba(167,139,250,0.9)" }}
              >
                {card.tag}
              </span>
            </div>
            {/* Approved checkmark on first 2 */}
            {i < 2 && (
              <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-emerald-500/70 flex items-center justify-center">
                <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Scene 2: Scene generation preview ───────────────────────────────────────
function GenerationScene({ active }: { active: boolean }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!active) { setProgress(0); return; }
    let p = 0;
    const interval = setInterval(() => {
      p = Math.min(p + Math.random() * 4 + 1, 92);
      setProgress(p);
      if (p >= 92) clearInterval(interval);
    }, 80);
    return () => clearInterval(interval);
  }, [active]);

  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{ opacity: active ? 1 : 0, transition: `opacity ${FADE_DURATION}ms ease` }}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(59,130,246,0.1) 0%, transparent 70%)", filter: "blur(60px)" }}
        />
      </div>

      <div
        className="w-full max-w-sm px-8"
        style={{
          opacity: active ? 1 : 0,
          transform: active ? "translateY(0)" : "translateY(16px)",
          transition: `opacity ${FADE_DURATION}ms ease, transform ${FADE_DURATION}ms ease`,
        }}
      >
        {/* Prompt card */}
        <div
          className="rounded-2xl border border-white/8 p-4 mb-4"
          style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(12px)" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            <span className="text-white/35 text-xs tracking-widest uppercase font-medium">Generating Scene 3</span>
          </div>
          <p className="text-white/70 text-sm italic leading-relaxed">
            "A lone figure walks through a neon-lit rain-soaked alley..."
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-white/30 text-xs">Rendering</span>
            <span className="text-violet-300 text-xs font-mono">{Math.round(progress)}%</span>
          </div>
          <div className="h-1 bg-white/8 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${progress}%`,
                background: "linear-gradient(90deg, #7c3aed, #6366f1, #3b82f6)",
                transition: "width 0.1s ease",
                boxShadow: "0 0 8px rgba(139,92,246,0.5)",
              }}
            />
          </div>
        </div>

        {/* Materialising image placeholder */}
        <div
          className="rounded-xl overflow-hidden border border-white/6"
          style={{ aspectRatio: "16/9", background: "rgba(255,255,255,0.02)" }}
        >
          <div
            className="w-full h-full"
            style={{
              background: `linear-gradient(135deg, rgba(30,27,75,${progress / 200}) 0%, rgba(99,102,241,${progress / 300}) 50%, rgba(30,27,75,${progress / 200}) 100%)`,
              transition: "background 0.3s ease",
            }}
          >
            {/* Scan line effect */}
            <div
              className="w-full"
              style={{
                height: 2,
                background: "linear-gradient(90deg, transparent, rgba(139,92,246,0.6), transparent)",
                transform: `translateY(${(progress / 100) * 100}%)`,
                transition: "transform 0.1s ease",
                boxShadow: "0 0 12px rgba(139,92,246,0.4)",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Scene 3: Cinematic output ────────────────────────────────────────────────
function CinematicOutputScene({ active }: { active: boolean }) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{ opacity: active ? 1 : 0, transition: `opacity ${FADE_DURATION}ms ease` }}
    >
      {/* Deep cinematic gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 30% 60%, rgba(15,10,40,0.95) 0%, rgba(5,5,20,0.98) 100%)",
        }}
      />

      {/* Volumetric light rays */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[0,1,2].map(i => (
          <div
            key={i}
            className="absolute top-0"
            style={{
              left: `${25 + i * 25}%`,
              width: 1,
              height: "100%",
              background: `linear-gradient(180deg, rgba(167,139,250,${0.08 - i * 0.02}) 0%, transparent 60%)`,
              transform: `rotate(${-8 + i * 8}deg)`,
              transformOrigin: "top center",
              filter: "blur(20px)",
              animation: `rayPulse ${3 + i * 0.7}s ease-in-out infinite alternate`,
              animationDelay: `${i * 0.4}s`,
            }}
          />
        ))}
      </div>

      {/* Cinematic letterbox bars */}
      <div className="absolute top-0 inset-x-0 h-[8%] bg-black/80" />
      <div className="absolute bottom-0 inset-x-0 h-[8%] bg-black/80" />

      {/* Simulated video frame */}
      <div
        className="relative w-full max-w-lg mx-8"
        style={{
          opacity: active ? 1 : 0,
          transform: active ? "scale(1)" : "scale(1.03)",
          transition: `opacity ${FADE_DURATION}ms ease, transform ${FADE_DURATION * 1.5}ms ease`,
        }}
      >
        <div
          className="rounded-2xl overflow-hidden border border-white/8"
          style={{ aspectRatio: "16/9", background: "linear-gradient(135deg, rgba(15,10,40,0.9) 0%, rgba(30,20,80,0.7) 50%, rgba(10,5,30,0.9) 100%)" }}
        >
          {/* Simulated scene content */}
          <div className="absolute inset-0 flex items-end p-4">
            {/* Simulated character silhouette */}
            <div
              className="absolute bottom-0 left-1/2 -translate-x-1/2"
              style={{
                width: 60,
                height: 120,
                background: "linear-gradient(180deg, rgba(139,92,246,0.15) 0%, rgba(0,0,0,0.6) 100%)",
                borderRadius: "50% 50% 0 0 / 30% 30% 0 0",
                filter: "blur(1px)",
              }}
            />
            {/* Timecode */}
            <div className="absolute top-3 right-3 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-white/40 text-[10px] font-mono">00:02:34</span>
            </div>
          </div>
        </div>

        {/* Export badge */}
        <div
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(12px)" }}
        >
          <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          <span className="text-white/60 text-xs font-medium">Ready to export · 4K</span>
        </div>
      </div>
    </div>
  );
}

// ── Scene 4: Lyric → visual moment ──────────────────────────────────────────
function LyricVisualScene({ active }: { active: boolean }) {
  const [phase, setPhase] = useState(0); // 0=lyric, 1=arrow, 2=visual

  useEffect(() => {
    if (!active) { setPhase(0); return; }
    const t1 = setTimeout(() => setPhase(1), 800);
    const t2 = setTimeout(() => setPhase(2), 1600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [active]);

  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{ opacity: active ? 1 : 0, transition: `opacity ${FADE_DURATION}ms ease` }}
    >
      {/* Ambient glow — shifts from neutral to warm on phase 2 */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
          style={{
            background: phase === 2
              ? "radial-gradient(ellipse, rgba(251,146,60,0.15) 0%, rgba(239,68,68,0.08) 40%, transparent 70%)"
              : "radial-gradient(ellipse, rgba(139,92,246,0.1) 0%, transparent 70%)",
            filter: "blur(60px)",
            transition: "background 1.2s ease",
          }}
        />
      </div>

      <div
        className="flex flex-col items-center gap-5 px-8"
        style={{
          opacity: active ? 1 : 0,
          transform: active ? "translateY(0)" : "translateY(16px)",
          transition: `opacity ${FADE_DURATION}ms ease, transform ${FADE_DURATION}ms ease`,
        }}
      >
        {/* Input lyric */}
        <div
          className="inline-flex items-center gap-3 rounded-xl border border-white/10 px-5 py-3"
          style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(8px)" }}
        >
          <span className="text-white/30 text-sm">✎</span>
          <span className="text-white/75 text-base sm:text-lg italic font-medium">"Walking through fire"</span>
        </div>

        {/* Arrow — appears at phase 1 */}
        <div
          style={{
            opacity: phase >= 1 ? 1 : 0,
            transform: phase >= 1 ? "translateY(0)" : "translateY(-8px)",
            transition: "opacity 0.5s ease, transform 0.5s ease",
          }}
        >
          <div className="flex flex-col items-center gap-1">
            <div className="w-px h-5 bg-gradient-to-b from-white/20 to-orange-400/60" />
            <svg className="w-4 h-4 text-orange-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 20l-8-8h5V4h6v8h5l-8 8z" />
            </svg>
          </div>
        </div>

        {/* Visual reaction — appears at phase 2 */}
        <div
          style={{
            opacity: phase >= 2 ? 1 : 0,
            transform: phase >= 2 ? "scale(1)" : "scale(0.92)",
            transition: "opacity 0.7s ease, transform 0.7s ease",
          }}
        >
          <div
            className="flex items-center gap-3 rounded-full border border-orange-500/30 px-6 py-3"
            style={{ background: "rgba(251,146,60,0.1)", backdropFilter: "blur(8px)" }}
          >
            <span className="text-2xl">🔥</span>
            <span className="text-orange-200 font-semibold text-sm sm:text-base">Flames · Heat · Sparks</span>
            <span className="text-2xl">⚡</span>
          </div>
          <p className="mt-3 text-center text-white/30 text-xs tracking-widest uppercase">
            AI understands context → generates matching visuals
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function HeroCinematicBg() {
  const [scene, setScene] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setScene(s => (s + 1) % 4);
    }, SCENE_DURATION);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden="true">
      {/* Base dark background */}
      <div className="absolute inset-0 bg-[#080810]" />

      {/* Scene layers — each crossfades */}
      <StoryboardScene    active={scene === 0} />
      <GenerationScene    active={scene === 1} />
      <CinematicOutputScene active={scene === 2} />
      <LyricVisualScene   active={scene === 3} />

      {/* Persistent dark veil — ensures text is always readable */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/75" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/30" />

      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.65) 100%)" }}
      />

      {/* Film grain */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundSize: "128px 128px",
        }}
      />

      {/* Scene indicator dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
        {[0,1,2,3].map(i => (
          <div
            key={i}
            className="rounded-full transition-all duration-700"
            style={{
              width: scene === i ? 16 : 5,
              height: 5,
              background: scene === i ? "rgba(167,139,250,0.7)" : "rgba(255,255,255,0.12)",
            }}
          />
        ))}
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes bgShimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        @keyframes rayPulse {
          from { opacity: 0.4; }
          to   { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
