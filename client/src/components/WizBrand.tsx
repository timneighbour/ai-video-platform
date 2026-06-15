/**
 * WizBrand — Shared brand component library
 * ==========================================
 * Provides consistent "Powered by" badges and animated tech-layer indicators
 * for WizCreate™, WizRender™, and WizSound™.
 *
 * Usage:
 *   <WizBrandBadge layer="create" />          // inline pill badge
 *   <WizBrandBadge layer="render" size="lg" /> // larger variant
 *   <WizBrandBadge layer="sound" />
 *   <WizBrandBanner layer="create" />          // full-width subtle banner
 *   <WizBrandProcessing layer="render" label="Building with WizRender™…" />
 *   <WizBrandPostBadge layer="sound" />        // post-render "Enhanced with" badge
 */

import { useEffect, useRef, useState } from "react";
import { Sparkles, Film, Music2, Cpu, Zap } from "@/lib/icons";

// ── Brand layer config ────────────────────────────────────────────────────────
export type WizLayer = "create" | "render" | "sound" | "pilot";

interface LayerConfig {
  name: string;        // e.g. "WizCreate™"
  verb: string;        // e.g. "Powered by"
  pastVerb: string;    // e.g. "Created with"
  processingLabel: string;
  tagline: string;
  colour: string;      // Tailwind colour token
  glow: string;        // box-shadow value
  Icon: React.FC<{ className?: string }>;
}

const LAYERS: Record<WizLayer, LayerConfig> = {
  create: {
    name: "WizCreate™",
    verb: "Powered by",
    pastVerb: "Created with",
    processingLabel: "Generating with WizCreate™…",
    tagline: "AI content generation",
    colour: "violet",
    glow: "0 0 12px rgba(139,92,246,0.45)",
    Icon: ({ className }) => <Sparkles className={className} />,
  },
  render: {
    name: "WizRender™",
    verb: "Building with",
    pastVerb: "Rendered with",
    processingLabel: "Building with WizRender™…",
    tagline: "Cinematic video building",
    colour: "purple",
    glow: "0 0 12px rgba(168,85,247,0.45)",
    Icon: ({ className }) => <Film className={className} />,
  },
  sound: {
    name: "WizSound™",
    verb: "Enhanced with",
    pastVerb: "Enhanced with",
    processingLabel: "Enhancing audio with WizSound™…",
    tagline: "Proprietary audio enhancement",
    colour: "indigo",
    glow: "0 0 12px rgba(99,102,241,0.45)",
    Icon: ({ className }) => <Music2 className={className} />,
  },
  pilot: {
    name: "WizScript",
    verb: "Automated by",
    pastVerb: "Automated by",
    processingLabel: "Automating with WizScript…",
    tagline: "Automated video production workflows",
    colour: "fuchsia",
    glow: "0 0 12px rgba(217,70,239,0.45)",
    Icon: ({ className }) => <Zap className={className} />,
  },
};

// ── Colour map (Tailwind doesn't support dynamic class names) ─────────────────
const colourMap: Record<WizLayer, { text: string; bg: string; border: string; ring: string }> = {
  create: {
    text: "text-[--color-gold]",
    bg: "bg-[--color-gold]/15",
    border: "border-[--color-gold]/30",
    ring: "ring-[--color-gold]/30",
  },
  render: {
    text: "text-[--color-gold]",
    bg: "bg-[--color-gold]/15",
    border: "border-[--color-gold]/30",
    ring: "ring-[--color-gold]/30",
  },
  sound: {
    text: "text-[--color-silver]",
    bg: "bg-[--color-silver]/10",
    border: "border-[--color-silver]/25",
    ring: "ring-[--color-silver]/30",
  },
  pilot: {
    text: "text-[--color-gold]",
    bg: "bg-[--color-gold]/15",
    border: "border-[--color-gold]/25",
    ring: "ring-[--color-gold]/30",
  },
};

// ── Animated waveform bars ────────────────────────────────────────────────────
function WaveformBars({ layer, active = true, bars = 5 }: { layer: WizLayer; active?: boolean; bars?: number }) {
  const heights = [3, 6, 9, 6, 3, 7, 4, 8, 5, 7];
  const c = colourMap[layer];
  return (
    <span className="inline-flex items-end gap-[2px] h-4" aria-hidden>
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className={`inline-block w-[3px] rounded-full ${c.text.replace("text-", "bg-")}`}
          style={{
            height: `${heights[i % heights.length]}px`,
            opacity: active ? 0.9 : 0.35,
            animation: active ? `wiz-wave ${0.6 + i * 0.12}s ease-in-out infinite alternate` : "none",
            animationDelay: `${i * 0.08}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes wiz-wave {
          from { transform: scaleY(0.4); }
          to   { transform: scaleY(1.0); }
        }
      `}</style>
    </span>
  );
}

// ── Animated glow dot ─────────────────────────────────────────────────────────
function GlowDot({ layer }: { layer: WizLayer }) {
  const c = colourMap[layer];
  return (
    <span className="relative inline-flex h-2 w-2 flex-shrink-0">
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${c.bg.replace("/10", "/60")} opacity-75`} />
      <span className={`relative inline-flex rounded-full h-2 w-2 ${c.bg.replace("/10", "")} ${c.border}`} />
    </span>
  );
}

// ── WizBrandBadge — inline pill ───────────────────────────────────────────────
interface WizBrandBadgeProps {
  layer: WizLayer;
  size?: "sm" | "md" | "lg";
  animated?: boolean;
  className?: string;
}

export function WizBrandBadge({ layer, size = "md", animated = false, className = "" }: WizBrandBadgeProps) {
  const cfg = LAYERS[layer];
  const c   = colourMap[layer];
  const { Icon } = cfg;

  const sizeClasses = {
    sm: "text-[9px] px-1.5 py-0.5 gap-1",
    md: "text-[10px] px-2 py-0.5 gap-1.5",
    lg: "text-xs px-2.5 py-1 gap-2",
  }[size];

  const iconSize = { sm: "w-2.5 h-2.5", md: "w-3 h-3", lg: "w-3.5 h-3.5" }[size];

  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold tracking-wider uppercase ${c.text} ${c.bg} ${c.border} ${sizeClasses} ${className}`}
      style={{ boxShadow: LAYERS[layer].glow }}
    >
      <Icon className={iconSize} />
      <span>{cfg.verb} {cfg.name}</span>
      {animated && <WaveformBars layer={layer} bars={4} />}
    </span>
  );
}

// ── WizBrandBanner — subtle full-width strip ──────────────────────────────────
interface WizBrandBannerProps {
  layer: WizLayer;
  className?: string;
}

export function WizBrandBanner({ layer, className = "" }: WizBrandBannerProps) {
  const cfg = LAYERS[layer];
  const c   = colourMap[layer];
  const { Icon } = cfg;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${c.bg} ${c.border} ${className}`}
    >
      <Icon className={`w-3.5 h-3.5 ${c.text} flex-shrink-0`} />
      <span className={`text-[10px] font-bold uppercase tracking-widest ${c.text}`}>
        {cfg.verb} {cfg.name}
      </span>
      <span className={`text-[9px] ${c.text} opacity-60 ml-auto`}>{cfg.tagline}</span>
    </div>
  );
}

// ── WizBrandProcessing — animated processing state ────────────────────────────
interface WizBrandProcessingProps {
  layer: WizLayer;
  label?: string;
  className?: string;
}

export function WizBrandProcessing({ layer, label, className = "" }: WizBrandProcessingProps) {
  const cfg = LAYERS[layer];
  const c   = colourMap[layer];
  const { Icon } = cfg;
  const displayLabel = label ?? cfg.processingLabel;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${c.bg} border ${c.border}`}
        style={{ boxShadow: LAYERS[layer].glow }}
      >
        <Icon className={`w-3.5 h-3.5 ${c.text}`} />
      </div>
      <div className="flex flex-col min-w-0">
        <span className={`text-xs font-semibold ${c.text} leading-tight`}>{displayLabel}</span>
        <span className="text-[10px] text-white/30 leading-tight">{cfg.tagline}</span>
      </div>
      <WaveformBars layer={layer} bars={6} active />
    </div>
  );
}

// ── WizBrandPostBadge — post-render "Enhanced with" badge ─────────────────────
interface WizBrandPostBadgeProps {
  layer: WizLayer;
  className?: string;
}

export function WizBrandPostBadge({ layer, className = "" }: WizBrandPostBadgeProps) {
  const cfg = LAYERS[layer];
  const c   = colourMap[layer];
  const { Icon } = cfg;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-semibold tracking-wide ${c.text} ${c.bg} ${c.border} ${className}`}
      style={{ boxShadow: LAYERS[layer].glow }}
    >
      <Icon className="w-3 h-3" />
      {cfg.pastVerb} {cfg.name}
    </span>
  );
}

// ── WizBrandProcessingOverlay — full-screen processing overlay ────────────────
interface WizBrandProcessingOverlayProps {
  layer: WizLayer;
  visible: boolean;
  stages: { label: string; done: boolean; active: boolean }[];
  title?: string;
  subtitle?: string;
}

export function WizBrandProcessingOverlay({
  layer, visible, stages, title, subtitle,
}: WizBrandProcessingOverlayProps) {
  const cfg = LAYERS[layer];
  const c   = colourMap[layer];
  const { Icon } = cfg;

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 backdrop-blur-sm">
      <div className="w-full max-w-md px-6 text-center">
        {/* Animated icon */}
        <div className="relative mb-6 flex items-center justify-center">
          <div
            className={`absolute w-28 h-28 rounded-full ${c.bg} animate-ping`}
            style={{ animationDuration: "2.5s" }}
          />
          <div
            className={`relative w-20 h-20 rounded-full flex items-center justify-center ${c.bg} border-2 ${c.border}`}
            style={{ boxShadow: LAYERS[layer].glow }}
          >
            <Icon className={`w-9 h-9 ${c.text}`} />
          </div>
        </div>

        {/* WizBrand badge */}
        <div className="flex justify-center mb-3">
          <WizBrandBadge layer={layer} size="md" animated />
        </div>

        {title && <h2 className="text-2xl font-bold text-white mb-1">{title}</h2>}
        {subtitle && <p className="text-muted-foreground text-sm mb-8">{subtitle}</p>}

        {/* Stage list */}
        <div className="space-y-2 text-left mt-6">
          {stages.map((s, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border transition-all ${
                s.done
                  ? "bg-[--color-silver]/5 border-[--color-silver]/20"
                  : s.active
                  ? `${c.bg} ${c.border}`
                  : "bg-card/50 border-border/50"
              }`}
            >
              {s.done ? (
                <svg className="w-4 h-4 text-[--color-silver] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : s.active ? (
                <svg className={`w-4 h-4 ${c.text} shrink-0 animate-spin`} fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <div className="w-4 h-4 rounded-full border border-border/70 shrink-0" />
              )}
              <span className={`text-sm font-medium ${
                s.done ? "text-[--color-silver]" : s.active ? "text-white" : "text-muted-foreground/70"
              }`}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
