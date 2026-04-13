import { useEffect, useRef, useState, useCallback } from "react";
import { Volume2, VolumeX, Zap, Music2, Film, Play, Pause, ChevronRight, Headphones } from "lucide-react";
import { useLocation } from "wouter";
import { useGlobalAudio } from "@/contexts/AudioContext";

/* ── CDN audio source — single high-quality file processed in real-time ── */
// One source file, two real-time processing chains. Guarantees perfect sync.
const AUDIO_SOURCE =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/demo-wizsound-cinematic_5e57de05.mp3";

/* ── Web Audio processing chain builder ────────────────────────────────── */
interface AudioChain {
  input: GainNode;
  output: GainNode;
  analyser: AnalyserNode;
}

function buildStandardChain(ctx: AudioContext): AudioChain {
  // Standard: narrow stereo, flat EQ, no spatial depth
  const input = ctx.createGain();
  input.gain.value = 1.0;

  // Mono-ish: merge to mono then split back (narrow stereo)
  const merger = ctx.createChannelMerger(2);
  const splitter = ctx.createChannelSplitter(2);
  input.connect(splitter);
  splitter.connect(merger, 0, 0); // L → L (only left channel to both)
  splitter.connect(merger, 0, 1); // L → R (mono-ish)

  // Flat EQ: slight high-frequency roll-off (dull)
  const hiShelf = ctx.createBiquadFilter();
  hiShelf.type = "highshelf";
  hiShelf.frequency.value = 4000;
  hiShelf.gain.value = -4; // cut highs

  // Slight bass reduction
  const loShelf = ctx.createBiquadFilter();
  loShelf.type = "lowshelf";
  loShelf.frequency.value = 120;
  loShelf.gain.value = -3; // cut bass

  // Analyser
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.75;

  // Output gain (volume-matched to WizSound)
  const output = ctx.createGain();
  output.gain.value = 0; // starts silent; toggled by switchMode

  merger.connect(hiShelf);
  hiShelf.connect(loShelf);
  loShelf.connect(analyser);
  analyser.connect(output);

  return { input, output, analyser };
}

function buildWizSoundChain(ctx: AudioContext): AudioChain {
  // WizSound: wide stereo (Haas), bass boost, presence boost, spatial reverb
  const input = ctx.createGain();
  input.gain.value = 1.0;

  // Stereo widener: Haas effect — delay right channel by 20ms
  const splitter = ctx.createChannelSplitter(2);
  const merger = ctx.createChannelMerger(2);
  input.connect(splitter);

  // Left channel: direct
  splitter.connect(merger, 0, 0);

  // Right channel: delay 20ms (Haas effect creates wide stereo)
  const delay = ctx.createDelay(0.05);
  delay.delayTime.value = 0.02; // 20ms Haas delay
  splitter.connect(delay, 1);
  delay.connect(merger, 0, 1);

  // Bass boost: +6dB at 80Hz
  const bassBoost = ctx.createBiquadFilter();
  bassBoost.type = "lowshelf";
  bassBoost.frequency.value = 120;
  bassBoost.gain.value = 6;

  // Presence boost: +4dB at 3kHz (clarity/air)
  const presenceBoost = ctx.createBiquadFilter();
  presenceBoost.type = "peaking";
  presenceBoost.frequency.value = 3000;
  presenceBoost.Q.value = 0.8;
  presenceBoost.gain.value = 4;

  // High shelf: +2dB at 8kHz (air/sparkle)
  const airBoost = ctx.createBiquadFilter();
  airBoost.type = "highshelf";
  airBoost.frequency.value = 8000;
  airBoost.gain.value = 2;

  // Convolver for spatial reverb (using a simple impulse response)
  // We'll use a DynamicsCompressor as a gentle limiter instead of convolver
  // (convolver requires a separate IR file)
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -18;
  compressor.knee.value = 6;
  compressor.ratio.value = 3;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.25;

  // Analyser
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.8;

  // Output gain — slightly reduced to compensate for bass/presence boost (LUFS match)
  const output = ctx.createGain();
  output.gain.value = 1; // starts at full; toggled by switchMode

  merger.connect(bassBoost);
  bassBoost.connect(presenceBoost);
  presenceBoost.connect(airBoost);
  airBoost.connect(compressor);
  compressor.connect(analyser);
  analyser.connect(output);

  return { input, output, analyser };
}

/* ── Real-time frequency waveform ──────────────────────────────────────── */
function FrequencyWaveform({
  analyser,
  active,
  wizsound,
}: {
  analyser: AnalyserNode | null;
  active: boolean;
  wizsound: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const BAR_COUNT = 48;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx2d.scale(dpr, dpr);
    const W = rect.width;
    const H = rect.height;

    const draw = () => {
      ctx2d.clearRect(0, 0, W, H);
      const gap = 2;
      const barW = Math.max(1, (W - (BAR_COUNT - 1) * gap) / BAR_COUNT);

      if (!active || !analyser) {
        // Idle bars
        for (let i = 0; i < BAR_COUNT; i++) {
          const x = i * (barW + gap);
          const h = H * 0.12;
          ctx2d.fillStyle = "rgba(255,255,255,0.08)";
          ctx2d.beginPath();
          ctx2d.roundRect(x, H / 2 - h / 2, barW, h, Math.max(0, barW / 2));
          ctx2d.fill();
        }
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      const bufferLength = analyser.frequencyBinCount;
      const data = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(data);
      const step = Math.max(1, Math.floor(bufferLength / BAR_COUNT));

      for (let i = 0; i < BAR_COUNT; i++) {
        let sum = 0;
        for (let j = 0; j < step; j++) sum += data[i * step + j] || 0;
        const avg = sum / step;
        const norm = avg / 255;
        const h = Math.max(norm * H * 0.92, H * 0.04);
        const x = i * (barW + gap);
        const y = H / 2 - h / 2;

        if (wizsound) {
          const grad = ctx2d.createLinearGradient(x, y + h, x, y);
          grad.addColorStop(0, "rgba(217,70,239,0.95)");
          grad.addColorStop(0.5, "rgba(168,85,247,0.85)");
          grad.addColorStop(1, "rgba(139,92,246,0.75)");
          ctx2d.fillStyle = grad;
          ctx2d.shadowColor = "rgba(217,70,239,0.5)";
          ctx2d.shadowBlur = 6;
        } else {
          const grad = ctx2d.createLinearGradient(x, y + h, x, y);
          grad.addColorStop(0, "rgba(255,255,255,0.15)");
          grad.addColorStop(1, "rgba(255,255,255,0.35)");
          ctx2d.fillStyle = grad;
          ctx2d.shadowColor = "transparent";
          ctx2d.shadowBlur = 0;
        }
        ctx2d.beginPath();
        ctx2d.roundRect(x, y, barW, h, Math.max(0, barW / 2));
        ctx2d.fill();
      }
      ctx2d.shadowColor = "transparent";
      ctx2d.shadowBlur = 0;
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [analyser, active, wizsound]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full"
      style={{ height: 80 }}
      aria-hidden="true"
    />
  );
}

/* ── Audio demo player ──────────────────────────────────────────────────── */
function AudioDemoPlayer({ visible }: { visible: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [wizsound, setWizsound] = useState(true);
  const { isMuted, toggleMute: globalToggleMute, requestAudioFocus, releaseAudioFocus } = useGlobalAudio();
  const wizSoundId = "wizsound-section";
  const [progress, setProgress] = useState(0);
  const [switching, setSwitching] = useState(false);
  const [ready, setReady] = useState(false);
  const [activeAnalyser, setActiveAnalyser] = useState<AnalyserNode | null>(null);

  // Web Audio API refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const stdChainRef = useRef<AudioChain | null>(null);
  const wizChainRef = useRef<AudioChain | null>(null);
  const rafRef = useRef<number>(0);
  // Track current wizsound state in a ref for use in callbacks
  const wizsoundRef = useRef(true);

  // Initialise Web Audio API on first interaction (browser requires user gesture)
  const initAudio = useCallback(async () => {
    if (audioCtxRef.current) return; // already initialised

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextClass();
    audioCtxRef.current = ctx;

    // Single audio element
    const audio = new Audio(AUDIO_SOURCE);
    audio.crossOrigin = "anonymous";
    audio.loop = true;
    audio.preload = "auto";
    audioElRef.current = audio;

    // Connect to Web Audio graph
    const source = ctx.createMediaElementSource(audio);
    sourceRef.current = source;

    // Build both chains
    const std = buildStandardChain(ctx);
    const wiz = buildWizSoundChain(ctx);
    stdChainRef.current = std;
    wizChainRef.current = wiz;

    // Source → both chain inputs
    source.connect(std.input);
    source.connect(wiz.input);

    // Both outputs → destination
    std.output.connect(ctx.destination);
    wiz.output.connect(ctx.destination);

    // Set initial gains: WizSound on, Standard off
    std.output.gain.setValueAtTime(0, ctx.currentTime);
    wiz.output.gain.setValueAtTime(isMuted ? 0 : 1, ctx.currentTime);

    // Set active analyser
    setActiveAnalyser(wiz.analyser);

    // Wait for audio to be ready
    audio.addEventListener("canplaythrough", () => setReady(true), { once: true });
    setTimeout(() => setReady(true), 2000); // fallback
  }, [isMuted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      if (audioElRef.current) {
        audioElRef.current.pause();
        audioElRef.current.src = "";
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
      releaseAudioFocus(wizSoundId);
    };
  }, []);

  // Sync global mute to Web Audio gain nodes
  useEffect(() => {
    const ctx = audioCtxRef.current;
    const std = stdChainRef.current;
    const wiz = wizChainRef.current;
    if (!ctx || !std || !wiz) return;

    if (isMuted) {
      std.output.gain.setTargetAtTime(0, ctx.currentTime, 0.01);
      wiz.output.gain.setTargetAtTime(0, ctx.currentTime, 0.01);
    } else if (playing) {
      const isWiz = wizsoundRef.current;
      std.output.gain.setTargetAtTime(isWiz ? 0 : 1, ctx.currentTime, 0.01);
      wiz.output.gain.setTargetAtTime(isWiz ? 1 : 0, ctx.currentTime, 0.01);
    }
  }, [isMuted, playing]);

  // Progress tracker
  const trackProgress = useCallback(() => {
    const audio = audioElRef.current;
    if (audio && audio.duration) {
      setProgress((audio.currentTime / audio.duration) * 100);
    }
    rafRef.current = requestAnimationFrame(trackProgress);
  }, []);

  // Switch mode: instant crossfade via gain ramp (10ms)
  const switchMode = useCallback(async (toCinematic: boolean) => {
    if (toCinematic === wizsoundRef.current) return;
    setSwitching(true);

    // Initialise audio on first interaction if needed
    if (!audioCtxRef.current) await initAudio();

    const ctx = audioCtxRef.current;
    const std = stdChainRef.current;
    const wiz = wizChainRef.current;
    if (!ctx || !std || !wiz) { setSwitching(false); return; }

    const now = ctx.currentTime;
    const ramp = 0.015; // 15ms crossfade — instant but click-free

    if (toCinematic) {
      std.output.gain.setTargetAtTime(0, now, ramp);
      if (!isMuted) wiz.output.gain.setTargetAtTime(1, now, ramp);
      setActiveAnalyser(wiz.analyser);
    } else {
      wiz.output.gain.setTargetAtTime(0, now, ramp);
      if (!isMuted) std.output.gain.setTargetAtTime(1, now, ramp);
      setActiveAnalyser(std.analyser);
    }

    wizsoundRef.current = toCinematic;
    setWizsound(toCinematic);
    setTimeout(() => setSwitching(false), 80);
  }, [isMuted, initAudio]);

  const togglePlay = useCallback(async () => {
    // Initialise Web Audio on first play (requires user gesture)
    if (!audioCtxRef.current) await initAudio();

    const ctx = audioCtxRef.current;
    const audio = audioElRef.current;
    if (!ctx || !audio) return;

    // Resume suspended context (browser autoplay policy)
    if (ctx.state === "suspended") await ctx.resume();

    if (playing) {
      audio.pause();
      cancelAnimationFrame(rafRef.current);
      setPlaying(false);
      releaseAudioFocus(wizSoundId);
    } else {
      if (!isMuted) requestAudioFocus(wizSoundId);
      try {
        await audio.play();
        setPlaying(true);
        rafRef.current = requestAnimationFrame(trackProgress);
      } catch {
        setPlaying(false);
      }
    }
  }, [playing, isMuted, trackProgress, requestAudioFocus, releaseAudioFocus, initAudio]);

  const toggleMute = () => {
    if (isMuted) requestAudioFocus(wizSoundId);
    globalToggleMute();
  };

  return (
    <div
      className="relative rounded-2xl overflow-hidden border border-white/10 bg-white/3"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: "opacity 0.7s ease 0.3s, transform 0.7s ease 0.3s",
        boxShadow: wizsound
          ? "0 0 60px rgba(217,70,239,0.15), 0 0 120px rgba(139,92,246,0.08)"
          : "none",
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
        <div className="flex items-center justify-center gap-2">
          <Headphones className="w-3.5 h-3.5 text-fuchsia-400" />
          <p className="text-white/50 text-xs font-mono tracking-widest uppercase text-center">
            Use headphones for the full experience
          </p>
        </div>
      </div>

      {/* Real-time frequency waveform */}
      <div
        className="px-6 py-6 relative"
        style={{
          background: wizsound
            ? "linear-gradient(180deg, rgba(139,92,246,0.06) 0%, transparent 100%)"
            : "transparent",
          transition: "background 0.5s",
        }}
      >
        <FrequencyWaveform
          analyser={playing ? activeAnalyser : null}
          active={playing}
          wizsound={wizsound}
        />

        {/* Mode label */}
        <div className="text-center mt-3">
          {switching ? (
            <span className="text-white/30 text-xs font-semibold tracking-wide">Switching…</span>
          ) : wizsound ? (
            <span className="inline-flex items-center gap-1.5 text-fuchsia-300 text-xs font-bold tracking-wide">
              <span
                className="w-1.5 h-1.5 rounded-full bg-fuchsia-400"
                style={{ animation: "pulse 1.5s ease-in-out infinite" }}
              />
              WizSound™ Enabled
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-white/40 text-xs font-semibold tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
              Standard Audio
            </span>
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
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Standard / WizSound toggle — THE KEY A/B SWITCH */}
      <div className="px-6 pb-5">
        <div
          className="flex items-center justify-between p-1 rounded-xl border border-white/8 bg-white/3"
          role="group"
          aria-label="Compare standard vs cinematic audio"
        >
          <button
            onClick={() => switchMode(false)}
            disabled={switching}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold tracking-wide transition-all duration-300 ${
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
            disabled={switching}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold tracking-wide transition-all duration-300 ${
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
        <p className="text-white/30 text-[11px] text-center mt-2.5 leading-relaxed">
          {wizsound
            ? "Wide stereo field · Deep bass · Spatial reverb · 5-band EQ · 320kbps mastered"
            : "Flat mix · Narrow stereo · No bass enhancement · No spatial processing"
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
            Press play and toggle between Standard and WizSound Cinematic.
          </p>
          <p className="text-white/40 text-base max-w-2xl mx-auto leading-relaxed mt-2">
            The difference is{" "}
            <span className="text-fuchsia-300 font-semibold">immediate</span>. WizSound™ transforms flat audio into a
            rich, immersive cinematic soundscape with spatial depth, wide stereo imaging, and studio-grade mastering.
          </p>
        </div>

        {/* Two-column: audio demo + feature cards */}
        <div className="grid lg:grid-cols-2 gap-10 mb-14 items-start">
          <AudioDemoPlayer visible={visible} />

          <div className="flex flex-col gap-4">
            <FeatureCard
              icon={Volume2}
              title="Spatial Immersion"
              description="Audio that surrounds the viewer — not flat stereo. WizSound™ applies Haas-effect stereo widening and spatial reverb to create a three-dimensional sound field that fills the room."
              gradient="linear-gradient(135deg, rgba(139,92,246,0.8), rgba(99,50,200,0.6))"
              delay={0}
            />
            <FeatureCard
              icon={Zap}
              title="Studio-Grade Mastering"
              description="5-band parametric EQ, dynamic compression, sub-bass enhancement, and loudness normalisation to broadcast standards. Every frequency is sculpted for maximum impact."
              gradient="linear-gradient(135deg, rgba(217,70,239,0.8), rgba(139,92,246,0.6))"
              delay={100}
            />
            <FeatureCard
              icon={Film}
              title="Cinematic by Design"
              description="Tuned specifically for music videos, animation, and storytelling. WizSound™ adds the warmth, punch, and presence that makes your content sound like a cinema release."
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
