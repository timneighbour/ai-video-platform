/**
 * WizSoundDemoPlayer — reusable three-tier audio comparison player
 * Tiers: Standard Audio | WizSound Active (+£1) | WizSound Spatial (+£3)
 * Uses the same three CDN-hosted demo tracks as WizSoundShowcase.
 * Can be embedded on Pricing page, WizSound product page, or any other page.
 */
import React, { useRef, useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useGlobalAudio } from "@/contexts/AudioContext";
import GraphicEqualiser from "@/components/GraphicEqualiser";

type Tier = "standard" | "enhanced" | "cinematic";

interface TierConfig {
  id: Tier;
  label: string;
  sublabel: string;
  price: string;
  tagline: string;
  badge?: string;
  colour: string;          // Tailwind gradient classes
  glowColour: string;      // CSS rgba for box-shadow
  accentHex: string;       // hex for inline styles
  specs: { label: string; value: string; bar: number }[];
  pipeline: string[];
  lufs: string;
  bars: number[];          // idle spectrum bar heights
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
  const [activeTier, setActiveTier] = useState<Tier>("cinematic");
  const [playingTier, setPlayingTier] = useState<Tier | null>(null);
  const [progress, setProgress] = useState<Record<Tier, number>>({ standard: 0, enhanced: 0, cinematic: 0 });
  const [duration, setDuration] = useState<Record<Tier, number>>({ standard: 0, enhanced: 0, cinematic: 0 });
  const [volume, setVolume] = useState(0.8);
  const [loaded, setLoaded] = useState<Record<Tier, boolean>>({ standard: false, enhanced: false, cinematic: false });
  const audioRefs = useRef<Record<Tier, HTMLAudioElement | null>>({ standard: null, enhanced: null, cinematic: null });
  const { isMuted, toggleMute: globalToggleMute, requestAudioFocus } = useGlobalAudio();
  const { data: previews } = trpc.render.getWizSoundPreviews.useQuery();

  const tier = TIERS.find(t => t.id === activeTier)!;
  const playingTierConfig = playingTier ? TIERS.find(t => t.id === playingTier) : null;

  /* ── Sync volume + mute ─────────────────────────────────────────── */
  useEffect(() => {
    (["standard", "enhanced", "cinematic"] as Tier[]).forEach(t => {
      const el = audioRefs.current[t];
      if (el) { el.volume = isMuted ? 0 : volume; el.muted = isMuted; }
    });
  }, [volume, isMuted]);

  /* ── Toggle playback ────────────────────────────────────────────── */
  const togglePlay = useCallback((t: Tier) => {
    const el = audioRefs.current[t];
    if (!el || !previews) return;

    if (playingTier === t) {
      el.pause();
      setPlayingTier(null);
    } else {
      (["standard", "enhanced", "cinematic"] as Tier[]).forEach(other => {
        const o = audioRefs.current[other];
        if (o && other !== t) { o.pause(); o.currentTime = 0; }
      });
      el.volume = isMuted ? 0 : volume;
      el.muted = isMuted;
      el.currentTime = 0;
      if (!isMuted) requestAudioFocus("wizsound-demo-player");
      el.play().catch(() => {});
      setPlayingTier(t);
      setActiveTier(t);
    }
  }, [playingTier, previews, isMuted, volume, requestAudioFocus]);

  /* ── Seek ───────────────────────────────────────────────────────── */
  const handleSeek = (t: Tier, pct: number) => {
    const el = audioRefs.current[t];
    if (el && el.duration > 0) { el.currentTime = (pct / 100) * el.duration; }
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  return (
    <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-[#07070a]"
      style={{ boxShadow: `0 0 80px ${tier.glowColour}, 0 0 20px rgba(0,0,0,0.8)` }}>

      {/* Hidden audio elements */}
      {previews && (["standard", "enhanced", "cinematic"] as Tier[]).map(t => (
        <audio
          key={t}
          ref={el => { audioRefs.current[t] = el; }}
          src={previews[t]}
          preload="auto"
          crossOrigin="anonymous"
          onLoadedMetadata={e => {
            const el = e.currentTarget;
            setDuration(d => ({ ...d, [t]: el.duration }));
            setLoaded(l => ({ ...l, [t]: true }));
          }}
          onTimeUpdate={e => {
            const el = e.currentTarget;
            if (el.duration > 0) setProgress(p => ({ ...p, [t]: (el.currentTime / el.duration) * 100 }));
          }}
          onEnded={() => { setPlayingTier(null); setProgress(p => ({ ...p, [t]: 0 })); }}
        />
      ))}

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
              onClick={() => setActiveTier(t.id)}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
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
            onClick={() => togglePlay(tier.id)}
            disabled={!previews || !loaded[tier.id]}
            className={`flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed ${
              playingTier === tier.id
                ? `bg-gradient-to-r ${tier.colour} text-white`
                : "bg-white/8 text-white/70 hover:bg-white/14 hover:text-white border border-white/15"
            }`}
            style={playingTier === tier.id ? { boxShadow: `0 0 20px ${tier.glowColour}` } : {}}
          >
            {!loaded[tier.id] && previews ? (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
              </svg>
            ) : playingTier === tier.id ? (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
              </svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
            )}
            {playingTier === tier.id ? "Pause" : "Preview"}
          </button>
        </div>

        {/* Visualiser / spectrum */}
        <div className="mb-3 h-14">
          {playingTier === tier.id && audioRefs.current[tier.id] ? (
            <GraphicEqualiser
              audioRef={{ current: audioRefs.current[tier.id] } as React.RefObject<HTMLAudioElement>}
              isPlaying={true}
              barCount={32}
              height={56}
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
              handleSeek(tier.id, ((e.clientX - rect.left) / rect.width) * 100);
            }}
          >
            <div
              className={`h-full bg-gradient-to-r ${tier.colour} rounded-full transition-all duration-150`}
              style={{ width: `${progress[tier.id]}%` }}
            />
            {/* Thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `calc(${progress[tier.id]}% - 6px)` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-white/25 mt-1 tabular-nums">
            <span>{fmt((progress[tier.id] / 100) * (duration[tier.id] || 0))}</span>
            <span>{duration[tier.id] ? fmt(duration[tier.id]) : "--:--"}</span>
          </div>
        </div>

        {/* Description */}
        <p className="text-white/40 text-xs leading-relaxed mb-5 border-l-2 pl-3" style={{ borderColor: tier.accentHex + "60" }}>
          {tier.description}
        </p>

        {/* Two-column: metrics + pipeline */}
        {!compact && (
          <div className="grid md:grid-cols-2 gap-4 border-t border-white/[0.06] pt-5">
            {/* Audio metrics */}
            <div>
              <h4 className="text-[10px] font-bold tracking-[0.18em] uppercase text-white/30 mb-3">Audio Metrics</h4>
              <div className="space-y-3">
                {tier.specs.map(spec => (
                  <div key={spec.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white/50">{spec.label}</span>
                      <span className="text-white font-medium tabular-nums">{spec.value}</span>
                    </div>
                    <div className="h-1 bg-white/8 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${tier.colour} rounded-full transition-all duration-700`}
                        style={{ width: `${spec.bar}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              {/* LUFS badge */}
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                <svg className="w-3 h-3 text-white/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
                  <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
                </svg>
                <span className="text-[10px] text-white/40">Target loudness:</span>
                <span className="text-[10px] font-semibold text-white">{tier.lufs}</span>
              </div>
            </div>

            {/* Processing pipeline */}
            <div>
              <h4 className="text-[10px] font-bold tracking-[0.18em] uppercase text-white/30 mb-3">Processing Pipeline</h4>
              <ol className="space-y-2.5">
                {tier.pipeline.map((step, i) => (
                  <li key={step} className="flex items-start gap-2.5">
                    <span
                      className={`flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-br ${tier.colour} text-white text-[10px] font-bold flex items-center justify-center mt-0.5`}
                    >
                      {i + 1}
                    </span>
                    <span className="text-xs text-white/60 leading-snug">{step}</span>
                  </li>
                ))}
              </ol>
              {tier.id === "cinematic" && (
                <div className="mt-4 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                  <p className="text-xs text-purple-300/80 leading-relaxed">
                    <span className="font-semibold text-purple-300">Streaming-ready.</span>{" "}
                    Cinema-grade spatial mastering at −14 LUFS — the standard used by Spotify, Apple Music, and YouTube.
                  </p>
                </div>
              )}
            </div>
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

      {/* Keyframes for idle spectrum */}
      <style>{`
        @keyframes specIdle1 { 0%,100%{transform:scaleY(0.7)} 50%{transform:scaleY(1.15)} }
        @keyframes specIdle2 { 0%,100%{transform:scaleY(0.5)} 50%{transform:scaleY(1.3)} }
        @keyframes specIdle3 { 0%,100%{transform:scaleY(0.8)} 50%{transform:scaleY(1.1)} }
      `}</style>
    </div>
  );
}
