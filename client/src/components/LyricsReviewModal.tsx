/**
 * LyricsReviewModal — Pre-render lyrics confirmation gate
 *
 * Shown before the user commits to a render. Displays all per-scene lyrics
 * in a scrollable list so the user can verify they are correct before the
 * render starts. Users can edit lyrics inline and confirm or go back.
 *
 * This is a critical step for Seedance reference-to-video (r2v) because
 * the lyrics are embedded in the prompt for phoneme-level lip sync.
 */
import React, { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Music, Pencil, Check, X, AlertTriangle, Sparkles, ChevronRight } from "@/lib/icons";
import { trpc } from "@/lib/trpc";

export interface LyricsScene {
  id: number;
  sceneIndex: number;
  startTime: number;
  duration: number;
  lyrics?: string | null;
  prompt?: string | null;
  sceneType?: string | null;
}

interface LyricsReviewModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  scenes: LyricsScene[];
  jobId: number;
  onLyricsUpdated?: (sceneId: number, newLyrics: string) => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function LyricsReviewModal({
  open,
  onClose,
  onConfirm,
  scenes,
  jobId,
  onLyricsUpdated,
}: LyricsReviewModalProps) {
  const [editingSceneId, setEditingSceneId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);

  const updateSceneLyrics = trpc.musicVideo.updateSceneLyrics.useMutation();

  const scenesWithLyrics = scenes.filter((s) => s.lyrics?.trim());
  const scenesWithoutLyrics = scenes.filter((s) => !s.lyrics?.trim());
  const performanceScenes = scenes.filter((s) => s.sceneType === "performance");
  const performanceScenesWithoutLyrics = performanceScenes.filter((s) => !s.lyrics?.trim());

  const startEdit = useCallback((scene: LyricsScene) => {
    setEditingSceneId(scene.id);
    setEditValue(scene.lyrics ?? "");
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingSceneId(null);
    setEditValue("");
  }, []);

  const saveEdit = useCallback(async (sceneId: number) => {
    setSavingId(sceneId);
    try {
      await updateSceneLyrics.mutateAsync({ sceneId, jobId, lyrics: editValue.trim() || null });
      onLyricsUpdated?.(sceneId, editValue.trim());
      setEditingSceneId(null);
      setEditValue("");
      toast.success("Lyrics updated");
    } catch (err: any) {
      toast.error("Failed to save lyrics", { description: String(err?.message ?? err) });
    } finally {
      setSavingId(null);
    }
  }, [editValue, updateSceneLyrics, onLyricsUpdated, jobId]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        style={{ background: "rgba(14,12,10,0.98)", border: "1px solid rgba(184,137,42,0.25)", borderRadius: 16 }}
      >
        <DialogHeader className="flex-shrink-0 pb-2">
          <DialogTitle className="flex items-center gap-2 text-white text-lg font-bold">
            <Music className="w-5 h-5 text-[--color-gold]" />
            Review Lyrics Before Rendering
          </DialogTitle>
          <DialogDescription className="text-white/50 text-sm leading-relaxed">
            Seedance 2.0 uses your lyrics for <strong className="text-white/70">phoneme-level lip sync</strong> — the AI matches exact mouth shapes to each word.
            Make sure the lyrics for each scene are correct before starting the render.
          </DialogDescription>
        </DialogHeader>

        {/* Warning banner for performance scenes without lyrics */}
        {performanceScenesWithoutLyrics.length > 0 && (
          <div className="flex-shrink-0 flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-semibold">
                {performanceScenesWithoutLyrics.length} performance scene{performanceScenesWithoutLyrics.length > 1 ? "s" : ""} have no lyrics.
              </span>{" "}
              Seedance will still generate lip sync from the audio, but adding lyrics improves accuracy significantly.
            </div>
          </div>
        )}

        {/* Summary stats */}
        <div className="flex-shrink-0 flex items-center gap-3 text-xs text-white/40">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500/70 inline-block" />
            {scenesWithLyrics.length} scenes with lyrics
          </span>
          {scenesWithoutLyrics.length > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-white/20 inline-block" />
              {scenesWithoutLyrics.length} scenes without lyrics
            </span>
          )}
          <span className="ml-auto text-white/25">{scenes.length} total scenes</span>
        </div>

        {/* Scene list */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
          {scenes.map((scene) => {
            const isEditing = editingSceneId === scene.id;
            const isSaving = savingId === scene.id;
            const isPerformance = scene.sceneType === "performance";
            return (
              <div
                key={scene.id}
                className="rounded-lg border px-3 py-2.5 transition-colors"
                style={{
                  background: isPerformance ? "rgba(184,137,42,0.06)" : "rgba(255,255,255,0.03)",
                  borderColor: isPerformance ? "rgba(184,137,42,0.2)" : "rgba(255,255,255,0.07)",
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[--color-gold]/20 text-[--color-gold] text-[10px] font-bold flex items-center justify-center">
                      {scene.sceneIndex + 1}
                    </span>
                    <span className="text-[11px] text-white/40 flex-shrink-0 font-mono">
                      {formatTime(scene.startTime)} – {formatTime(scene.startTime + scene.duration)}
                    </span>
                    {isPerformance && (
                      <Badge className="text-[9px] px-1.5 py-0 bg-[--color-gold]/15 text-[--color-gold] border-[--color-gold]/30 flex-shrink-0">
                        Lip Sync
                      </Badge>
                    )}
                  </div>
                  {!isEditing && (
                    <button
                      onClick={() => startEdit(scene)}
                      className="flex-shrink-0 p-1 rounded hover:bg-white/10 text-white/30 hover:text-white/70 transition-colors"
                      title="Edit lyrics"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <div className="mt-2 space-y-2">
                    <Textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      rows={3}
                      placeholder="Enter lyrics for this scene window…"
                      className="text-xs font-mono bg-[rgba(24,20,16,0.9)] border-[rgba(184,137,42,0.3)] text-zinc-200 resize-none focus:border-[--color-gold]"
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-[--color-gold] hover:bg-[--color-gold]/90 text-black"
                        onClick={() => saveEdit(scene.id)}
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
                    </div>
                  </div>
                ) : (
                  <div className="mt-1.5">
                    {scene.lyrics?.trim() ? (
                      <p className="text-[11px] text-white/65 font-mono leading-relaxed whitespace-pre-wrap line-clamp-3">
                        {scene.lyrics.trim()}
                      </p>
                    ) : (
                      <p className="text-[11px] text-white/25 italic">
                        No lyrics — click <Pencil className="w-3 h-3 inline mx-0.5" /> to add
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer actions */}
        <div className="flex-shrink-0 flex items-center justify-between pt-3 border-t border-white/08">
          <Button
            variant="ghost"
            className="text-white/50 hover:text-white/80 text-sm"
            onClick={onClose}
          >
            <X className="w-4 h-4 mr-1.5" /> Go Back
          </Button>
          <Button
            className="bg-gradient-to-r from-[#b8892a] to-[#2e2e36] hover:from-[#b8892a] hover:to-[#2e2e36] text-white font-semibold text-sm px-5"
            onClick={onConfirm}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Lyrics Confirmed — Create Video
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
