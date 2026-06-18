/**
 * AudioMetricsPanel — real-time audio metrics display driven by Web Audio API.
 *
 * Computes four metrics from a live AnalyserNode:
 *   • Stereo Width     — mid/side energy ratio (requires stereo analyser)
 *   • Dynamic Range    — peak-to-RMS ratio in dB
 *   • Loudness (LUFS)  — RMS-based LUFS approximation
 *   • Frequency Balance — high-to-low frequency energy ratio (brightness)
 *
 * When isPlaying=false, shows the static "expected" values for the active tier.
 * When isPlaying=true, shows live computed values that update at ~15fps.
 *
 * Usage:
 *   <AudioMetricsPanel
 *     analyser={analyserNode}
 *     analyserL={leftChannelAnalyser}   // optional, for stereo width
 *     analyserR={rightChannelAnalyser}  // optional, for stereo width
 *     isPlaying={isPlaying}
 *     tier="standard" | "enhanced" | "cinematic"
 *     accentHex="#9b59b6"
 *   />
 */

import { useRef, useEffect, useState } from "react";

type Tier = "standard" | "enhanced" | "cinematic";

interface AudioMetricsPanelProps {
  /** Main AnalyserNode from the DSP chain output */
  analyser: AnalyserNode | null;
  /** Optional left-channel AnalyserNode for stereo width measurement */
  analyserL?: AnalyserNode | null;
  /** Optional right-channel AnalyserNode for stereo width measurement */
  analyserR?: AnalyserNode | null;
  isPlaying: boolean;
  tier: Tier;
  accentHex?: string;
  className?: string;
}

interface Metrics {
  stereoWidth: number;      // 0–100 %
  dynamicRange: number;     // 0–100 (mapped from dB)
  loudness: number;         // 0–100 (mapped from LUFS)
  freqBalance: number;      // 0–100 (brightness)
  stereoWidthLabel: string;
  dynamicRangeLabel: string;
  loudnessLabel: string;
  freqBalanceLabel: string;
}

// Static "expected" values shown when not playing
const STATIC_METRICS: Record<Tier, Metrics> = {
  standard: {
    stereoWidth: 50, dynamicRange: 55, loudness: 40, freqBalance: 50,
    stereoWidthLabel: "100%", dynamicRangeLabel: "Original", loudnessLabel: "Varies", freqBalanceLabel: "Flat",
  },
  enhanced: {
    stereoWidth: 72, dynamicRange: 65, loudness: 68, freqBalance: 68,
    stereoWidthLabel: "×2.5", dynamicRangeLabel: "Compressed", loudnessLabel: "−16 LUFS", freqBalanceLabel: "Warm",
  },
  cinematic: {
    stereoWidth: 95, dynamicRange: 88, loudness: 82, freqBalance: 88,
    stereoWidthLabel: "×3.5 + Haas", dynamicRangeLabel: "Pro mastered", loudnessLabel: "−14 LUFS", freqBalanceLabel: "Bright",
  },
};

const METRIC_LABELS: Record<Tier, { stereoWidth: string; dynamicRange: string; loudness: string; freqBalance: string }> = {
  standard: { stereoWidth: "100%", dynamicRange: "Original", loudness: "Varies", freqBalance: "Flat" },
  enhanced: { stereoWidth: "×2.5", dynamicRange: "Compressed", loudness: "−16 LUFS", freqBalance: "Warm" },
  cinematic: { stereoWidth: "×3.5 + Haas", dynamicRange: "Pro mastered", loudness: "−14 LUFS", freqBalance: "Bright" },
};

function computeMetrics(
  analyser: AnalyserNode,
  analyserL?: AnalyserNode | null,
  analyserR?: AnalyserNode | null,
): Omit<Metrics, "stereoWidthLabel" | "dynamicRangeLabel" | "loudnessLabel" | "freqBalanceLabel"> {
  const bufLen = analyser.frequencyBinCount;
  const freqData = new Uint8Array(bufLen);
  const timeData = new Float32Array(analyser.fftSize);

  analyser.getByteFrequencyData(freqData);
  analyser.getFloatTimeDomainData(timeData);

  // ── Loudness (LUFS approximation from RMS) ──────────────────────────
  let sumSq = 0;
  for (let i = 0; i < timeData.length; i++) sumSq += timeData[i] * timeData[i];
  const rms = Math.sqrt(sumSq / timeData.length);
  const rmsDb = rms > 0 ? 20 * Math.log10(rms) : -70;
  // Map −70 dBFS → 0, −6 dBFS → 100
  const loudness = Math.max(0, Math.min(100, ((rmsDb + 70) / 64) * 100));

  // ── Peak ─────────────────────────────────────────────────────────────
  let peak = 0;
  for (let i = 0; i < timeData.length; i++) {
    const abs = Math.abs(timeData[i]);
    if (abs > peak) peak = abs;
  }
  const peakDb = peak > 0 ? 20 * Math.log10(peak) : -70;

  // ── Dynamic Range (peak-to-RMS ratio) ────────────────────────────────
  const drDb = peakDb - rmsDb; // higher = more dynamic
  // Map 0 dB (fully compressed) → 0, 30 dB (very dynamic) → 100
  const dynamicRange = Math.max(0, Math.min(100, 100 - (drDb / 30) * 100));

  // ── Frequency Balance (high vs low energy) ───────────────────────────
  const lowEnd = Math.floor(bufLen * 0.15);   // 0–15% = bass
  const highStart = Math.floor(bufLen * 0.55); // 55–100% = treble
  let lowSum = 0, highSum = 0;
  for (let i = 0; i < lowEnd; i++) lowSum += freqData[i];
  for (let i = highStart; i < bufLen; i++) highSum += freqData[i];
  const lowAvg = lowSum / lowEnd || 1;
  const highAvg = highSum / (bufLen - highStart) || 0;
  const brightness = highAvg / lowAvg;
  // Map 0 (dark) → 20, 1.5 (bright) → 100
  const freqBalance = Math.max(0, Math.min(100, 20 + (brightness / 1.5) * 80));

  // ── Stereo Width (L vs R channel difference) ─────────────────────────
  let stereoWidth = 50; // default if no stereo analysers
  if (analyserL && analyserR) {
    const lData = new Uint8Array(analyserL.frequencyBinCount);
    const rData = new Uint8Array(analyserR.frequencyBinCount);
    analyserL.getByteFrequencyData(lData);
    analyserR.getByteFrequencyData(rData);

    let midEnergy = 0, sideEnergy = 0;
    const len = Math.min(lData.length, rData.length);
    for (let i = 0; i < len; i++) {
      const mid = (lData[i] + rData[i]) / 2;
      const side = Math.abs(lData[i] - rData[i]);
      midEnergy += mid;
      sideEnergy += side;
    }
    const widthRatio = midEnergy > 0 ? sideEnergy / midEnergy : 0;
    // Map 0 (mono) → 0, 0.8 (wide) → 100
    stereoWidth = Math.max(0, Math.min(100, (widthRatio / 0.8) * 100));
  } else {
    // Estimate from frequency spread when no stereo analysers available
    // Use variance of frequency bins as a proxy for perceived width
    let mean = 0;
    for (let i = 0; i < bufLen; i++) mean += freqData[i];
    mean /= bufLen;
    let variance = 0;
    for (let i = 0; i < bufLen; i++) variance += (freqData[i] - mean) ** 2;
    variance /= bufLen;
    stereoWidth = Math.max(0, Math.min(100, Math.sqrt(variance) / 80 * 100));
  }

  return { stereoWidth, dynamicRange, loudness, freqBalance };
}

// Animated bar with smooth transition
function MetricBar({
  value,
  accentHex,
  animate,
}: {
  value: number;
  accentHex: string;
  animate: boolean;
}) {
  return (
    <div className="h-[3px] bg-white/8 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full"
        style={{
          width: `${value}%`,
          background: `linear-gradient(90deg, ${accentHex}88, ${accentHex})`,
          transition: animate ? "width 0.12s ease-out" : "width 0.6s ease-in-out",
          boxShadow: value > 60 ? `0 0 6px ${accentHex}66` : "none",
        }}
      />
    </div>
  );
}

export default function AudioMetricsPanel({
  analyser,
  analyserL,
  analyserR,
  isPlaying,
  tier,
  accentHex = "#9b59b6",
  className = "",
}: AudioMetricsPanelProps) {
  const [metrics, setMetrics] = useState<Metrics>(STATIC_METRICS[tier]);
  const rafRef = useRef<number>(0);
  const frameCountRef = useRef(0);

  // Update static metrics immediately when tier changes (while not playing)
  useEffect(() => {
    if (!isPlaying) {
      setMetrics(STATIC_METRICS[tier]);
    }
  }, [tier, isPlaying]);

  // Live metrics loop — runs at ~15fps (every 4 animation frames)
  useEffect(() => {
    if (!isPlaying || !analyser) {
      cancelAnimationFrame(rafRef.current);
      return;
    }

    const labels = METRIC_LABELS[tier];

    const tick = () => {
      frameCountRef.current++;
      // Update at ~15fps to avoid excessive re-renders
      if (frameCountRef.current % 4 === 0) {
        const computed = computeMetrics(analyser, analyserL, analyserR);
        setMetrics({
          ...computed,
          stereoWidthLabel: labels.stereoWidth,
          dynamicRangeLabel: labels.dynamicRange,
          loudnessLabel: labels.loudness,
          freqBalanceLabel: labels.freqBalance,
        });
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, analyser, analyserL, analyserR, tier]);

  const metricItems = [
    {
      label: "Stereo Width",
      value: metrics.stereoWidth,
      displayValue: isPlaying
        ? `${Math.round(metrics.stereoWidth)}%`
        : metrics.stereoWidthLabel,
      icon: (
        <svg viewBox="0 0 20 20" fill="none" className="w-3.5 h-3.5 opacity-60" stroke="currentColor" strokeWidth="1.5">
          <path d="M2 10h16M2 10l4-4M2 10l4 4M18 10l-4-4M18 10l-4 4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
    {
      label: "Dynamic Range",
      value: metrics.dynamicRange,
      displayValue: isPlaying
        ? `${Math.round(metrics.dynamicRange)}%`
        : metrics.dynamicRangeLabel,
      icon: (
        <svg viewBox="0 0 20 20" fill="none" className="w-3.5 h-3.5 opacity-60" stroke="currentColor" strokeWidth="1.5">
          <path d="M2 14V6l4 4 4-6 4 4 4-2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
    {
      label: "Loudness (LUFS)",
      value: metrics.loudness,
      displayValue: isPlaying
        ? `${(((metrics.loudness / 100) * 64) - 70).toFixed(1)} LUFS`
        : metrics.loudnessLabel,
      icon: (
        <svg viewBox="0 0 20 20" fill="none" className="w-3.5 h-3.5 opacity-60" stroke="currentColor" strokeWidth="1.5">
          <path d="M4 14V6M7 14V9M10 14V4M13 14V8M16 14V11" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      label: "Frequency Balance",
      value: metrics.freqBalance,
      displayValue: isPlaying
        ? `${Math.round(metrics.freqBalance)}%`
        : metrics.freqBalanceLabel,
      icon: (
        <svg viewBox="0 0 20 20" fill="none" className="w-3.5 h-3.5 opacity-60" stroke="currentColor" strokeWidth="1.5">
          <path d="M2 10 Q5 4 8 10 Q11 16 14 10 Q17 4 18 10" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
  ];

  return (
    <div
      className={`rounded-xl border border-white/8 bg-white/3 backdrop-blur-sm overflow-hidden ${className}`}
      style={{ borderColor: `${accentHex}22` }}
    >
      {/* Header */}
      <div
        className="px-4 py-2.5 flex items-center justify-between border-b border-white/6"
        style={{ background: `linear-gradient(90deg, ${accentHex}12, transparent)` }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: accentHex,
              boxShadow: isPlaying ? `0 0 6px ${accentHex}` : "none",
              animation: isPlaying ? "pulse 1.5s ease-in-out infinite" : "none",
            }}
          />
          <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-white/50">
            Audio Metrics
          </span>
        </div>
        <span
          className="text-[9px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full border"
          style={{
            color: accentHex,
            borderColor: `${accentHex}44`,
            background: `${accentHex}11`,
          }}
        >
          {isPlaying ? "Live" : "Preview"}
        </span>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-px bg-white/4">
        {metricItems.map((item) => (
          <div
            key={item.label}
            className="bg-[#07070a] px-4 py-3 flex flex-col gap-2"
          >
            {/* Label row */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-white/40">
                {item.icon}
                <span className="text-[10px] font-medium tracking-wide uppercase">
                  {item.label}
                </span>
              </div>
              <span
                className="text-[11px] font-bold tabular-nums"
                style={{ color: isPlaying ? accentHex : "rgba(255,255,255,0.7)" }}
              >
                {item.displayValue}
              </span>
            </div>
            {/* Animated bar */}
            <MetricBar
              value={item.value}
              accentHex={accentHex}
              animate={isPlaying}
            />
          </div>
        ))}
      </div>

      {/* Processing pipeline strip */}
      <div className="px-4 py-2 flex items-center gap-2 border-t border-white/6 overflow-x-auto scrollbar-none">
        <span className="text-[9px] font-bold tracking-wider uppercase text-white/25 flex-shrink-0">
          Pipeline
        </span>
        {tier === "standard" && (
          <>
            <PipelineStep label="Original file" accent={accentHex} />
            <PipelineArrow />
            <PipelineStep label="Format conversion" accent={accentHex} />
            <PipelineArrow />
            <PipelineStep label="Stereo output" accent={accentHex} />
          </>
        )}
        {tier === "enhanced" && (
          <>
            <PipelineStep label="M/S widening ×2.5" accent={accentHex} />
            <PipelineArrow />
            <PipelineStep label="3-band EQ" accent={accentHex} />
            <PipelineArrow />
            <PipelineStep label="Compression" accent={accentHex} />
            <PipelineArrow />
            <PipelineStep label="−16 LUFS" accent={accentHex} />
          </>
        )}
        {tier === "cinematic" && (
          <>
            <PipelineStep label="Haas widening" accent={accentHex} />
            <PipelineArrow />
            <PipelineStep label="5-band EQ" accent={accentHex} />
            <PipelineArrow />
            <PipelineStep label="Reverb 8%" accent={accentHex} />
            <PipelineArrow />
            <PipelineStep label="−14 LUFS" accent={accentHex} />
          </>
        )}
      </div>
    </div>
  );
}

function PipelineStep({ label, accent }: { label: string; accent: string }) {
  return (
    <span
      className="text-[9px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
      style={{ color: accent, background: `${accent}18`, border: `1px solid ${accent}30` }}
    >
      {label}
    </span>
  );
}

function PipelineArrow() {
  return (
    <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 opacity-25 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 6h8M7 3l3 3-3 3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
