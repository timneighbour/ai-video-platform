/**
 * CharacterConfirmationStep
 *
 * Shown between the Setup step and Storyboard generation.
 * For each saved character the user can:
 *   - Generate an AI preview image (Flux PuLID for photo characters, standard gen for AI-described)
 *   - Regenerate the preview if they're not happy
 *   - Approve the preview (required before proceeding)
 *   - Go back to edit the character
 *
 * Once ALL characters are approved, the "Generate Storyboard" button becomes active.
 */
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  CheckCircle2, RefreshCw, ArrowLeft, Sparkles, User,
  ShieldCheck, AlertCircle, Loader2, ImageIcon,
} from "lucide-react";

interface CharacterPreviewState {
  id: number;
  slotIndex: number;
  name: string;
  role: string | null;
  previewImageUrl: string | null;
  previewApproved: boolean;
  primaryPhotoUrl: string | null;
  lockedDescription: string | null;
  isLocked: boolean;
  photoCount: number;
}

interface CharacterConfirmationStepProps {
  jobId: number;
  savedCharacterIds: Record<number, number>;
  onApproveAll: () => void;
  onBack: () => void;
  isGeneratingStoryboard: boolean;
}

const SLOT_COLORS = [
  { ring: "ring-purple-500", bg: "bg-purple-900/20", badge: "bg-purple-900/50 text-purple-300 border-purple-800", dot: "bg-purple-400" },
  { ring: "ring-blue-500",   bg: "bg-blue-900/20",   badge: "bg-blue-900/50 text-blue-300 border-blue-800",     dot: "bg-blue-400" },
  { ring: "ring-pink-500",   bg: "bg-pink-900/20",   badge: "bg-pink-900/50 text-pink-300 border-pink-800",     dot: "bg-pink-400" },
  { ring: "ring-amber-500",  bg: "bg-amber-900/20",  badge: "bg-amber-900/50 text-amber-300 border-amber-800",  dot: "bg-amber-400" },
];

export default function CharacterConfirmationStep({
  jobId,
  savedCharacterIds,
  onApproveAll,
  onBack,
  isGeneratingStoryboard,
}: CharacterConfirmationStepProps) {
  const [characters, setCharacters] = useState<CharacterPreviewState[]>([]);
  const [generatingPreviews, setGeneratingPreviews] = useState<Set<number>>(new Set());
  const [approvingIds, setApprovingIds] = useState<Set<number>>(new Set());

  const getCharactersQuery = trpc.musicVideo.getCharactersForJob.useQuery(
    { jobId },
    { enabled: !!jobId, staleTime: 0 }
  );

  const previewCharacterMutation = trpc.musicVideo.previewCharacter.useMutation();
  const approveCharacterPreviewMutation = trpc.musicVideo.approveCharacterPreview.useMutation();

  // Sync characters from query
  useEffect(() => {
    if (getCharactersQuery.data?.characters) {
      setCharacters(getCharactersQuery.data.characters.map((c: any) => ({
        id: c.id,
        slotIndex: c.slotIndex,
        name: c.name,
        role: c.role,
        previewImageUrl: c.previewImageUrl ?? null,
        previewApproved: c.previewApproved ?? false,
        primaryPhotoUrl: c.primaryPhotoUrl ?? null,
        lockedDescription: c.lockedDescription ?? null,
        isLocked: c.isLocked ?? false,
        photoCount: c.photoCount ?? 0,
      })));
    }
  }, [getCharactersQuery.data]);

  const handleGeneratePreview = async (char: CharacterPreviewState) => {
    setGeneratingPreviews(prev => new Set(prev).add(char.id));
    toast.loading(`Generating preview for ${char.name}...`, { id: `preview-${char.id}` });
    try {
      const result = await previewCharacterMutation.mutateAsync({ characterId: char.id, jobId });
      setCharacters(prev => prev.map(c =>
        c.id === char.id ? { ...c, previewImageUrl: result.imageUrl, previewApproved: false } : c
      ));
      toast.success(`Preview ready for ${char.name}!`, { id: `preview-${char.id}` });
    } catch (err: any) {
      toast.error(`Preview failed for ${char.name}`, { id: `preview-${char.id}`, description: err?.message ?? "Please try again." });
    } finally {
      setGeneratingPreviews(prev => { const n = new Set(prev); n.delete(char.id); return n; });
    }
  };

  const handleApprove = async (char: CharacterPreviewState) => {
    setApprovingIds(prev => new Set(prev).add(char.id));
    try {
      await approveCharacterPreviewMutation.mutateAsync({ characterId: char.id, jobId });
      setCharacters(prev => prev.map(c =>
        c.id === char.id ? { ...c, previewApproved: true } : c
      ));
      toast.success(`${char.name} approved!`, { description: "This character's look is confirmed for the storyboard." });
    } catch (err: any) {
      toast.error(`Failed to approve ${char.name}`, { description: err?.message });
    } finally {
      setApprovingIds(prev => { const n = new Set(prev); n.delete(char.id); return n; });
    }
  };

  const handleUnapprove = (char: CharacterPreviewState) => {
    setCharacters(prev => prev.map(c => c.id === char.id ? { ...c, previewApproved: false } : c));
  };

  const allApproved = characters.length > 0 && characters.every(c => c.previewApproved);
  const approvedCount = characters.filter(c => c.previewApproved).length;

  if (getCharactersQuery.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
        <p className="text-zinc-400">Loading characters...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            Confirm Your Characters
          </h2>
          <p className="text-zinc-400 text-sm mt-1">
            Generate and approve an AI preview for each character before your storyboard is created.
            This ensures the AI will use the correct appearance in every scene.
          </p>
        </div>
        <Badge className={`text-sm px-3 py-1.5 ${allApproved ? "bg-emerald-900/60 text-emerald-300 border-emerald-700" : "bg-zinc-800 text-zinc-400 border-zinc-700"}`}>
          {approvedCount} / {characters.length} Approved
        </Badge>
      </div>

      {/* Character cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {characters.map((char) => {
          const colors = SLOT_COLORS[char.slotIndex] ?? SLOT_COLORS[0];
          const isGenerating = generatingPreviews.has(char.id);
          const isApproving = approvingIds.has(char.id);
          const hasPreview = !!char.previewImageUrl;

          return (
            <div
              key={char.id}
              className={`rounded-xl border overflow-hidden transition-all ${
                char.previewApproved
                  ? "border-emerald-600/70 ring-1 ring-emerald-500/30"
                  : hasPreview
                  ? `ring-1 ${colors.ring} border-zinc-700`
                  : "border-zinc-700"
              }`}
            >
              {/* Character header */}
              <div className={`px-4 py-3 flex items-center gap-3 ${char.previewApproved ? "bg-emerald-900/20" : colors.bg} border-b border-zinc-700/50`}>
                <div className={`w-8 h-8 rounded-lg ${char.previewApproved ? "bg-emerald-700" : "bg-zinc-700"} flex items-center justify-center flex-shrink-0`}>
                  {char.previewApproved ? <CheckCircle2 className="w-4 h-4 text-white" /> : <User className="w-4 h-4 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{char.name}</p>
                  {char.role && <p className="text-zinc-400 text-xs truncate">{char.role}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {char.photoCount > 0 && (
                    <Badge className={`text-xs ${colors.badge}`}>📷 {char.photoCount} photo{char.photoCount !== 1 ? "s" : ""}</Badge>
                  )}
                  {char.previewApproved && (
                    <Badge className="bg-emerald-900/60 text-emerald-300 border-emerald-700 text-xs">✓ Approved</Badge>
                  )}
                </div>
              </div>

              {/* Preview image area */}
              <div className="relative bg-zinc-900 min-h-[220px] flex items-center justify-center">
                {isGenerating ? (
                  <div className="flex flex-col items-center gap-3 py-10">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full bg-violet-900/30 flex items-center justify-center">
                        <Sparkles className="w-8 h-8 text-violet-400 animate-pulse" />
                      </div>
                      <div className="absolute inset-0 rounded-full border-2 border-violet-500/50 animate-spin border-t-transparent" />
                    </div>
                    <p className="text-zinc-400 text-sm">Generating AI preview...</p>
                    <p className="text-zinc-600 text-xs">This takes 10–20 seconds</p>
                  </div>
                ) : hasPreview ? (
                  <>
                    <img
                      src={char.previewImageUrl!}
                      alt={`${char.name} AI preview`}
                      className="w-full max-h-72 object-cover"
                    />
                    {char.previewApproved && (
                      <div className="absolute inset-0 bg-emerald-900/20 flex items-center justify-center">
                        <div className="bg-emerald-900/80 rounded-full p-3">
                          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-10 px-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-zinc-600" />
                    </div>
                    <p className="text-zinc-400 text-sm font-medium">No preview yet</p>
                    {char.primaryPhotoUrl ? (
                      <p className="text-zinc-600 text-xs">Click "Generate Preview" to see how the AI will render {char.name}</p>
                    ) : (
                      <p className="text-zinc-600 text-xs">Generate a preview to confirm this character's appearance</p>
                    )}
                    {/* Show reference photo thumbnail if available */}
                    {char.primaryPhotoUrl && (
                      <div className="flex items-center gap-2 mt-1">
                        <img src={char.primaryPhotoUrl} alt="Reference" className="w-10 h-10 rounded-lg object-cover border border-zinc-700" />
                        <span className="text-zinc-500 text-xs">Reference photo</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Locked description preview */}
              {char.lockedDescription && (
                <div className="px-4 py-2 bg-zinc-800/50 border-t border-zinc-700/50">
                  <p className="text-zinc-500 text-xs line-clamp-2">{char.lockedDescription}</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="p-3 bg-zinc-900 border-t border-zinc-800 flex gap-2">
                {/* Generate / Regenerate */}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleGeneratePreview(char)}
                  disabled={isGenerating || isApproving}
                  className="flex-1 border-zinc-700 bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 gap-1.5"
                >
                  {isGenerating ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</>
                  ) : hasPreview ? (
                    <><RefreshCw className="w-3.5 h-3.5" /> Regenerate</>
                  ) : (
                    <><Sparkles className="w-3.5 h-3.5" /> Generate Preview</>
                  )}
                </Button>

                {/* Approve / Unapprove */}
                {hasPreview && !isGenerating && (
                  char.previewApproved ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleUnapprove(char)}
                      className="flex-1 border-emerald-700/60 bg-emerald-900/20 text-emerald-300 hover:bg-emerald-900/40 gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Approved ✓
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleApprove(char)}
                      disabled={isApproving}
                      className="flex-1 bg-emerald-700 hover:bg-emerald-600 text-white gap-1.5"
                    >
                      {isApproving ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Approving...</>
                      ) : (
                        <><CheckCircle2 className="w-3.5 h-3.5" /> Approve Look</>
                      )}
                    </Button>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Info banner */}
      {!allApproved && characters.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-blue-800/50 bg-blue-950/30 px-4 py-3">
          <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-blue-300 font-medium text-sm">Approve all characters to continue</p>
            <p className="text-blue-200/60 text-xs mt-0.5">
              Generate a preview for each character and click "Approve Look" to confirm their appearance.
              You can regenerate as many times as you like. Once approved, the storyboard will use these exact looks.
            </p>
          </div>
        </div>
      )}

      {allApproved && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-700/50 bg-emerald-950/30 px-4 py-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-emerald-300 font-medium text-sm">All characters approved!</p>
            <p className="text-emerald-200/60 text-xs mt-0.5">
              Your characters' appearances are locked in. Click "Generate Storyboard" to create your video scenes.
            </p>
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isGeneratingStoryboard}
          className="border-zinc-700 text-zinc-300 bg-transparent hover:bg-zinc-800 gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Setup
        </Button>

        <div className="flex-1" />

        <Button
          type="button"
          onClick={onApproveAll}
          disabled={!allApproved || isGeneratingStoryboard}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold px-6 gap-2 disabled:opacity-50"
        >
          {isGeneratingStoryboard ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Generating Storyboard...</>
          ) : (
            <><Sparkles className="w-4 h-4" /> Generate Storyboard</>
          )}
        </Button>
      </div>
    </div>
  );
}
