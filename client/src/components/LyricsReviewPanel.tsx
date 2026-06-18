/**
 * LyricsReviewPanel — Inline storyboard lyrics review interface
 *
 * Embedded directly in the storyboard step (not a modal). Shows all scenes
 * with their time windows and auto-transcribed lyrics. Users can:
 *   • See every scene's time window (mm:ss – mm:ss)
 *   • See which scenes are performance/lip-sync scenes (gold badge)
 *   • Edit lyrics inline with a textarea
 *   • Toggle lip sync on/off per scene
 *   • Confirm all lyrics before render
 *
 * The panel collapses to a summary bar when confirmed, and expands again
 * if the user wants to re-review.
 */
import React, { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Music,
  Pencil,
  Check,
  X,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Mic,
  Clock,
  Sparkles,
  CheckCircle2,
  Info,
} from "@/lib/icons";

// MicOff not in icon lib — inline SVG
const MicOff = ({ className = "w-3 h-3" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 5v3a3 3 0 005.5 1.7M8 1a3 3 0 013 3v1M8 1a3 3 0 00-3 3v4M1 1l14 14" />
    <path d="M4.5 12.5A7 7 0 0012 9M8 15v-2" />
  </svg>
);
import { trpc } from "@/lib/trpc";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LyricsReviewScene {
  id: number;
  sceneIndex: number;
  startTime: number;
  duration: number;
  lyrics?: string | null;
  prompt?: string | null;
  sceneType?: string | null;
  lipSync?: boolean;
}

interface LyricsReviewPanelProps {
  scenes: LyricsReviewScene[];
  jobId: number;
  /** Called when user clicks "Confirm Lyrics" — parent can unlock the render button */
  onConfirmed?: () => void;
  /** Called when user un-confirms (re-opens for editing) */
  onUnconfirmed?: () => void;
  /** Called when a scene's lyrics are updated locally */
  onLyricsUpdated?: (sceneId: number, newLyrics: string) => void;
  /** Called when a scene's lip sync toggle changes */
  onLipSyncToggled?: (sceneId: number, enabled: boolean) => void;
  /** Whether lyrics are already confirmed (controlled from parent) */
  confirmed?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function isPerformanceScene(scene: LyricsReviewScene): boolean {
  // A scene is a performance scene if its type is performance OR if lip sync is explicitly enabled.
  // This ensures that when the user toggles lip sync ON in the storyboard card,
  // the Review Lyrics panel immediately reflects the change and shows the Lip Sync badge.
  const type = (scene.sceneType ?? "").toLowerCase();
  return type === "performance" || type === "lip_sync" || type === "lipsync" || scene.lipSync === true;
}

// ─── Scene Row ────────────────────────────────────────────────────────────────

interface SceneRowProps {
  scene: LyricsReviewScene;
  jobId: number;
  onLyricsUpdated?: (sceneId: number, newLyrics: string) => void;
  onLipSyncToggled?: (sceneId: number, enabled: boolean) => void;
}

function SceneRow({ scene, jobId, onLyricsUpdated, onLipSyncToggled }: SceneRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(scene.lyrics ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [localLyrics, setLocalLyrics] = useState(scene.lyrics ?? "");
  const [localLipSync, setLocalLipSync] = useState(scene.lipSync !== false);

  const updateSceneLyrics = trpc.musicVideo.updateSceneLyrics.useMutation();
  const updateSceneLipSync = trpc.musicVideo.updateSceneLipSync.useMutation();

  const isPerf = isPerformanceScene(scene);
  const hasLyrics = localLyrics.trim().length > 0;

  const startEdit = useCallback(() => {
    setEditValue(localLyrics);
    setIsEditing(true);
  }, [localLyrics]);

  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditValue(localLyrics);
  }, [localLyrics]);

  const saveEdit = useCallback(async () => {
    setIsSaving(true);
    try {
      const trimmed = editValue.trim();
      await updateSceneLyrics.mutateAsync({ sceneId: scene.id, jobId, lyrics: trimmed || null });
      setLocalLyrics(trimmed);
      onLyricsUpdated?.(scene.id, trimmed);
      setIsEditing(false);
      toast.success("Lyrics saved", { description: `Scene ${scene.sceneIndex + 1} updated` });
    } catch (err: any) {
      toast.error("Failed to save lyrics", { description: String(err?.message ?? err) });
    } finally {
      setIsSaving(false);
    }
  }, [editValue, updateSceneLyrics, scene.id, scene.sceneIndex, jobId, onLyricsUpdated]);

  const handleLipSyncToggle = useCallback(async (enabled: boolean) => {
    setLocalLipSync(enabled);
    onLipSyncToggled?.(scene.id, enabled);
    try {
      await updateSceneLipSync.mutateAsync({ sceneId: scene.id, jobId, lipSync: enabled });
    } catch {
      // Non-fatal — local state already updated
    }
  }, [scene.id, jobId, updateSceneLipSync, onLipSyncToggled]);

  return (
    <div
      className="rounded-xl border transition-all duration-200"
      style={{
        background: isPerf
          ? "rgba(184,137,42,0.05)"
          : "rgba(255,255,255,0.02)",
        borderColor: isPerf
          ? hasLyrics ? "rgba(184,137,42,0.25)" : "rgba(184,137,42,0.12)"
          : "rgba(255,255,255,0.06)",
      }}
    >
      {/* Row header */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Scene number */}
        <div
          className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold"
          style={{
            background: isPerf ? "rgba(184,137,42,0.2)" : "rgba(255,255,255,0.07)",
            color: isPerf ? "oklch(0.72 0.14 70)" : "rgba(255,255,255,0.5)",
          }}
        >
          {scene.sceneIndex + 1}
        </div>

        {/* Time window */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Clock className="w-3 h-3 text-white/30" />
          <span className="text-[11px] font-mono text-white/40">
            {formatTime(scene.startTime)} – {formatTime(scene.startTime + scene.duration)}
          </span>
        </div>

        {/* Scene type badge */}
        {isPerf && (
          <Badge
            className="text-[9px] px-1.5 py-0 flex-shrink-0"
            style={{
              background: "rgba(184,137,42,0.15)",
              color: "oklch(0.72 0.14 70)",
              border: "1px solid rgba(184,137,42,0.3)",
            }}
          >
            <Mic className="w-2.5 h-2.5 mr-1" />
            Lip Sync
          </Badge>
        )}

        {/* Lyrics status indicator */}
        <div className="flex-1 min-w-0">
          {!isEditing && (
            <p
              className="text-[11px] truncate"
              style={{ color: hasLyrics ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.2)" }}
            >
              {hasLyrics ? localLyrics : "No lyrics — click edit to add"}
            </p>
          )}
        </div>

        {/* Lip sync toggle (performance scenes only) */}
        {isPerf && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {localLipSync ? (
              <Mic className="w-3 h-3 text-[--color-gold]" />
            ) : (
              <MicOff className="w-3 h-3 text-white/30" />
            )}
            <Switch
              checked={localLipSync}
              onCheckedChange={handleLipSyncToggle}
              className="scale-75 origin-right"
            />
          </div>
        )}

        {/* Edit button */}
        {!isEditing && (
          <button
            onClick={startEdit}
            className="flex-shrink-0 p-1.5 rounded-lg transition-colors hover:bg-white/10 text-white/30 hover:text-white/70"
            title="Edit lyrics for this scene"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Inline editor */}
      {isEditing && (
        <div className="px-4 pb-3 space-y-2">
          <Textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            rows={3}
            placeholder={`Enter the lyrics that play during ${formatTime(scene.startTime)} – ${formatTime(scene.startTime + scene.duration)}…`}
            className="text-xs font-mono resize-none"
            style={{
              background: "rgba(24,20,16,0.9)",
              borderColor: "rgba(184,137,42,0.3)",
              color: "rgba(255,255,255,0.85)",
            }}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) saveEdit();
              if (e.key === "Escape") cancelEdit();
            }}
          />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="h-7 text-xs"
              style={{ background: "oklch(0.72 0.14 70)", color: "#000" }}
              onClick={saveEdit}
              disabled={isSaving}
            >
              {isSaving ? "Saving…" : <><Check className="w-3.5 h-3.5 mr-1" /> Save</>}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-white/50 hover:text-white/80"
              onClick={cancelEdit}
              disabled={isSaving}
            >
              <X className="w-3.5 h-3.5 mr-1" /> Cancel
            </Button>
            <span className="text-[10px] text-white/25 ml-auto">⌘↵ to save · Esc to cancel</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function LyricsReviewPanel({
  scenes,
  jobId,
  onConfirmed,
  onUnconfirmed,
  onLyricsUpdated,
  onLipSyncToggled,
  confirmed: confirmedProp = false,
}: LyricsReviewPanelProps) {
  const [expanded, setExpanded] = useState(!confirmedProp);
  const [confirmed, setConfirmed] = useState(confirmedProp);

  const performanceScenes = useMemo(() => scenes.filter(isPerformanceScene), [scenes]);
  const scenesWithLyrics = useMemo(
    () => scenes.filter((s) => s.lyrics?.trim()),
    [scenes]
  );
  const perfScenesWithoutLyrics = useMemo(
    () => performanceScenes.filter((s) => !s.lyrics?.trim()),
    [performanceScenes]
  );

  const handleConfirm = useCallback(() => {
    setConfirmed(true);
    setExpanded(false);
    onConfirmed?.();
    toast.success("Lyrics confirmed", {
      description: "Your lyrics are locked in for WIZ lip sync.",
    });
  }, [onConfirmed]);

  const handleReopen = useCallback(() => {
    setConfirmed(false);
    setExpanded(true);
    onUnconfirmed?.();
  }, [onUnconfirmed]);

  // ── Confirmed summary bar ──────────────────────────────────────────────────
  if (confirmed && !expanded) {
    return (
      <div
        className="rounded-xl border px-4 py-3 flex items-center gap-3 cursor-pointer transition-colors hover:border-[rgba(184,137,42,0.35)]"
        style={{
          background: "rgba(16,20,12,0.8)",
          borderColor: "rgba(34,197,94,0.3)",
        }}
        onClick={handleReopen}
        title="Click to re-review lyrics"
      >
        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-emerald-300">Lyrics Confirmed</p>
          <p className="text-xs text-white/40">
            {scenesWithLyrics.length} of {scenes.length} scenes have lyrics · click to re-review
          </p>
        </div>
        <ChevronDown className="w-4 h-4 text-white/30" />
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        background: "rgba(10,8,6,0.95)",
        borderColor: confirmed ? "rgba(34,197,94,0.3)" : "rgba(184,137,42,0.2)",
      }}
    >
      {/* Panel header */}
      <div
        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer select-none"
        style={{ borderBottom: expanded ? "1px solid rgba(255,255,255,0.06)" : "none" }}
        onClick={() => setExpanded((v) => !v)}
      >
        <Music className="w-4 h-4 flex-shrink-0" style={{ color: "oklch(0.72 0.14 70)" }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">Review Lyrics</p>
          <p className="text-xs text-white/40">
            Verify and edit per-scene lyrics before rendering — used for WIZ lip sync
          </p>
        </div>

        {/* Stats pills */}
        <div className="hidden sm:flex items-center gap-2">
          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            {scenesWithLyrics.length} with lyrics
          </span>
          {perfScenesWithoutLyrics.length > 0 && (
            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <AlertTriangle className="w-2.5 h-2.5" />
              {perfScenesWithoutLyrics.length} lip-sync missing
            </span>
          )}
        </div>

        {expanded ? (
          <ChevronUp className="w-4 h-4 text-white/30 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-white/30 flex-shrink-0" />
        )}
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Info banner */}
          <div
            className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-xs mt-3"
            style={{
              background: "rgba(184,137,42,0.07)",
              border: "1px solid rgba(184,137,42,0.15)",
              color: "rgba(255,255,255,0.55)",
            }}
          >
            <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "oklch(0.72 0.14 70)" }} />
            <span>
              <strong className="text-white/75">WIZ AI</strong> uses these lyrics for phoneme-level lip sync —
              matching exact mouth shapes to each word. Scenes marked{" "}
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0 rounded text-[9px] font-semibold"
                style={{ background: "rgba(184,137,42,0.15)", color: "oklch(0.72 0.14 70)" }}
              >
                <Mic className="w-2 h-2" /> Lip Sync
              </span>{" "}
              will use your character's environment portrait as the reference image.
            </span>
          </div>

          {/* Warning for performance scenes without lyrics */}
          {perfScenesWithoutLyrics.length > 0 && (
            <div
              className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-xs"
              style={{
                background: "rgba(245,158,11,0.08)",
                border: "1px solid rgba(245,158,11,0.2)",
                color: "rgba(245,158,11,0.9)",
              }}
            >
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>
                <strong>{perfScenesWithoutLyrics.length} lip-sync scene{perfScenesWithoutLyrics.length > 1 ? "s" : ""}</strong> have no lyrics.
                WIZ AI will still animate from the audio, but adding lyrics significantly improves accuracy.
                Scenes: {perfScenesWithoutLyrics.map((s) => `#${s.sceneIndex + 1}`).join(", ")}
              </span>
            </div>
          )}

          {/* Scene rows */}
          <div className="space-y-2">
            {scenes.map((scene) => (
              <SceneRow
                key={scene.id}
                scene={scene}
                jobId={jobId}
                onLyricsUpdated={onLyricsUpdated}
                onLipSyncToggled={onLipSyncToggled}
              />
            ))}
          </div>

          {/* Footer: confirm button */}
          <div
            className="flex items-center justify-between pt-3"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
          >
            <p className="text-xs text-white/35">
              {scenesWithLyrics.length} of {scenes.length} scenes have lyrics
            </p>
            <Button
              className="font-semibold text-sm"
              style={{
                background: "linear-gradient(135deg, oklch(0.72 0.14 70), oklch(0.45 0.05 260))",
                color: "#fff",
              }}
              onClick={handleConfirm}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Confirm Lyrics
              <Check className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
