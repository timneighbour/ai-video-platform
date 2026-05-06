/**
 * LyricTimelineBar — horizontal song structure timeline
 *
 * Displays a visual arc of the full song showing:
 * - Section labels (Intro, Verse, Chorus, Bridge, Outro)
 * - Timestamps per scene
 * - Emotional intensity gradient
 * - Active scene highlight during render
 */

import React, { useMemo } from "react";

interface SceneEntry {
  id: number;
  index: number;
  lyrics?: string | null;
  prompt?: string;
  startTime?: number | null; // seconds
  endTime?: number | null;   // seconds
  status?: string;
}

interface LyricTimelineBarProps {
  scenes: SceneEntry[];
  totalDuration?: number; // seconds, optional — inferred from scenes if not provided
  activeSceneId?: number | null;
  onSceneClick?: (sceneId: number) => void;
  className?: string;
}

const SECTION_COLORS: Record<string, { bg: string; text: string; border: string; intensity: number }> = {
  Intro:         { bg: "rgba(99,102,241,0.18)",  text: "#a5b4fc", border: "rgba(99,102,241,0.35)",  intensity: 0.3 },
  Verse:         { bg: "rgba(20,184,166,0.14)",  text: "#5eead4", border: "rgba(20,184,166,0.30)",  intensity: 0.5 },
  "Pre-Chorus":  { bg: "rgba(245,158,11,0.14)",  text: "#fcd34d", border: "rgba(245,158,11,0.30)",  intensity: 0.65 },
  Chorus:        { bg: "rgba(212,168,67,0.22)",  text: "#fde68a", border: "rgba(212,168,67,0.45)",  intensity: 1.0 },
  Drop:          { bg: "rgba(239,68,68,0.18)",   text: "#fca5a5", border: "rgba(239,68,68,0.35)",   intensity: 1.0 },
  Bridge:        { bg: "rgba(168,85,247,0.18)",  text: "#d8b4fe", border: "rgba(168,85,247,0.35)",  intensity: 0.7 },
  Instrumental:  { bg: "rgba(148,163,184,0.12)", text: "#94a3b8", border: "rgba(148,163,184,0.25)", intensity: 0.4 },
  Outro:         { bg: "rgba(99,102,241,0.12)",  text: "#a5b4fc", border: "rgba(99,102,241,0.25)",  intensity: 0.2 },
  "":            { bg: "rgba(255,255,255,0.06)", text: "#9ca3af", border: "rgba(255,255,255,0.12)", intensity: 0.4 },
};

function inferSectionType(lyrics?: string | null, prompt?: string): string {
  const text = ((lyrics ?? "") + " " + (prompt ?? "")).toLowerCase();
  if (text.includes("[intro]") || text.includes("intro")) return "Intro";
  if (text.includes("[outro]") || text.includes("outro") || text.includes("fade out")) return "Outro";
  if (text.includes("[bridge]") || text.includes("bridge")) return "Bridge";
  if (text.includes("[chorus]") || text.includes("chorus") || text.includes("hook")) return "Chorus";
  if (text.includes("[pre-chorus]") || text.includes("pre-chorus") || text.includes("pre chorus")) return "Pre-Chorus";
  if (text.includes("[drop]") || text.includes("drop")) return "Drop";
  if (text.includes("[verse]") || text.includes("verse")) return "Verse";
  if (text.includes("[instrumental]") || text.includes("instrumental") || text.includes("solo")) return "Instrumental";
  return "";
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function LyricTimelineBar({
  scenes,
  totalDuration,
  activeSceneId,
  onSceneClick,
  className = "",
}: LyricTimelineBarProps) {
  const sortedScenes = useMemo(
    () => [...scenes].sort((a, b) => (a.index ?? 0) - (b.index ?? 0)),
    [scenes]
  );

  const duration = useMemo(() => {
    if (totalDuration) return totalDuration;
    const last = sortedScenes[sortedScenes.length - 1];
    if (last?.endTime) return last.endTime;
    // Estimate: assume 8s per scene
    return sortedScenes.length * 8;
  }, [sortedScenes, totalDuration]);

  const enriched = useMemo(() =>
    sortedScenes.map((scene, i) => {
      const section = inferSectionType(scene.lyrics, scene.prompt);
      const start = scene.startTime ?? i * 8;
      const end = scene.endTime ?? (i + 1) * 8;
      const widthPct = ((end - start) / duration) * 100;
      const leftPct = (start / duration) * 100;
      const colors = SECTION_COLORS[section] ?? SECTION_COLORS[""];
      return { ...scene, section, start, end, widthPct, leftPct, colors };
    }),
    [sortedScenes, duration]
  );

  if (sortedScenes.length === 0) return null;

  return (
    <div className={`w-full select-none ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2 px-0.5">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold tracking-[0.25em] uppercase text-white/30">Song Structure</span>
          <span className="text-[9px] text-white/20">·</span>
          <span className="text-[9px] text-white/25">{sortedScenes.length} scenes</span>
        </div>
        <span className="text-[9px] text-white/25">{formatTime(duration)}</span>
      </div>

      {/* Emotional intensity arc */}
      <div className="relative h-1 w-full rounded-full overflow-hidden mb-1.5" style={{ background: "rgba(255,255,255,0.05)" }}>
        {enriched.map((scene) => (
          <div
            key={scene.id}
            className="absolute top-0 h-full transition-all duration-300"
            style={{
              left: `${scene.leftPct}%`,
              width: `${scene.widthPct}%`,
              background: scene.colors.bg.replace("0.18", String(scene.colors.intensity * 0.6)).replace("0.22", String(scene.colors.intensity * 0.6)),
              borderRight: "1px solid rgba(0,0,0,0.4)",
            }}
          />
        ))}
        {/* Intensity gradient overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(to right, ${enriched.map((s, i) => {
              const pct = s.leftPct + s.widthPct / 2;
              const alpha = s.colors.intensity * 0.9;
              return `${s.colors.text.replace("#", "rgba(").replace(/(.{2})(.{2})(.{2})/, (_, r, g, b) =>
                `${parseInt(r, 16)},${parseInt(g, 16)},${parseInt(b, 16)}`)} ${alpha}) ${pct}%`;
            }).join(", ")})`,
            mixBlendMode: "screen",
            opacity: 0.5,
          }}
        />
      </div>

      {/* Timeline segments */}
      <div className="relative h-8 w-full">
        {enriched.map((scene) => {
          const isActive = scene.id === activeSceneId;
          const isCompleted = scene.status === "completed";
          const isFailed = scene.status === "failed";
          return (
            <button
              key={scene.id}
              className="absolute top-0 h-full flex items-center justify-center overflow-hidden transition-all duration-200 group"
              style={{
                left: `${scene.leftPct}%`,
                width: `${scene.widthPct}%`,
                background: isActive
                  ? scene.colors.bg.replace(/0\.\d+\)$/, "0.35)")
                  : scene.colors.bg,
                border: `1px solid ${isActive ? scene.colors.border.replace(/0\.\d+\)$/, "0.7)") : scene.colors.border}`,
                borderRadius: "4px",
                padding: "0 2px",
                cursor: onSceneClick ? "pointer" : "default",
                boxShadow: isActive ? `0 0 8px ${scene.colors.border}` : "none",
                outline: "none",
              }}
              onClick={() => onSceneClick?.(scene.id)}
              title={`Scene ${scene.index + 1}${scene.section ? ` — ${scene.section}` : ""} · ${formatTime(scene.start)}–${formatTime(scene.end)}`}
            >
              {/* Section label — only show if segment is wide enough */}
              {scene.widthPct > 6 && (
                <span
                  className="text-[8px] font-bold truncate leading-none"
                  style={{ color: scene.colors.text, letterSpacing: "0.05em" }}
                >
                  {scene.section || `S${scene.index + 1}`}
                </span>
              )}
              {/* Completion indicator */}
              {isCompleted && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ background: scene.colors.text, opacity: 0.6 }}
                />
              )}
              {isFailed && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500/60" />
              )}
              {/* Active pulse */}
              {isActive && (
                <div
                  className="absolute inset-0 rounded animate-pulse"
                  style={{ background: scene.colors.bg.replace(/0\.\d+\)$/, "0.2)") }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Timestamp labels — show start of each section change */}
      <div className="relative h-4 w-full mt-0.5">
        {enriched.map((scene, i) => {
          const prevSection = i > 0 ? enriched[i - 1].section : null;
          const showLabel = i === 0 || scene.section !== prevSection;
          if (!showLabel) return null;
          return (
            <span
              key={scene.id}
              className="absolute text-[8px] text-white/25 leading-none"
              style={{ left: `${scene.leftPct}%`, transform: "translateX(-50%)" }}
            >
              {formatTime(scene.start)}
            </span>
          );
        })}
        {/* End time */}
        <span className="absolute right-0 text-[8px] text-white/25 leading-none">
          {formatTime(duration)}
        </span>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mt-2">
        {(["Intro", "Verse", "Pre-Chorus", "Chorus", "Bridge", "Outro"] as const).map((section) => {
          const hasSection = enriched.some((s) => s.section === section);
          if (!hasSection) return null;
          const colors = SECTION_COLORS[section];
          return (
            <div key={section} className="flex items-center gap-1">
              <div
                className="w-2 h-2 rounded-sm"
                style={{ background: colors.bg.replace(/0\.\d+\)$/, "0.5)"), border: `1px solid ${colors.border}` }}
              />
              <span className="text-[8px] font-medium" style={{ color: colors.text, opacity: 0.7 }}>
                {section}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default LyricTimelineBar;
