import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useGlobalAudio } from "@/contexts/AudioContext";
import GraphicEqualiser from "@/components/GraphicEqualiser";

/* ── Types ─────────────────────────────────────────────────────────── */
type Tier = "standard" | "enhanced" | "cinematic";

/* ── Tier data ──────────────────────────────────────────────────────── */
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
} [] = [
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
    colour: "from-violet-600 to-purple-500",
    glow: "rgba(139,92,246,0.4)",
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
    colour: "from-fuchsia-600 to-pink-500",
    glow: "rgba(217,70,239,0.45)",
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

/* ── Animated spectrum bars ─────────────────────────────────────────── */
function SpectrumBars({ bars, colour, playing }: { bars: number[]; colour: string; playing: boolean }) {
  return (
    <div className="flex items-end gap-[2px] h-14 w-full" aria-hidden="true">
      {bars.map((h, i) => (
        <div
          key={i}
          className={`flex-1 rounded-sm bg-gradient-to-t ${colour} opacity-80`}
          style={{
            height: playing ? `${h * 1.8}px` : `${h * 0.9}px`,
            maxHeight: "100%",
            transition: `height ${0.12 + (i % 5) * 0.04}s ease-in-out`,
            animation: playing
              ? `specBar${(i % 5) + 1} ${0.5 + (i % 7) * 0.08}s ease-in-out ${i * 0.02}s infinite alternate`
              : "none",
          }}
        />
      ))}
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────────── */
export default function WizSoundShowcase() {
  const [activeTier, setActiveTier] = useState<Tier>("cinematic");
  const [playingTier, setPlayingTier] = useState<Tier | null>(null);
  const [previewProgress, setPreviewProgress] = useState<Record<Tier, number>>({
    standard: 0, enhanced: 0, cinematic: 0,
  });
  const [volume, setVolume] = useState(0.8);
  const { isMuted, toggleMute: globalToggleMute, requestAudioFocus } = useGlobalAudio();
  const audioRefs = useRef<Record<Tier, HTMLAudioElement | null>>({
    standard: null, enhanced: null, cinematic: null,
  });

  const { data: previews } = trpc.render.getWizSoundPreviews.useQuery();

  const tier = TIERS.find((t) => t.id === activeTier)!;

  /* ── Sync volume + global mute ─────────────────────────────────── */
  useEffect(() => {
    (["standard", "enhanced", "cinematic"] as Tier[]).forEach((t) => {
      const el = audioRefs.current[t];
      if (el) {
        el.volume = isMuted ? 0 : volume;
        el.muted = isMuted;
      }
    });
  }, [volume, isMuted]);

  /* ── Toggle preview playback ──────────────────────────────────────── */
  const togglePlay = (t: Tier) => {
    const el = audioRefs.current[t];
    if (!el || !previews) return;

    if (playingTier === t) {
      el.pause();
      setPlayingTier(null);
    } else {
      // Stop any currently playing
      (["standard", "enhanced", "cinematic"] as Tier[]).forEach((other) => {
        const o = audioRefs.current[other];
        if (o && other !== t) { o.pause(); o.currentTime = 0; }
      });
      el.volume = isMuted ? 0 : volume;
      el.muted = isMuted;
      el.currentTime = 0;
      if (!isMuted) requestAudioFocus("wizsound-showcase");
      el.play().catch(() => {});
      setPlayingTier(t);
      setActiveTier(t);
    }
  };

  return (
    <section className="py-20 px-4 relative overflow-hidden" aria-labelledby="wizsound-showcase-heading">
      {/* Hidden audio elements */}
      {previews && (["standard", "enhanced", "cinematic"] as Tier[]).map((t) => (
        <audio
          key={t}
          ref={(el) => { audioRefs.current[t] = el; }}
          src={previews[t]}
          preload="auto"
          onTimeUpdate={(e) => {
            const el = e.currentTarget;
            if (el.duration > 0) {
              setPreviewProgress((p) => ({ ...p, [t]: (el.currentTime / el.duration) * 100 }));
            }
          }}
          onEnded={() => {
            setPlayingTier(null);
            setPreviewProgress((p) => ({ ...p, [t]: 0 }));
          }}
        />
      ))}

      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 40%, ${tier.glow} 0%, transparent 65%)`,
          transition: "background 600ms ease",
        }}
      />

      <div className="max-w-5xl mx-auto relative">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-xs font-medium tracking-widest uppercase mb-4">
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
            <span
              style={{
                background: "linear-gradient(90deg, #a78bfa, #e879f9)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              WizSound™
            </span>
          </h2>
          <p className="text-white/50 text-base max-w-xl mx-auto">
            Proprietary spatial audio engine built into every render. Cinema-grade immersive sound — select a tier to explore the pipeline.
          </p>
        </div>

        {/* Tier selector tabs */}
        <div className="flex justify-center gap-2 mb-10 flex-wrap">
          {TIERS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTier(t.id)}
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
                  <span className="ml-2 text-[10px] font-bold bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30 px-2 py-0.5 rounded-full">
                    {tier.badge}
                  </span>
                )}
                <p className="text-white/40 text-xs mt-0.5">{tier.tagline}</p>
              </div>
              {/* Preview play button */}
              <button
                onClick={() => togglePlay(tier.id)}
                disabled={!previews}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  playingTier === tier.id
                    ? `bg-gradient-to-r ${tier.colour} text-white`
                    : "bg-white/8 text-white/60 hover:bg-white/14 hover:text-white border border-white/10"
                }`}
                style={playingTier === tier.id ? { boxShadow: `0 0 16px ${tier.glow}` } : {}}
              >
                {playingTier === tier.id ? (
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
            {playingTier === tier.id && audioRefs.current[tier.id] ? (
              <GraphicEqualiser
                audioRef={{ current: audioRefs.current[tier.id] } as React.RefObject<HTMLAudioElement>}
                isPlaying={true}
                barCount={32}
                height={36}
              />
            ) : (
              <SpectrumBars bars={tier.bars} colour={tier.colour} playing={false} />
            )}

            {/* Progress bar (only when playing) */}
            {playingTier === tier.id && (
              <div className="mt-2 h-[2px] bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${tier.colour} rounded-full transition-all duration-200`}
                  style={{ width: `${previewProgress[tier.id]}%` }}
                />
              </div>
            )}
          </div>

          {/* Two-column: specs + pipeline */}
          <div className="grid md:grid-cols-2 gap-0 border-t border-white/8">
            {/* Left: audio metrics */}
            <div className="p-8 border-r border-white/8">
              <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-5">Audio Metrics</h3>
              <div className="space-y-4">
                {tier.specs.map((spec) => (
                  <div key={spec.label}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-white/60">{spec.label}</span>
                      <span className="text-white font-medium">{spec.value}</span>
                    </div>
                    <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${tier.colour} rounded-full transition-all duration-700`}
                        style={{ width: `${spec.bar}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* LUFS badge */}
              <div className="mt-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                <svg className="w-3.5 h-3.5 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
                  <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
                </svg>
                <span className="text-xs text-white/50">Target loudness:</span>
                <span className="text-xs font-semibold text-white">{tier.lufs}</span>
              </div>
            </div>

            {/* Right: processing pipeline */}
            <div className="p-8">
              <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-5">Processing Pipeline</h3>
              <ol className="space-y-3">
                {tier.pipeline.map((step, i) => (
                  <li key={step} className="flex items-start gap-3">
                    <span
                      className={`flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-br ${tier.colour} text-white text-[10px] font-bold flex items-center justify-center mt-0.5`}
                    >
                      {i + 1}
                    </span>
                    <span className="text-sm text-white/70 leading-snug">{step}</span>
                  </li>
                ))}
              </ol>

              {/* Streaming compatibility note for Cinematic */}
              {tier.id === "cinematic" && (
                <div className="mt-6 p-3 rounded-lg bg-fuchsia-500/8 border border-fuchsia-500/20">
                  <p className="text-xs text-fuchsia-300/80 leading-relaxed">
                    <span className="font-semibold text-fuchsia-300">Spatial + Streaming ready.</span>{" "}
                    Cinema-grade spatial mastering normalised to −14 LUFS — the loudness standard used by Spotify, Apple Music, and YouTube. Dolby Cinema-inspired immersive depth.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Volume control footer */}
          <div className="px-8 py-4 border-t border-white/8 flex items-center gap-3">
            <button
              onClick={() => { if (isMuted) { requestAudioFocus("wizsound-showcase"); } globalToggleMute(); }}
              className="text-white/40 hover:text-white/70 transition-colors"
              aria-label={isMuted ? "Unmute preview" : "Mute preview"}
            >
              {isMuted ? (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
                </svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                </svg>
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
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
                    className={`px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider ${
                      activeTier === t.id ? "text-white" : "text-white/40"
                    }`}
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
                  <td className={`px-4 py-3 text-center ${activeTier === "enhanced" ? "text-violet-300 font-medium" : "text-white/40"}`}>{enh}</td>
                  <td className={`px-4 py-3 text-center ${activeTier === "cinematic" ? "text-fuchsia-300 font-medium" : "text-white/40"}`}>{cin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Keyframes for spectrum bars */}
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
