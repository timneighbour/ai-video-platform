import { useEffect, useRef, useState, useCallback } from "react";
import { Volume2, VolumeX, Zap, Music2, Film, Play, Pause, ChevronRight, Headphones, Sparkles } from "lucide-react";
import { useLocation } from "wouter";

/* ── CDN video URLs — two identical visuals, different baked-in audio ── */
const VIDEO_STANDARD =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/demo-video-standard_32cb7c7a.mp4";
const VIDEO_WIZSOUND =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/demo-video-wizsound_d2f714ff.mp4";

/* ── Dual-video sync player ─────────────────────────────────────────────── */
function DualVideoPlayer({ visible }: { visible: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [wizsound, setWizsound] = useState(true);
  const [progress, setProgress] = useState(0);
  const [loaded, setLoaded] = useState({ std: false, wiz: false });
  // Local mute state — independent of global AudioContext
  // Start unmuted so audio plays immediately when user clicks play
  const [isMuted, setIsMuted] = useState(false);

  const stdRef = useRef<HTMLVideoElement>(null);
  const wizRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number>(0);
  const wizsoundRef = useRef(true);

  /* ── Keep inactive video always muted, active video respects local mute ── */
  useEffect(() => {
    const std = stdRef.current;
    const wiz = wizRef.current;
    if (!std || !wiz) return;
    if (wizsound) {
      std.muted = true;      // Inactive: always silent
      wiz.muted = isMuted;   // Active: user controls
    } else {
      wiz.muted = true;      // Inactive: always silent
      std.muted = isMuted;   // Active: user controls
    }
  }, [wizsound, isMuted]);

  /* ── Track progress ────────────────────────────────────────────────── */
  const trackProgress = useCallback(() => {
    const active = wizsoundRef.current ? wizRef.current : stdRef.current;
    if (active && active.duration) {
      setProgress((active.currentTime / active.duration) * 100);
    }
    rafRef.current = requestAnimationFrame(trackProgress);
  }, []);

  /* ── Cleanup ───────────────────────────────────────────────────────── */
  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  /* ── Play / Pause ──────────────────────────────────────────────────── */
  const togglePlay = useCallback(async () => {
    const std = stdRef.current;
    const wiz = wizRef.current;
    if (!std || !wiz) return;

    if (playing) {
      std.pause();
      wiz.pause();
      cancelAnimationFrame(rafRef.current);
      setPlaying(false);
    } else {
      // Sync both to same time
      const syncTime = (wizsoundRef.current ? wiz : std).currentTime;
      std.currentTime = syncTime;
      wiz.currentTime = syncTime;

      // Enforce mute: inactive always muted, active respects local state
      if (wizsoundRef.current) {
        std.muted = true;
        wiz.muted = isMuted;
      } else {
        wiz.muted = true;
        std.muted = isMuted;
      }

      try {
        await Promise.all([std.play(), wiz.play()]);
        setPlaying(true);
        rafRef.current = requestAnimationFrame(trackProgress);
      } catch {
        // Autoplay blocked — play muted first, then unmute active
        std.muted = true;
        wiz.muted = true;
        try {
          await Promise.all([std.play(), wiz.play()]);
          // Unmute the active video if user wants sound
          if (!isMuted) {
            if (wizsoundRef.current) wiz.muted = false;
            else std.muted = false;
          }
          setPlaying(true);
          rafRef.current = requestAnimationFrame(trackProgress);
        } catch {
          setPlaying(false);
        }
      }
    }
  }, [playing, isMuted, trackProgress]);

  /* ── Switch Standard ↔ WizSound ────────────────────────────────────── */
  const switchMode = useCallback((toWizSound: boolean) => {
    if (toWizSound === wizsoundRef.current) return;

    const std = stdRef.current;
    const wiz = wizRef.current;
    if (!std || !wiz) return;

    // Sync time from active to incoming
    const currentTime = wizsoundRef.current ? wiz.currentTime : std.currentTime;

    if (toWizSound) {
      wiz.currentTime = currentTime;
      std.currentTime = currentTime;
      std.muted = true;       // Inactive: always silent
      wiz.muted = isMuted;    // Active: respect local mute
    } else {
      std.currentTime = currentTime;
      wiz.currentTime = currentTime;
      wiz.muted = true;       // Inactive: always silent
      std.muted = isMuted;    // Active: respect local mute
    }

    wizsoundRef.current = toWizSound;
    setWizsound(toWizSound);
  }, [isMuted]);

  /* ── Mute toggle ───────────────────────────────────────────────────── */
  const toggleMute = useCallback(() => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    // Apply immediately to active video
    const activeVid = wizsoundRef.current ? wizRef.current : stdRef.current;
    if (activeVid) activeVid.muted = newMuted;
  }, [isMuted]);

  /* ── Seek ──────────────────────────────────────────────────────────── */
  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const std = stdRef.current;
    const wiz = wizRef.current;
    if (!std || !wiz) return;
    const t = ratio * (std.duration || 22);
    std.currentTime = t;
    wiz.currentTime = t;
    setProgress(ratio * 100);
  }, []);

  const isReady = loaded.std && loaded.wiz;

  return (
    <div
      className="relative rounded-2xl overflow-hidden border bg-[#0c0c14] transition-all duration-700"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: "opacity 0.7s ease 0.3s, transform 0.7s ease 0.3s, border-color 0.5s, box-shadow 0.5s",
        borderColor: wizsound ? "rgba(217,70,239,0.45)" : "rgba(255,255,255,0.1)",
        boxShadow: wizsound
          ? "0 0 60px rgba(217,70,239,0.18), 0 0 120px rgba(139,92,246,0.10), inset 0 0 0 1px rgba(217,70,239,0.2)"
          : "none",
      }}
    >
      {/* WizSound active glow ring */}
      {wizsound && (
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none z-10"
          style={{ background: "linear-gradient(180deg, rgba(217,70,239,0.04) 0%, transparent 40%)" }}
        />
      )}

      {/* ── Video stack — two videos, one audible at a time ── */}
      <div className="relative w-full aspect-video bg-black overflow-hidden rounded-t-xl">
        {/* Loading state */}
        {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black z-20">
            <div className="w-8 h-8 rounded-full border-2 border-fuchsia-500/40 border-t-fuchsia-400 animate-spin" />
          </div>
        )}

        {/* Video A — Standard audio */}
        <video
          ref={stdRef}
          src={VIDEO_STANDARD}
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            opacity: wizsound ? 0 : 1,
            transition: "opacity 0.08s ease",
            zIndex: wizsound ? 1 : 2,
          }}
          playsInline
          loop
          preload="auto"
          onCanPlayThrough={() => setLoaded(p => ({ ...p, std: true }))}
        />

        {/* Video B — WizSound audio */}
        <video
          ref={wizRef}
          src={VIDEO_WIZSOUND}
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            opacity: wizsound ? 1 : 0,
            transition: "opacity 0.08s ease",
            zIndex: wizsound ? 2 : 1,
          }}
          playsInline
          loop
          preload="auto"
          onCanPlayThrough={() => setLoaded(p => ({ ...p, wiz: true }))}
        />

        {/* Play button overlay — only when paused */}
        {!playing && isReady && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center z-30 group"
            aria-label="Play demo"
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 group-hover:scale-110 active:scale-95"
              style={{
                background: wizsound
                  ? "linear-gradient(135deg, rgba(217,70,239,0.9), rgba(139,92,246,0.8))"
                  : "rgba(255,255,255,0.15)",
                backdropFilter: "blur(8px)",
                boxShadow: wizsound ? "0 0 40px rgba(217,70,239,0.5)" : "0 4px 20px rgba(0,0,0,0.4)",
              }}
            >
              <Play className="w-7 h-7 text-white ml-1" />
            </div>
          </button>
        )}

        {/* WizSound active badge */}
        <div
          className="absolute top-3 right-3 z-30 transition-all duration-300"
          style={{ opacity: wizsound && playing ? 1 : 0, transform: wizsound && playing ? "scale(1)" : "scale(0.85)" }}
        >
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-[11px] font-bold tracking-wide"
            style={{
              background: "linear-gradient(135deg, rgba(217,70,239,0.85), rgba(139,92,246,0.75))",
              boxShadow: "0 0 20px rgba(217,70,239,0.4)",
              animation: "pulse 2s ease-in-out infinite",
            }}
          >
            <Sparkles className="w-3 h-3" />
            WizSound™ Enabled
          </div>
        </div>

        {/* Standard badge */}
        <div
          className="absolute top-3 right-3 z-30 transition-all duration-300"
          style={{ opacity: !wizsound && playing ? 1 : 0, transform: !wizsound && playing ? "scale(1)" : "scale(0.85)" }}
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white/60 text-[11px] font-semibold tracking-wide bg-white/10 backdrop-blur-sm border border-white/15">
            Standard Audio
          </div>
        </div>
      </div>

      {/* ── Headphones hint ── */}
      <div className="px-5 pt-4 pb-2 border-b border-white/6">
        <div className="flex items-center justify-center gap-2">
          <Headphones className="w-3.5 h-3.5 text-fuchsia-400" />
          <p className="text-white/45 text-xs font-mono tracking-widest uppercase text-center">
            Use headphones for the full effect
          </p>
        </div>
      </div>

      {/* ── Playback controls ── */}
      <div className="px-5 py-4 flex items-center gap-4">
        {/* Play/pause */}
        <button
          onClick={togglePlay}
          aria-label={playing ? "Pause" : "Play"}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 hover:scale-105 active:scale-95"
          style={{
            background: wizsound
              ? "linear-gradient(135deg, rgba(217,70,239,0.9), rgba(139,92,246,0.8))"
              : "rgba(255,255,255,0.12)",
            boxShadow: wizsound ? "0 0 20px rgba(217,70,239,0.4)" : "none",
          }}
        >
          {playing ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
        </button>

        {/* Progress bar */}
        <div
          className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden cursor-pointer"
          onClick={handleSeek}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
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
          aria-label={isMuted ? "Unmute" : "Mute"}
          className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white/70 transition-colors flex-shrink-0"
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>

      {/* ── A/B toggle ── */}
      <div className="px-5 pb-5">
        <div
          className="flex items-center justify-between p-1 rounded-xl border border-white/8 bg-white/3"
          role="group"
          aria-label="Compare standard vs WizSound audio"
        >
          <button
            onClick={() => switchMode(false)}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold tracking-wide transition-all duration-200 ${
              !wizsound
                ? "bg-white/12 text-white shadow-sm"
                : "text-white/35 hover:text-white/55"
            }`}
            aria-pressed={!wizsound}
          >
            Standard Audio
          </button>
          <button
            onClick={() => switchMode(true)}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold tracking-wide transition-all duration-200 ${
              wizsound ? "text-white" : "text-white/35 hover:text-white/55"
            }`}
            style={wizsound ? {
              background: "linear-gradient(135deg, rgba(217,70,239,0.85), rgba(139,92,246,0.75))",
              boxShadow: "0 0 16px rgba(217,70,239,0.35)",
            } : {}}
            aria-pressed={wizsound}
          >
            ✦ WizSound™ Cinematic
          </button>
        </div>

        {/* Descriptor */}
        <p className="text-white/30 text-[11px] text-center mt-2.5 leading-relaxed transition-all duration-300">
          {wizsound
            ? "Wide stereo · Deep bass · Spatial reverb · 320kbps mastered"
            : "Flat mix · Narrow stereo · No bass · No spatial processing"
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
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const [, navigate] = useLocation();

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.15 }
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
            Press play, then toggle between Standard and WizSound Cinematic.
          </p>
          <p className="text-white/40 text-base max-w-2xl mx-auto leading-relaxed mt-2">
            The difference is{" "}
            <span className="text-fuchsia-300 font-semibold">immediate</span>. WizSound™ transforms flat audio into a
            rich, immersive cinematic soundscape — wider stereo, deeper bass, and studio-grade mastering.
          </p>
        </div>

        {/* Two-column: dual-video demo + feature cards */}
        <div className="grid lg:grid-cols-2 gap-10 mb-14 items-start">
          <DualVideoPlayer visible={visible} />

          <div className="flex flex-col gap-4">
            <FeatureCard
              icon={Volume2}
              title="Spatial Immersion"
              description="Audio that surrounds the viewer — not flat stereo. WizSound™ applies stereo widening and spatial reverb to create a three-dimensional sound field that fills the room."
              gradient="linear-gradient(135deg, rgba(139,92,246,0.8), rgba(99,50,200,0.6))"
              delay={0}
            />
            <FeatureCard
              icon={Zap}
              title="Studio-Grade Mastering"
              description="5-band parametric EQ, dynamic compression, sub-bass enhancement, and loudness normalisation to broadcast standards. Every frequency sculpted for maximum impact."
              gradient="linear-gradient(135deg, rgba(217,70,239,0.8), rgba(139,92,246,0.6))"
              delay={100}
            />
            <FeatureCard
              icon={Film}
              title="Cinematic by Design"
              description="Tuned for music videos, animation, and storytelling. WizSound™ adds the warmth, punch, and presence that makes your content sound like a cinema release."
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
              { label: "Standard Audio", sub: "Basic mix, no processing", price: "Included", colour: "text-white/50", icon: Music2 },
              { label: "WizSound Enhance", sub: "Bass boost + clarity", price: "+£1", colour: "text-violet-300", icon: Volume2 },
              { label: "WizSound Cinematic", sub: "Full spatial mastering", price: "+£3", colour: "text-fuchsia-300", icon: Zap, badge: "RECOMMENDED" },
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
        </div>

      </div>
    </section>
  );
}
