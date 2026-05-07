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
} from "@/lib/icons";

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
  const normaliseCharacterMutation = trpc.characters.normaliseCharacter.useMutation();
  const [normalisedIds, setNormalisedIds] = useState<Set<number>>(new Set());

  // Auto-trigger normaliseCharacter for all characters that have a lockedDescription
  // but haven't been normalised yet (normalisedAt is null) — runs once per character
  useEffect(() => {
    if (!getCharactersQuery.data?.characters) return;
    const toNormalise = getCharactersQuery.data.characters.filter(
      // Only normalise if: has a lockedDescription, not already normalised in this session,
      // AND not already normalised in the DB (normalisedAt is null/undefined)
      (c: any) => c.lockedDescription && !normalisedIds.has(c.id) && !c.normalisedAt
    );
    for (const c of toNormalise) {
      setNormalisedIds(prev => new Set(prev).add(c.id));
      normaliseCharacterMutation.mutate(
        { characterId: c.id },
        {
          onSuccess: () => console.log(`[normalise] ${c.name} normalised`),
          onError: (err) => console.warn(`[normalise] ${c.name} failed:`, err.message),
        }
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getCharactersQuery.data]);

  // Sync characters from query
  useEffect(() => {
    if (getCharactersQuery.data?.characters) {
      setCharacters(getCharactersQuery.data.characters.map((c: any) => {
        // AI-generated characters (no photos, has previewImageUrl) are pre-approved —
        // the user already saw and accepted the image in CharacterManager.
        const isAiGenerated = (c.characterMode === "ai_generated" || (!c.photoCount && !!c.previewImageUrl));
        return {
        id: c.id,
        slotIndex: c.slotIndex,
        name: c.name,
        role: c.role,
        previewImageUrl: c.previewImageUrl ?? null,
        previewApproved: c.previewApproved || isAiGenerated,
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
      };
      }));
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

  const lockedCount = characters.filter(c => c.isLocked).length;
  return (
    <div style={{maxWidth:'100%'}}>
      {/* ── char-lock-header ── */}
      <div style={{background:'#0c0c0c',borderBottom:'1px solid #1a1a1a',padding:'14px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,borderRadius:'8px 8px 0 0'}}>
        <div>
          <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,letterSpacing:3,color:'#fff',margin:0,display:'flex',alignItems:'center',gap:8}}>
            <ShieldCheck style={{width:18,height:18,color:'#6db86d'}} />
            CHARACTER LOCK
          </h2>
          <p style={{fontSize:11,color:'#666',marginTop:3}}>Build each band member's full profile — face, build, instrument &amp; performance. <span style={{color:'#d4a843'}}>Up to 10 characters.</span> Every scene uses these exact locked profiles.</p>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          {/* lock status badge */}
          <div style={{background:'#141414',border:'1px solid #2a2a2a',borderRadius:4,padding:'6px 12px',display:'flex',alignItems:'center',gap:8}}>
            <span style={{width:8,height:8,borderRadius:'50%',background: allApproved ? '#6db86d' : '#d4a843',boxShadow:`0 0 8px ${allApproved ? 'rgba(109,184,109,0.6)' : 'rgba(212,168,67,0.6)'}`,display:'inline-block'}} />
            <span style={{fontSize:11,color:'#ccc',fontWeight:600,letterSpacing:1}}>{approvedCount}/{characters.length} APPROVED</span>
          </div>
        </div>
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

      {/* ── char-face-strip: 4-up face close-up grid ── */}
      {characters.length > 0 && (
        <div style={{display:'grid',gridTemplateColumns:`repeat(${Math.min(characters.length,4)},1fr)`,gap:10,marginBottom:16}}>
          {characters.slice(0,4).map((char) => (
            <div key={char.id} style={{position:'relative',borderRadius:6,overflow:'hidden',border:`2px solid ${char.previewApproved ? '#34d399' : '#2a2a2a'}`,background:'#111',aspectRatio:'1/1',cursor:'pointer',transition:'all 0.2s',boxShadow: char.previewApproved ? '0 0 12px rgba(52,211,153,0.3)' : 'none'}}>
              {char.previewImageUrl ? (
                <img src={char.previewImageUrl} alt={char.name} style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'top'}} />
              ) : (
                <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',background:'#1a1a1a'}}>
                  <User style={{width:24,height:24,color:'#444'}} />
                </div>
              )}
              {/* Approved checkmark badge in top-right corner */}
              {char.previewApproved && (
                <div style={{position:'absolute',top:4,right:4,background:'#059669',borderRadius:'50%',width:18,height:18,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 6px rgba(52,211,153,0.6)'}}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}
              {/* Pending indicator in top-right corner */}
              {!char.previewApproved && (
                <div style={{position:'absolute',top:4,right:4,background:'#92400e',borderRadius:'50%',width:18,height:18,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <circle cx="5" cy="5" r="3" fill="#fbbf24"/>
                  </svg>
                </div>
              )}
              <div style={{position:'absolute',bottom:0,left:0,right:0,background: char.previewApproved ? 'rgba(5,150,105,0.85)' : 'rgba(0,0,0,0.85)',fontSize:9,fontWeight:700,letterSpacing:1,color:'#fff',textAlign:'center',padding:'4px',textTransform:'uppercase'}}>
                {char.previewApproved ? '✓ ' : ''}{char.name}
              </div>
            </div>
          ))}
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
                  ? "border-emerald-500 ring-2 ring-emerald-500/40 shadow-[0_0_20px_rgba(52,211,153,0.18)]"
                  : hasPreview
                  ? `ring-1 ${colors.ring} border-zinc-700`
                  : "border-zinc-700"
              }`}
            >
              {/* Character header */}
              <div className={`px-4 py-3 flex items-center gap-3 border-b ${
                char.previewApproved
                  ? "bg-gradient-to-r from-emerald-900/40 to-emerald-900/10 border-emerald-700/40"
                  : `${colors.bg} border-zinc-700/50`
              }`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  char.previewApproved
                    ? "bg-emerald-600 shadow-[0_0_10px_rgba(52,211,153,0.5)]"
                    : "bg-zinc-700"
                }`}>
                  {char.previewApproved
                    ? <CheckCircle2 className="w-4 h-4 text-white" />
                    : <User className="w-4 h-4 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm truncate ${
                    char.previewApproved ? "text-emerald-200" : "text-white"
                  }`}>{char.name}</p>
                  {char.role && <p className={`text-xs truncate ${
                    char.previewApproved ? "text-emerald-400/70" : "text-zinc-400"
                  }`}>{char.role}</p>}
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
                  {char.previewApproved ? (
                    <Badge className="bg-emerald-600/90 text-white border-emerald-500 text-xs font-bold px-2 py-0.5 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> LOCKED IN
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-900/50 text-amber-300 border-amber-700/60 text-xs">Pending</Badge>
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
                      {/* Approved overlay — LOCKED IN stamp */}
                      {char.previewApproved && (
                        <div className="absolute inset-0 pointer-events-none rounded-lg">
                          {/* subtle green tint */}
                          <div className="absolute inset-0 bg-emerald-900/10 rounded-lg" />
                          {/* corner stamp */}
                          <div className="absolute top-2 right-2 bg-emerald-600/95 rounded-md px-2 py-1 flex items-center gap-1 shadow-lg">
                            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                            <span className="text-white text-[10px] font-bold tracking-wider">LOCKED IN</span>
                          </div>
                          {/* bottom green bar */}
                          <div className="absolute bottom-0 left-0 right-0 bg-emerald-600/80 py-1 flex items-center justify-center gap-1.5 rounded-b-lg">
                            <CheckCircle2 className="w-3 h-3 text-white" />
                            <span className="text-white text-[9px] font-bold tracking-widest uppercase">Character Approved</span>
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
                            : `Click "Generate Preview" to see how the AI will create ${char.name}`}
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

      {/* ── char-lock-panel: lock status card + LOCK CHARACTER gold CTA ── */}
      <div style={{background:'#0f0f0f',border:'1px solid #1e1e1e',borderRadius:8,padding:'20px',marginTop:16}}>
        <div style={{fontSize:10,fontWeight:600,letterSpacing:2,color:'#555',textTransform:'uppercase',marginBottom:12,paddingBottom:8,borderBottom:'1px solid #1e1e1e'}}>LOCK STATUS</div>
        {/* lock-status-card */}
        <div style={{background:'#141414',border:'1px solid #2a2a2a',borderRadius:4,padding:16,marginBottom:16}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
            <span style={{fontSize:11,color:'#888'}}>Characters Defined</span>
            <span style={{fontSize:11,fontWeight:600,color:'#ccc'}}>{characters.length}</span>
          </div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
            <span style={{fontSize:11,color:'#888'}}>Portraits Generated</span>
            <span style={{fontSize:11,fontWeight:600,color:'#d4a843'}}>{characters.filter(c=>!!c.previewImageUrl).length} / {characters.length}</span>
          </div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
            <span style={{fontSize:11,color:'#888'}}>Approved</span>
            <span style={{fontSize:11,fontWeight:600,color: allApproved ? '#6db86d' : '#d4a843'}}>
              <span style={{width:8,height:8,borderRadius:'50%',background: allApproved ? '#6db86d' : '#d4a843',display:'inline-block',marginRight:6}} />
              {approvedCount} / {characters.length}
            </span>
          </div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <span style={{fontSize:11,color:'#888'}}>Lock Mode</span>
            <span style={{fontSize:11,fontWeight:600,color: characterLockMode ? '#d4a843' : '#888'}}>{characterLockMode ? 'ENFORCED' : 'STANDARD'}</span>
          </div>
        </div>
        {/* Back button */}
        <button
          type="button"
          onClick={onBack}
          disabled={isGeneratingStoryboard}
          style={{background:'#1a1a1a',border:'1px solid #333',color:'#888',padding:'8px 14px',fontSize:11,fontWeight:600,letterSpacing:0.5,borderRadius:3,cursor:'pointer',display:'flex',alignItems:'center',gap:6,marginBottom:12,width:'100%',justifyContent:'center',opacity: isGeneratingStoryboard ? 0.5 : 1}}
        >
          <ArrowLeft style={{width:12,height:12}} /> BACK TO SETUP
        </button>
        {/* LOCK CHARACTER gold CTA */}
        <div style={{marginTop:'auto',paddingTop:0,borderTop:'1px solid #1e1e1e'}}>
          <button
            type="button"
            onClick={onApproveAll}
            disabled={!allApproved || isGeneratingStoryboard}
            style={{width:'100%',background: allApproved ? 'linear-gradient(135deg,#d4a843,#b8892a)' : '#1a1a1a',border: allApproved ? 'none' : '1px solid #333',color: allApproved ? '#000' : '#555',padding:14,fontSize:13,fontWeight:700,letterSpacing:2,borderRadius:3,cursor: allApproved ? 'pointer' : 'not-allowed',display:'flex',alignItems:'center',justifyContent:'center',gap:10,transition:'all 0.2s',marginTop:12}}
          >
            {isGeneratingStoryboard ? (
              <><Loader2 style={{width:16,height:16,animation:'spin 1s linear infinite'}} /> GENERATING STORYBOARD...</>
            ) : (
              <><Lock style={{width:16,height:16}} /> {allApproved ? 'LOCK CHARACTER · GENERATE STORYBOARD' : `APPROVE ALL ${characters.length} CHARACTERS TO CONTINUE`}</>
            )}
          </button>
          <div style={{textAlign:'center',fontSize:10,color:'#555',marginTop:8}}>Face · Build · Instrument · Performance · Wardrobe — all locked. No randomness.</div>
        </div>
      </div>
    </div>
  );
}
