import { useEffect, useRef, useState, useCallback } from "react";
import { Volume2, VolumeX, Zap, Music2, Film, Play, Pause, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";

/* ── Animated waveform bars ─────────────────────────────────────────────── */
function WaveformVisualizer({ active, wizsound }: { active: boolean; wizsound: boolean }) {
  const bars = [14, 24, 36, 48, 44, 38, 30, 22, 32, 44, 50, 42, 32, 36, 46, 52, 44, 34, 24, 16, 28, 40, 52, 44, 36, 28, 20, 32, 44, 48];
  const color = wizsound
    ? "linear-gradient(to top, rgba(217,70,239,0.95), rgba(139,92,246,0.8))"
    : "linear-gradient(to top, rgba(255,255,255,0.35), rgba(255,255,255,0.2))";
  const glow = wizsound ? "0 0 8px rgba(217,70,239,0.6)" : "none";
  return (
    <div className="flex items-center justify-center gap-[3px] h-16">
      {bars.map((h, i) => (
        <div
          key={i}
          className="rounded-full transition-all"
          style={{
            width: 3,
            height: active ? `${wizsound ? h : Math.max(h * 0.55, 10)}%` : "20%",
            background: active ? color : "rgba(255,255,255,0.10)",
            animation: active ? `waveBar ${0.6 + (i % 5) * 0.12}s ease-in-out infinite alternate` : "none",
            animationDelay: `${(i * 0.04) % 0.5}s`,
            boxShadow: active ? glow : "none",
            transition: "background 0.4s, box-shadow 0.4s",
          }}
        />
      ))}
      <style>{`
        @keyframes waveBar {
          from { transform: scaleY(0.4); }
          to   { transform: scaleY(1.15); }
        }
      `}</style>
    </div>
  );
}

/* ── Audio demo player ───────────────────────────────────────────────────── */
const DEMO_AUDIO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/31d5bf0e/cinema-sting.mp3";

function AudioDemoPlayer({ visible }: { visible: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [wizsound, setWizsound] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number>(0);

  // Create audio element on mount
  useEffect(() => {
    const audio = new Audio(DEMO_AUDIO_URL);
    audio.preload = "metadata";
    audio.loop = true;
    audio.volume = 0.7;
    audioRef.current = audio;

    audio.addEventListener("ended", () => setPlaying(false));

    return () => {
      audio.pause();
      audio.src = "";
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Apply WizSound EQ simulation via volume/panning
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (wizsound) {
      audio.volume = muted ? 0 : 0.95; // louder, fuller
    } else {
      audio.volume = muted ? 0 : 0.65; // standard
    }
  }, [wizsound, muted]);

  // Progress tracker
  const trackProgress = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    setProgress((audio.currentTime / audio.duration) * 100);
    rafRef.current = requestAnimationFrame(trackProgress);
  }, []);

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      cancelAnimationFrame(rafRef.current);
      setPlaying(false);
    } else {
      try {
        await audio.play();
        setPlaying(true);
        rafRef.current = requestAnimationFrame(trackProgress);
      } catch {
        // autoplay blocked — still update state
        setPlaying(false);
      }
    }
  }, [playing, trackProgress]);

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const next = !muted;
    setMuted(next);
    audio.volume = next ? 0 : (wizsound ? 0.95 : 0.65);
  };

  return (
    <div
      className="relative rounded-2xl overflow-hidden border border-white/10 bg-white/3"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: "opacity 0.7s ease 0.3s, transform 0.7s ease 0.3s",
        boxShadow: wizsound ? "0 0 60px rgba(217,70,239,0.15), 0 0 120px rgba(139,92,246,0.08)" : "none",
      }}
    >
      {/* WizSound glow border */}
      {wizsound && (
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{ boxShadow: "inset 0 0 0 1.5px rgba(217,70,239,0.4)" }}
        />
      )}

      {/* Caption */}
      <div className="px-6 pt-5 pb-3 border-b border-white/6">
        <p className="text-white/40 text-xs font-mono tracking-widest uppercase text-center">
          Powered by WizSound™ – richer, more cinematic audio
        </p>
      </div>

      {/* Waveform display */}
      <div
        className="px-6 py-6 relative"
        style={{
          background: wizsound
            ? "linear-gradient(180deg, rgba(139,92,246,0.06) 0%, transparent 100%)"
            : "transparent",
          transition: "background 0.5s",
        }}
      >
        <WaveformVisualizer active={playing} wizsound={wizsound} />

        {/* Mode label */}
        <div className="text-center mt-3">
          {wizsound ? (
            <span className="inline-flex items-center gap-1.5 text-fuchsia-300 text-xs font-bold tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 animate-pulse" />
              WizSound™ Cinematic Active
            </span>
          ) : (
            <span className="text-white/30 text-xs font-semibold tracking-wide">Standard Audio</span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="px-6 pb-5 flex items-center gap-4">
        {/* Play/pause */}
        <button
          onClick={togglePlay}
          aria-label={playing ? "Pause demo" : "Play demo"}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 hover:scale-105 active:scale-95"
          style={{
            background: wizsound
              ? "linear-gradient(135deg, rgba(217,70,239,0.9), rgba(139,92,246,0.8))"
              : "rgba(255,255,255,0.12)",
            boxShadow: wizsound ? "0 0 20px rgba(217,70,239,0.4)" : "none",
          }}
        >
          {playing
            ? <Pause className="w-4 h-4 text-white" />
            : <Play className="w-4 h-4 text-white ml-0.5" />
          }
        </button>

        {/* Progress bar */}
        <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-100"
            style={{
              width: `${progress}%`,
              background: wizsound
                ? "linear-gradient(90deg, rgba(217,70,239,0.9), rgba(139,92,246,0.7))"
                : "rgba(255,255,255,0.4)",
            }}
          />
        </div>

        {/* Mute */}
        <button
          onClick={toggleMute}
          aria-label="Toggle sound"
          className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white/70 transition-colors flex-shrink-0"
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Standard / WizSound toggle */}
      <div className="px-6 pb-5">
        <div
          className="flex items-center justify-between p-1 rounded-xl border border-white/8 bg-white/3"
          role="group"
          aria-label="Compare standard vs cinematic audio"
        >
          <button
            onClick={() => setWizsound(false)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold tracking-wide transition-all duration-300 ${
              !wizsound
                ? "bg-white/12 text-white shadow-sm"
                : "text-white/35 hover:text-white/55"
            }`}
            aria-pressed={!wizsound}
          >
            Standard Audio
          </button>
          <button
            onClick={() => setWizsound(true)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold tracking-wide transition-all duration-300 ${
              wizsound
                ? "text-white shadow-sm"
                : "text-white/35 hover:text-white/55"
            }`}
            style={wizsound ? {
              background: "linear-gradient(135deg, rgba(217,70,239,0.8), rgba(139,92,246,0.7))",
              boxShadow: "0 0 16px rgba(217,70,239,0.3)",
            } : {}}
            aria-pressed={wizsound}
          >
            WizSound™ Cinematic
          </button>
        </div>
        <p className="text-white/25 text-[10px] text-center mt-2 font-mono">
          {wizsound
            ? "Full mastering pipeline · Stereo widening · Spatial depth"
            : "Original audio mix — no enhancement applied"
          }
        </p>
      </div>
    </div>
  );
}

/* ── Feature card ────────────────────────────────────────────────────────── */
function FeatureCard({
  icon: Icon,
  title,
  description,
  gradient,
  delay,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  gradient: string;
  delay: number;
}) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.2 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="relative rounded-2xl border border-white/8 bg-white/3 p-6 overflow-hidden group hover:border-fuchsia-500/30 hover:bg-white/5 transition-all duration-500"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      }}
    >
      <div
        className="absolute top-0 left-0 w-24 h-24 rounded-br-full opacity-20 group-hover:opacity-30 transition-opacity duration-500"
        style={{ background: gradient }}
      />
      <div className="relative z-10">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
          style={{ background: gradient, boxShadow: "0 0 20px rgba(217,70,239,0.2)" }}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>
        <h3 className="text-white font-bold text-base mb-2">{title}</h3>
        <p className="text-white/50 text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

/* ── Main section ────────────────────────────────────────────────────────── */
export default function WizSoundSection() {
  const [waveActive, setWaveActive] = useState(false);
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const [, navigate] = useLocation();

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          setWaveActive(true);
        } else {
          setWaveActive(false);
        }
      },
      { threshold: 0.2 }
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="wizsound"
      className="relative py-28 px-6 overflow-hidden"
      style={{ background: "linear-gradient(180deg, #0a0a14 0%, #0d0d1a 50%, #0a0a0f 100%)" }}
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(139,92,246,0.06) 0%, transparent 70%)",
        }}
      />
      {/* Top border glow */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-fuchsia-500/40 to-transparent" />

      <div className="relative max-w-6xl mx-auto">

        {/* Header */}
        <div
          className="text-center mb-14"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.7s ease, transform 0.7s ease",
          }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300 text-xs font-mono tracking-widest uppercase font-semibold mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 animate-pulse" />
            Powered by WizSound™
          </div>

          <h2
            className="font-extrabold tracking-tight text-white mb-4"
            style={{ fontSize: "clamp(2rem, 4.5vw, 3.5rem)", lineHeight: 1.1 }}
          >
            Hear the difference with{" "}
            <span className="bg-gradient-to-r from-fuchsia-300 via-purple-200 to-indigo-300 bg-clip-text text-transparent">
              WizSound™
            </span>
          </h2>

          <p className="text-white/55 text-lg max-w-2xl mx-auto leading-relaxed">
            Immersive cinematic audio for your videos.
          </p>
          <p className="text-white/40 text-base max-w-2xl mx-auto leading-relaxed mt-3">
            Our proprietary audio engine turns ordinary sound into a cinematic experience. Choose{" "}
            <span className="text-fuchsia-300 font-semibold">WizSound Cinematic</span> for full 3D depth, or{" "}
            <span className="text-violet-300 font-semibold">WizSound Enhance</span> for extra bass and clarity.
          </p>
        </div>

        {/* Two-column: audio demo + feature cards */}
        <div className="grid lg:grid-cols-2 gap-10 mb-14 items-start">

          {/* Left: Audio demo player */}
          <AudioDemoPlayer visible={visible} />

          {/* Right: Feature cards stacked */}
          <div className="flex flex-col gap-4">
            <FeatureCard
              icon={Volume2}
              title="Immersive Depth"
              description="Audio that surrounds the viewer — layered and spatial, not flat stereo. WizSound™ adds Haas stereo enhancement and spatial reverb for a three-dimensional sound field."
              gradient="linear-gradient(135deg, rgba(139,92,246,0.8), rgba(99,50,200,0.6))"
              delay={0}
            />
            <FeatureCard
              icon={Zap}
              title="Cinematic Mastering"
              description="AI-enhanced clarity, punch, and balance — like a professionally mastered soundtrack. 5-band EQ, dynamic compression, and loudness normalisation to streaming standards."
              gradient="linear-gradient(135deg, rgba(217,70,239,0.8), rgba(139,92,246,0.6))"
              delay={100}
            />
            <FeatureCard
              icon={Film}
              title="Built for Video"
              description="Optimised specifically for music videos, animation, and storytelling. Every processing step is tuned for emotional impact."
              gradient="linear-gradient(135deg, rgba(236,72,153,0.8), rgba(217,70,239,0.6))"
              delay={200}
            />
          </div>
        </div>

        {/* Tier comparison strip */}
        <div
          className="rounded-2xl border border-white/8 bg-white/3 overflow-hidden mb-10"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.7s ease 0.4s, transform 0.7s ease 0.4s",
          }}
        >
          <div className="grid grid-cols-3 divide-x divide-white/8">
            {[
              { label: "Standard Audio", sub: "Original mix", price: "Included", colour: "text-white/50", icon: Music2 },
              { label: "WizSound Enhance", sub: "Polished, fuller sound", price: "+£1", colour: "text-violet-300", icon: Volume2 },
              { label: "WizSound Cinematic", sub: "Full mastering pipeline", price: "+£3", colour: "text-fuchsia-300", icon: Zap, badge: "RECOMMENDED" },
            ].map((tier) => (
              <div key={tier.label} className={`relative p-5 text-center ${tier.badge ? "bg-fuchsia-500/5" : ""}`}>
                {tier.badge && (
                  <div className="absolute -top-px left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-b-lg bg-fuchsia-500 text-white text-[9px] font-bold tracking-widest">
                    {tier.badge}
                  </div>
                )}
                <tier.icon className={`w-5 h-5 mx-auto mb-2 mt-3 ${tier.colour}`} />
                <p className={`text-sm font-bold ${tier.colour}`}>{tier.label}</p>
                <p className="text-white/35 text-xs mt-1">{tier.sub}</p>
                <p className={`text-base font-extrabold mt-2 ${tier.badge ? "text-fuchsia-300" : "text-white/60"}`}>{tier.price}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Upgrade CTA */}
        <div
          className="text-center"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 0.7s ease 0.5s, transform 0.7s ease 0.5s",
          }}
        >
          <button
            onClick={() => navigate("/onboarding")}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-bold text-white text-sm transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              background: "linear-gradient(135deg, rgba(217,70,239,0.9), rgba(139,92,246,0.8))",
              boxShadow: "0 0 40px rgba(217,70,239,0.3), 0 4px 20px rgba(0,0,0,0.4)",
            }}
            aria-label="Add WizSound cinematic audio to your video"
          >
            <Zap className="w-4 h-4" />
            Add WizSound to Your Video
            <ChevronRight className="w-4 h-4" />
          </button>
          <p className="text-white/30 text-xs mt-3">
            Select WizSound Cinematic at checkout · Only pay when you render
          </p>
          {/* Callout */}
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-fuchsia-500/20 bg-fuchsia-500/8 text-fuchsia-300/70 text-xs font-semibold tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400/60 animate-pulse" />
            Simulated cinematic spatial audio experience
          </div>
        </div>

      </div>
    </section>
  );
}
