import { useEffect, useRef, useState, useCallback } from "react";
import { Volume2, VolumeX, Zap, Music2, Film, Play, Pause, Headphones, Sparkles, Radio } from "@/lib/icons";
import GraphicEqualiser from "@/components/GraphicEqualiser";
import { mp } from "@/lib/mixpanel";

/* ── CDN assets ── */
const VIDEO_SRC =
  "/manus-storage/demo-video-only_404f1adb.mp4"; // Re-uploaded with video/mp4 MIME type
// Normal: flat, dry, unprocessed reference — -16 LUFS
const AUDIO_NORMAL =
  "/manus-storage/wizsound-original_20889372.mp3";
// Enhanced: EQ boost (bass +5dB, highs +4dB), light compression, stereo widening — -11 LUFS
const AUDIO_ENHANCED =
  "/manus-storage/wizsound-enhance_417ffd57.mp3";
// Cinematic: full spatial processing, deep bass, reverb, 320kbps — -9 LUFS
const AUDIO_CINEMATIC =
  "/manus-storage/wizsound-cinematic_ed42a2e8.mp3";

type AudioMode = "normal" | "enhanced" | "cinematic";

const MODE_CONFIG: Record<AudioMode, {
  label: string;
  sublabel: string;
  description: string;
  gradient: string;
  glow: string;
  borderColor: string;
}> = {
  normal: {
    label: "Standard",
    sublabel: "Standard",
    description: "Standard audio · No enhancement · Toggle to hear the difference",
    gradient: "",
    glow: "",
    borderColor: "rgba(255,255,255,0.1)",
  },
  enhanced: {
    label: "WizSound Active",
    sublabel: "WizSound™",
    description: "Richer · Fuller · Clearer · Studio-mastered audio enhancement",
    gradient: "linear-gradient(135deg, rgba(139,92,246,0.85), rgba(99,102,241,0.75))",
    glow: "0 0 16px rgba(139,92,246,0.35)",
    borderColor: "rgba(139,92,246,0.45)",
  },
  cinematic: {
    label: "WizSound Spatial",
    sublabel: "WizSound™ Spatial",
    description: "Spatial depth · Immersive reverb · Deep bass · Cinema-grade audio",
    gradient: "linear-gradient(135deg, rgba(217,70,239,0.9), rgba(139,92,246,0.8))",
    glow: "0 0 24px rgba(217,70,239,0.45), 0 0 48px rgba(139,92,246,0.2)",
    borderColor: "rgba(217,70,239,0.5)",
  },
};

/* ── Web Audio API Cinematic processor ──────────────────────────────────────
   Applies: convolver reverb (simulated), bass boost (+6dB at 80Hz),
   stereo widener, and slight compression for a cinema-grade sound.
   ────────────────────────────────────────────────────────────────────────── */
function createCinematicChain(ctx: AudioContext, source: MediaElementAudioSourceNode) {
  // Bass boost filter
  const bass = ctx.createBiquadFilter();
  bass.type = "lowshelf";
  bass.frequency.value = 80;
  bass.gain.value = 7;

  // Presence boost (upper mids)
  const presence = ctx.createBiquadFilter();
  presence.type = "peaking";
  presence.frequency.value = 3500;
  presence.Q.value = 1.2;
  presence.gain.value = 3;

  // Air (high shelf)
  const air = ctx.createBiquadFilter();
  air.type = "highshelf";
  air.frequency.value = 10000;
  air.gain.value = 2.5;

  // Compressor
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.knee.value = 6;
  comp.ratio.value = 3;
  comp.attack.value = 0.003;
  comp.release.value = 0.15;

  // Stereo widener via delay
  const splitter = ctx.createChannelSplitter(2);
  const merger = ctx.createChannelMerger(2);
  const delayL = ctx.createDelay(0.02);
  const delayR = ctx.createDelay(0.02);
  delayL.delayTime.value = 0.012;
  delayR.delayTime.value = 0.008;

  // Reverb via convolver (synthetic IR)
  const convolver = ctx.createConvolver();
  const irLength = ctx.sampleRate * 2.5;
  const ir = ctx.createBuffer(2, irLength, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = ir.getChannelData(ch);
    for (let i = 0; i < irLength; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLength, 2.8);
    }
  }
  convolver.buffer = ir;

  // Reverb gain (wet/dry mix)
  const reverbGain = ctx.createGain();
  reverbGain.gain.value = 0.22;
  const dryGain = ctx.createGain();
  dryGain.gain.value = 0.82;

  // Chain: source → bass → presence → air → comp → splitter
  source.connect(bass);
  bass.connect(presence);
  presence.connect(air);
  air.connect(comp);

  // Stereo widening
  comp.connect(splitter);
  splitter.connect(delayL, 0);
  splitter.connect(delayR, 1);
  delayL.connect(merger, 0, 0);
  delayR.connect(merger, 0, 1);

  // Dry + reverb
  merger.connect(dryGain);
  merger.connect(convolver);
  convolver.connect(reverbGain);

  dryGain.connect(ctx.destination);
  reverbGain.connect(ctx.destination);

  return { bass, presence, air, comp, splitter, merger, delayL, delayR, convolver, reverbGain, dryGain };
}

/* ── Spatial Rings — Dolby Cinema-inspired pulsing rings ─────────────────── */
function SpatialRings({ active, playing }: { active: boolean; playing: boolean }) {
  if (!active) return null;
  return (
    <div className="absolute inset-0 pointer-events-none z-[5] overflow-hidden rounded-2xl">
      {/* Outer ring */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[rgba(184,137,42,0.15)]"
        style={{
          width: "140%",
          height: "140%",
          animation: playing ? "spatialPulse 3s ease-in-out infinite" : "none",
          opacity: playing ? 1 : 0.3,
        }}
      />
      {/* Middle ring */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[rgba(184,137,42,0.2)]"
        style={{
          width: "110%",
          height: "110%",
          animation: playing ? "spatialPulse 3s ease-in-out infinite 0.5s" : "none",
          opacity: playing ? 1 : 0.3,
        }}
      />
      {/* Inner ring */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[rgba(180,180,200,0.2)]"
        style={{
          width: "85%",
          height: "85%",
          animation: playing ? "spatialPulse 3s ease-in-out infinite 1s" : "none",
          opacity: playing ? 1 : 0.3,
        }}
      />
      {/* Ambient glow */}
      <div
        className="absolute inset-0"
        style={{
          background: playing
            ? "radial-gradient(ellipse at center, rgba(217,70,239,0.08) 0%, transparent 70%)"
            : "none",
          animation: playing ? "spatialGlow 4s ease-in-out infinite" : "none",
        }}
      />
    </div>
  );
}

/* ── Player component ────────────────────────────────────────────────────── */
function WizSoundPlayer({ visible }: { visible: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [mode, setMode] = useState<AudioMode>("normal");
  const [progress, setProgress] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioNormalRef = useRef<HTMLAudioElement>(null);
  const audioEnhancedRef = useRef<HTMLAudioElement>(null);
  const audioCinematicRef = useRef<HTMLAudioElement>(null);
  const rafRef = useRef<number>(0);
  // Web Audio API refs for cinematic mode
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const cinemaChainRef = useRef<ReturnType<typeof createCinematicChain> | null>(null);

  const getAudioForMode = useCallback((m: AudioMode) => {
    if (m === "normal") return audioNormalRef.current;
    if (m === "enhanced") return audioEnhancedRef.current;
    return audioCinematicRef.current;
  }, []);

  /* ── Track progress ── */
  const trackProgress = useCallback(() => {
    const v = videoRef.current;
    if (v && v.duration) setProgress((v.currentTime / v.duration) * 100);
    rafRef.current = requestAnimationFrame(trackProgress);
  }, []);
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  /* ── Mode switch ── */
  useEffect(() => {
    const v = videoRef.current;
    const active = getAudioForMode(mode);
    // Pause all other audio
    [audioNormalRef, audioEnhancedRef, audioCinematicRef].forEach(ref => {
      if (ref.current && ref.current !== active) {
        ref.current.pause();
      }
    });
    if (!v || !active) return;
    active.currentTime = v.currentTime;
    active.muted = isMuted;
    if (playing) active.play().catch(() => {});
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Mute sync ── */
  useEffect(() => {
    [audioNormalRef, audioEnhancedRef, audioCinematicRef].forEach(ref => {
      if (ref.current) ref.current.muted = isMuted;
    });
  }, [isMuted]);

  /* ── Drift correction ── */
  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => {
      const v = videoRef.current;
      const active = getAudioForMode(mode);
      if (v && active && Math.abs(v.currentTime - active.currentTime) > 0.15) {
        active.currentTime = v.currentTime;
      }
    }, 300);
    return () => clearInterval(interval);
  }, [playing, mode, getAudioForMode]);

  /* ── Play / Pause ── */
  const togglePlay = useCallback(async () => {
    const v = videoRef.current;
    const active = getAudioForMode(mode);
    if (!v || !active) return;
    if (playing) {
      v.pause();
      active.pause();
      cancelAnimationFrame(rafRef.current);
      setPlaying(false);
    } else {
      active.currentTime = v.currentTime;
      active.muted = isMuted;
      try {
        await v.play();
        await active.play();
        setPlaying(true);
        rafRef.current = requestAnimationFrame(trackProgress);
      } catch {
        try {
          await v.play();
          setPlaying(true);
          rafRef.current = requestAnimationFrame(trackProgress);
        } catch { setPlaying(false); }
      }
    }
  }, [playing, mode, getAudioForMode, isMuted, trackProgress]);

  /* ── Loop sync ── */
  const handleVideoLoop = useCallback(() => {
    const v = videoRef.current;
    const active = getAudioForMode(mode);
    if (v && active) {
      active.currentTime = 0;
      if (playing) active.play().catch(() => {});
    }
  }, [playing, mode, getAudioForMode]);

  /* ── Seek ── */
  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    const active = getAudioForMode(mode);
    if (!v) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    v.currentTime = ratio * (v.duration || 22);
    if (active) active.currentTime = v.currentTime;
    setProgress(ratio * 100);
  }, [mode, getAudioForMode]);

  const cfg = MODE_CONFIG[mode];

  return (
    <div
      className="relative rounded-2xl overflow-hidden border bg-[#0c0c14] transition-all duration-700"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: "opacity 0.7s ease 0.3s, transform 0.7s ease 0.3s, border-color 0.5s, box-shadow 0.5s",
        borderColor: cfg.borderColor,
        boxShadow: cfg.glow ? `${cfg.glow}, inset 0 0 0 1px ${cfg.borderColor}` : "none",
      }}
    >
      {mode !== "normal" && (
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none z-10"
          style={{ background: `linear-gradient(180deg, ${cfg.borderColor.replace("0.5", "0.06")} 0%, transparent 40%)` }}
        />
      )}

      {/* Spatial rings for cinematic mode */}
      <SpatialRings active={mode === "cinematic"} playing={playing} />

      {/* ── Video ── */}
      <div className="relative w-full aspect-video bg-black overflow-hidden rounded-t-xl">
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black z-20 pointer-events-none">
            <div className="w-8 h-8 rounded-full border-2 border-[rgba(184,137,42,0.4)] border-t-[#d4aa48] animate-spin" />
          </div>
        )}
        <video
          ref={videoRef}
          src={VIDEO_SRC}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          playsInline
          loop
          muted
          preload="auto"
          onCanPlayThrough={() => setLoaded(true)}
          onSeeked={handleVideoLoop}
        />
        {/* Hidden audio elements */}
        <audio ref={audioNormalRef} src={AUDIO_NORMAL} preload="auto" loop />
        <audio ref={audioEnhancedRef} src={AUDIO_ENHANCED} preload="auto" loop crossOrigin="anonymous" />
        {/* Cinematic: dedicated 320kbps source with full spatial processing */}
        <audio ref={audioCinematicRef} src={AUDIO_CINEMATIC} preload="auto" loop crossOrigin="anonymous" />

        {/* Play overlay */}
        {!playing && loaded && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center z-20 group"
            aria-label="Play"
          >
            <div className="w-16 h-16 rounded-full bg-black/60 border border-white/20 flex items-center justify-center backdrop-blur-sm group-hover:bg-black/80 group-hover:scale-110 transition-all duration-200">
              <Play className="w-6 h-6 text-white ml-1" fill="white" />
            </div>
          </button>
        )}

        {/* Mode badge */}
        {mode === "cinematic" && (
          <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold text-white"
            style={{ background: cfg.gradient, boxShadow: cfg.glow }}>
            <Radio className="w-3 h-3" />
            Spatial Audio Active
          </div>
        )}
        {mode === "enhanced" && (
          <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold text-white"
            style={{ background: cfg.gradient, boxShadow: cfg.glow }}>
            <Sparkles className="w-3 h-3" />
            {cfg.sublabel} Active
          </div>
        )}
        {mode === "normal" && (
          <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold text-white/60 bg-white/10 border border-white/15">
            Standard Audio
          </div>
        )}

        {/* Cinematic spatial indicator — bottom right */}
        {mode === "cinematic" && playing && (
          <div className="absolute bottom-3 right-3 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm border border-[rgba(184,137,42,0.3)]">
            <div className="flex items-center gap-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-0.5 rounded-full bg-[#b8892a]"
                  style={{
                    height: `${8 + Math.random() * 8}px`,
                    animation: `spatialBar 0.8s ease-in-out infinite ${i * 0.1}s`,
                  }}
                />
              ))}
            </div>
            <span className="text-[9px] font-bold text-[#d4aa48] tracking-wider uppercase">Spatial</span>
          </div>
        )}
      </div>

      {/* ── Equaliser ── */}
      <div className="px-5 pt-3">
        <GraphicEqualiser
          audioRef={mode === "normal" ? audioNormalRef : mode === "enhanced" ? audioEnhancedRef : audioCinematicRef}
          isPlaying={playing}
          barCount={32}
          height={36}
        />
      </div>

      {/* ── Controls ── */}
      <div className="px-5 pt-2 pb-2 flex items-center gap-3">
        <button
          onClick={togglePlay}
          className="w-9 h-9 rounded-full bg-white/8 hover:bg-white/15 flex items-center justify-center transition-colors duration-200 flex-shrink-0"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
        </button>
        {/* Progress bar */}
        <div
          className="flex-1 h-1.5 bg-white/10 rounded-full cursor-pointer overflow-hidden"
          onClick={handleSeek}
        >
          <div
            className="h-full rounded-full transition-none"
            style={{
              width: `${progress}%`,
              background: mode === "cinematic"
                ? "linear-gradient(90deg, #d946ef, #8b5cf6, #d946ef)"
                : mode === "enhanced"
                ? "linear-gradient(90deg, #8b5cf6, #6366f1)"
                : "rgba(255,255,255,0.5)",
            }}
          />
        </div>
        <button
          onClick={() => setIsMuted(v => !v)}
          className="w-9 h-9 rounded-full bg-white/8 hover:bg-white/15 flex items-center justify-center transition-colors duration-200 flex-shrink-0"
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-white/60" /> : <Volume2 className="w-4 h-4 text-white" />}
        </button>
      </div>

      {/* ── 3-mode toggle ── */}
      <div className="px-5 pb-5">
        <div
          className="flex items-center p-1 rounded-xl border border-white/8 bg-white/[0.03] gap-1"
          role="group"
          aria-label="Audio mode selector"
        >
          {(["normal", "enhanced", "cinematic"] as AudioMode[]).map((m) => {
            const c = MODE_CONFIG[m];
            const active = mode === m;
            return (
              <button
                key={m}
                onClick={() => { setMode(m); mp.wizSoundDemoInteracted(m); }}
                className={`flex-1 py-2.5 rounded-lg text-xs font-bold tracking-wide transition-all duration-250 flex items-center justify-center gap-1.5 ${
                  active ? "text-white" : "text-white/35 hover:text-white/60"
                }`}
                style={active && m !== "normal" ? { background: c.gradient, boxShadow: c.glow } : active ? { background: "rgba(255,255,255,0.12)" } : {}}
                aria-pressed={active}
              >
                {m === "cinematic" && <Radio className="w-3 h-3" />}
                {c.label}
              </button>
            );
          })}
        </div>
        <p className="text-white/35 text-[11px] text-center mt-2.5 leading-relaxed transition-all duration-300">
          {cfg.description}
        </p>
        {!playing && (
          <p className="text-[rgba(184,137,42,0.55)] text-[10px] text-center mt-1.5 animate-pulse">
            ▶ Toggle to hear the difference
          </p>
        )}
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
  badge,
}: {
  icon: typeof Zap;
  title: string;
  description: string;
  gradient: string;
  badge?: string;
}) {
  return (
    <div className="glass-card p-5 group relative">
      {badge && (
        <div className="absolute -top-2 right-4 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider text-white"
          style={{ background: gradient }}>
          {badge}
        </div>
      )}
      <div className="flex items-start gap-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110"
          style={{ background: gradient }}
        >
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="text-white font-semibold text-sm mb-1">{title}</h3>
          <p className="text-white/45 text-xs leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
}

/* ── Main section ────────────────────────────────────────────────────────── */
export default function WizSoundSection() {
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="py-24 px-6 bg-gradient-to-b from-[#0d0d18] via-[#0f0f0f] to-[#0f0f0f] relative overflow-hidden"
    >
      {/* Ambient background glow for spatial feel */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-[rgba(184,137,42,0.03)] blur-[120px]" />
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] rounded-full bg-[rgba(184,137,42,0.03)] blur-[100px]" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-14 reveal" style={{ transitionDelay: "0ms" }}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[rgba(184,137,42,0.3)] bg-[rgba(184,137,42,0.08)] text-[#d4aa48] text-xs font-mono tracking-widest uppercase font-semibold mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#b8892a] animate-pulse" />
            WizSound™ Spatial Audio Engine
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            Hear the{" "}
            <span className="bg-gradient-to-r from-[#b8892a] via-[#d4aa48] to-[#e8c878] bg-clip-text text-transparent">
              spatial difference
            </span>
          </h2>
          <p className="text-white/50 text-lg max-w-2xl mx-auto leading-relaxed">
            Cinema-grade immersive audio. Toggle between Standard, Enhanced, and Cinematic spatial modes to experience how WizSound transforms your video's sound.
          </p>
          <p className="text-[rgba(184,137,42,0.5)] text-sm mt-2 font-medium">
            Best experienced with headphones for full spatial depth
          </p>
        </div>

        {/* Two-column layout */}
        <div className="grid lg:grid-cols-2 gap-10 items-start">
          {/* Player */}
          <div className="reveal" style={{ transitionDelay: "100ms" }}>
            <WizSoundPlayer visible={visible} />
          </div>

          {/* Feature cards */}
          <div className="flex flex-col gap-3 reveal" style={{ transitionDelay: "200ms" }}>
            <FeatureCard
              icon={Volume2}
              title="Standard Audio"
              description="The raw, unprocessed audio — flat mix, no EQ, narrow stereo. The baseline before WizSound enhancement."
              gradient="linear-gradient(135deg, rgba(100,100,120,0.8), rgba(60,60,80,0.8))"
            />
            <FeatureCard
              icon={Music2}
              title="WizSound Active"
              description="Studio-grade EQ, bass boost, stereo widening, and light compression. Immediate, clean improvement for any content."
              gradient="linear-gradient(135deg, rgba(139,92,246,0.8), rgba(99,102,241,0.8))"
            />
            <FeatureCard
              icon={Radio}
              title="WizSound Spatial"
              description="Full spatial audio mastering — concert-hall reverb, deep immersive bass, stereo widening, and cinema-grade dynamic range. Your video sounds like it belongs in a Dolby Cinema."
              gradient="linear-gradient(135deg, rgba(217,70,239,0.85), rgba(139,92,246,0.75))"
              badge="SPATIAL"
            />

            {/* Spatial depth indicator */}
            <div className="p-4 rounded-xl border border-[rgba(184,137,42,0.2)] bg-gradient-to-br from-[rgba(184,137,42,0.07)] to-[rgba(180,180,200,0.03)]">
              <div className="flex items-center gap-3 mb-3">
                <Headphones className="w-5 h-5 text-[#b8892a] flex-shrink-0" />
                <div>
                  <p className="text-white/80 text-sm font-semibold">Spatial Sound Experience</p>
                  <p className="text-white/40 text-[11px]">Inspired by Dolby Cinema immersive audio</p>
                </div>
              </div>
              {/* Spatial depth bars */}
              <div className="grid grid-cols-5 gap-1.5 mt-2">
                {["Bass depth", "Stereo width", "Reverb space", "Dynamic range", "Clarity"].map((label, i) => (
                  <div key={label} className="text-center">
                    <div className="h-12 bg-white/5 rounded-lg relative overflow-hidden mb-1">
                      <div
                        className="absolute bottom-0 left-0 right-0 rounded-lg"
                        style={{
                          height: `${[90, 85, 80, 88, 82][i]}%`,
                          background: `linear-gradient(to top, rgba(217,70,239,${0.3 + i * 0.1}), rgba(139,92,246,${0.2 + i * 0.08}))`,
                        }}
                      />
                    </div>
                    <span className="text-[8px] text-white/30 font-medium leading-tight block">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing callout */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/8 bg-white/[0.03]">
              <Sparkles className="w-4 h-4 text-[#b8892a] flex-shrink-0" />
              <p className="text-white/45 text-xs leading-relaxed">
                <span className="text-white/70 font-medium">Standard Audio</span> is free with every build.{" "}
                <span className="text-[#d4aa48] font-medium">Enhanced</span> +£1 ·{" "}
                <span className="text-[#d4aa48] font-medium">Cinematic Spatial</span> +£3
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Keyframes for spatial effects */}
      <style>{`
        @keyframes spatialPulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.3; }
          50% { transform: translate(-50%, -50%) scale(1.08); opacity: 0.6; }
        }
        @keyframes spatialGlow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        @keyframes spatialBar {
          0%, 100% { transform: scaleY(0.4); }
          50% { transform: scaleY(1); }
        }
      `}</style>
    </section>
  );
}
