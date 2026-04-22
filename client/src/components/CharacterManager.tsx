/**
 * CharacterManager
 * Dual-mode character setup for music/animation videos.
 *
 * Each character slot supports two modes:
 *   1. PHOTO UPLOAD — user uploads a real photo; AI analyses it to build a locked visual brief.
 *      Re-analyse Photo button regenerates the brief from the uploaded photo.
 *   2. AI GENERATE — user describes what they want in plain English + picks a style;
 *      AI expands the description into a full visual brief and generates a preview image.
 *
 * Design: All slots are always expanded. The mode toggle is the first thing visible.
 * AI Generate mode is prominently displayed with a gradient CTA.
 */
import { useRef, useCallback, useState, useEffect } from "react";

// ─── CommaInput ───────────────────────────────────────────────────────────────
// A plain text input that stores its value as a string[] but lets the user type
// freely (including commas and spaces). The array is only re-parsed on blur,
// which prevents the cursor-jump bug that occurs when splitting on every change.
function CommaInput({
  value,
  onChange,
  placeholder,
  className,
  disabled,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [local, setLocal] = useState(() => value.join(', '));

  // Sync inbound value changes (e.g. when the parent resets the form) but only
  // when the joined string actually differs — avoids overwriting mid-edit.
  useEffect(() => {
    const joined = value.join(', ');
    setLocal((prev) => {
      const prevParsed = prev.split(',').map((s) => s.trim()).filter(Boolean);
      const same =
        prevParsed.length === value.length &&
        prevParsed.every((t, i) => t === value[i]);
      return same ? prev : joined;
    });
  }, [value]);

  return (
    <input
      type="text"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        const tags = local.split(',').map((s) => s.trim()).filter(Boolean);
        onChange(tags);
        // Re-join so display is normalised (e.g. trailing comma removed)
        setLocal(tags.join(', '));
      }}
      placeholder={placeholder}
      disabled={disabled}
      className={`flex h-9 w-full rounded-md border px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm ${className ?? ''}`}
    />
  );
}
import WizPerformerConsentModal, { hasGivenConsent, persistConsent } from "@/components/WizPerformerConsentModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  Plus, Trash2, User, Mic, ImagePlus, X,
  Crown, Lock, LockOpen, ShieldCheck,
  RefreshCw, Wand2, Camera, Sparkles,
} from "@/lib/icons";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CharacterPhoto {
  previewUrl: string;
  base64: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  isPrimary: boolean;
}

export type CharacterMode = "photo" | "ai_generated";
export type AnimationStyle = "realistic" | "pixar3d" | "anime" | "cartoon";
export type BodyBuild = "slim" | "lean" | "average" | "athletic" | "stocky" | "muscular";

export interface LockedRules {
  role?: string;
  mustHave?: string[];
  allowedProps?: string[];
  forbidden?: string[];
}

export interface Character {
  slotIndex: number;
  name: string;
  role: string;
  enableLipSync: boolean;
  /** Optional face video URL for performance-sync (uploaded short video of the character's face) */
  faceVideoUrl?: string;
  /** Mode: real photo upload or AI-generated from description */
  mode: CharacterMode;
  // Photo mode
  photos: CharacterPhoto[];
  // AI Generate mode
  aiDescription: string;
  aiStyle: AnimationStyle;
  aiGeneratedImageUrl: string;
  aiGeneratedBrief: string;
  // Shared
  lockedDescription: string;
  isLocked: boolean;
  /** Visual details: outfit, instrument, position, props — overrides scene assumptions */
  visualDetails: string;
  // Structured locked fields (unified pipeline)
  lockedOutfit: string;
  lockedProps: string;
  lockedPosition: string;
  lockedRules: LockedRules;
  /** Body build hint injected into portrait prompts — helps AI match the user's actual physique */
  bodyBuild: BodyBuild;
}

interface CharacterManagerProps {
  characters: Character[];
  onChange: (characters: Character[]) => void;
  maxCharacters?: number;
  disabled?: boolean;
  jobId?: number | null;
  savedCharacterIds?: Record<number, number>;
  /** The overall video style selected (cinematic, anime, pixar3d, etc.) — used to default AI style */
  videoStyle?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SLOT_COLORS = [
  { ring: "ring-[--color-gold]", bg: "bg-[--color-gold]/10", badge: "bg-[--color-gold]/15 text-[--color-gold] border-[--color-gold]/30", icon: "bg-[--color-gold]", dot: "bg-[--color-gold]", tab: "bg-[--color-gold]/80 hover:bg-[--color-gold]" },
  { ring: "ring-[--color-silver]", bg: "bg-[--color-silver]/10", badge: "bg-[--color-silver]/10 text-[--color-silver] border-[--color-silver]/20", icon: "bg-[--color-silver]", dot: "bg-[--color-silver]", tab: "bg-[--color-silver]/60 hover:bg-[--color-silver]/40" },
  { ring: "ring-zinc-500", bg: "bg-zinc-800/50", badge: "bg-zinc-700/50 text-zinc-300 border-zinc-600", icon: "bg-zinc-600", dot: "bg-zinc-400", tab: "bg-zinc-700 hover:bg-zinc-600" },
  { ring: "ring-amber-500",  bg: "bg-amber-900/30",  badge: "bg-amber-900/50 text-amber-300 border-amber-800",  icon: "bg-amber-600",  dot: "bg-amber-400",  tab: "bg-amber-700 hover:bg-amber-600" },
  { ring: "ring-sky-500",    bg: "bg-sky-900/30",    badge: "bg-sky-900/50 text-sky-300 border-sky-800",        icon: "bg-sky-600",    dot: "bg-sky-400",    tab: "bg-sky-700 hover:bg-sky-600" },
  { ring: "ring-emerald-500",bg: "bg-emerald-900/30",badge: "bg-emerald-900/50 text-emerald-300 border-emerald-800",icon: "bg-emerald-600",dot: "bg-emerald-400",tab: "bg-emerald-700 hover:bg-emerald-600" },
  { ring: "ring-violet-500", bg: "bg-violet-900/30", badge: "bg-violet-900/50 text-violet-300 border-violet-800", icon: "bg-violet-600", dot: "bg-violet-400", tab: "bg-violet-700 hover:bg-violet-600" },
  { ring: "ring-rose-500",   bg: "bg-rose-900/30",   badge: "bg-rose-900/50 text-rose-300 border-rose-800",     icon: "bg-rose-600",   dot: "bg-rose-400",   tab: "bg-rose-700 hover:bg-rose-600" },
];

const AI_STYLES: { id: AnimationStyle; label: string; desc: string; emoji: string }[] = [
  { id: "realistic",  label: "Realistic",  desc: "Photorealistic human",   emoji: "" },
  { id: "pixar3d",    label: "Cinematic 3D", desc: "Cinematic 3D animation", emoji: "" },
  { id: "anime",      label: "Anime",      desc: "Japanese anime style",   emoji: "" },
  { id: "cartoon",    label: "Cartoon",    desc: "Bold cartoon style",     emoji: "" },
];

const AI_DESCRIPTION_EXAMPLES = [
  "Young woman dancing in street clothes, early 20s, confident energy",
  "Tall man in a sharp suit, mid-30s, mysterious expression",
  "Teenage boy with a skateboard, casual streetwear, energetic",
  "Elegant woman in a flowing red dress, late 20s, graceful",
  "Muscular man in gym clothes, athletic build, intense focus",
  "Quirky robot DJ with glowing eyes and chrome body",
  "Cartoon fox wearing headphones and a hoodie",
  "Pixar-style wizard with a long beard and sparkling staff",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function validateImageFile(file: File): boolean {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    toast.error("Invalid image type", { description: "Please upload a JPG, PNG, or WebP image." });
    return false;
  }
  if (file.size > 10 * 1024 * 1024) {
    toast.error("Image too large", { description: "Maximum image size is 10MB." });
    return false;
  }
  return true;
}

export function createEmptyCharacter(slotIndex: number, videoStyle?: string): Character {
  const defaultStyle: AnimationStyle =
    videoStyle === "anime" ? "anime" :
    videoStyle === "pixar3d" || videoStyle === "disney" ? "pixar3d" :
    videoStyle === "cartoon" ? "cartoon" : "realistic";
  return {
    slotIndex,
    name: "",
    role: "",
    enableLipSync: true,
    faceVideoUrl: undefined,
    mode: "photo",
    photos: [],
    aiDescription: "",
    aiStyle: defaultStyle,
    aiGeneratedImageUrl: "",
    aiGeneratedBrief: "",
    lockedDescription: "",
    isLocked: false,
    visualDetails: "",
    lockedOutfit: "",
    lockedProps: "",
    lockedPosition: "",
    lockedRules: {},
    bodyBuild: "average",
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CharacterManager({
  characters,
  onChange,
  maxCharacters = 8,
  disabled = false,
  jobId,
  savedCharacterIds = {},
  videoStyle,
}: CharacterManagerProps) {
  const photoInputRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null, null, null, null, null]);
  const [reanalysingSlots, setReanalysingSlots] = useState<Set<number>>(new Set());
  const [generatingSlots, setGeneratingSlots] = useState<Set<number>>(new Set());
  // Consent state — tracks whether the user has accepted the WizPerformer privacy notice
  const [consentGiven, setConsentGiven] = useState(() => hasGivenConsent());
  const [pendingUploadSlot, setPendingUploadSlot] = useState<number | null>(null);

  const reanalyseCharacterPhoto = trpc.musicVideo.reanalyseCharacterPhoto.useMutation();
  const generateCharacterFromDescription = trpc.musicVideo.generateCharacterFromDescription.useMutation();

  const updateCharacter = (slotIndex: number, patch: Partial<Character>) =>
    onChange(characters.map((c) => c.slotIndex === slotIndex ? { ...c, ...patch } : c));

  const addCharacter = () => {
    if (characters.length >= maxCharacters) return;
    const nextSlot = characters.length;
    const newChar = createEmptyCharacter(nextSlot, videoStyle);
    onChange([...characters, newChar]);
  };

  const removeCharacter = (slotIndex: number) => {
    const updated = characters
      .filter((c) => c.slotIndex !== slotIndex)
      .map((c, i) => ({ ...c, slotIndex: i }));
    onChange(updated);
  };

  const toggleLock = (slotIndex: number) => {
    const char = characters.find((c) => c.slotIndex === slotIndex);
    if (!char) return;
    if (!char.isLocked) {
      const hasContent = char.mode === "photo" ? char.photos.length > 0 : !!char.aiGeneratedImageUrl;
      if (!hasContent) {
        toast.error("Add content first", { description: char.mode === "photo" ? "Upload at least one photo before locking." : "Generate a character image first." });
        return;
      }
    }
    updateCharacter(slotIndex, { isLocked: !char.isLocked });
  };

  const handleReanalysePhoto = async (slotIndex: number) => {
    const char = characters.find((c) => c.slotIndex === slotIndex);
    if (!char || char.photos.length === 0) return;
    const savedId = savedCharacterIds[slotIndex];
    if (!savedId || !jobId) {
      toast.error("Save characters first", { description: "Submit the form once to save characters, then you can re-analyse." });
      return;
    }
    setReanalysingSlots(prev => new Set(prev).add(slotIndex));
    toast.loading(`Re-analysing ${char.name || "character"}...`, { id: `reanalyse-${slotIndex}` });
    try {
      const result = await reanalyseCharacterPhoto.mutateAsync({ characterId: savedId, jobId: jobId! });
      updateCharacter(slotIndex, { lockedDescription: result.description });
      toast.success("Photo re-analysed!", { id: `reanalyse-${slotIndex}`, description: "Visual brief updated." });
    } catch (err: any) {
      toast.error("Re-analysis failed", { id: `reanalyse-${slotIndex}`, description: err?.message ?? "Please try again." });
    } finally {
      setReanalysingSlots(prev => { const n = new Set(prev); n.delete(slotIndex); return n; });
    }
  };

  const handleGenerateCharacter = async (slotIndex: number) => {
    const char = characters.find((c) => c.slotIndex === slotIndex);
    if (!char) return;
    if (!char.aiDescription.trim() || char.aiDescription.trim().length < 5) {
      toast.error("Description too short", { description: "Please describe your character in at least a few words." });
      return;
    }
    setGeneratingSlots(prev => new Set(prev).add(slotIndex));
    toast.loading(`Creating ${char.name || "character"}...`, { id: `generate-${slotIndex}` });
    try {
      const result = await generateCharacterFromDescription.mutateAsync({
        name: char.name || "Character",
        role: char.role || undefined,
        description: char.aiDescription,
        style: char.aiStyle,
        bodyBuild: char.bodyBuild ?? "average",
      });
      updateCharacter(slotIndex, {
        aiGeneratedBrief: result.visualBrief,
        aiGeneratedImageUrl: result.imageUrl,
        lockedDescription: result.visualBrief,
        isLocked: true,
      });
      toast.success(`${char.name || "Character"} created!`, { id: `generate-${slotIndex}`, description: "Preview image generated. You can regenerate or adjust the description." });
    } catch (err: any) {
      toast.error(`Failed to generate character`, { id: `generate-${slotIndex}`, description: err?.message ?? "Please try again." });
    } finally {
      setGeneratingSlots(prev => { const n = new Set(prev); n.delete(slotIndex); return n; });
    }
  };

  // Called when user clicks the photo upload area — check consent first
  const triggerPhotoUpload = (slotIndex: number) => {
    if (!consentGiven) {
      setPendingUploadSlot(slotIndex);
      return;
    }
    photoInputRefs.current[slotIndex]?.click();
  };

  const handlePhotoFiles = useCallback(async (slotIndex: number, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const char = characters.find((c) => c.slotIndex === slotIndex);
    if (!char) return;
    const remaining = 10 - char.photos.length;
    if (remaining <= 0) { toast.error("Photo limit reached"); return; }
    const filesToProcess = Array.from(files).slice(0, remaining);
    const newPhotos: CharacterPhoto[] = [];
    for (const file of filesToProcess) {
      if (!validateImageFile(file)) continue;
      const base64 = await fileToBase64(file);
      newPhotos.push({
        previewUrl: URL.createObjectURL(file),
        base64,
        mimeType: file.type as CharacterPhoto["mimeType"],
        isPrimary: char.photos.length === 0 && newPhotos.length === 0,
      });
    }
    updateCharacter(slotIndex, { photos: [...char.photos, ...newPhotos] });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characters]);

  const removePhoto = (slotIndex: number, photoIndex: number) => {
    const char = characters.find((c) => c.slotIndex === slotIndex);
    if (!char) return;
    const updated = char.photos.filter((_, i) => i !== photoIndex);
    if (updated.length > 0 && !updated.some((p) => p.isPrimary)) updated[0] = { ...updated[0], isPrimary: true };
    updateCharacter(slotIndex, { photos: updated });
  };

  const setPrimaryPhoto = (slotIndex: number, photoIndex: number) =>
    updateCharacter(slotIndex, { photos: characters.find(c => c.slotIndex === slotIndex)!.photos.map((p, i) => ({ ...p, isPrimary: i === photoIndex })) });

  return (
    <div className="space-y-4">
      {characters.map((char) => {
        const colors = SLOT_COLORS[char.slotIndex] ?? SLOT_COLORS[0];
        const isLocked = char.isLocked;
        const isReanalysing = reanalysingSlots.has(char.slotIndex);
        const isGenerating = generatingSlots.has(char.slotIndex);
        const hasSavedId = !!savedCharacterIds[char.slotIndex] && !!jobId;
        const hasPreview = char.mode === "ai_generated" ? !!char.aiGeneratedImageUrl : char.photos.length > 0;

        return (
          <div
            key={char.slotIndex}
            className={`rounded-xl border overflow-hidden transition-all ${
              isLocked ? "border-emerald-600/70 ring-1 ring-emerald-500/30" :
              hasPreview ? `ring-1 ${colors.ring} border-zinc-700` : "border-zinc-700"
            }`}
          >
            {/* ── Header ── */}
            <div className={`px-4 py-3 flex items-center gap-3 ${isLocked ? "bg-emerald-900/20" : colors.bg} border-b border-zinc-700/50`}>
              {/* Slot icon */}
              <div className={`w-8 h-8 rounded-lg ${isLocked ? "bg-emerald-700" : colors.icon} flex items-center justify-center flex-shrink-0`}>
                {isLocked ? <ShieldCheck className="w-4 h-4 text-white" /> :
                 char.slotIndex === 0 ? <Crown className="w-4 h-4 text-white" /> :
                 <User className="w-4 h-4 text-white" />}
              </div>

              {/* Name */}
              <span className="text-white font-semibold text-sm truncate max-w-[120px]">
                {char.name || `Character ${char.slotIndex + 1}`}
              </span>

              {/* Mode badge */}
              <Badge className={`text-xs ${isLocked ? "bg-emerald-900/60 text-emerald-300 border-emerald-700" : colors.badge}`}>
                {isLocked ? "Locked" : char.mode === "ai_generated" ? "AI Generated" : "Photo Upload"}
              </Badge>

              {/* Preview thumbnail — taller portrait so the full face is visible */}
              {hasPreview && (
                <div className="w-10 h-14 rounded-lg overflow-hidden flex-shrink-0 ring-1 ring-zinc-500 bg-zinc-900">
                  <img
                    src={char.mode === "ai_generated" ? char.aiGeneratedImageUrl : char.photos[0]?.previewUrl}
                    alt={char.name}
                    className="w-full h-full object-contain"
                  />
                </div>
              )}

              <div className="flex-1" />

              {/* Lock toggle */}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => toggleLock(char.slotIndex)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all border ${
                    isLocked ? "border-emerald-600/60 bg-emerald-900/30 text-emerald-300 hover:bg-emerald-900/50" :
                    "border-zinc-600 bg-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-400"
                  }`}
                >
                  {isLocked ? <Lock className="w-3 h-3" /> : <LockOpen className="w-3 h-3" />}
                  {isLocked ? "Unlock" : "Lock"}
                </button>
              )}

              {/* Remove */}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeCharacter(char.slotIndex)}
                  className="text-zinc-500 hover:text-red-400 transition-colors p-1 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* ── Body — always visible ── */}
            <div className="p-4 space-y-4">
              {/* Name + Role */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-zinc-400 text-xs mb-1 block">Name *</Label>
                  <Input value={char.name} onChange={(e) => updateCharacter(char.slotIndex, { name: e.target.value })}
                    placeholder="e.g. Alex, Lead Singer" className="bg-zinc-800 border-zinc-700 text-white text-sm" disabled={disabled} />
                </div>
                <div>
                  <Label className="text-zinc-400 text-xs mb-1 block">Role / Instrument</Label>
                  <Input value={char.role} onChange={(e) => updateCharacter(char.slotIndex, { role: e.target.value })}
                    placeholder="e.g. Lead Vocalist, Guitarist" className="bg-zinc-800 border-zinc-700 text-white text-sm" disabled={disabled} />
                  {/* Quick-select instrument role buttons */}
                  {!disabled && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {["Lead Vocalist", "Guitarist", "Bassist", "Drummer", "Keyboard"].map(role => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => updateCharacter(char.slotIndex, { role })}
                          className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                            char.role === role
                              ? "bg-[--color-gold] border-[--color-gold]/80 text-white"
                              : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-[--color-gold] hover:text-[--color-gold]"
                          }`}
                        >
                          {role}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Body Build selector ── */}
              <div>
                <Label className="text-zinc-400 text-xs mb-2 block">Body Build <span className="text-zinc-600 font-normal">(optional — helps the AI match your physique)</span></Label>
                <div className="flex flex-wrap gap-1.5">
                  {([
                    { id: "slim",     label: "Slim",     desc: "Very lean, narrow frame" },
                    { id: "lean",     label: "Lean",     desc: "Toned, low body fat" },
                    { id: "average",  label: "Average",  desc: "Typical build" },
                    { id: "athletic", label: "Athletic", desc: "Muscular and fit" },
                    { id: "stocky",   label: "Stocky",   desc: "Broad, heavier set" },
                    { id: "muscular", label: "Muscular", desc: "Very built, large frame" },
                  ] as { id: BodyBuild; label: string; desc: string }[]).map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      title={opt.desc}
                      onClick={() => updateCharacter(char.slotIndex, { bodyBuild: opt.id })}
                      disabled={disabled || isLocked}
                      className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                        char.bodyBuild === opt.id
                          ? "bg-[--color-gold] border-[--color-gold]/80 text-white"
                          : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-[--color-gold]/60 hover:text-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {char.bodyBuild !== "average" && (
                  <p className="text-zinc-600 text-[10px] mt-1">
                    {char.bodyBuild === "slim" && "AI will create a slim, narrow-framed figure."}
                    {char.bodyBuild === "lean" && "AI will create a lean, toned figure."}
                    {char.bodyBuild === "athletic" && "AI will create a fit, athletic figure."}
                    {char.bodyBuild === "stocky" && "AI will create a broad, heavier-set figure."}
                    {char.bodyBuild === "muscular" && "AI will create a very muscular, large-framed figure."}
                  </p>
                )}
              </div>

              {/* ── Structured Character Details ── */}
              <div className="space-y-3">
                {/* Free-text visual details (legacy, still used) */}
                <div>
                  <Label className="text-zinc-400 text-xs mb-1 block">Visual Details (free text)</Label>
                  <Textarea
                    value={char.visualDetails || ""}
                    onChange={(e) => updateCharacter(char.slotIndex, { visualDetails: e.target.value })}
                    placeholder="Describe what this character wears and holds (e.g. Black leather jacket, red Gibson Les Paul guitar, microphone)"
                    className="bg-zinc-800 border-zinc-700 text-white text-sm placeholder:text-zinc-600 resize-none min-h-[60px]"
                    disabled={disabled}
                    rows={2}
                  />
                </div>

                {/* Structured locked fields */}
                <div className="rounded-xl border border-zinc-700/70 bg-zinc-900/50 p-3 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-amber-300 text-xs font-semibold uppercase tracking-wider">Locked Character Constraints</span>
                  </div>

                  {/* Outfit */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Badge className="text-[10px] px-1.5 py-0 bg-amber-900/50 text-amber-300 border-amber-800">LOCKED</Badge>
                      <Label className="text-zinc-300 text-xs font-medium">Outfit</Label>
                    </div>
                    <Input
                      value={char.lockedOutfit}
                      onChange={(e) => updateCharacter(char.slotIndex, { lockedOutfit: e.target.value })}
                      placeholder="e.g. Black leather jacket, jeans with key chain"
                      className={`bg-zinc-800 border-zinc-700 text-white text-sm ${isLocked ? 'border-emerald-800/50 cursor-not-allowed opacity-80' : ''}`}
                      disabled={disabled || isLocked}
                    />
                  </div>

                  {/* Props */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Badge className="text-[10px] px-1.5 py-0 bg-amber-900/50 text-amber-300 border-amber-800">LOCKED</Badge>
                      <Label className="text-zinc-300 text-xs font-medium">Props / Instruments</Label>
                    </div>
                    <Input
                      value={char.lockedProps}
                      onChange={(e) => updateCharacter(char.slotIndex, { lockedProps: e.target.value })}
                      placeholder="e.g. Sunburst Gibson Les Paul, microphone"
                      className={`bg-zinc-800 border-zinc-700 text-white text-sm ${isLocked ? 'border-emerald-800/50 cursor-not-allowed opacity-80' : ''}`}
                      disabled={disabled || isLocked}
                    />
                  </div>

                  {/* Position */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Badge className="text-[10px] px-1.5 py-0 bg-amber-900/50 text-amber-300 border-amber-800">LOCKED</Badge>
                      <Label className="text-zinc-300 text-xs font-medium">Position</Label>
                    </div>
                    <Input
                      value={char.lockedPosition}
                      onChange={(e) => updateCharacter(char.slotIndex, { lockedPosition: e.target.value })}
                      placeholder="e.g. Standing at microphone, seated behind drum kit"
                      className={`bg-zinc-800 border-zinc-700 text-white text-sm ${isLocked ? 'border-emerald-800/50 cursor-not-allowed opacity-80' : ''}`}
                      disabled={disabled || isLocked}
                    />
                  </div>

                  {/* Rules — must have */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Badge className="text-[10px] px-1.5 py-0 bg-emerald-900/50 text-emerald-300 border-emerald-800">MUST HAVE</Badge>
                      <Label className="text-zinc-300 text-xs font-medium">Mandatory Rules</Label>
                    </div>
                    <CommaInput
                      value={char.lockedRules?.mustHave || []}
                      onChange={(tags) => updateCharacter(char.slotIndex, {
                        lockedRules: { ...char.lockedRules, mustHave: tags }
                      })}
                      placeholder="e.g. standing at microphone, black leather jacket"
                      className={`bg-zinc-800 border-zinc-700 text-white text-sm ${isLocked ? 'border-emerald-800/50 cursor-not-allowed opacity-80' : ''}`}
                      disabled={disabled || isLocked}
                    />
                    <p className="text-zinc-600 text-[10px] mt-0.5">Comma-separated. These MUST appear in every scene.</p>
                  </div>

                  {/* Rules — forbidden */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Badge className="text-[10px] px-1.5 py-0 bg-red-900/50 text-red-300 border-red-800">FORBIDDEN</Badge>
                      <Label className="text-zinc-300 text-xs font-medium">Forbidden</Label>
                    </div>
                    <CommaInput
                      value={char.lockedRules?.forbidden || []}
                      onChange={(tags) => updateCharacter(char.slotIndex, {
                        lockedRules: { ...char.lockedRules, forbidden: tags }
                      })}
                      placeholder="e.g. holding drumsticks, wearing t-shirt only"
                      className={`bg-zinc-800 border-zinc-700 text-white text-sm ${isLocked ? 'border-emerald-800/50 cursor-not-allowed opacity-80' : ''}`}
                      disabled={disabled || isLocked}
                    />
                    <p className="text-zinc-600 text-[10px] mt-0.5">Comma-separated. These must NEVER appear.</p>
                  </div>
                </div>
              </div>

              {/* ── Mode selector — prominent two-button toggle ── */}
              {!disabled && (
                <div>
                  <Label className="text-zinc-400 text-xs mb-2 block">How do you want to add this character?</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {/* Upload Photo */}
                    <button
                      type="button"
                      onClick={() => updateCharacter(char.slotIndex, { mode: "photo" })}
                      className={`flex flex-col items-center gap-2 py-3 px-3 rounded-xl border-2 text-sm font-medium transition-all ${
                        char.mode === "photo"
                          ? "border-zinc-400 bg-zinc-700 text-white"
                          : "border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
                      }`}
                    >
                      <Camera className="w-5 h-5" />
                      <span>Upload Photo</span>
                      <span className="text-xs font-normal text-zinc-500 leading-tight text-center">Real person — exact likeness</span>
                    </button>
                    {/* AI Generate */}
                    <button
                      type="button"
                      onClick={() => updateCharacter(char.slotIndex, { mode: "ai_generated" })}
                      className={`flex flex-col items-center gap-2 py-3 px-3 rounded-xl border-2 text-sm font-medium transition-all ${
                        char.mode === "ai_generated"
                          ? "border-[--color-gold] bg-[--color-gold]/15 text-[--color-gold]"
                          : "border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-[--color-gold]/60 hover:text-zinc-200"
                      }`}
                    >
                      <Sparkles className="w-5 h-5 text-[--color-gold]" />
                      <span>AI Character Builder</span>
                      <span className="text-xs font-normal text-zinc-500 leading-tight text-center">Describe & generate any character</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ── PHOTO MODE ── */}
              {char.mode === "photo" && (
                <div className="space-y-3">
                  {/* Re-analyse button */}
                  {char.photos.length > 0 && !disabled && (
                    <button
                      type="button"
                      onClick={() => handleReanalysePhoto(char.slotIndex)}
                      disabled={isReanalysing || !hasSavedId}
                      className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                        hasSavedId
                          ? "border-[--color-silver]/40 bg-[--color-silver]/10 text-[--color-silver] hover:bg-[--color-silver]/20"
                          : "border-zinc-700 bg-zinc-800/30 text-zinc-600 cursor-not-allowed"
                      }`}
                      title={!hasSavedId ? "Submit the form once to enable re-analysis" : "Re-run AI photo analysis to update the visual brief"}
                    >
                      {isReanalysing ? (
                        <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Re-analysing...</>
                      ) : (
                        <><RefreshCw className="w-3.5 h-3.5" /> Re-analyse Photo</>
                      )}
                    </button>
                  )}

                  {/* Photo upload area */}
                  <div>
                    <input
                      ref={(el) => { photoInputRefs.current[char.slotIndex] = el; }}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      className="hidden"
                      onChange={(e) => handlePhotoFiles(char.slotIndex, e.target.files)}
                    />
                    {char.photos.length === 0 ? (
                      <button
                        type="button"
                        onClick={() => triggerPhotoUpload(char.slotIndex)}
                        disabled={disabled}
                        className="w-full rounded-xl border-2 border-dashed border-zinc-700 hover:border-zinc-500 py-8 flex flex-col items-center justify-center gap-2 text-zinc-400 hover:text-zinc-200 transition-all group"
                      >
                        <div className="w-10 h-10 rounded-full bg-zinc-800 group-hover:bg-zinc-700 flex items-center justify-center transition-colors">
                          <ImagePlus className="w-5 h-5" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium">Upload photos</p>
                          <p className="text-xs text-zinc-600 mt-0.5">JPG, PNG, WebP · Up to 10 photos · 10MB each</p>
                        </div>
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <div className="grid grid-cols-4 gap-2">
                          {char.photos.map((photo, photoIndex) => (
                            <div key={photoIndex} className="relative group rounded-lg overflow-hidden bg-zinc-900" style={{aspectRatio:'3/4'}}>
                              <img src={photo.previewUrl} alt="" className="w-full h-full object-contain" />
                              {photo.isPrimary && (
                                <div className="absolute top-1 left-1">
                                  <Badge className="text-xs px-1 py-0 bg-amber-900/80 text-amber-300 border-amber-700">★</Badge>
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                {!photo.isPrimary && (
                                  <button type="button" onClick={() => setPrimaryPhoto(char.slotIndex, photoIndex)}
                                    className="p-1 rounded bg-amber-600/80 hover:bg-amber-600 text-white" title="Set as primary">
                                    <Sparkles className="w-3 h-3" />
                                  </button>
                                )}
                                <button type="button" onClick={() => removePhoto(char.slotIndex, photoIndex)}
                                  className="p-1 rounded bg-red-600/80 hover:bg-red-600 text-white" title="Remove photo">
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                          {char.photos.length < 10 && !disabled && (
                            <button type="button" onClick={() => triggerPhotoUpload(char.slotIndex)}
                              style={{aspectRatio:'3/4'}}
                              className="rounded-lg border-2 border-dashed border-zinc-700 hover:border-zinc-500 flex items-center justify-center text-zinc-500 hover:text-zinc-300 transition-all">
                              <Plus className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                        <p className="text-zinc-600 text-xs">{char.photos.length} photo{char.photos.length !== 1 ? "s" : ""} · ★ = primary reference</p>
                      </div>
                    )}
                  </div>

                  {/* Locked description (photo mode) */}
                  {char.lockedDescription && (
                    <div className={`rounded-lg border p-3 ${isLocked ? "border-emerald-600/50 bg-emerald-900/10" : "border-zinc-700 bg-zinc-800/30"}`}>
                      <Label className={`text-xs font-medium mb-1.5 block ${isLocked ? "text-emerald-300" : "text-zinc-400"}`}>
                        {isLocked ? "Locked Visual Brief" : "Visual Brief (editable)"}
                      </Label>
                      <Textarea value={char.lockedDescription}
                        onChange={(e) => updateCharacter(char.slotIndex, { lockedDescription: e.target.value })}
                        className={`bg-zinc-900 border-zinc-700 text-sm resize-none min-h-[70px] ${isLocked ? "text-emerald-100 border-emerald-800/50 cursor-not-allowed opacity-80" : "text-white"}`}
                        disabled={disabled || isLocked} rows={3} />
                    </div>
                  )}
                </div>
              )}

              {/* ── AI GENERATE MODE ── */}
              {char.mode === "ai_generated" && (
                <div className="space-y-4">
                  {/* Intro banner */}
                  <div className="rounded-xl bg-gradient-to-br from-[--color-gold]/10 to-[#1a1a1a] border border-[--color-gold]/30 p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[--color-gold] flex items-center justify-center flex-shrink-0">
                        <Wand2 className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-[--color-gold] font-semibold text-sm">AI Character Builder</p>
                        <p className="text-[--color-gold]/70 text-xs mt-0.5 leading-relaxed">
                          Describe any character — real, animated, or fantastical — and the AI will generate a full visual brief and a preview image. Works for Stylised 3D, anime, cartoon, and photorealistic styles.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Style selector */}
                  <div>
                    <Label className="text-zinc-400 text-xs mb-2 block">Character Style</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {AI_STYLES.map((style) => (
                        <button
                          key={style.id}
                          type="button"
                          onClick={() => updateCharacter(char.slotIndex, { aiStyle: style.id })}
                          disabled={disabled}
                          className={`flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl border-2 text-xs font-medium transition-all ${
                            char.aiStyle === style.id
                              ? "border-[--color-gold] bg-[--color-gold]/15 text-[--color-gold]"
                              : "border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
                          }`}
                        >
                          <span className="text-xl">{style.emoji}</span>
                          <span>{style.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Description input */}
                  <div>
                    <Label className="text-zinc-400 text-xs mb-1 block">Describe Your Character *</Label>
                    <Textarea
                      value={char.aiDescription}
                      onChange={(e) => updateCharacter(char.slotIndex, { aiDescription: e.target.value })}
                      placeholder={`Describe what you want...\n\nExamples:\n• ${AI_DESCRIPTION_EXAMPLES[char.slotIndex % AI_DESCRIPTION_EXAMPLES.length]}\n• ${AI_DESCRIPTION_EXAMPLES[(char.slotIndex + 4) % AI_DESCRIPTION_EXAMPLES.length]}`}
                      className="bg-zinc-800 border-zinc-700 text-white text-sm placeholder:text-zinc-600 resize-none min-h-[100px]"
                      disabled={disabled || isGenerating}
                      rows={4}
                    />
                    <p className="text-zinc-600 text-xs mt-1">
                      Be specific: age, gender, clothing style, hair, energy, role in the video. Works for animated characters too!
                    </p>
                  </div>

                  {/* Generate button */}
                  {!disabled && (
                    <Button
                      type="button"
                      onClick={() => handleGenerateCharacter(char.slotIndex)}
                      disabled={isGenerating || !char.aiDescription.trim()}
                      className="w-full bg-gradient-to-r from-[#b8892a] to-[#4a3010] hover:from-[#e8c878] hover:to-[#b8892a] text-white gap-2 py-5 text-base font-semibold shadow-lg shadow-[#b8892a]/30"
                    >
                      {isGenerating ? (
                        <><RefreshCw className="w-5 h-5 animate-spin" /> Generating Character...</>
                      ) : char.aiGeneratedImageUrl ? (
                        <><RefreshCw className="w-5 h-5" /> Regenerate Character</>
                      ) : (
                        <><Wand2 className="w-5 h-5" /> Generate Character Image</>
                      )}
                    </Button>
                  )}

                  {/* Generated preview */}
                  {char.aiGeneratedImageUrl && (
                    <div className="rounded-xl overflow-hidden border border-emerald-600/50 bg-emerald-900/10">
                      <div className="relative">
                        <img
                          src={char.aiGeneratedImageUrl}
                          alt={`${char.name} AI preview`}
                          className="w-full max-h-72 object-cover"
                        />
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-emerald-900/80 text-emerald-300 border-emerald-700 text-xs">
                            AI Generated
                          </Badge>
                        </div>
                      </div>
                      {char.aiGeneratedBrief && (
                        <div className="p-3">
                          <p className="text-zinc-400 text-xs font-medium mb-1">AI Visual Brief:</p>
                          <p className="text-zinc-300 text-xs leading-relaxed">{char.aiGeneratedBrief}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Locked description (ai mode — shows the brief) */}
                  {char.aiGeneratedBrief && (
                    <div className={`rounded-lg border p-3 ${isLocked ? "border-emerald-600/50 bg-emerald-900/10" : "border-zinc-700 bg-zinc-800/30"}`}>
                      <Label className={`text-xs font-medium mb-1.5 block ${isLocked ? "text-emerald-300" : "text-zinc-400"}`}>
                        {isLocked ? "Locked Visual Brief" : "Visual Brief (editable)"}
                      </Label>
                      <Textarea value={char.lockedDescription}
                        onChange={(e) => updateCharacter(char.slotIndex, { lockedDescription: e.target.value })}
                        className={`bg-zinc-900 border-zinc-700 text-sm resize-none min-h-[70px] ${isLocked ? "text-emerald-100 border-emerald-800/50 cursor-not-allowed opacity-80" : "text-white"}`}
                        disabled={disabled || isLocked} rows={3} />
                    </div>
                  )}
                </div>
              )}

              {/* ── Lip Sync ── */}
              <div className={`rounded-lg border p-3 transition-all ${char.enableLipSync ? "border-[--color-gold]/40 bg-[--color-gold]/10" : "border-zinc-700 bg-zinc-800/30"}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Mic className={`w-4 h-4 ${char.enableLipSync ? "text-[--color-gold]" : "text-zinc-500"}`} />
                    <div>
                      <p className="text-white text-sm font-medium">Lip Sync</p>
                      <p className="text-zinc-400 text-xs">
                        Sync mouth to audio track
                        {char.mode === "photo" && char.photos.length === 0 && <span className="text-yellow-400 ml-1">— add a photo first</span>}
                        {char.mode === "ai_generated" && !char.aiGeneratedImageUrl && <span className="text-yellow-400 ml-1">— generate character first</span>}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={char.enableLipSync}
                    onCheckedChange={(v) => {
                      const hasContent = char.mode === "photo" ? char.photos.length > 0 : !!char.aiGeneratedImageUrl;
                      if (v && !hasContent) {
                        toast.error("Add content first", { description: char.mode === "photo" ? "Upload a photo to enable lip sync." : "Generate a character image first." });
                        return;
                      }
                      updateCharacter(char.slotIndex, { enableLipSync: v });
                    }}
                    disabled={disabled}
                  />
                </div>
                {/* Performance sync face video upload — shown when lip sync is enabled */}
                {char.enableLipSync && (
                  <div className="mt-3 border-t border-[--color-gold]/20 pt-3">
                    <p className="text-[11px] font-semibold text-[--color-gold]/70 uppercase tracking-widest mb-2">Performance Sync Video</p>
                    <p className="text-[11px] text-zinc-400 mb-2">
                      Upload a short video (3–10s) of this character's face for realistic lip-sync. Leave empty to use AI-generated mouth animation.
                    </p>
                    {char.faceVideoUrl ? (
                      <div className="flex items-center gap-2">
                        <video src={char.faceVideoUrl} className="w-16 h-16 rounded-lg object-cover border border-[--color-gold]/30" muted playsInline />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white font-medium truncate">Face video uploaded</p>
                          <p className="text-[10px] text-zinc-400">WizSync will sync lips to audio</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => updateCharacter(char.slotIndex, { faceVideoUrl: undefined })}
                          className="text-zinc-500 hover:text-red-400 transition-colors text-xs"
                          disabled={disabled}
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <label className={`flex items-center gap-2 rounded-lg border border-dashed border-[--color-gold]/30 bg-[--color-gold]/5 px-3 py-2 cursor-pointer hover:border-[--color-gold]/60 hover:bg-[--color-gold]/10 transition-all ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
                        <input
                          type="file"
                          accept="video/*"
                          className="hidden"
                          disabled={disabled}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.size > 50 * 1024 * 1024) {
                              toast.error('File too large', { description: 'Face video must be under 50MB.' });
                              return;
                            }
                            // Upload via tRPC upload endpoint
                            const formData = new FormData();
                            formData.append('file', file);
                            try {
                              const res = await fetch('/api/video/upload', { method: 'POST', body: formData });
                              if (!res.ok) throw new Error('Upload failed');
                              const { url } = await res.json() as { url: string };
                              updateCharacter(char.slotIndex, { faceVideoUrl: url });
                              toast.success('Face video uploaded');
                            } catch {
                              toast.error('Upload failed', { description: 'Please try again.' });
                            }
                          }}
                        />
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-[--color-gold]/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        <span className="text-xs text-[--color-gold]/70">Upload face video (MP4/MOV, max 50MB)</span>
                      </label>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Add character button */}
      {!disabled && characters.length < maxCharacters && (
        <button
          type="button"
          onClick={addCharacter}
          className="w-full rounded-xl border-2 border-dashed border-zinc-700 hover:border-zinc-500 py-4 flex items-center justify-center gap-2 text-zinc-400 hover:text-zinc-200 transition-all group"
        >
          <div className="w-8 h-8 rounded-full bg-zinc-800 group-hover:bg-zinc-700 flex items-center justify-center transition-colors">
            <Plus className="w-4 h-4" />
          </div>
          <span className="text-sm font-medium">Add Character {characters.length + 1}{maxCharacters < 99 ? ` of ${maxCharacters}` : ""}</span>
        </button>
      )}

      {characters.length === 0 && (
        <p className="text-zinc-500 text-xs text-center py-2">
          Characters are optional. Add them if you want specific people or characters to appear in your video.
        </p>
      )}

      {/* WizPerformer Privacy Consent Modal — shown before the first photo upload */}
      {pendingUploadSlot !== null && !consentGiven && (
        <WizPerformerConsentModal
          characterName={characters.find(c => c.slotIndex === pendingUploadSlot)?.name || undefined}
          onAccept={() => {
            setConsentGiven(true);
            setPendingUploadSlot(null);
            // Trigger the upload now that consent is given
            setTimeout(() => {
              photoInputRefs.current[pendingUploadSlot!]?.click();
            }, 50);
          }}
          onDecline={() => setPendingUploadSlot(null)}
        />
      )}
    </div>
  );
}
