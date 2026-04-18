/**
 * CharacterConfirmationStep
 *
 * Shown between the Setup step and Storyboard generation.
 * For each saved character the user can:
 *   - Generate a Master Portrait (identity anchor for all scenes)
 *   - Regenerate the preview if they're not happy
 *   - Approve the preview (required before proceeding)
 *   - Go back to edit the character
 *
 * Character Lock Mode (ON by default): enforces face identity across all scenes
 * using the master portrait + locked seed + locked character prompt.
 *
 * Once ALL characters are approved, the "Generate Storyboard" button becomes active.
 *
 * UI improvements (Apr 2026):
 *   - Preview image shown full-height with object-contain so the full body is always visible
 *   - Uploaded reference photo shown alongside the AI portrait for easy comparison
 *   - Outfit / hair / instrument details displayed as readable tags below the image
 */
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  CheckCircle2, RefreshCw, ArrowLeft, Sparkles, User,
  ShieldCheck, AlertCircle, Loader2, ImageIcon, Lock, Unlock,
  Anchor, Info, Camera,
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
  lockedOutfit: string | null;        // raw JSON string from DB
  lockedProps: string | null;         // raw JSON string from DB
  lockedRules: string | null;         // raw JSON string from DB
  characterVisualDetails: string | null; // free-text visual details
  isLocked: boolean;
  photoCount: number;
  masterPortraitUrl: string | null;
  masterSeed: number | null;
  characterPrompt: string | null;
  masterPortraitGeneratedAt: string | null;
}

/** Parse a JSON column that may be a plain string or a JSON object/array */
function parseJsonField(raw: string | null): string {
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "string") return parsed;
    // Flatten object values into a readable string
    if (typeof parsed === "object" && !Array.isArray(parsed)) {
      return Object.values(parsed).filter(Boolean).join(", ");
    }
    if (Array.isArray(parsed)) return parsed.filter(Boolean).join(", ");
    return String(parsed);
  } catch {
    return raw;
  }
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
  { ring: "ring-sky-500",    bg: "bg-sky-900/20",    badge: "bg-sky-900/50 text-sky-300 border-sky-800",        dot: "bg-sky-400" },
  { ring: "ring-emerald-500",bg: "bg-emerald-900/20",badge: "bg-emerald-900/50 text-emerald-300 border-emerald-800",dot: "bg-emerald-400" },
  { ring: "ring-violet-500", bg: "bg-violet-900/20", badge: "bg-violet-900/50 text-violet-300 border-violet-800", dot: "bg-violet-400" },
  { ring: "ring-rose-500",   bg: "bg-rose-900/20",   badge: "bg-rose-900/50 text-rose-300 border-rose-800",     dot: "bg-rose-400" },
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
  const [generatingMasterPortraits, setGeneratingMasterPortraits] = useState<Set<number>>(new Set());
  const [approvingIds, setApprovingIds] = useState<Set<number>>(new Set());
  const [characterLockMode, setCharacterLockMode] = useState(true); // ON by default

  const getCharactersQuery = trpc.musicVideo.getCharactersForJob.useQuery(
    { jobId },
    { enabled: !!jobId, staleTime: 0 }
  );

  const previewCharacterMutation = trpc.musicVideo.previewCharacter.useMutation();
  const approveCharacterPreviewMutation = trpc.musicVideo.approveCharacterPreview.useMutation();
  const generateMasterPortraitMutation = trpc.musicVideo.generateMasterPortrait.useMutation();

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
        lockedOutfit: c.lockedOutfit ?? null,
        lockedProps: c.lockedProps ?? null,
        lockedRules: c.lockedRules ?? null,
        characterVisualDetails: c.characterVisualDetails ?? null,
        isLocked: c.isLocked ?? false,
        photoCount: c.photoCount ?? 0,
        masterPortraitUrl: c.masterPortraitUrl ?? null,
        masterSeed: c.masterSeed ?? null,
        characterPrompt: c.characterPrompt ?? null,
        masterPortraitGeneratedAt: c.masterPortraitGeneratedAt ?? null,
      })));
    }
  }, [getCharactersQuery.data]);

  // Generate master portrait (identity anchor) for a photo-mode character
  const handleGenerateMasterPortrait = async (char: CharacterPreviewState) => {
    setGeneratingMasterPortraits(prev => new Set(prev).add(char.id));
    toast.loading(`Creating full-body portrait for ${char.name}...`, { id: `master-${char.id}` });
    try {
      const result = await generateMasterPortraitMutation.mutateAsync({ characterId: char.id, jobId });
      setCharacters(prev => prev.map(c =>
        c.id === char.id ? {
          ...c,
          masterPortraitUrl: result.masterPortraitUrl,
          masterSeed: result.masterSeed,
          characterPrompt: result.characterPrompt,
          previewImageUrl: result.masterPortraitUrl,
          previewApproved: false,
        } : c
      ));
      toast.success(`Full-body portrait ready for ${char.name}!`, {
        id: `master-${char.id}`,
        description: `Check the face, hair colour, and outfit — then approve.`,
      });
    } catch (err: any) {
      toast.error(`Failed to create portrait for ${char.name}`, {
        id: `master-${char.id}`,
        description: err?.message ?? "Please try again.",
      });
    } finally {
      setGeneratingMasterPortraits(prev => { const n = new Set(prev); n.delete(char.id); return n; });
    }
  };

  // Legacy preview generation (for AI-described characters without photos)
  const handleGeneratePreview = async (char: CharacterPreviewState) => {
    // If character has a photo and lock mode is on, use master portrait generation instead
    if (char.photoCount > 0 && characterLockMode) {
      return handleGenerateMasterPortrait(char);
    }
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
  const photoChars = characters.filter(c => c.photoCount > 0);
  const allPhotoCharsHaveMasterPortrait = photoChars.length === 0 || photoChars.every(c => !!c.masterPortraitUrl);

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
            Generate a full-body portrait for each character. Check the face, hair colour, and outfit — then approve.
          </p>
        </div>
        <Badge className={`text-sm px-3 py-1.5 ${allApproved ? "bg-emerald-900/60 text-emerald-300 border-emerald-700" : "bg-zinc-800 text-zinc-400 border-zinc-700"}`}>
          {approvedCount} / {characters.length} Approved
        </Badge>
      </div>

      {/* Character Lock Mode toggle */}
      <div className={`flex items-center gap-4 rounded-xl border px-4 py-3 transition-all ${characterLockMode ? "border-violet-700/60 bg-violet-950/30" : "border-zinc-700 bg-zinc-900/40"}`}>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${characterLockMode ? "bg-[--color-gold]/20" : "bg-zinc-800"}`}>
          {characterLockMode ? <Lock className="w-5 h-5 text-[--color-gold]" /> : <Unlock className="w-5 h-5 text-zinc-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={`font-semibold text-sm ${characterLockMode ? "text-[--color-gold]" : "text-zinc-300"}`}>
              Character Lock Mode
            </p>
            {characterLockMode && (
              <Badge className="bg-violet-900/60 text-[--color-gold] border-violet-700 text-xs">Recommended</Badge>
            )}
          </div>
          <p className="text-zinc-500 text-xs mt-0.5">
            {characterLockMode
              ? "Identity enforced via master portrait + locked seed. The same face appears in every scene."
              : "Standard mode — face consistency relies on prompt text only (less reliable)."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCharacterLockMode(v => !v)}
          className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${characterLockMode ? "bg-[--color-gold]" : "bg-zinc-700"}`}
          aria-label="Toggle Character Lock Mode"
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${characterLockMode ? "translate-x-6" : "translate-x-0"}`} />
        </button>
      </div>

      {/* Master portrait status banner for photo characters */}
      {characterLockMode && photoChars.length > 0 && !allPhotoCharsHaveMasterPortrait && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-700/50 bg-amber-950/30 px-4 py-3">
          <Anchor className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-amber-300 font-medium text-sm">Generate full-body portraits for your photo characters</p>
            <p className="text-amber-200/60 text-xs mt-0.5">
              Click "Create Full-Body Portrait" on each photo character below. You'll see the AI version of them — face, hair colour, and complete outfit — so you can verify everything looks right before the storyboard is built.
            </p>
          </div>
        </div>
      )}

      {/* Character cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {characters.map((char) => {
          const colors = SLOT_COLORS[char.slotIndex] ?? SLOT_COLORS[0];
          const isGeneratingMaster = generatingMasterPortraits.has(char.id);
          const isGenerating = generatingPreviews.has(char.id) || isGeneratingMaster;
          const isApproving = approvingIds.has(char.id);
          const hasPreview = !!char.previewImageUrl;
          const hasMasterPortrait = !!char.masterPortraitUrl;
          const isPhotoChar = char.photoCount > 0;
          const showMasterPortraitBadge = isPhotoChar && hasMasterPortrait && characterLockMode;

          // Build outfit detail tags for display — parse JSON columns into readable strings
          const detailTags: { label: string; value: string }[] = [];
          const outfitStr = parseJsonField(char.lockedOutfit);
          const propsStr = parseJsonField(char.lockedProps);
          if (outfitStr) detailTags.push({ label: "Outfit", value: outfitStr });
          if (propsStr) detailTags.push({ label: "Props", value: propsStr });
          if (!detailTags.length && char.characterVisualDetails) detailTags.push({ label: "Details", value: char.characterVisualDetails });

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
                    <Badge className={`text-xs ${colors.badge}`}>{char.photoCount} photo{char.photoCount !== 1 ? "s" : ""}</Badge>
                  )}
                  {showMasterPortraitBadge && (
                    <Badge className="bg-violet-900/60 text-[--color-gold] border-violet-700 text-xs flex items-center gap-1">
                      <Anchor className="w-3 h-3" /> Anchored
                    </Badge>
                  )}
                  {char.previewApproved && (
                    <Badge className="bg-emerald-900/60 text-emerald-300 border-emerald-700 text-xs">✓ Approved</Badge>
                  )}
                </div>
              </div>

              {/* ── Main preview area: reference photo + AI portrait side by side ── */}
              <div className="bg-zinc-900">
                {isGenerating ? (
                  <div className="flex flex-col items-center gap-3 py-14">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full bg-[--color-gold]/10 flex items-center justify-center">
                        {isGeneratingMaster
                          ? <Anchor className="w-8 h-8 text-[--color-gold] animate-pulse" />
                          : <Sparkles className="w-8 h-8 text-[--color-gold] animate-pulse" />
                        }
                      </div>
                      <div className="absolute inset-0 rounded-full border-2 border-[--color-gold]/50 animate-spin border-t-transparent pointer-events-none" />
                    </div>
                    <p className="text-zinc-400 text-sm">
                      {isGeneratingMaster ? "Generating full-body portrait..." : "Generating AI preview..."}
                    </p>
                    <p className="text-zinc-600 text-xs">
                      {isGeneratingMaster ? "Face · Hair · Outfit — 30–60 seconds" : "10–20 seconds"}
                    </p>
                  </div>
                ) : hasPreview ? (
                  <div className="flex gap-0">
                    {/* Reference photo column — only shown for photo-mode characters */}
                    {isPhotoChar && char.primaryPhotoUrl && (
                      <div className="w-1/3 flex-shrink-0 border-r border-zinc-800">
                        <div className="px-2 pt-2 pb-1">
                          <p className="text-zinc-500 text-[10px] font-medium uppercase tracking-wider flex items-center gap-1">
                            <Camera className="w-3 h-3" /> Your Photo
                          </p>
                        </div>
                        {/* Portrait aspect ratio — object-contain so face is never cropped */}
                        <div className="mx-2 mb-2 rounded-lg overflow-hidden bg-zinc-950" style={{ aspectRatio: "3/4" }}>
                          <img
                            src={char.primaryPhotoUrl}
                            alt={`${char.name} reference`}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      </div>
                    )}

                    {/* AI portrait column */}
                    <div className={`relative ${isPhotoChar && char.primaryPhotoUrl ? "w-2/3" : "w-full"}`}>
                      <div className="px-2 pt-2 pb-1">
                        <p className="text-zinc-500 text-[10px] font-medium uppercase tracking-wider flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> AI Full-Body Portrait
                        </p>
                      </div>
                      {/* Tall portrait container — object-contain so legs and feet are always visible */}
                      <div className="mx-2 mb-2 rounded-lg overflow-hidden bg-zinc-950" style={{ aspectRatio: "3/4" }}>
                        <img
                          src={char.previewImageUrl!}
                          alt={`${char.name} AI portrait`}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      {/* Approved overlay */}
                      {char.previewApproved && (
                        <div className="absolute inset-0 bg-emerald-900/20 flex items-center justify-center pointer-events-none rounded-lg">
                          <div className="bg-emerald-900/80 rounded-full p-3">
                            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                          </div>
                        </div>
                      )}
                      {/* Master portrait badge */}
                      {showMasterPortraitBadge && !char.previewApproved && (
                        <div className="absolute bottom-4 left-4 bg-[#1a1a1a]/90 rounded-lg px-2 py-1 flex items-center gap-1.5">
                          <Anchor className="w-3 h-3 text-[--color-gold]" />
                          <span className="text-[--color-gold] text-xs font-medium">Identity Anchor</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-10 px-4 text-center">
                    {/* Show reference photo prominently when no AI portrait yet */}
                    {char.primaryPhotoUrl ? (
                      <>
                        <div className="w-full max-w-[160px] mx-auto rounded-xl overflow-hidden bg-zinc-950 ring-1 ring-zinc-700" style={{ aspectRatio: "3/4" }}>
                          <img
                            src={char.primaryPhotoUrl}
                            alt={`${char.name} reference`}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <p className="text-zinc-400 text-sm font-medium">Reference photo uploaded</p>
                        <p className="text-zinc-600 text-xs max-w-[200px]">
                          {characterLockMode
                            ? `Click "Create Full-Body Portrait" to generate the AI version of ${char.name} — face, hair, and outfit`
                            : `Click "Generate Preview" to see how the AI will render ${char.name}`}
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center">
                          <ImageIcon className="w-8 h-8 text-zinc-600" />
                        </div>
                        <p className="text-zinc-400 text-sm font-medium">No preview yet</p>
                        <p className="text-zinc-600 text-xs">Generate a preview to confirm this character's appearance</p>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* ── Outfit / hair / instrument detail tags ── */}
              {detailTags.length > 0 && (
                <div className="px-3 py-2 bg-zinc-800/60 border-t border-zinc-700/50 space-y-1.5">
                  {detailTags.map(tag => (
                    <div key={tag.label} className="flex items-start gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 min-w-[52px] mt-0.5">{tag.label}</span>
                      <span className="text-zinc-300 text-xs leading-relaxed">{tag.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Locked description / character prompt preview */}
              {!detailTags.length && (char.characterPrompt || char.lockedDescription) && (
                <div className="px-4 py-2 bg-zinc-800/50 border-t border-zinc-700/50">
                  <p className="text-zinc-500 text-xs line-clamp-2">
                    {char.characterPrompt ?? char.lockedDescription}
                  </p>
                </div>
              )}

              {/* Action buttons */}
              <div className="p-3 bg-zinc-900 border-t border-zinc-800 flex gap-2">
                {/* Primary action: Create Full-Body Portrait (photo chars in lock mode) or Generate Preview */}
                {isPhotoChar && characterLockMode ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleGenerateMasterPortrait(char)}
                    disabled={isGenerating || isApproving}
                    className={`flex-1 gap-1.5 ${hasMasterPortrait
                      ? "border-violet-700/60 bg-violet-900/20 text-[--color-gold] hover:bg-violet-900/40"
                      : "border-amber-700/60 bg-amber-900/20 text-amber-300 hover:bg-amber-900/40"
                    }`}
                  >
                    {isGeneratingMaster ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating portrait...</>
                    ) : hasMasterPortrait ? (
                      <><RefreshCw className="w-3.5 h-3.5" /> Regenerate Portrait</>
                    ) : (
                      <><Anchor className="w-3.5 h-3.5" /> Create Full-Body Portrait</>
                    )}
                  </Button>
                ) : (
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
                )}

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
        <div className="flex items-start gap-3 rounded-xl border border-[--color-gold]/30 bg-[--color-gold]/10 px-4 py-3">
          <AlertCircle className="w-5 h-5 text-[--color-gold] mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[--color-gold] font-medium text-sm">Approve all characters to continue</p>
            <p className="text-[--color-gold]/60 text-xs mt-0.5">
              {characterLockMode
                ? "For photo characters: create a full-body portrait first, then verify the face, hair colour, and outfit — then approve. This portrait becomes the face reference in every scene."
                : "Generate a preview for each character and click \"Approve Look\" to confirm their appearance."}
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
              {characterLockMode && photoChars.length > 0
                ? "Identity anchors are locked in. Every scene will use your approved portraits to enforce face, hair, and outfit consistency."
                : "Your characters' appearances are locked in. Click \"Generate Storyboard\" to create your video scenes."}
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
          className="bg-gradient-to-r from-[#b8892a] to-[#4a3010] hover:from-[#e8c878] hover:to-[#b8892a] text-white font-semibold px-6 gap-2 disabled:opacity-50"
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
