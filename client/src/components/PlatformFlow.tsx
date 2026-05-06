import { useEffect, useRef, useState, useCallback } from "react";
import { NavLink } from "@/components/NavLink";
import { ArrowRight, Pause, Play } from "@/lib/icons";

// ─── Step definitions ────────────────────────────────────────────────────────

const STEPS = [
  {
    id: 1,
    iconImg: "/manus-storage/wizaudio-logo-v1_f428aad0.png",
    label: "Audio",
    title: "Create or upload your track",
    desc: "Generate an original song with AI or upload your own audio file to begin.",
    color: "violet",
    accent: "#8b5cf6",
    bg: "from-[#b8892a]/80 to-[#4a3010]/40",
    border: "border-[--color-gold]/30",
    pill: "bg-[--color-gold]/15 text-[--color-gold] border-[--color-gold]/30",
    dot: "bg-[--color-gold]",
    animType: "waveform",
    ctaLink: "/music-creator",
    ctaLabel: "Start with Audio",
  },
  {
    id: 2,
    iconImg: "/manus-storage/wizvideo-logo-v1_9ec37e45.png",
    label: "Video",
    title: "Turn sound into video",
    desc: "Our AI transforms your audio into a fully cinematic, scene-by-scene video.",
    color: "cyan",
    accent: "#06b6d4",
    bg: "from-[#9090a0]/80 to-[#2e2e36]/40",
    border: "border-[--color-silver]/30",
    pill: "bg-[--color-silver]/10 text-[--color-silver] border-cyan-500/25",
    dot: "bg-cyan-500",
    animType: "filmstrip",
  },
  {
    id: 3,
    iconImg: "/manus-storage/wizanimate-logo-new_a84f9808_a089857a.png",
    label: "Character",
    title: "Lock your character across every scene",
    desc: "Upload a photo or generate an AI character — consistent in every frame.",
    color: "pink",
    accent: "#ec4899",
    bg: "from-[#9090a0]/80 to-[#2e2e36]/40",
    border: "border-[--color-silver]/30",
    pill: "bg-[--color-silver]/10 text-[--color-silver] border-pink-500/25",
    dot: "bg-[--color-silver]",
    animType: "character",
  },
  {
    id: 4,
    iconImg: "/manus-storage/wizcreate-logo-new_85a25756_f4aa29bb.png",
    label: "Storyboard",
    title: "Control every scene before building",
    desc: "Preview and refine your storyboard — adjust prompts, styles, and timing.",
    color: "amber",
    accent: "#f59e0b",
    bg: "from-[#b8892a]/80 to-[#4a3010]/40",
    border: "border-[--color-gold]/30",
    pill: "bg-[--color-gold]/15 text-[--color-gold] border-[--color-gold]/30",
    dot: "bg-[--color-gold]",
    animType: "panels",
  },
  {
    id: 5,
    iconImg: "/manus-storage/wizgenesis-logo-new_9814b3d1_cabaf933.png",
    label: "Build",
    title: "Build your full video",
    desc: "Only build when you're happy. Choose quality, resolution, and style.",
    color: "emerald",
    accent: "#10b981",
    bg: "from-[#9090a0]/80 to-[#2e2e36]/40",
    border: "border-[--color-silver]/30",
    pill: "bg-[--color-silver]/10 text-[--color-silver] border-[--color-silver]/25",
    dot: "bg-[--color-silver]",
    animType: "progress",
  },
  {
    id: 6,
    iconImg: "/manus-storage/wizscript-logo-v1_c6af5345.png",
    label: "Notify",
    title: "Get notified when ready",
    desc: "Receive an email or dashboard alert the moment your video is complete.",
    color: "sky",
    accent: "#0ea5e9",
    bg: "from-sky-950/80 to-sky-900/40",
    border: "border-sky-500/30",
    pill: "bg-sky-500/15 text-sky-300 border-sky-500/25",
    dot: "bg-sky-500",
    animType: "notification",
  },
  {
    id: 7,
    iconImg: "/manus-storage/wizboost-logo-new_93f2b48b_b731a139.png",
    label: "WizBoost",
    title: "Share your content and grow your audience",
    desc: "Publish, share, and promote your creation across every platform.",
    color: "rose",
    accent: "#f43f5e",
    bg: "from-[#9090a0]/80 to-[#2e2e36]/40",
    border: "border-rose-500/30",
    pill: "bg-[--color-silver]/10 text-[--color-silver] border-rose-500/25",
    dot: "bg-rose-500",
    animType: "boost",
  },
] as const;

type AnimType = (typeof STEPS)[number]["animType"];

// ─── Per-step micro-animations ────────────────────────────────────────────────

function WaveformAnim({ active }: { active: boolean }) {
  const bars = [3, 6, 9, 12, 8, 14, 10, 7, 13, 5, 11, 8, 15, 6, 9, 12, 7, 10, 4, 13];
  return (
    <div className="flex items-end justify-center gap-[3px] h-20 px-4">
      {bars.map((h, i) => (
        <div
          key={i}
          className="w-1.5 rounded-full bg-[--color-gold] origin-bottom"
          style={{
            height: active ? `${h * 4}px` : "6px",
            transition: `height 0.4s ease ${i * 30}ms`,
            animation: active ? `waveBar 1.2s ease-in-out ${i * 60}ms infinite alternate` : "none",
            opacity: active ? 0.85 : 0.3,
          }}
        />
      ))}
      <style>{`
        @keyframes waveBar {
          from { transform: scaleY(0.4); }
          to   { transform: scaleY(1.0); }
        }
      `}</style>
    </div>
  );
}

function FilmstripAnim({ active }: { active: boolean }) {
  const frames = ["#1a1a2e", "#16213e", "#0f3460", "#1a1a2e"];
  return (
    <div className="relative h-20 flex items-center justify-center overflow-hidden px-2">
      <div
        className="flex gap-2"
        style={{
          transform: active ? "translateX(-25%)" : "translateX(0)",
          transition: "transform 1.8s ease-in-out",
        }}
      >
        {[...frames, ...frames].map((bg, i) => (
          <div
            key={i}
            className="w-14 h-16 rounded-lg border border-[--color-silver]/30 flex-shrink-0 relative overflow-hidden"
            style={{ background: bg }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="w-5 h-5 rounded-full border-2 border-[--color-silver]/60"
                style={{ opacity: active ? 1 : 0.3, transition: "opacity 0.5s" }}
              />
            </div>
            {/* Film perforations */}
            <div className="absolute top-1 left-1 w-1.5 h-1.5 rounded-sm bg-black/60" />
            <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-sm bg-black/60" />
            <div className="absolute bottom-1 left-1 w-1.5 h-1.5 rounded-sm bg-black/60" />
            <div className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-sm bg-black/60" />
          </div>
        ))}
      </div>
    </div>
  );
}

function CharacterAnim({ active }: { active: boolean }) {
  return (
    <div className="h-20 flex items-center justify-center gap-6">
      {/* Photo */}
      <div
        className="w-14 h-14 rounded-full border-2 border-[--color-silver]/40 bg-[--color-silver]/10 flex items-center justify-center overflow-hidden"
        style={{ opacity: active ? 1 : 0.4, transition: "opacity 0.5s" }}
      >
        <div className="w-8 h-8 rounded-full bg-[--color-silver]/10 flex items-center justify-center">
          <div className="w-4 h-4 rounded-full bg-[--color-silver]/10" />
        </div>
      </div>
      {/* Arrow */}
      <div
        className="flex flex-col items-center gap-1"
        style={{ opacity: active ? 1 : 0.3, transition: "opacity 0.5s 0.2s" }}
      >
        <div className="w-8 h-px bg-gradient-to-r from-[#9090a0]/60 to-[#2e2e36]/60" />
        <span className="text-[9px] text-[--color-silver]/70 font-semibold uppercase tracking-wider">AI</span>
        <div className="w-8 h-px bg-gradient-to-r from-[#9090a0]/60 to-[#2e2e36]/60" />
      </div>
      {/* AI Character */}
      <div
        className="w-14 h-14 rounded-full border-2 border-[--color-silver]/60 bg-gradient-to-br from-[#9090a0]/60 to-[#4a3010]/60 flex items-center justify-center relative"
        style={{
          opacity: active ? 1 : 0.4,
          transition: "opacity 0.5s 0.3s",
          boxShadow: active ? "0 0 20px rgba(236,72,153,0.3)" : "none",
        }}
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#9090a0]/40 to-[#4a3010]/40 flex items-center justify-center">
          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-[#9090a0]/80 to-[#4a3010]/80" />
        </div>
        {/* Lock badge */}
        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[--color-silver] flex items-center justify-center">
          <span className="text-[8px]"></span>
        </div>
      </div>
    </div>
  );
}

function PanelsAnim({ active }: { active: boolean }) {
  const panels = [
    { w: "w-20", delay: 0 },
    { w: "w-16", delay: 100 },
    { w: "w-20", delay: 200 },
  ];
  return (
    <div className="h-20 flex items-center justify-center gap-2">
      {panels.map((p, i) => (
        <div
          key={i}
          className={`${p.w} h-14 rounded-lg border border-[--color-gold]/30 bg-[--color-gold]/15 relative overflow-hidden`}
          style={{
            opacity: active ? 1 : 0.3,
            transform: active ? "translateY(0)" : "translateY(8px)",
            transition: `opacity 0.4s ${p.delay}ms, transform 0.4s ${p.delay}ms`,
          }}
        >
          {/* Scene lines */}
          <div className="absolute bottom-2 left-2 right-2 space-y-1">
            <div className="h-1 rounded-full bg-[--color-gold]/15" />
            <div className="h-1 rounded-full bg-[--color-gold]/15 w-3/4" />
          </div>
          {/* Scene number */}
          <div className="absolute top-1.5 left-2 text-[9px] font-bold text-[--color-gold]/60">
            {i + 1}
          </div>
        </div>
      ))}
    </div>
  );
}

function ProgressAnim({ active }: { active: boolean }) {
  return (
    <div className="h-20 flex flex-col items-center justify-center gap-3 px-6 w-full">
      {/* Progress bar */}
      <div className="w-full h-2 rounded-full bg-[--color-silver]/10 border border-[--color-silver]/20 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#9090a0] to-[#2e2e36]"
          style={{
            width: active ? "85%" : "0%",
            transition: "width 1.8s cubic-bezier(0.4, 0, 0.2, 1)",
            boxShadow: active ? "0 0 8px rgba(16,185,129,0.6)" : "none",
          }}
        />
      </div>
      {/* Status text */}
      <div className="flex items-center gap-2">
        <div
          className="w-2 h-2 rounded-full bg-[--color-silver]"
          style={{
            animation: active ? "pulse 1s ease-in-out infinite" : "none",
            opacity: active ? 1 : 0.3,
          }}
        />
        <span
          className="text-xs text-[--color-silver]/80 font-medium"
          style={{ opacity: active ? 1 : 0.3, transition: "opacity 0.5s" }}
        >
          {active ? "Building scene 4 of 7…" : "Waiting to build"}
        </span>
      </div>
      {/* Quality badges */}
      <div
        className="flex gap-1.5"
        style={{ opacity: active ? 1 : 0.2, transition: "opacity 0.5s 0.5s" }}
      >
        {["4K", "HDR", "No watermark"].map((b) => (
          <span key={b} className="text-[9px] bg-[--color-silver]/10 border border-[--color-silver]/25 text-[--color-silver] rounded-full px-2 py-0.5 font-semibold">
            {b}
          </span>
        ))}
      </div>
    </div>
  );
}

function NotificationAnim({ active }: { active: boolean }) {
  return (
    <div className="h-20 flex items-center justify-center">
      <div
        className="relative bg-sky-950/60 border border-sky-500/30 rounded-2xl px-4 py-3 max-w-[200px] w-full"
        style={{
          opacity: active ? 1 : 0.3,
          transform: active ? "translateY(0) scale(1)" : "translateY(10px) scale(0.95)",
          transition: "opacity 0.5s, transform 0.5s",
          boxShadow: active ? "0 0 24px rgba(14,165,233,0.2)" : "none",
        }}
      >
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-full bg-sky-500/20 border border-sky-500/30 flex items-center justify-center flex-shrink-0 text-sm">
            <img src="/manus-storage/wizscript-logo-v1_c6af5345.png" alt="Notify" className="w-4 h-4 object-contain"  loading="lazy" />
          </div>
          <div>
            <p className="text-sky-200 text-[11px] font-bold leading-tight">Your video is ready!</p>
            <p className="text-sky-400/70 text-[10px] mt-0.5">WIZ AI · Just now</p>
          </div>
        </div>
        {/* Notification dot */}
        {active && (
          <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-sky-400 border-2 border-sky-950 animate-ping" />
        )}
      </div>
    </div>
  );
}

function BoostAnim({ active }: { active: boolean }) {
  const platforms = [
    { icon: "▶", color: "bg-red-500/20 border-red-500/30 text-red-400", delay: 0 },
    { icon: "IG", color: "bg-[--color-silver]/10 border-[--color-silver]/30 text-[--color-silver]", delay: 80 },
    { icon: "♪", color: "bg-[--color-silver]/10 border-rose-500/30 text-[--color-silver]", delay: 160 },
    { icon: "X", color: "bg-sky-500/20 border-sky-500/30 text-sky-400", delay: 240 },
  ];
  return (
    <div className="h-20 flex flex-col items-center justify-center gap-2">
      {/* Rocket */}
      <div
        className="text-2xl"
        style={{
          transform: active ? "translateY(-4px)" : "translateY(4px)",
          transition: "transform 0.6s ease-in-out",
          animation: active ? "rocketBob 2s ease-in-out infinite" : "none",
        }}
      >
        <img src="/manus-storage/wizboost-logo-new_93f2b48b_b731a139.png" alt="WizBoost" className="w-8 h-8 object-contain"  loading="lazy" />
      </div>
      {/* Platform icons */}
      <div className="flex gap-1.5">
        {platforms.map((p, i) => (
          <div
            key={i}
            className={`w-7 h-7 rounded-lg border ${p.color} flex items-center justify-center text-xs`}
            style={{
              opacity: active ? 1 : 0.2,
              transform: active ? "scale(1)" : "scale(0.8)",
              transition: `opacity 0.3s ${p.delay}ms, transform 0.3s ${p.delay}ms`,
            }}
          >
            {p.icon}
          </div>
        ))}
      </div>
      <style>{`
        @keyframes rocketBob {
          0%, 100% { transform: translateY(-4px); }
          50%       { transform: translateY(4px); }
        }
      `}</style>
    </div>
  );
}

function StepAnimation({ type, active }: { type: AnimType; active: boolean }) {
  switch (type) {
    case "waveform":     return <WaveformAnim active={active} />;
    case "filmstrip":    return <FilmstripAnim active={active} />;
    case "character":    return <CharacterAnim active={active} />;
    case "panels":       return <PanelsAnim active={active} />;
    case "progress":     return <ProgressAnim active={active} />;
    case "notification": return <NotificationAnim active={active} />;
    case "boost":        return <BoostAnim active={active} />;
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setInView(true); },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

const STEP_DURATION = 2800; // ms per step

export default function PlatformFlow() {
  const { ref: sectionRef, inView } = useInView(0.1);
  const [activeStep, setActiveStep] = useState(0); // 0-indexed
  const [paused, setPaused] = useState(false);
  const [started, setStarted] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const advance = useCallback(() => {
    setActiveStep((s) => (s + 1) % STEPS.length);
  }, []);

  // Start auto-play when section enters view
  useEffect(() => {
    if (inView && !started) {
      setStarted(true);
    }
  }, [inView, started]);

  useEffect(() => {
    if (!started || paused) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(advance, STEP_DURATION);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [started, paused, advance]);

  const step = STEPS[activeStep];

  return (
    <section
      ref={sectionRef}
      className="relative py-24 px-5 overflow-hidden"
      style={{ background: "linear-gradient(180deg, #080810 0%, #0c0a18 50%, #080810 100%)" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Ambient glow that tracks active step colour */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-1000"
        style={{
          background: `radial-gradient(ellipse 700px 350px at 50% 60%, ${step.accent}08 0%, transparent 70%)`,
        }}
      />

      <div className="relative max-w-6xl mx-auto">

        {/* ── Header ── */}
        <div
          className={`text-center mb-14 transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
        >
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[--color-gold] animate-pulse" />
            <span className="text-white/50 text-xs font-semibold uppercase tracking-widest">The Full Journey</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight mb-4 tracking-tight">
            From idea to audience —
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#b8892a] via-cyan-400 to-[#2e2e36]">
              all in one platform
            </span>
          </h2>
          <p className="text-white/45 text-base max-w-xl mx-auto">
            Seven steps. One platform. Zero complexity.
          </p>
        </div>

        {/* ── Desktop: step tabs + large animation panel ── */}
        <div className="hidden lg:block">
          {/* Step selector tabs */}
          <div className="flex items-center justify-center gap-1 mb-8 flex-wrap">
            {STEPS.map((s, i) => {
              const isActive = i === activeStep;
              return (
                <button
                  key={s.id}
                  onClick={() => { setActiveStep(i); setPaused(true); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 border ${
                    isActive
                      ? `${s.pill} scale-105 shadow-lg`
                      : "bg-white/4 border-white/8 text-white/40 hover:text-white/70 hover:bg-white/8"
                  }`}
                >
                  <img src={s.iconImg} alt={s.label} className="w-4 h-4 object-contain"  loading="lazy" />
                  <span>{s.label}</span>
                </button>
              );
            })}
            {/* Play/pause */}
            <button
              onClick={() => setPaused((p) => !p)}
              className="ml-2 w-7 h-7 rounded-full bg-white/8 border border-white/12 flex items-center justify-center text-white/50 hover:text-white/80 transition-colors"
            >
              {paused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            </button>
          </div>

          {/* Large animated panel */}
          <div
            className={`relative rounded-3xl border ${step.border} overflow-hidden transition-all duration-700`}
            style={{
              background: `linear-gradient(135deg, ${step.accent}12 0%, #0a0a12 60%)`,
              boxShadow: `0 0 60px ${step.accent}18`,
            }}
          >
            {/* Progress bar across top */}
            <div className="h-0.5 bg-white/5 overflow-hidden">
              <div
                key={activeStep}
                className="h-full rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${step.accent}, ${step.accent}80)`,
                  animation: paused ? "none" : `stepProgress ${STEP_DURATION}ms linear forwards`,
                }}
              />
            </div>
            <style>{`
              @keyframes stepProgress {
                from { width: 0%; }
                to   { width: 100%; }
              }
            `}</style>

            <div className="grid grid-cols-2 gap-0 min-h-[320px]">
              {/* Left: text content */}
              <div className="flex flex-col justify-center p-10">
                <div className={`inline-flex items-center gap-2 ${step.pill} border rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest w-fit mb-5`}>
                  <img src={step.iconImg} alt={step.label} className="w-4 h-4 object-contain"  loading="lazy" />
                  <span>Step {step.id} of {STEPS.length}</span>
                </div>
                <h3
                  key={`title-${activeStep}`}
                  className="text-white text-2xl font-black leading-tight mb-3"
                  style={{ animation: "fadeSlideIn 0.5s ease forwards" }}
                >
                  {step.title}
                </h3>
                <p
                  key={`desc-${activeStep}`}
                  className="text-white/55 text-sm leading-relaxed max-w-sm"
                  style={{ animation: "fadeSlideIn 0.5s ease 0.1s both forwards" }}
                >
                  {step.desc}
                </p>

                {/* Step CTA link (if defined) */}
                {(step as any).ctaLink && (
                  <a
                    href={(step as any).ctaLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-6 mb-2 text-xs font-bold px-4 py-2 rounded-xl transition-all duration-200 hover:scale-105"
                    style={{
                      background: `${step.accent}22`,
                      border: `1px solid ${step.accent}55`,
                      color: step.accent,
                    }}
                  >
                    <img src={step.iconImg} alt={step.label} className="w-3.5 h-3.5 object-contain"  loading="lazy" />
                    {(step as any).ctaLabel}
                    <ArrowRight className="w-3 h-3" />
                  </a>
                )}

                {/* Step dots */}
                <div className="flex gap-1.5 mt-8">
                  {STEPS.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => { setActiveStep(i); setPaused(true); }}
                      className={`rounded-full transition-all duration-300 ${
                        i === activeStep
                          ? `w-6 h-2`
                          : "w-2 h-2 bg-white/20 hover:bg-white/40"
                      }`}
                      style={i === activeStep ? { background: step.accent } : {}}
                    />
                  ))}
                </div>
              </div>

              {/* Right: micro-animation */}
              <div
                className="flex items-center justify-center p-8 border-l border-white/5"
                style={{ background: `${step.accent}06` }}
              >
                <div className="w-full max-w-[280px]">
                  <StepAnimation type={step.animType} active={started} />
                </div>
              </div>
            </div>
          </div>

          {/* Mini step strip below */}
          <div className="flex items-stretch mt-4 rounded-2xl overflow-hidden border border-white/6">
            {STEPS.map((s, i) => {
              const isActive = i === activeStep;
              const isPast = i < activeStep;
              return (
                <button
                  key={s.id}
                  onClick={() => { setActiveStep(i); setPaused(true); }}
                  className={`flex-1 flex flex-col items-center py-3 px-1 text-center transition-all duration-300 border-r border-white/5 last:border-r-0 ${
                    isActive ? "bg-white/6" : isPast ? "bg-white/2" : "bg-transparent"
                  } hover:bg-white/5`}
                >
                  <img src={s.iconImg} alt={s.label} className="w-6 h-6 object-contain mb-1"  loading="lazy" />
                  <span className={`text-[10px] font-semibold ${isActive ? "text-white" : "text-white/35"}`}>
                    {s.label}
                  </span>
                  {isActive && (
                    <div
                      className="w-1 h-1 rounded-full mt-1"
                      style={{ background: s.accent }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Mobile: vertical card stack ── */}
        <div className="lg:hidden space-y-3">
          {STEPS.map((s, i) => {
            const isActive = i === activeStep;
            return (
              <div
                key={s.id}
                className={`rounded-2xl border ${s.border} p-4 transition-all duration-500 cursor-pointer ${
                  isActive ? "scale-[1.01]" : "opacity-60"
                }`}
                style={{
                  background: isActive ? `linear-gradient(135deg, ${s.accent}12 0%, #0a0a12 80%)` : "#0a0a12",
                  boxShadow: isActive ? `0 0 24px ${s.accent}18` : "none",
                }}
                onClick={() => { setActiveStep(i); setPaused(true); }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl border ${s.border} flex items-center justify-center text-lg flex-shrink-0`}
                    style={{ background: `${s.accent}15` }}
                  >
                    <img src={s.iconImg} alt={s.label} className="w-6 h-6 object-contain"  loading="lazy" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[9px] font-bold uppercase tracking-widest ${s.pill.split(" ")[1]}`}>
                        Step {s.id}
                      </span>
                    </div>
                    <h3 className="text-white font-bold text-sm leading-tight mb-1">{s.title}</h3>
                    {isActive && (
                      <p className="text-white/50 text-xs leading-relaxed">{s.desc}</p>
                    )}
                  </div>
                </div>
                {isActive && (
                  <div className="mt-3 pt-3 border-t border-white/6">
                    <StepAnimation type={s.animType} active={true} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Footer tagline + CTA ── */}
        <div
          className={`text-center mt-14 transition-all duration-700 delay-300 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
        >
          <p className="text-white/30 text-sm mb-6 tracking-wide">
            Everything you need to create, build, and grow — in one platform
          </p>
          <NavLink
            href="/onboarding"
            className="inline-flex items-center gap-2.5 bg-gradient-to-r from-[#b8892a] to-[#2e2e36] hover:from-[#b8892a] hover:to-[#2e2e36] text-white font-bold px-8 py-3.5 rounded-2xl transition-all duration-300 hover:scale-105 shadow-lg shadow-violet-500/25 text-sm"
          >
            Start Your Journey Free
            <ArrowRight className="w-4 h-4" />
          </NavLink>
        </div>
      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}
