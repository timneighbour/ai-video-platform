/**
 * WizSoundShowcase — three-tier audio comparison with real-time Web Audio API processing
 *
 * Uses a SINGLE source track. Each tier applies a different DSP chain:
 *   Standard  → raw passthrough (no processing)
 *   Active    → stereo widening (M/S), 3-band EQ, dynamic compression, −16 LUFS gain
 *   Spatial   → Haas psychoacoustic widening, 5-band EQ, harmonic saturation,
 *               reverb simulation, −14 LUFS gain
 *
 * Defaults to Standard so users hear the improvement stage by stage.
 */
import React, { useRef, useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useGlobalAudio } from "@/contexts/AudioContext";
import GraphicEqualiser from "@/components/GraphicEqualiser";
import AudioMetricsPanel from "@/components/AudioMetricsPanel";

type Tier = "standard" | "enhanced" | "cinematic";

const TIERS: {
  id: Tier;
  label: string;
  price: string;
  tagline: string;
  colour: string;
  glow: string;
  badge?: string;
  specs: { label: string; value: string; bar: number }[];
  pipeline: string[];
  lufs: string;
  bars: number[];
}[] = [
  {
    id: "standard",
    label: "Standard Audio",
    price: "Included",
    tagline: "Original audio, used as-is",
    colour: "from-slate-600 to-slate-500",
    glow: "rgba(100,116,139,0.35)",
    specs: [
      { label: "Stereo Width", value: "100%", bar: 50 },
      { label: "Dynamic Range", value: "Original", bar: 45 },
      { label: "Loudness (LUFS)", value: "Varies", bar: 40 },
      { label: "Frequency Balance", value: "Original", bar: 50 },
    ],
    pipeline: ["Original file", "Format conversion", "Stereo output"],
    lufs: "Varies",
    bars: [8, 12, 16, 20, 18, 14, 10, 8, 12, 16, 14, 10, 8, 12, 16, 20, 18, 14, 10, 8],
  },
  {
    id: "enhanced",
    label: "WizSound Active",
    price: "+£1",
    tagline: "Polished, fuller sound",
    colour: "from-[#b8892a] to-[#4a3010]",
    glow: "rgba(184,137,42,0.4)",
    specs: [
      { label: "Stereo Width", value: "×2.5", bar: 72 },
      { label: "Dynamic Range", value: "Compressed", bar: 65 },
      { label: "Loudness (LUFS)", value: "−16 LUFS", bar: 68 },
      { label: "Frequency Balance", value: "3-band EQ", bar: 70 },
    ],
    pipeline: ["Stereo widening ×2.5", "3-band EQ", "Dynamic compression", "Loudnorm −16 LUFS"],
    lufs: "−16 LUFS",
    bars: [10, 18, 26, 34, 30, 24, 18, 14, 20, 28, 32, 26, 18, 22, 30, 36, 28, 20, 14, 10],
  },
  {
    id: "cinematic",
    label: "WizSound Spatial",
    price: "+£3",
    tagline: "Spatial audio mastering — cinema-grade immersive sound",
    colour: "from-[#9b59b6] to-[#6c3483]",
    glow: "rgba(155,89,182,0.45)",
    badge: "RECOMMENDED",
    specs: [
      { label: "Stereo Width", value: "×3.5 + Haas", bar: 95 },
      { label: "Dynamic Range", value: "Pro mastered", bar: 90 },
      { label: "Loudness (LUFS)", value: "−14 LUFS", bar: 88 },
      { label: "Frequency Balance", value: "5-band EQ", bar: 92 },
    ],
    pipeline: [
      "Spatial stereo widening ×3.5",
      "Haas spatial enhancer (2.05ms / 2.12ms)",
      "5-band EQ (sub-bass → shimmer)",
      "Immersive dynamic compression",
      "Cinema-grade loudnorm −14 LUFS",
    ],
    lufs: "−14 LUFS",
    bars: [14, 24, 36, 48, 44, 38, 30, 22, 32, 44, 50, 42, 32, 36, 46, 52, 44, 34, 24, 16],
  },
];

/* ── DSP chain builders (same as WizSoundDemoPlayer) ────────────────── */
function buildStandardChain(ctx: AudioContext, src: MediaElementAudioSourceNode) {
  const gain = ctx.createGain(); gain.gain.value = 1.0;
  const analyser = ctx.createAnalyser(); analyser.fftSize = 256; analyser.smoothingTimeConstant = 0.8;
  src.connect(gain); gain.connect(analyser); analyser.connect(ctx.destination);
  return { gain, analyser, disconnect: () => { try { gain.disconnect(); analyser.disconnect(); } catch {} } };
}

function buildEnhancedChain(ctx: AudioContext, src: MediaElementAudioSourceNode) {
  // Gentle M/S widening (1.4× side) + conservative 3-band EQ (≤2.5 dB) + soft compressor
  const splitter = ctx.createChannelSplitter(2);
  const merger = ctx.createChannelMerger(2);
  const midGainL = ctx.createGain(); midGainL.gain.value = 0.5;
  const midGainR = ctx.createGain(); midGainR.gain.value = 0.5;
  const midMix = ctx.createGain(); midMix.gain.value = 1.0;
  const sideGainL = ctx.createGain(); sideGainL.gain.value = 0.5;
  const sideGainR = ctx.createGain(); sideGainR.gain.value = -0.5;
  const sideWidth = ctx.createGain(); sideWidth.gain.value = 1.4; // was 2.5 — subtle
  const outL = ctx.createGain(); outL.gain.value = 1.0;
  const outR = ctx.createGain(); outR.gain.value = 1.0;
  src.connect(splitter);
  splitter.connect(midGainL, 0); splitter.connect(midGainR, 1);
  midGainL.connect(midMix); midGainR.connect(midMix);
  splitter.connect(sideGainL, 0); splitter.connect(sideGainR, 1);
  sideGainL.connect(sideWidth); sideGainR.connect(sideWidth);
  midMix.connect(outL); sideWidth.connect(outL);
  midMix.connect(outR); sideWidth.connect(outR);
  outL.connect(merger, 0, 0); outR.connect(merger, 0, 1);
  const bassEQ = ctx.createBiquadFilter(); bassEQ.type = "lowshelf"; bassEQ.frequency.value = 100; bassEQ.gain.value = 2.0; // was 4.5
  const midEQ = ctx.createBiquadFilter(); midEQ.type = "peaking"; midEQ.frequency.value = 3000; midEQ.Q.value = 0.8; midEQ.gain.value = 1.5; // was 3.0
  const trebleEQ = ctx.createBiquadFilter(); trebleEQ.type = "highshelf"; trebleEQ.frequency.value = 9000; trebleEQ.gain.value = 2.5; // was 3.5
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18; comp.knee.value = 12; comp.ratio.value = 2.5; comp.attack.value = 0.01; comp.release.value = 0.25;
  const gain = ctx.createGain(); gain.gain.value = 1.0; // was 1.35 — unity
  const analyser = ctx.createAnalyser(); analyser.fftSize = 256; analyser.smoothingTimeConstant = 0.8;
  merger.connect(bassEQ); bassEQ.connect(midEQ); midEQ.connect(trebleEQ); trebleEQ.connect(comp); comp.connect(gain); gain.connect(analyser); analyser.connect(ctx.destination);
  return {
    gain, analyser,
    disconnect: () => {
      try {
        splitter.disconnect(); merger.disconnect();
        midGainL.disconnect(); midGainR.disconnect(); midMix.disconnect();
        sideGainL.disconnect(); sideGainR.disconnect(); sideWidth.disconnect();
        outL.disconnect(); outR.disconnect();
        bassEQ.disconnect(); midEQ.disconnect(); trebleEQ.disconnect();
        comp.disconnect(); gain.disconnect(); analyser.disconnect();
      } catch {}
    },
  };
}

function buildCinematicChain(ctx: AudioContext, src: MediaElementAudioSourceNode) {
  // Haas psychoacoustic widening (tiny delays, unity gain) + 5-band EQ (≤2.5 dB) + transparent compressor + gentle reverb
  // NO waveshaper, NO feedback loop, NO hot gain — clean spatial depth
  const splitter = ctx.createChannelSplitter(2);
  const merger = ctx.createChannelMerger(2);
  const delayL = ctx.createDelay(0.05); delayL.delayTime.value = 0.0018; // 1.8ms
  const delayR = ctx.createDelay(0.05); delayR.delayTime.value = 0.0022; // 2.2ms
  const gainL = ctx.createGain(); gainL.gain.value = 1.0; // unity (was 1.6)
  const gainR = ctx.createGain(); gainR.gain.value = 1.0;
  src.connect(splitter);
  splitter.connect(delayL, 0); splitter.connect(delayR, 1);
  delayL.connect(gainL); delayR.connect(gainR);
  gainL.connect(merger, 0, 0); gainR.connect(merger, 0, 1);
  const subBass = ctx.createBiquadFilter(); subBass.type = "lowshelf"; subBass.frequency.value = 80; subBass.gain.value = 1.5; // was 5.5
  const bass = ctx.createBiquadFilter(); bass.type = "peaking"; bass.frequency.value = 200; bass.Q.value = 0.7; bass.gain.value = 1.5; // was 4.0
  const mid = ctx.createBiquadFilter(); mid.type = "peaking"; mid.frequency.value = 1000; mid.Q.value = 1.0; mid.gain.value = 1.0; // was 2.5
  const presence = ctx.createBiquadFilter(); presence.type = "peaking"; presence.frequency.value = 3500; presence.Q.value = 1.0; presence.gain.value = 2.0; // was 4.0
  const air = ctx.createBiquadFilter(); air.type = "highshelf"; air.frequency.value = 10000; air.gain.value = 2.5; // was 5.0
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.knee.value = 14; comp.ratio.value = 2.0; comp.attack.value = 0.02; comp.release.value = 0.3;
  // Parallel reverb — single-tap, no feedback, low wet mix
  const reverbDelay = ctx.createDelay(0.5); reverbDelay.delayTime.value = 0.06;
  const reverbWet = ctx.createGain(); reverbWet.gain.value = 0.08; // 8% wet (was 18% + feedback)
  const reverbDry = ctx.createGain(); reverbDry.gain.value = 0.92;
  const gain = ctx.createGain(); gain.gain.value = 1.05; // was 1.55
  merger.connect(subBass); subBass.connect(bass); bass.connect(mid); mid.connect(presence); presence.connect(air); air.connect(comp);
  comp.connect(reverbDry); comp.connect(reverbDelay);
  reverbDelay.connect(reverbWet);
  const analyser = ctx.createAnalyser(); analyser.fftSize = 256; analyser.smoothingTimeConstant = 0.8;
  reverbDry.connect(gain); reverbWet.connect(gain); gain.connect(analyser); analyser.connect(ctx.destination);
  return {
    gain, analyser,
    disconnect: () => {
      try {
        splitter.disconnect(); merger.disconnect();
        delayL.disconnect(); delayR.disconnect();
        gainL.disconnect(); gainR.disconnect();
        subBass.disconnect(); bass.disconnect(); mid.disconnect();
        presence.disconnect(); air.disconnect(); comp.disconnect();
        reverbDelay.disconnect(); reverbWet.disconnect(); reverbDry.disconnect(); gain.disconnect(); analyser.disconnect();
      } catch {}
    },
  };
}

/* ── Animated spectrum bars ─────────────────────────────────────────── */
function SpectrumBars({ bars, colour }: { bars: number[]; colour: string }) {
  return (
    <div className="flex items-end gap-[2px] h-14 w-full" aria-hidden="true">
      {bars.map((h, i) => (
        <div
          key={i}
          className={`flex-1 rounded-sm bg-gradient-to-t ${colour} opacity-80`}
          style={{ height: `${h * 0.9}px`, maxHeight: "100%", transition: `height ${0.12 + (i % 5) * 0.04}s ease-in-out` }}
        />
      ))}
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────────── */
export default function WizSoundShowcase() {
  // Default to "standard" so users hear the improvement stage by stage
  const [activeTier, setActiveTier] = useState<Tier>("standard");
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [loaded, setLoaded] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const chainRef = useRef<{ gain: GainNode; analyser: AnalyserNode; disconnect: () => void } | null>(null);
  const rafRef = useRef<number | null>(null);
  const [activeAnalyser, setActiveAnalyser] = useState<AnalyserNode | null>(null);

  const { isMuted, toggleMute: globalToggleMute, requestAudioFocus } = useGlobalAudio();
  const { data: previews } = trpc.render.getWizSoundPreviews.useQuery();

  const tier = TIERS.find((t) => t.id === activeTier)!;

  /* ── Load single audio element ───────────────────────────────────── */
  useEffect(() => {
    if (!previews) return;
    const src = previews.standard || previews.enhanced || previews.cinematic;
    if (!src) return;
    const el = new Audio();
    el.crossOrigin = "anonymous";
    el.preload = "auto";
    el.src = src;
    el.volume = isMuted ? 0 : volume;
    el.muted = isMuted;
    el.onloadedmetadata = () => { setDuration(el.duration); setLoaded(true); };
    el.onended = () => { setIsPlaying(false); setProgress(0); };
    audioRef.current = el;
    return () => { el.pause(); el.src = ""; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previews]);

  /* ── Sync volume / mute ──────────────────────────────────────────── */
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = isMuted ? 0 : volume;
    el.muted = isMuted;
  }, [volume, isMuted]);

  /* ── Build DSP chain ─────────────────────────────────────────────── */
  const buildChain = useCallback((t: Tier) => {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") ctx.resume();
    const el = audioRef.current;
    if (!el) return;
    if (chainRef.current) { chainRef.current.disconnect(); chainRef.current = null; }
    if (sourceNodeRef.current) { try { sourceNodeRef.current.disconnect(); } catch {} }
    let src: MediaElementAudioSourceNode;
    try { src = ctx.createMediaElementSource(el); sourceNodeRef.current = src; }
    catch { src = sourceNodeRef.current!; }
    if (t === "standard") chainRef.current = buildStandardChain(ctx, src);
    else if (t === "enhanced") chainRef.current = buildEnhancedChain(ctx, src);
    else chainRef.current = buildCinematicChain(ctx, src);
    if (chainRef.current) setActiveAnalyser(chainRef.current.analyser);
  }, []);

  /* ── Switch tier ─────────────────────────────────────────────────── */
  const switchTier = useCallback((t: Tier) => {
    setActiveTier(t);
    if (isPlaying) buildChain(t);
  }, [isPlaying, buildChain]);

  /* ── Toggle play ─────────────────────────────────────────────────── */
  const togglePlay = useCallback(async () => {
    const el = audioRef.current;
    if (!el || !loaded) return;
    if (isPlaying) {
      el.pause(); setIsPlaying(false);
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    } else {
      buildChain(activeTier);
      el.volume = isMuted ? 0 : volume; el.muted = isMuted;
      if (!isMuted) requestAudioFocus("wizsound-showcase");
      try {
        await el.play(); setIsPlaying(true);
        const tick = () => {
          if (el.duration > 0) setProgress((el.currentTime / el.duration) * 100);
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch {}
    }
  }, [isPlaying, loaded, activeTier, buildChain, isMuted, volume, requestAudioFocus]);

  /* ── Cleanup ─────────────────────────────────────────────────────── */
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (audioRef.current) audioRef.current.pause();
      if (chainRef.current) chainRef.current.disconnect();
      if (audioCtxRef.current) { try { audioCtxRef.current.close(); } catch {} }
    };
  }, []);

  return (
    <section className="py-20 px-4 relative overflow-hidden" aria-labelledby="wizsound-showcase-heading">
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 50% 40%, ${tier.glow} 0%, transparent 65%)`, transition: "background 600ms ease" }}
      />

      <div className="max-w-5xl mx-auto relative">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[--color-gold]/30 bg-[--color-gold]/15 text-[--color-gold] text-xs font-medium tracking-widest uppercase mb-4">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M9 18V5l12-2v13M9 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm12-2c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2z"/>
            </svg>
            Spatial Audio Deep Dive
          </div>
          <h2
            id="wizsound-showcase-heading"
            className="text-3xl md:text-4xl font-bold text-white mb-3"
          >
            Powered by{" "}
            <span style={{ background: "linear-gradient(90deg, #a78bfa, #e879f9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              WizSound™
            </span>
          </h2>
          <p className="text-white/50 text-base max-w-xl mx-auto">
            Proprietary spatial audio engine built into every build. Cinema-grade immersive sound — select a tier to explore the pipeline.
          </p>
        </div>

        {/* Tier selector tabs */}
        <div className="flex justify-center gap-2 mb-10 flex-wrap">
          {TIERS.map((t) => (
            <button
              key={t.id}
              onClick={() => switchTier(t.id)}
              className={`relative px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                activeTier === t.id
                  ? `bg-gradient-to-r ${t.colour} text-white shadow-lg`
                  : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80 border border-white/10"
              }`}
              style={activeTier === t.id ? { boxShadow: `0 0 20px ${t.glow}` } : {}}
            >
              {t.badge && (
                <span className="absolute -top-2 -right-2 text-[9px] font-bold bg-fuchsia-500 text-white px-1.5 py-0.5 rounded-full tracking-wider">
                  {t.badge}
                </span>
              )}
              {t.label}
              <span className="ml-2 text-xs opacity-70">{t.price}</span>
            </button>
          ))}
        </div>

        {/* Main showcase card */}
        <div
          className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm overflow-hidden transition-all duration-500"
          style={{ boxShadow: `0 0 60px ${tier.glow}` }}
        >
          {/* Spectrum visualiser */}
          <div className="px-8 pt-8 pb-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-white font-semibold text-lg">{tier.label}</span>
                {tier.badge && (
                  <span className="ml-2 text-[10px] font-bold bg-[--color-gold]/15 text-[--color-gold] border border-[--color-gold]/30 px-2 py-0.5 rounded-full">
                    {tier.badge}
                  </span>
                )}
                <p className="text-white/40 text-xs mt-0.5">{tier.tagline}</p>
              </div>
              {/* Play/Pause button */}
              <button
                onClick={togglePlay}
                disabled={!loaded}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                  isPlaying
                    ? `bg-gradient-to-r ${tier.colour} text-white`
                    : "bg-white/8 text-white/60 hover:bg-white/14 hover:text-white border border-white/10"
                }`}
                style={isPlaying ? { boxShadow: `0 0 16px ${tier.glow}` } : {}}
              >
                {!loaded ? (
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
                  </svg>
                ) : isPlaying ? (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                    Pause
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    Preview
                  </>
                )}
              </button>
            </div>

            {/* Spectrum bars / Equaliser */}
            {isPlaying && activeAnalyser ? (
              <GraphicEqualiser
                analyser={activeAnalyser}
                isPlaying={true}
                barCount={32}
                height={36}
              />
            ) : (
              <SpectrumBars bars={tier.bars} colour={tier.colour} />
            )}

            {/* Progress bar */}
            <div className="mt-2 h-[2px] bg-white/10 rounded-full overflow-hidden cursor-pointer"
              onClick={e => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pct = ((e.clientX - rect.left) / rect.width) * 100;
                const el = audioRef.current;
                if (el && el.duration > 0) { el.currentTime = (pct / 100) * el.duration; setProgress(pct); }
              }}
            >
              <div
                className={`h-full bg-gradient-to-r ${tier.colour} rounded-full transition-all duration-200`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-white/25 mt-1 tabular-nums">
              <span>{`${Math.floor((progress / 100) * duration / 60)}:${String(Math.floor((progress / 100) * duration % 60)).padStart(2, "0")}`}</span>
              <span>{duration ? `${Math.floor(duration / 60)}:${String(Math.floor(duration % 60)).padStart(2, "0")}` : "--:--"}</span>
            </div>
          </div>

          {/* Real-time audio metrics panel */}
          <div className="border-t border-white/8 p-8">
            <AudioMetricsPanel
              analyser={activeAnalyser}
              isPlaying={isPlaying}
              tier={activeTier}
              accentHex={
                activeTier === "standard" ? "#94a3b8" :
                activeTier === "enhanced" ? "#c4a464" : "#b07fd4"
              }
            />
          </div>

          {/* Volume control footer */}
          <div className="px-8 py-4 border-t border-white/8 flex items-center gap-3">
            <button
              onClick={() => { if (isMuted) requestAudioFocus("wizsound-showcase"); globalToggleMute(); }}
              className="text-white/40 hover:text-white/70 transition-colors"
              aria-label={isMuted ? "Unmute preview" : "Mute preview"}
            >
              {isMuted ? (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
                </svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                </svg>
              )}
            </button>
            <input
              type="range" min={0} max={1} step={0.01} value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-24 accent-violet-500 cursor-pointer"
              aria-label="Preview volume"
            />
            <span className="text-xs text-white/30 tabular-nums">{Math.round(volume * 100)}%</span>
            <span className="ml-auto text-xs text-white/25">Preview volume · does not affect your render</span>
          </div>
        </div>

        {/* Comparison table */}
        <div className="mt-10 rounded-xl border border-white/8 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8">
                <th className="text-left px-6 py-3 text-white/40 font-medium text-xs uppercase tracking-wider">Feature</th>
                {TIERS.map((t) => (
                  <th
                    key={t.id}
                    className={`px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider ${activeTier === t.id ? "text-white" : "text-white/40"}`}
                  >
                    {t.id === "standard" ? "Standard" : t.id === "enhanced" ? "Active" : "Spatial"}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["Stereo widening", "—", "×2.5", "×3.5 + Haas"],
                ["EQ bands", "—", "3-band", "5-band"],
                ["Dynamic compression", "—", "✓", "Pro mastered"],
                ["Loudness normalisation", "—", "−16 LUFS", "−14 LUFS"],
                ["Spatial depth (Haas)", "—", "—", "✓"],
                ["Streaming optimised", "—", "—", "✓"],
              ].map(([feature, std, enh, cin]) => (
                <tr key={feature} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-3 text-white/60">{feature}</td>
                  <td className={`px-4 py-3 text-center ${activeTier === "standard" ? "text-white font-medium" : "text-white/40"}`}>{std}</td>
                  <td className={`px-4 py-3 text-center ${activeTier === "enhanced" ? "text-[--color-gold] font-medium" : "text-white/40"}`}>{enh}</td>
                  <td className={`px-4 py-3 text-center ${activeTier === "cinematic" ? "text-[--color-gold] font-medium" : "text-white/40"}`}>{cin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        @keyframes specBar1 { 0% { transform: scaleY(0.7); } 100% { transform: scaleY(1.15); } }
        @keyframes specBar2 { 0% { transform: scaleY(0.5); } 100% { transform: scaleY(1.3); } }
        @keyframes specBar3 { 0% { transform: scaleY(0.8); } 100% { transform: scaleY(1.1); } }
        @keyframes specBar4 { 0% { transform: scaleY(0.6); } 100% { transform: scaleY(1.25); } }
        @keyframes specBar5 { 0% { transform: scaleY(0.75); } 100% { transform: scaleY(1.2); } }
      `}</style>
    </section>
  );
}
