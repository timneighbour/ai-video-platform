/**
 * CinematicUpsellModal
 *
 * Appears after a video finishes rendering. Lets the user select individual
 * scenes to re-render with premium (WizBoost) quality.
 *
 * Cost: 20 Credits per scene (VIDEO_CREDIT_COSTS.perCinematicScene)
 *
 * Design rules:
 *  - Dark premium aesthetic (zinc-950 / violet accents)
 *  - Scene thumbnails from previewImageUrl (storyboard images)
 *  - Select All / Deselect All toggle
 *  - Running total shown in sticky footer
 *  - "Not enough Credits" path → redirect to /credits
 */
import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  CheckCircle2,
  Circle,
  Zap,
  Film,
  ArrowRight,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { VIDEO_CREDIT_COSTS } from "../../../shared/const";
import { Link } from "wouter";

export interface CinematicScene {
  id: number;
  index: number;
  prompt: string;
  previewImageUrl?: string | null;
  status: string;
}

interface CinematicUpsellModalProps {
  open: boolean;
  onClose: () => void;
  scenes: CinematicScene[];
  /** User's current credit balance */
  creditBalance: number;
  /** Called with the array of scene IDs to upgrade */
  onUpgrade: (sceneIds: number[]) => Promise<void>;
  /** Whether an upgrade is currently in progress */
  isUpgrading?: boolean;
}

const COST_PER_SCENE = VIDEO_CREDIT_COSTS.perCinematicScene; // 20

const QUALITY_BULLETS = [
  "Rendered with WizBoost™ (premium model)",
  "Cinematic motion & depth",
  "Higher detail & sharpness",
  "Smoother scene transitions",
];

export default function CinematicUpsellModal({
  open,
  onClose,
  scenes,
  creditBalance,
  onUpgrade,
  isUpgrading = false,
}: CinematicUpsellModalProps) {
  // Only show completed scenes (can't upgrade pending/failed)
  const upgradableScenes = useMemo(
    () => scenes.filter((s) => s.status === "completed"),
    [scenes]
  );

  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    () => new Set(upgradableScenes.map((s) => s.id))
  );

  const totalCost = selectedIds.size * COST_PER_SCENE;
  const canAfford = creditBalance >= totalCost;
  const shortfall = Math.max(0, totalCost - creditBalance);

  const toggleScene = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () =>
    setSelectedIds(new Set(upgradableScenes.map((s) => s.id)));
  const deselectAll = () => setSelectedIds(new Set());

  const handleUpgrade = async () => {
    if (selectedIds.size === 0 || !canAfford || isUpgrading) return;
    await onUpgrade(Array.from(selectedIds));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-[--color-gold]/15 border border-[--color-gold]/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[--color-gold]" />
            </div>
            <div>
              <DialogTitle className="text-white text-lg leading-tight">
                Want this video to look like a real music video?
              </DialogTitle>
              <DialogDescription className="text-zinc-400 text-sm mt-0.5">
                Upgrade key scenes to cinematic quality — rendered with our premium AI model for sharper detail, cinematic motion, and a professional finish.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Quality comparison strip */}
        <div className="mx-6 mt-4 rounded-xl border border-[--color-gold]/20 bg-gradient-to-r from-[#2a1f00]/30 to-[#1a1000]/20 px-4 py-3 shrink-0">
          <p className="text-xs font-semibold text-[--color-gold] uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5" />
            What cinematic quality adds
          </p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            {QUALITY_BULLETS.map((b) => (
              <div key={b} className="flex items-center gap-2 text-xs text-zinc-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-[--color-gold] flex-shrink-0" />
                {b}
              </div>
            ))}
          </div>
        </div>

        {/* Scene selector */}
        <div className="px-6 pt-4 pb-2 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-zinc-300">
              Select scenes to upgrade
              <span className="text-zinc-500 font-normal ml-2">
                ({selectedIds.size} of {upgradableScenes.length} selected)
              </span>
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={selectAll}
                className="text-xs text-[--color-gold] hover:text-[--color-gold]/80 transition-colors"
              >
                Select all
              </button>
              <span className="text-zinc-700">·</span>
              <button
                onClick={deselectAll}
                className="text-xs text-zinc-500 hover:text-zinc-400 transition-colors"
              >
                Deselect all
              </button>
            </div>
          </div>
        </div>

        {/* Scene grid — scrollable */}
        <div className="overflow-y-auto flex-1 px-6 pb-4">
          {upgradableScenes.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-sm">
              No completed scenes available to upgrade.
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {upgradableScenes.map((scene) => {
                const selected = selectedIds.has(scene.id);
                return (
                  <button
                    key={scene.id}
                    onClick={() => toggleScene(scene.id)}
                    className={`relative rounded-xl overflow-hidden border-2 transition-all text-left group ${
                      selected
                        ? "border-[--color-gold]/70 shadow-lg shadow-[#b8892a]/20"
                        : "border-zinc-800 hover:border-zinc-600"
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="aspect-video bg-zinc-900 relative">
                      {scene.previewImageUrl ? (
                        <img
                          src={scene.previewImageUrl}
                          alt={`Scene ${scene.index + 1}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Film className="w-6 h-6 text-zinc-700" />
                        </div>
                      )}
                      {/* Selection overlay */}
                      <div
                        className={`absolute inset-0 transition-all pointer-events-none ${
                          selected
                            ? "bg-[--color-gold]/10"
                            : "bg-transparent group-hover:bg-white/5"
                        }`}
                      />
                      {/* Checkmark */}
                      <div className="absolute top-1.5 right-1.5">
                        {selected ? (
                          <CheckCircle2 className="w-5 h-5 text-[--color-gold] drop-shadow" />
                        ) : (
                          <Circle className="w-5 h-5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                        )}
                      </div>
                      {/* Scene number badge */}
                      <div className="absolute bottom-1.5 left-1.5">
                        <Badge className="bg-black/70 text-zinc-300 text-[10px] px-1.5 py-0 border-0">
                          Scene {scene.index + 1}
                        </Badge>
                      </div>
                    </div>
                    {/* Prompt snippet */}
                    <div className="px-2 py-1.5 bg-zinc-900/80">
                      <p className="text-[10px] text-zinc-400 line-clamp-2 leading-relaxed">
                        {scene.prompt}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Sticky footer */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-950 rounded-b-2xl shrink-0 space-y-3">
          {/* Cost summary */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-zinc-400">
              {selectedIds.size} scene{selectedIds.size !== 1 ? "s" : ""} ×{" "}
              <span className="text-white font-semibold">{COST_PER_SCENE} Credits</span>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-white">{totalCost} Credits</span>
              {!canAfford && totalCost > 0 && (
                <p className="text-xs text-red-400 mt-0.5">
                  {shortfall} Credits short
                </p>
              )}
              {canAfford && totalCost > 0 && (
                <p className="text-xs text-zinc-500 mt-0.5">
                  {creditBalance - totalCost} Credits remaining after upgrade
                </p>
              )}
            </div>
          </div>

          {/* CTA row */}
          {!canAfford && totalCost > 0 ? (
            <div className="space-y-2">
              <Link href="/credits">
                <Button
                  className="w-full btn-primary font-semibold gap-2"
                  onClick={onClose}
                >
                  <Zap className="w-4 h-4" />
                  Get More Credits
                  <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                className="w-full text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
                onClick={onClose}
              >
                Maybe later
              </Button>
            </div>
          ) : (
            <div className="flex gap-3">
              <Button
                variant="ghost"
                className="flex-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
                onClick={onClose}
                disabled={isUpgrading}
              >
                Skip for now
              </Button>
              <Button
                className="flex-[2] btn-primary font-bold gap-2"
                onClick={handleUpgrade}
                disabled={selectedIds.size === 0 || isUpgrading}
              >
                {isUpgrading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Upgrading…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Upgrade {selectedIds.size > 0 ? `${selectedIds.size} Scene${selectedIds.size !== 1 ? "s" : ""}` : "Scenes"}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          )}

          <p className="text-xs text-zinc-600 text-center">
            Credits are deducted immediately · Upgraded scenes replace originals in your video
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
