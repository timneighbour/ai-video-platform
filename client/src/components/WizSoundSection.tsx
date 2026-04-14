import { useEffect, useRef, useState, useCallback } from "react";
import { Volume2, VolumeX, Zap, Music2, Film, Play, Pause, ChevronRight, Headphones, Sparkles } from "lucide-react";

/* ── CDN assets ── */
const VIDEO_SRC =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/demo-video-only_553227ac.mp4";
const AUDIO_STANDARD =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizsound-standard_31845db2.m4a";
const AUDIO_ENHANCED =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizsound-enhanced_9f37b387.m4a";

/* ── Simple dual-audio player ─────────────────────────────────────────────
   Video plays muted (always allowed by browsers).
   Audio plays from a separate <audio> element synced to the video.
   Toggle switches between two pre-processed audio files:
     Standard = flat, 192kbps, volume 0.7
     WizSound = bass boost, stereo widening, reverb, compression, 320kbps
   ────────────────────────────────────────────────────────────────────── */
function WizSoundPlayer({ visible }: { visible: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [wizsound, setWizsound] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [isMuted, setIsMuted] = useState(false); // Start unmuted — audio plays when user clicks play

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioStdRef = useRef<HTMLAudioElement>(null);
  const audioEnhRef = useRef<HTMLAudioElement>(null);
  const rafRef = useRef<number>(0);

  /* ── Get the active audio element ── */
  const getActiveAudio = useCallback(() => {
    return wizsound ? audioEnhRef.current : audioStdRef.current;
  }, [wizsound]);

  const getInactiveAudio = useCallback(() => {
    return wizsound ? audioStdRef.current : audioEnhRef.current;
  }, [wizsound]);

  /* ── Track progress ── */
  const trackProgress = useCallback(() => {
    const v = videoRef.current;
    if (v && v.duration) setProgress((v.currentTime / v.duration) * 100);
    rafRef.current = requestAnimationFrame(trackProgress);
  }, []);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  /* ── Sync audio to video time on mode switch ── */
  useEffect(() => {
    const v = videoRef.current;
    const active = getActiveAudio();
    const inactive = getInactiveAudio();
    if (!v || !active) return;

    // Pause inactive audio
    if (inactive) {
      inactive.pause();
    }

    // Sync active audio to video time
    active.currentTime = v.currentTime;
    active.muted = isMuted;

    if (playing) {
      active.play().catch(() => {});
    }
  }, [wizsound]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Sync mute state ── */
  useEffect(() => {
    const active = getActiveAudio();
    if (active) active.muted = isMuted;
  }, [isMuted, getActiveAudio]);

  /* ── Keep audio synced to video (drift correction) ── */
  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => {
      const v = videoRef.current;
      const active = getActiveAudio();
      if (v && active && Math.abs(v.currentTime - active.currentTime) > 0.1) {
        active.currentTime = v.currentTime;
      }
    }, 250); // Reduced from 500ms for faster mobile sync
    return () => clearInterval(interval);
  }, [playing, getActiveAudio]);

  /* ── Play / Pause ── */
  const togglePlay = useCallback(async () => {
    const v = videoRef.current;
    const active = getActiveAudio();
    if (!v || !active) return;

    if (playing) {
      v.pause();
      active.pause();
      cancelAnimationFrame(rafRef.current);
      setPlaying(false);
    } else {
      // Sync audio to video position
      active.currentTime = v.currentTime;
      active.muted = isMuted;

      try {
        await v.play(); // Video is muted, always works
        await active.play(); // Audio plays — user clicked, so gesture is satisfied
        setPlaying(true);
        rafRef.current = requestAnimationFrame(trackProgress);
      } catch {
        // If audio still blocked, play video only (user can unmute later)
        try {
          await v.play();
          setPlaying(true);
          rafRef.current = requestAnimationFrame(trackProgress);
        } catch {
          setPlaying(false);
        }
      }
    }
  }, [playing, getActiveAudio, isMuted, trackProgress]);

  /* ── Handle video ended (loop) ── */
  const handleVideoLoop = useCallback(() => {
    const v = videoRef.current;
    const active = getActiveAudio();
    if (v && active) {
      active.currentTime = 0;
      if (playing) active.play().catch(() => {});
    }
  }, [playing, getActiveAudio]);

  /* ── Switch Standard ↔ WizSound ── */
  const switchMode = useCallback((toWizSound: boolean) => {
    setWizsound(toWizSound);
  }, []);

  /* ── Mute toggle ── */
  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  /* ── Seek ── */
  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    const active = getActiveAudio();
    if (!v) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    v.currentTime = ratio * (v.duration || 22);
    if (active) active.currentTime = v.currentTime;
    setProgress(ratio * 100);
  }, [getActiveAudio]);

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
      {wizsound && (
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none z-10"
          style={{ background: "linear-gradient(180deg, rgba(217,70,239,0.04) 0%, transparent 40%)" }}
        />
      )}

      {/* ── Video (always muted — audio comes from separate element) ── */}
      <div className="relative w-full aspect-video bg-black overflow-hidden rounded-t-xl">
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black z-20 pointer-events-none">
            <div className="w-8 h-8 rounded-full border-2 border-fuchsia-500/40 border-t-fuchsia-400 animate-spin" />
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

        {/* Hidden audio elements — one standard, one enhanced */}
        <audio ref={audioStdRef} src={AUDIO_STANDARD} preload="auto" loop crossOrigin="anonymous" />
        <audio ref={audioEnhRef} src={AUDIO_ENHANCED} preload="auto" loop crossOrigin="anonymous" />

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
}: {
  icon: typeof Zap;
  title: string;
  description: string;
  gradient: string;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/3 p-6 hover:border-fuchsia-500/25 transition-all duration-300 group">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110"
        style={{ background: gradient }}
      >
        <Icon className="w-5 h-5 text-white" />
      </div>
      <h3 className="text-white font-semibold text-base mb-2">{title}</h3>
      <p className="text-white/50 text-sm leading-relaxed">{description}</p>
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
      id="wizsound"
      className="relative py-24 overflow-hidden"
      style={{ background: "linear-gradient(180deg, #0a0a12 0%, #0d0d18 50%, #0a0a12 100%)" }}
    >
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] pointer-events-none" style={{ background: "radial-gradient(ellipse, rgba(217,70,239,0.06) 0%, transparent 70%)" }} />

      <div className="container max-w-6xl mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-fuchsia-500/25 bg-fuchsia-500/8 mb-6 transition-all duration-700"
            style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(12px)" }}
          >
            <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />
            <span className="text-fuchsia-300 text-xs font-bold tracking-wider uppercase">Powered by WizSound™</span>
          </div>
          <h2
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 transition-all duration-700 delay-100"
            style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(16px)" }}
          >
            Hear the difference with{" "}
            <span className="bg-gradient-to-r from-fuchsia-400 via-purple-400 to-violet-400 bg-clip-text text-transparent">
              WizSound™
            </span>
          </h2>
          <p
            className="text-white/50 text-base md:text-lg max-w-2xl mx-auto leading-relaxed transition-all duration-700 delay-200"
            style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(12px)" }}
          >
            Press play, then toggle between Standard and WizSound Cinematic.
          </p>
          <p
            className="text-white/40 text-sm max-w-xl mx-auto mt-2 transition-all duration-700 delay-300"
            style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(12px)" }}
          >
            The difference is <strong className="text-white/60">immediate</strong>. WizSound™ transforms flat audio into a rich, immersive
            cinematic soundscape — wider stereo, deeper bass, and studio-grade mastering.
          </p>
        </div>

        {/* Player + features grid */}
        <div className="grid lg:grid-cols-5 gap-8 items-start">
          <div className="lg:col-span-3">
            <WizSoundPlayer visible={visible} />
          </div>

          <div className="lg:col-span-2 space-y-4">
            <FeatureCard
              icon={Volume2}
              title="Spatial Immersion"
              description="Audio that surrounds the viewer — not flat stereo. WizSound™ applies stereo widening and spatial reverb to create a three-dimensional sound field that fills the room."
              gradient="linear-gradient(135deg, rgba(217,70,239,0.3), rgba(139,92,246,0.2))"
            />
            <FeatureCard
              icon={Zap}
              title="Studio-Grade Mastering"
              description="5-band parametric EQ, dynamic compression, sub-bass enhancement, and loudness normalisation to broadcast standards. Every frequency sculpted for maximum impact."
              gradient="linear-gradient(135deg, rgba(59,130,246,0.3), rgba(139,92,246,0.2))"
            />
            <FeatureCard
              icon={Film}
              title="Cinematic by Design"
              description="Inspired by film scoring techniques — WizSound™ adds depth, warmth, and presence that makes your video sound like it was mixed in a professional studio."
              gradient="linear-gradient(135deg, rgba(236,72,153,0.3), rgba(217,70,239,0.2))"
            />
          </div>
        </div>

        {/* CTA */}
        <div
          className="text-center mt-12 transition-all duration-700 delay-500"
          style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(12px)" }}
        >
          <p className="text-white/30 text-xs mb-4">
            Select WizSound Cinematic at checkout · Only pay when you render
          </p>
          <a
            href="/onboarding"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-white transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              background: "linear-gradient(135deg, rgba(217,70,239,0.85), rgba(139,92,246,0.75))",
              boxShadow: "0 0 30px rgba(217,70,239,0.3)",
            }}
          >
            <Music2 className="w-4 h-4" />
            Try WizSound™ Free
            <ChevronRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
