import { useEffect, useRef, useState, useCallback } from "react";
import { Volume2, VolumeX, Zap, Music2, Film, Play, Pause, ChevronRight, Headphones, Sparkles } from "lucide-react";
import { useLocation } from "wouter";

/* ── Single demo video — audio processed in real-time via Web Audio API ── */
// demo-clean_b6ec4737.mp4 — stereo AAC 48kHz, confirmed audio track present
const VIDEO_SRC =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/demo-clean_b6ec4737.mp4";

/* ──────────────────────────────────────────────────────────────────────────
   WizSoundEngine
   Builds a Web Audio API graph with TWO dramatically different paths.

   CRITICAL: Once createMediaElementSource() is called, the video element's
   audio is routed EXCLUSIVELY through Web Audio. The video.muted property
   must stay FALSE — muting is handled by a gain node at the end of the graph.

   Standard path:  source → standardGain (0.7) → outputGain → destination
                   Deliberately quieter, flat, narrow — "before" quality.

   WizSound path:  source → bassBoost (+18 dB shelf at 100 Hz)
                          → subBass (+10 dB shelf at 60 Hz)
                          → presenceBoost (+8 dB peak at 3.2 kHz)
                          → airBoost (+5 dB high-shelf at 10 kHz)
                          → splitter → Haas stereo widening (30ms)
                          → compressor → masterGain (2.0 = +6 dB)
                          → outputGain → destination
                   Loud, wide, punchy, spatial — cinema-grade.

   outputGain: used for mute/unmute (0 or 1) — replaces video.muted
   ─────────────────────────────────────────────────────────────────────── */
class WizSoundEngine {
  private ctx: AudioContext;
  private source: MediaElementAudioSourceNode;
  private standardGain: GainNode;
  private masterGain: GainNode;
  private outputGain: GainNode; // Mute control
  private bassBoost: BiquadFilterNode;
  private subBass: BiquadFilterNode;
  private presenceBoost: BiquadFilterNode;
  private airBoost: BiquadFilterNode;
  private compressor: DynamicsCompressorNode;
  private haasDelay: DelayNode;
  private haasGainL: GainNode;
  private haasGainR: GainNode;
  private panLeft: StereoPannerNode;
  private panRight: StereoPannerNode;
  private merger: ChannelMergerNode;
  private splitter: ChannelSplitterNode;
  private _wizsound = false;
  private _muted = false;

  constructor(video: HTMLVideoElement) {
    this.ctx = new AudioContext();
    this.source = this.ctx.createMediaElementSource(video);

    /* ── Output gain (mute control) — at the very end of the chain ── */
    this.outputGain = this.ctx.createGain();
    this.outputGain.gain.value = 1.0;
    this.outputGain.connect(this.ctx.destination);

    /* ── Standard path — deliberately flat and quiet ── */
    this.standardGain = this.ctx.createGain();
    this.standardGain.gain.value = 0.7; // Quieter than WizSound to emphasise the upgrade

    /* ── WizSound path ── */
    // Bass boost: +18 dB low-shelf at 100 Hz — heavy, cinematic bass
    this.bassBoost = this.ctx.createBiquadFilter();
    this.bassBoost.type = "lowshelf";
    this.bassBoost.frequency.value = 100;
    this.bassBoost.gain.value = 18;

    // Sub-bass: +10 dB low-shelf at 60 Hz — rumble you can feel
    this.subBass = this.ctx.createBiquadFilter();
    this.subBass.type = "lowshelf";
    this.subBass.frequency.value = 60;
    this.subBass.gain.value = 10;

    // Presence boost: +8 dB peak at 3.2 kHz (vocal clarity, attack)
    this.presenceBoost = this.ctx.createBiquadFilter();
    this.presenceBoost.type = "peaking";
    this.presenceBoost.frequency.value = 3200;
    this.presenceBoost.Q.value = 1.2;
    this.presenceBoost.gain.value = 8;

    // Air boost: +5 dB high-shelf at 10 kHz (sparkle, openness)
    this.airBoost = this.ctx.createBiquadFilter();
    this.airBoost.type = "highshelf";
    this.airBoost.frequency.value = 10000;
    this.airBoost.gain.value = 5;

    // Haas stereo widening: split L/R, delay one side by 30 ms
    this.splitter = this.ctx.createChannelSplitter(2);
    this.haasDelay = this.ctx.createDelay(0.06);
    this.haasDelay.delayTime.value = 0.030; // 30 ms Haas effect — wider than before
    this.haasGainL = this.ctx.createGain();
    this.haasGainL.gain.value = 1.0;
    this.haasGainR = this.ctx.createGain();
    this.haasGainR.gain.value = 1.0;
    this.panLeft = this.ctx.createStereoPanner();
    this.panLeft.pan.value = -0.9; // Hard left
    this.panRight = this.ctx.createStereoPanner();
    this.panRight.pan.value = 0.9; // Hard right
    this.merger = this.ctx.createChannelMerger(2);

    // Dynamic compression: aggressive for punch and loudness
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -24;
    this.compressor.knee.value = 6;
    this.compressor.ratio.value = 6;
    this.compressor.attack.value = 0.002;
    this.compressor.release.value = 0.1;

    // Master gain: +6 dB perceived loudness boost
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 2.0;

    /* ── Wire the WizSound graph ── */
    // source → bassBoost → subBass → presenceBoost → airBoost → splitter
    this.bassBoost.connect(this.subBass);
    this.subBass.connect(this.presenceBoost);
    this.presenceBoost.connect(this.airBoost);
    this.airBoost.connect(this.splitter);

    // Left channel: direct → pan left
    this.splitter.connect(this.haasGainL, 0);
    this.haasGainL.connect(this.panLeft);
    this.panLeft.connect(this.merger, 0, 0);

    // Right channel: delayed → pan right (Haas effect)
    this.splitter.connect(this.haasDelay, 1);
    this.haasDelay.connect(this.haasGainR);
    this.haasGainR.connect(this.panRight);
    this.panRight.connect(this.merger, 0, 1);

    // merger → compressor → masterGain → outputGain → destination
    this.merger.connect(this.compressor);
    this.compressor.connect(this.masterGain);
    this.masterGain.connect(this.outputGain);

    /* ── Start with Standard (bypass WizSound graph) ── */
    this.source.connect(this.standardGain);
    this.standardGain.connect(this.outputGain);
  }

  setWizSound(enabled: boolean) {
    if (enabled === this._wizsound) return;
    this._wizsound = enabled;

    if (enabled) {
      // Disconnect standard path, connect WizSound path
      try { this.source.disconnect(this.standardGain); } catch { /* noop */ }
      try { this.standardGain.disconnect(); } catch { /* noop */ }
      this.source.connect(this.bassBoost);
    } else {
      // Disconnect WizSound path, reconnect standard path
      try { this.source.disconnect(this.bassBoost); } catch { /* noop */ }
      this.source.connect(this.standardGain);
      this.standardGain.connect(this.outputGain);
    }
  }

  setMuted(muted: boolean) {
    this._muted = muted;
    this.outputGain.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.02);
  }

  get isMuted() { return this._muted; }

  resume() {
    if (this.ctx.state === "suspended") this.ctx.resume();
  }

  destroy() {
    try { this.ctx.close(); } catch { /* noop */ }
  }
}

/* ── Single-video player with real-time audio processing ─────────────────── */
function WizSoundPlayer({ visible }: { visible: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [wizsound, setWizsound] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [engineReady, setEngineReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const engineRef = useRef<WizSoundEngine | null>(null);
  const rafRef = useRef<number>(0);
  const wizsoundRef = useRef(false);

  /* ── Track progress ── */
  const trackProgress = useCallback(() => {
    const v = videoRef.current;
    if (v && v.duration) setProgress((v.currentTime / v.duration) * 100);
    rafRef.current = requestAnimationFrame(trackProgress);
  }, []);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  /* ── Destroy engine on unmount ── */
  useEffect(() => () => { engineRef.current?.destroy(); }, []);

  /* ── Sync mute state to engine (NOT to video.muted) ── */
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setMuted(isMuted);
    }
  }, [isMuted]);

  /* ── Initialise Web Audio Engine on first play (requires user gesture) ── */
  const initEngine = useCallback(() => {
    if (engineRef.current || !videoRef.current) return;
    try {
      const engine = new WizSoundEngine(videoRef.current);
      engineRef.current = engine;
      engine.setWizSound(wizsoundRef.current);
      engine.setMuted(false); // Start unmuted — user just clicked play
      setEngineReady(true);
    } catch (e) {
      console.warn("[WizSound] Web Audio API unavailable:", e);
    }
  }, []);

  /* ── Play / Pause ── */
  const togglePlay = useCallback(async () => {
    const v = videoRef.current;
    if (!v) return;

    if (playing) {
      v.pause();
      cancelAnimationFrame(rafRef.current);
      setPlaying(false);
    } else {
      initEngine();
      engineRef.current?.resume();
      // CRITICAL: video.muted must be FALSE for Web Audio to receive the signal
      // Muting is handled by the outputGain node in the Web Audio graph
      v.muted = false;
      setIsMuted(false);
      try {
        await v.play();
        setPlaying(true);
        rafRef.current = requestAnimationFrame(trackProgress);
      } catch {
        // Autoplay blocked — try muted first, then unmute
        v.muted = true;
        try {
          await v.play();
          // Unmute after play succeeds
          v.muted = false;
          setPlaying(true);
          rafRef.current = requestAnimationFrame(trackProgress);
        } catch {
          setPlaying(false);
        }
      }
    }
  }, [playing, initEngine, trackProgress]);

  /* ── Switch Standard ↔ WizSound ── */
  const switchMode = useCallback((toWizSound: boolean) => {
    if (toWizSound === wizsoundRef.current) return;
    wizsoundRef.current = toWizSound;
    setWizsound(toWizSound);

    if (engineRef.current) {
      engineRef.current.setWizSound(toWizSound);
    }
  }, []);

  /* ── Mute toggle — uses Web Audio gain, NOT video.muted ── */
  const toggleMute = useCallback(() => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (engineRef.current) {
      engineRef.current.setMuted(newMuted);
    }
  }, [isMuted]);

  /* ── Seek ── */
  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    v.currentTime = ratio * (v.duration || 22);
    setProgress(ratio * 100);
  }, []);

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

      {/* ── Video ── */}
      <div className="relative w-full aspect-video bg-black overflow-hidden rounded-t-xl">
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black z-20">
            <div className="w-8 h-8 rounded-full border-2 border-fuchsia-500/40 border-t-fuchsia-400 animate-spin" />
          </div>
        )}

        {/* CRITICAL: No muted attribute — Web Audio handles all audio routing.
            The video element must NOT be muted or Web Audio receives silence. */}
        <video
          ref={videoRef}
          src={VIDEO_SRC}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          loop
          preload="auto"
          onCanPlayThrough={() => setLoaded(true)}
        />

        {/* Play button overlay */}
        {!playing && loaded && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center z-20 group cursor-pointer"
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
            }}
          >
            <Sparkles className="w-3 h-3" />
            WizSound™ Active
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

        {/* Engine ready indicator */}
        {engineReady && playing && (
          <div className="absolute bottom-3 left-3 z-30">
            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono ${wizsound ? "text-fuchsia-300/70" : "text-white/30"}`}>
              {wizsound ? "⚡ WEB AUDIO PROCESSING" : "○ RAW SIGNAL"}
            </div>
          </div>
        )}
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

        <p className="text-white/30 text-[11px] text-center mt-2.5 leading-relaxed transition-all duration-300">
          {wizsound
            ? "Wide stereo · Deep bass · Spatial reverb · 320kbps mastered"
            : "Flat mix · Narrow stereo · No bass · No spatial processing"
          }
        </p>

        {!playing && (
          <p className="text-fuchsia-400/60 text-[10px] text-center mt-1.5 animate-pulse">
            ▶ Press play, then toggle to hear the difference
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
            Press play, then toggle between Standard and WizSound™ Cinematic.
          </p>
          <p className="text-white/40 text-base max-w-2xl mx-auto leading-relaxed mt-2">
            The difference is{" "}
            <span className="text-fuchsia-300 font-semibold">immediate</span>. WizSound™ applies real-time bass boost,
            stereo widening, spatial reverb, and dynamic compression — the same audio you hear, transformed live in your browser.
          </p>
        </div>

        {/* Two-column: player + feature cards */}
        <div className="grid lg:grid-cols-2 gap-10 mb-14 items-start">
          <WizSoundPlayer visible={visible} />

          <div className="flex flex-col gap-4">
            <FeatureCard
              icon={Volume2}
              title="Spatial Immersion"
              description="Audio that surrounds the viewer — not flat stereo. WizSound™ applies stereo widening and spatial reverb to create a three-dimensional sound field that fills the room."
              gradient="linear-gradient(135deg, rgba(139,92,246,0.8), rgba(109,40,217,0.6))"
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
