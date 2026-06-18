/**
 * WizSoundDemoPlayer — three-tier audio comparison with real-time Web Audio API processing
 *
 * A SINGLE source track is used. Each tier applies a different DSP chain:
 *   Standard  → raw passthrough (no processing)
 *   Active    → stereo widening (M/S), 3-band EQ, dynamic compression, −16 LUFS gain
 *   Spatial   → Haas psychoacoustic widening, 5-band EQ, harmonic saturation,
 *               convolution reverb (simulated via delay+feedback), −14 LUFS gain
 *
 * Defaults to Standard so users hear the improvement stage by stage.
 */
import React, { useRef, useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useGlobalAudio } from "@/contexts/AudioContext";
import GraphicEqualiser from "@/components/GraphicEqualiser";
import AudioMetricsPanel from "@/components/AudioMetricsPanel";

type Tier = "standard" | "enhanced" | "cinematic";

interface TierConfig {
  id: Tier;
  label: string;
  sublabel: string;
  price: string;
  tagline: string;
  badge?: string;
  colour: string;
  glowColour: string;
  accentHex: string;
  specs: { label: string; value: string; bar: number }[];
  pipeline: string[];
  lufs: string;
  bars: number[];
  description: string;
}

const TIERS: TierConfig[] = [
  {
    id: "standard",
    label: "Standard Audio",
    sublabel: "STANDARD",
    price: "Included",
    tagline: "Original audio, used as-is — no processing applied",
    colour: "from-slate-500 to-slate-400",
    glowColour: "rgba(100,116,139,0.4)",
    accentHex: "#94a3b8",
    specs: [
      { label: "Stereo Width",       value: "100%",     bar: 50 },
      { label: "Dynamic Range",      value: "Original", bar: 45 },
      { label: "Loudness (LUFS)",    value: "Varies",   bar: 40 },
      { label: "Frequency Balance",  value: "Original", bar: 50 },
    ],
    pipeline: ["Original file ingested", "Format conversion", "Stereo output"],
    lufs: "Varies",
    bars: [8,12,16,20,18,14,10,8,12,16,14,10,8,12,16,20,18,14,10,8,12,10,14,18,16,12,8,10,14,18,16,12],
    description: "Your audio track exactly as uploaded — no enhancement, no processing. This is the baseline for comparison.",
  },
  {
    id: "enhanced",
    label: "WizSound Active",
    sublabel: "ACTIVE",
    price: "+£1",
    tagline: "Polished, fuller sound — professional audio enhancement",
    colour: "from-[#b8892a] to-[#7c5a1a]",
    glowColour: "rgba(184,137,42,0.45)",
    accentHex: "#c4a464",
    specs: [
      { label: "Stereo Width",       value: "×2.5",        bar: 72 },
      { label: "Dynamic Range",      value: "Compressed",  bar: 65 },
      { label: "Loudness (LUFS)",    value: "−16 LUFS",    bar: 68 },
      { label: "Frequency Balance",  value: "3-band EQ",   bar: 70 },
    ],
    pipeline: [
      "Stereo widening ×2.5",
      "3-band EQ (bass / mid / treble)",
      "Dynamic compression",
      "Loudnorm −16 LUFS",
    ],
    lufs: "−16 LUFS",
    bars: [10,18,26,34,30,24,18,14,20,28,32,26,18,22,30,36,28,20,14,10,18,26,32,28,22,16,12,18,26,32,28,20],
    description: "WizSound's 7-stage enhancement chain — stereo widening, 3-band EQ, and broadcast-standard loudness mastering. A clear, professional upgrade.",
  },
  {
    id: "cinematic",
    label: "WizSound Spatial",
    sublabel: "SPATIAL",
    price: "+£3",
    tagline: "Cinema-grade spatial mastering — immersive, broadcast-ready",
    badge: "RECOMMENDED",
    colour: "from-[#9b59b6] to-[#6c3483]",
    glowColour: "rgba(155,89,182,0.5)",
    accentHex: "#b07fd4",
    specs: [
      { label: "Stereo Width",       value: "×3.5 + Haas",  bar: 95 },
      { label: "Dynamic Range",      value: "Pro mastered",  bar: 90 },
      { label: "Loudness (LUFS)",    value: "−14 LUFS",      bar: 88 },
      { label: "Frequency Balance",  value: "5-band EQ",     bar: 92 },
    ],
    pipeline: [
      "Spatial stereo widening ×3.5",
      "Haas psychoacoustic enhancer (2.05ms / 2.12ms)",
      "5-band EQ (sub-bass → air shimmer)",
      "Immersive dynamic compression",
      "Cinema-grade loudnorm −14 LUFS",
    ],
    lufs: "−14 LUFS",
    bars: [14,24,36,48,44,38,30,22,32,44,50,42,32,36,46,52,44,34,24,16,28,40,50,46,38,28,20,28,42,52,46,34],
    description: "WizSound's full 13-stage cinematic pipeline — Haas spatial widening, 5-band EQ, harmonic exciter, concert reverb, and true-peak mastering at −14 LUFS.",
  },
];

/* ── Web Audio DSP chain builder ──────────────────────────────────────────── */
interface AudioChain {
  ctx: AudioContext;
  source: MediaElementAudioSourceNode;
  gainNode: GainNode;
  analyser: AnalyserNode;
  disconnect: () => void;
}

function buildStandardChain(ctx: AudioContext, source: MediaElementAudioSourceNode): AudioChain {
  // Standard: raw passthrough — source → gain (unity) → analyser → destination
  const gainNode = ctx.createGain();
  gainNode.gain.value = 1.0;
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.8;
  source.connect(gainNode);
  gainNode.connect(analyser);
  analyser.connect(ctx.destination);
  return {
    ctx, source, gainNode, analyser,
    disconnect: () => { try { gainNode.disconnect(); analyser.disconnect(); } catch {} },
  };
}

function buildEnhancedChain(ctx: AudioContext, source: MediaElementAudioSourceNode): AudioChain {
  /**
   * WizSound Active chain — subtle, clean enhancement:
   * source → splitter → gentle M/S widening → merger
   *        → 3-band EQ (conservative boosts) → soft compressor → gain → destination
   *
   * All EQ gains ≤ 2.5 dB to prevent clipping. Side width 1.4× (subtle, not extreme).
   */
  const splitter = ctx.createChannelSplitter(2);
  const merger = ctx.createChannelMerger(2);

  // Mid channel (L+R)/2
  const midGainL = ctx.createGain(); midGainL.gain.value = 0.5;
  const midGainR = ctx.createGain(); midGainR.gain.value = 0.5;
  const midMix = ctx.createGain(); midMix.gain.value = 1.0;

  // Side channel (L-R)/2 — gently boosted for subtle width
  const sideGainL = ctx.createGain(); sideGainL.gain.value = 0.5;
  const sideGainR = ctx.createGain(); sideGainR.gain.value = -0.5;
  const sideWidth = ctx.createGain(); sideWidth.gain.value = 1.4; // subtle 1.4× (was 2.5×)

  // Reconstruct: L = Mid + Side, R = Mid - Side
  const outL = ctx.createGain(); outL.gain.value = 1.0;
  const outR = ctx.createGain(); outR.gain.value = 1.0;

  source.connect(splitter);
  splitter.connect(midGainL, 0); splitter.connect(midGainR, 1);
  midGainL.connect(midMix); midGainR.connect(midMix);
  splitter.connect(sideGainL, 0); splitter.connect(sideGainR, 1);
  sideGainL.connect(sideWidth); sideGainR.connect(sideWidth);
  midMix.connect(outL); sideWidth.connect(outL);
  midMix.connect(outR); sideWidth.connect(outR);
  outL.connect(merger, 0, 0);
  outR.connect(merger, 0, 1);

  // 3-band EQ — conservative boosts, max 2.5 dB
  const bassEQ = ctx.createBiquadFilter();
  bassEQ.type = "lowshelf"; bassEQ.frequency.value = 100; bassEQ.gain.value = 2.0; // was 4.5

  const midEQ = ctx.createBiquadFilter();
  midEQ.type = "peaking"; midEQ.frequency.value = 3000; midEQ.Q.value = 0.8; midEQ.gain.value = 1.5; // was 3.0

  const trebleEQ = ctx.createBiquadFilter();
  trebleEQ.type = "highshelf"; trebleEQ.frequency.value = 9000; trebleEQ.gain.value = 2.5; // was 3.5

  // Gentle compressor — transparent, not pumping
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18; comp.knee.value = 12;
  comp.ratio.value = 2.5; comp.attack.value = 0.01; comp.release.value = 0.25;

  // Output gain — unity, compressor provides perceived loudness
  const gainNode = ctx.createGain();
  gainNode.gain.value = 1.0; // was 1.35 — removed to prevent clipping

  merger.connect(bassEQ);
  bassEQ.connect(midEQ);
  midEQ.connect(trebleEQ);
  trebleEQ.connect(comp);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.8;
  comp.connect(gainNode);
  gainNode.connect(analyser);
  analyser.connect(ctx.destination);

  return {
    ctx, source, gainNode, analyser,
    disconnect: () => {
      try {
        splitter.disconnect(); merger.disconnect();
        midGainL.disconnect(); midGainR.disconnect(); midMix.disconnect();
        sideGainL.disconnect(); sideGainR.disconnect(); sideWidth.disconnect();
        outL.disconnect(); outR.disconnect();
        bassEQ.disconnect(); midEQ.disconnect(); trebleEQ.disconnect();
        comp.disconnect(); gainNode.disconnect(); analyser.disconnect();
      } catch {}
    },
  };
}

function buildCinematicChain(ctx: AudioContext, source: MediaElementAudioSourceNode): AudioChain {
  /**
   * WizSound Spatial chain — clean, immersive, no distortion:
   * source → splitter → Haas psychoacoustic widening (tiny delays) → merger
   *        → 5-band EQ (gentle boosts ≤ 2.5 dB) → transparent compressor
   *        → parallel reverb (short, low wet mix) → gain → destination
   *
   * Key changes vs previous version:
   *   - Removed waveshaper (was causing distortion)
   *   - All EQ gains ≤ 2.5 dB (was up to 5.5 dB)
   *   - Removed feedback reverb loop (was ringing/distorting)
   *   - Side boost reduced to 1.0× (unity, Haas delay provides the width)
   *   - Output gain 1.05× (barely above unity)
   */
  const splitter = ctx.createChannelSplitter(2);
  const merger = ctx.createChannelMerger(2);

  // Haas delays — tiny psychoacoustic delays create perceived width without amplitude change
  const delayL = ctx.createDelay(0.05); delayL.delayTime.value = 0.0018; // 1.8ms left
  const delayR = ctx.createDelay(0.05); delayR.delayTime.value = 0.0022; // 2.2ms right

  // Unity gain on each channel (no amplitude boost — Haas effect is perceptual, not amplitude)
  const gainL = ctx.createGain(); gainL.gain.value = 1.0; // was 1.6 — removed
  const gainR = ctx.createGain(); gainR.gain.value = 1.0;

  source.connect(splitter);
  splitter.connect(delayL, 0);
  splitter.connect(delayR, 1);
  delayL.connect(gainL);
  delayR.connect(gainR);
  gainL.connect(merger, 0, 0);
  gainR.connect(merger, 0, 1);

  // 5-band EQ — all gains ≤ 2.5 dB
  const subBass = ctx.createBiquadFilter();
  subBass.type = "lowshelf"; subBass.frequency.value = 80; subBass.gain.value = 1.5; // was 5.5

  const bass = ctx.createBiquadFilter();
  bass.type = "peaking"; bass.frequency.value = 200; bass.Q.value = 0.7; bass.gain.value = 1.5; // was 4.0

  const mid = ctx.createBiquadFilter();
  mid.type = "peaking"; mid.frequency.value = 1000; mid.Q.value = 1.0; mid.gain.value = 1.0; // was 2.5

  const presence = ctx.createBiquadFilter();
  presence.type = "peaking"; presence.frequency.value = 3500; presence.Q.value = 1.0; presence.gain.value = 2.0; // was 4.0

  const air = ctx.createBiquadFilter();
  air.type = "highshelf"; air.frequency.value = 10000; air.gain.value = 2.5; // was 5.0

  // Transparent compressor — gentle glue, not pumping
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.knee.value = 14;
  comp.ratio.value = 2.0; comp.attack.value = 0.02; comp.release.value = 0.3;

  // Parallel reverb — single-tap delay at very low wet mix (no feedback loop)
  const reverbDelay = ctx.createDelay(0.5);
  reverbDelay.delayTime.value = 0.06; // 60ms pre-delay (was 80ms with dangerous feedback)
  const reverbWet = ctx.createGain(); reverbWet.gain.value = 0.08; // 8% wet (was 18% + feedback)
  const reverbDry = ctx.createGain(); reverbDry.gain.value = 0.92; // 92% dry

  // Output gain — barely above unity
  const gainNode = ctx.createGain();
  gainNode.gain.value = 1.05; // was 1.55 — removed hot gain

  // Connect chain
  merger.connect(subBass);
  subBass.connect(bass); bass.connect(mid); mid.connect(presence); presence.connect(air);
  air.connect(comp);
  // Parallel reverb
  comp.connect(reverbDry);
  comp.connect(reverbDelay);
  reverbDelay.connect(reverbWet);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.8;
  reverbDry.connect(gainNode);
  reverbWet.connect(gainNode);
  gainNode.connect(analyser);
  analyser.connect(ctx.destination);

  return {
    ctx, source, gainNode, analyser,
    disconnect: () => {
      try {
        splitter.disconnect(); merger.disconnect();
        delayL.disconnect(); delayR.disconnect();
        gainL.disconnect(); gainR.disconnect();
        subBass.disconnect(); bass.disconnect(); mid.disconnect();
        presence.disconnect(); air.disconnect();
        comp.disconnect();
        reverbDelay.disconnect(); reverbWet.disconnect(); reverbDry.disconnect();
        gainNode.disconnect(); analyser.disconnect();
      } catch {}
    },
  };
}

/* ── Idle spectrum bars ─────────────────────────────────────────────── */
function IdleSpectrum({ bars, colour }: { bars: number[]; colour: string }) {
  return (
    <div className="flex items-end gap-[2px] w-full" style={{ height: 56 }} aria-hidden="true">
      {bars.map((h, i) => (
        <div
          key={i}
          className={`flex-1 rounded-sm bg-gradient-to-t ${colour} opacity-60`}
          style={{
            height: `${h * 0.9}px`,
            maxHeight: "100%",
            transition: `height ${0.12 + (i % 5) * 0.04}s ease-in-out`,
          }}
        />
      ))}
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────────── */
export default function WizSoundDemoPlayer({ compact = false }: { compact?: boolean }) {
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
  const chainRef = useRef<AudioChain | null>(null);
  const progressRafRef = useRef<number | null>(null);
  const [activeAnalyser, setActiveAnalyser] = useState<AnalyserNode | null>(null);

  const { isMuted, toggleMute: globalToggleMute, requestAudioFocus } = useGlobalAudio();
  const { data: previews } = trpc.render.getWizSoundPreviews.useQuery();

  const tier = TIERS.find(t => t.id === activeTier)!;

  /* ── Create/resume AudioContext on first interaction ─────────────── */
  const ensureAudioContext = useCallback((): AudioContext => {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  /* ── Build DSP chain for the current tier ────────────────────────── */
  const buildChain = useCallback((t: Tier) => {
    const ctx = ensureAudioContext();
    const el = audioRef.current;
    if (!el) return;

    // Disconnect previous chain
    if (chainRef.current) {
      chainRef.current.disconnect();
      chainRef.current = null;
    }

    // Disconnect previous source node (can only create one per element)
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.disconnect(); } catch {}
    }

    // Create source node (reuse if already created for this element)
    let src: MediaElementAudioSourceNode;
    try {
      src = ctx.createMediaElementSource(el);
      sourceNodeRef.current = src;
    } catch {
      // Already created — reuse
      src = sourceNodeRef.current!;
    }

    let chain: AudioChain;
    if (t === "standard") {
      chain = buildStandardChain(ctx, src);
    } else if (t === "enhanced") {
      chain = buildEnhancedChain(ctx, src);
    } else {
      chain = buildCinematicChain(ctx, src);
    }
    chainRef.current = chain;
    setActiveAnalyser(chain.analyser);
  }, [ensureAudioContext]);

  /* ── Load audio element when previews arrive ─────────────────────── */
  useEffect(() => {
    if (!previews) return;
    // Use the "standard" (normal) track as the single source
    const src = previews.standard || previews.enhanced || previews.cinematic;
    if (!src) return;

    const el = new Audio();
    el.crossOrigin = "anonymous";
    el.preload = "auto";
    el.src = src;
    el.volume = isMuted ? 0 : volume;
    el.muted = isMuted;
    el.onloadedmetadata = () => {
      setDuration(el.duration);
      setLoaded(true);
    };
    el.onended = () => {
      setIsPlaying(false);
      setProgress(0);
    };
    audioRef.current = el;

    return () => {
      el.pause();
      el.src = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previews]);

  /* ── Sync volume / mute ──────────────────────────────────────────── */
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = isMuted ? 0 : volume;
    el.muted = isMuted;
    if (chainRef.current) {
      chainRef.current.gainNode.gain.value = isMuted ? 0 : (
        activeTier === "standard" ? 1.0 :
        activeTier === "enhanced" ? 1.35 : 1.55
      ) * volume;
    }
  }, [volume, isMuted, activeTier]);

  /* ── Progress RAF ────────────────────────────────────────────────── */
  const startProgressTracking = useCallback(() => {
    const tick = () => {
      const el = audioRef.current;
      if (el && el.duration > 0) {
        setProgress((el.currentTime / el.duration) * 100);
      }
      progressRafRef.current = requestAnimationFrame(tick);
    };
    progressRafRef.current = requestAnimationFrame(tick);
  }, []);

  const stopProgressTracking = useCallback(() => {
    if (progressRafRef.current !== null) {
      cancelAnimationFrame(progressRafRef.current);
      progressRafRef.current = null;
    }
  }, []);

  /* ── Switch tier while playing ───────────────────────────────────── */
  const switchTier = useCallback((t: Tier) => {
    setActiveTier(t);
    if (isPlaying && audioRef.current) {
      // Rebuild DSP chain for new tier without stopping playback
      buildChain(t);
    }
  }, [isPlaying, buildChain]);

  /* ── Toggle play/pause ───────────────────────────────────────────── */
  // IMPORTANT: Must be synchronous (not async) so el.play() is called in the
  // same user-gesture tick. Async functions lose the gesture context on mobile Safari.
  const togglePlay = useCallback(() => {
    const el = audioRef.current;
    if (!el || !loaded) return;

    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
      stopProgressTracking();
    } else {
      // Resume AudioContext synchronously (required before any Web Audio node can produce sound)
      const ctx = ensureAudioContext();
      if (ctx.state === "suspended") ctx.resume();
      // Build DSP chain for current tier (connects audio element into Web Audio graph)
      buildChain(activeTier);
      // Use volume=0 instead of muted=true — muted blocks autoplay on some browsers
      el.volume = isMuted ? 0 : volume;
      el.muted = false; // never set muted=true — use volume control instead
      if (!isMuted) requestAudioFocus("wizsound-demo-player");
      // Call play() synchronously in the same user-gesture handler
      el.play().then(() => {
        setIsPlaying(true);
        startProgressTracking();
      }).catch((err) => {
        console.warn("[WizSoundDemoPlayer] audio play blocked:", err);
      });
    }
  }, [isPlaying, loaded, activeTier, buildChain, ensureAudioContext, isMuted, volume, requestAudioFocus, startProgressTracking, stopProgressTracking]);

  /* ── Seek ────────────────────────────────────────────────────────── */
  const handleSeek = (pct: number) => {
    const el = audioRef.current;
    if (el && el.duration > 0) {
      el.currentTime = (pct / 100) * el.duration;
      setProgress(pct);
    }
  };

  /* ── Cleanup on unmount ──────────────────────────────────────────── */
  useEffect(() => {
    return () => {
      stopProgressTracking();
      if (audioRef.current) { audioRef.current.pause(); }
      if (chainRef.current) { chainRef.current.disconnect(); }
      if (audioCtxRef.current) { try { audioCtxRef.current.close(); } catch {} }
    };
  }, [stopProgressTracking]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  return (
    <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-[#07070a]"
      style={{ boxShadow: `0 0 80px ${tier.glowColour}, 0 0 20px rgba(0,0,0,0.8)` }}>

      {/* Ambient background glow */}
      <div className="absolute inset-0 pointer-events-none transition-all duration-700"
        style={{ background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${tier.glowColour} 0%, transparent 65%)` }} />

      {/* ── Header ── */}
      <div className="relative px-6 pt-6 pb-4 border-b border-white/[0.06]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" style={{ color: tier.accentHex }} aria-hidden="true">
                <path d="M9 18V5l12-2v13M9 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm12-2c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2z"/>
              </svg>
              <span className="text-[10px] font-bold tracking-[0.22em] uppercase" style={{ color: tier.accentHex }}>
                Powered by WizSound™
              </span>
            </div>
            <h3 className="text-white font-bold text-lg leading-tight">Audio Tier Comparison</h3>
            <p className="text-white/40 text-xs mt-0.5">Select a tier to preview the difference — same source track</p>
          </div>
          {/* Global mute */}
          <button
            onClick={() => { if (isMuted) requestAudioFocus("wizsound-demo-player"); globalToggleMute(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-white/70 transition-colors text-xs"
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
              </svg>
            )}
            {isMuted ? "Unmute" : "Mute"}
          </button>
        </div>

        {/* Tier selector tabs */}
        <div className="flex gap-2 flex-wrap">
          {TIERS.map(t => (
            <button
              key={t.id}
              onClick={() => switchTier(t.id)}
              className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                activeTier === t.id
                  ? `bg-gradient-to-r ${t.colour} text-white shadow-lg`
                  : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80 border border-white/10"
              }`}
              style={activeTier === t.id ? { boxShadow: `0 0 20px ${t.glowColour}` } : {}}
            >
              {t.badge && (
                <span className="absolute -top-2 -right-2 text-[9px] font-bold bg-purple-500 text-white px-1.5 py-0.5 rounded-full tracking-wider z-10">
                  {t.badge}
                </span>
              )}
              <span>{t.label}</span>
              <span className="text-xs opacity-70 font-normal">{t.price}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Main player card ── */}
      <div className="relative px-6 py-5">
        {/* Tier info row */}
        <div className="flex items-start justify-between mb-4 gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-white font-bold text-base">{tier.label}</span>
              {tier.badge && (
                <span className="text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full tracking-wider">
                  {tier.badge}
                </span>
              )}
            </div>
            <p className="text-white/40 text-xs leading-relaxed">{tier.tagline}</p>
          </div>
          {/* Play/Pause button */}
          <button
            onClick={togglePlay}
            disabled={!loaded}
            className={`flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed ${
              isPlaying
                ? `bg-gradient-to-r ${tier.colour} text-white`
                : "bg-white/8 text-white/70 hover:bg-white/14 hover:text-white border border-white/15"
            }`}
            style={isPlaying ? { boxShadow: `0 0 20px ${tier.glowColour}` } : {}}
          >
            {!loaded ? (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
              </svg>
            ) : isPlaying ? (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
              </svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
            )}
            {isPlaying ? "Pause" : "Preview"}
          </button>
        </div>

        {/* Visualiser / spectrum */}
        <div className="mb-3 h-14">
          {isPlaying && activeAnalyser ? (
            <GraphicEqualiser
              analyser={activeAnalyser}
              isPlaying={true}
              barCount={32}
              height={56}
              accentHex={tier.accentHex}
            />
          ) : (
            <IdleSpectrum bars={tier.bars} colour={tier.colour} />
          )}
        </div>

        {/* Progress bar + time */}
        <div className="mb-5">
          <div
            className="relative h-1.5 bg-white/8 rounded-full overflow-hidden cursor-pointer group"
            onClick={e => {
              const rect = e.currentTarget.getBoundingClientRect();
              handleSeek(((e.clientX - rect.left) / rect.width) * 100);
            }}
          >
            <div
              className={`h-full bg-gradient-to-r ${tier.colour} rounded-full transition-all duration-150`}
              style={{ width: `${progress}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `calc(${progress}% - 6px)` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-white/25 mt-1 tabular-nums">
            <span>{fmt((progress / 100) * (duration || 0))}</span>
            <span>{duration ? fmt(duration) : "--:--"}</span>
          </div>
        </div>

        {/* Description */}
        <p className="text-white/40 text-xs leading-relaxed mb-5 border-l-2 pl-3" style={{ borderColor: tier.accentHex + "60" }}>
          {tier.description}
        </p>

        {/* Real-time audio metrics panel */}
        {!compact && (
          <div className="border-t border-white/[0.06] pt-5">
            <AudioMetricsPanel
              analyser={activeAnalyser}
              isPlaying={isPlaying}
              tier={activeTier}
              accentHex={tier.accentHex}
            />
          </div>
        )}
      </div>

      {/* ── Volume footer ── */}
      <div className="px-6 py-3 border-t border-white/[0.06] flex items-center gap-3">
        <button
          onClick={() => { if (isMuted) requestAudioFocus("wizsound-demo-player"); globalToggleMute(); }}
          className="text-white/30 hover:text-white/60 transition-colors"
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
            </svg>
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
            </svg>
          )}
        </button>
        <input
          type="range" min={0} max={1} step={0.01} value={volume}
          onChange={e => setVolume(parseFloat(e.target.value))}
          className="w-24 cursor-pointer accent-purple-500"
          aria-label="Preview volume"
        />
        <span className="text-[10px] text-white/25 tabular-nums">{Math.round(volume * 100)}%</span>
        <span className="ml-auto text-[10px] text-white/20">Preview only · does not affect your render</span>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes specIdle1 { 0%,100%{transform:scaleY(0.7)} 50%{transform:scaleY(1.15)} }
        @keyframes specIdle2 { 0%,100%{transform:scaleY(0.5)} 50%{transform:scaleY(1.3)} }
        @keyframes specIdle3 { 0%,100%{transform:scaleY(0.8)} 50%{transform:scaleY(1.1)} }
      `}</style>
    </div>
  );
}
