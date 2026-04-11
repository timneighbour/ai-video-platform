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
 * Character Lock:
 *   Once locked, the visual brief is injected as a strict constraint into every LLM and image-gen prompt.
 *   Unlocking does NOT erase the description.
 *
 * Character Confirmation (separate step):
 *   After saving, the wizard shows AI-generated preview images per character for approval before storyboard.
 */
import { useRef, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  Plus, Trash2, User, Mic, ImagePlus, X, Star,
  Crown, Lock, LockOpen, ShieldCheck, AlertTriangle,
  RefreshCw, Wand2, Camera, Sparkles, ChevronDown,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CharacterPhoto {
  previewUrl: string;
  base64: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  isPrimary: boolean;
}

export type CharacterMode = "photo" | "ai_generated";
export type AnimationStyle = "realistic" | "pixar3d" | "anime" | "cartoon";

export interface Character {
  slotIndex: number;
  name: string;
  role: string;
  enableLipSync: boolean;
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
  { ring: "ring-purple-500", bg: "bg-purple-900/30", badge: "bg-purple-900/50 text-purple-300 border-purple-800", icon: "bg-purple-600", dot: "bg-purple-400" },
  { ring: "ring-blue-500",   bg: "bg-blue-900/30",   badge: "bg-blue-900/50 text-blue-300 border-blue-800",     icon: "bg-blue-600",   dot: "bg-blue-400" },
  { ring: "ring-pink-500",   bg: "bg-pink-900/30",   badge: "bg-pink-900/50 text-pink-300 border-pink-800",     icon: "bg-pink-600",   dot: "bg-pink-400" },
  { ring: "ring-amber-500",  bg: "bg-amber-900/30",  badge: "bg-amber-900/50 text-amber-300 border-amber-800",  icon: "bg-amber-600",  dot: "bg-amber-400" },
];

const AI_STYLES: { id: AnimationStyle; label: string; desc: string; emoji: string }[] = [
  { id: "realistic",  label: "Realistic",  desc: "Photorealistic human",   emoji: "📸" },
  { id: "pixar3d",    label: "Pixar 3D",   desc: "Disney-Pixar animation", emoji: "🎬" },
  { id: "anime",      label: "Anime",      desc: "Japanese anime style",   emoji: "⛩️" },
  { id: "cartoon",    label: "Cartoon",    desc: "Bold cartoon style",     emoji: "🎨" },
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
    name: `Character ${slotIndex + 1}`,
    role: "",
    enableLipSync: false,
    mode: "photo",
    photos: [],
    aiDescription: "",
    aiStyle: defaultStyle,
    aiGeneratedImageUrl: "",
    aiGeneratedBrief: "",
    lockedDescription: "",
    isLocked: false,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CharacterManager({
  characters,
  onChange,
  maxCharacters = 4,
  disabled = false,
  jobId,
  savedCharacterIds = {},
  videoStyle,
}: CharacterManagerProps) {
  const photoInputRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null]);
  const [reanalysingSlots, setReanalysingSlots] = useState<Set<number>>(new Set());
  const [generatingSlots, setGeneratingSlots] = useState<Set<number>>(new Set());
  const [expandedSlots, setExpandedSlots] = useState<Set<number>>(new Set([0]));

  const reanalyseCharacterPhoto = trpc.musicVideo.reanalyseCharacterPhoto.useMutation();
  const generateCharacterFromDescription = trpc.musicVideo.generateCharacterFromDescription.useMutation();

  const updateCharacter = (slotIndex: number, patch: Partial<Character>) =>
    onChange(characters.map((c) => c.slotIndex === slotIndex ? { ...c, ...patch } : c));

  const addCharacter = () => {
    if (characters.length >= maxCharacters) return;
    const nextSlot = characters.length;
    const newChar = createEmptyCharacter(nextSlot, videoStyle);
    onChange([...characters, newChar]);
    setExpandedSlots(prev => new Set(prev).add(nextSlot));
  };

  const removeCharacter = (slotIndex: number) => {
    const updated = characters
      .filter((c) => c.slotIndex !== slotIndex)
      .map((c, i) => ({ ...c, slotIndex: i }));
    onChange(updated);
  };

  const toggleExpanded = (slotIndex: number) => {
    setExpandedSlots(prev => {
      const next = new Set(prev);
      if (next.has(slotIndex)) next.delete(slotIndex); else next.add(slotIndex);
      return next;
    });
  };

  const toggleLock = (slotIndex: number) => {
    const char = characters.find((c) => c.slotIndex === slotIndex);
    if (!char) return;
    if (!char.isLocked) {
      const hasContent = char.mode === "photo" ? char.photos.length > 0 : char.aiGeneratedBrief.trim().length > 0;
      updateCharacter(slotIndex, { isLocked: true });
      if (hasContent) {
        toast.success(`${char.name} locked`, { description: "Appearance will be consistent across all scenes." });
      } else {
        toast.info(`${char.name} marked for locking`, { description: char.mode === "photo" ? "Upload a photo to lock this character's look." : "Generate a character first to lock the look." });
      }
    } else {
      updateCharacter(slotIndex, { isLocked: false });
      toast.info(`${char.name} unlocked`);
    }
  };

  // Re-analyse photo (requires saved character in DB)
  const handleReanalysePhoto = async (slotIndex: number) => {
    const char = characters.find((c) => c.slotIndex === slotIndex);
    if (!char) return;
    const characterId = savedCharacterIds[slotIndex];
    if (!characterId || !jobId) {
      toast.error("Save characters first", { description: "The Re-analyse button works after the job is created." });
      return;
    }
    if (char.photos.length === 0) {
      toast.error("No photo to analyse", { description: "Upload a reference photo first." });
      return;
    }
    setReanalysingSlots(prev => new Set(prev).add(slotIndex));
    toast.loading(`Analysing ${char.name}'s photo...`, { id: `reanalyse-${slotIndex}` });
    try {
      const result = await reanalyseCharacterPhoto.mutateAsync({ characterId, jobId });
      updateCharacter(slotIndex, { lockedDescription: result.description, isLocked: true });
      toast.success(`${char.name} re-analysed`, { id: `reanalyse-${slotIndex}`, description: "Appearance description updated." });
    } catch (err: any) {
      toast.error(`Failed to re-analyse ${char.name}`, { id: `reanalyse-${slotIndex}`, description: err?.message ?? "Please try again." });
    } finally {
      setReanalysingSlots(prev => { const n = new Set(prev); n.delete(slotIndex); return n; });
    }
  };

  // Generate character from AI description
  const handleGenerateCharacter = async (slotIndex: number) => {
    const char = characters.find((c) => c.slotIndex === slotIndex);
    if (!char) return;
    if (!char.aiDescription.trim() || char.aiDescription.trim().length < 5) {
      toast.error("Add a description", { description: "Describe what you want this character to look like." });
      return;
    }
    setGeneratingSlots(prev => new Set(prev).add(slotIndex));
    toast.loading(`Creating ${char.name}...`, { id: `generate-${slotIndex}` });
    try {
      const result = await generateCharacterFromDescription.mutateAsync({
        name: char.name,
        role: char.role || undefined,
        description: char.aiDescription,
        style: char.aiStyle,
      });
      updateCharacter(slotIndex, {
        aiGeneratedBrief: result.visualBrief,
        aiGeneratedImageUrl: result.imageUrl,
        lockedDescription: result.visualBrief,
        isLocked: true,
      });
      toast.success(`${char.name} created!`, { id: `generate-${slotIndex}`, description: "Preview image generated. You can regenerate or adjust the description." });
    } catch (err: any) {
      toast.error(`Failed to generate ${char.name}`, { id: `generate-${slotIndex}`, description: err?.message ?? "Please try again." });
    } finally {
      setGeneratingSlots(prev => { const n = new Set(prev); n.delete(slotIndex); return n; });
    }
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
    <div className="space-y-3">
      {characters.map((char) => {
        const colors = SLOT_COLORS[char.slotIndex] ?? SLOT_COLORS[0];
        const isLocked = char.isLocked;
        const isReanalysing = reanalysingSlots.has(char.slotIndex);
        const isGenerating = generatingSlots.has(char.slotIndex);
        const hasSavedId = !!savedCharacterIds[char.slotIndex] && !!jobId;
        const isExpanded = expandedSlots.has(char.slotIndex);
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
            <div
              className={`px-4 py-3 flex items-center gap-3 cursor-pointer ${isLocked ? "bg-emerald-900/20" : colors.bg} border-b border-zinc-700/50`}
              onClick={() => toggleExpanded(char.slotIndex)}
            >
              {/* Slot icon */}
              <div className={`w-8 h-8 rounded-lg ${isLocked ? "bg-emerald-700" : colors.icon} flex items-center justify-center flex-shrink-0`}>
                {isLocked ? <ShieldCheck className="w-4 h-4 text-white" /> :
                 char.slotIndex === 0 ? <Crown className="w-4 h-4 text-white" /> :
                 <User className="w-4 h-4 text-white" />}
              </div>

              {/* Name */}
              <span className="text-white font-semibold text-sm truncate max-w-[120px]">{char.name}</span>

              {/* Mode badge */}
              <Badge className={`text-xs ${isLocked ? "bg-emerald-900/60 text-emerald-300 border-emerald-700" : colors.badge}`}>
                {isLocked ? "🔒 Locked" : char.mode === "ai_generated" ? "✨ AI" : "📷 Photo"}
              </Badge>

              {/* Preview thumbnail */}
              {hasPreview && (
                <div className="w-7 h-7 rounded-md overflow-hidden flex-shrink-0 ring-1 ring-zinc-600">
                  <img
                    src={char.mode === "ai_generated" ? char.aiGeneratedImageUrl : char.photos[0]?.previewUrl}
                    alt={char.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="flex-1" />

              {/* Lock toggle */}
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggleLock(char.slotIndex); }}
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
                  onClick={(e) => { e.stopPropagation(); removeCharacter(char.slotIndex); }}
                  className="text-zinc-500 hover:text-red-400 transition-colors p-1 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
            </div>

            {/* ── Expanded body ── */}
            {isExpanded && (
              <div className="p-4 space-y-4">
                {/* Name + Role */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-zinc-400 text-xs mb-1 block">Name *</Label>
                    <Input value={char.name} onChange={(e) => updateCharacter(char.slotIndex, { name: e.target.value })}
                      placeholder="e.g. Alex, Lead Singer" className="bg-zinc-800 border-zinc-700 text-white text-sm" disabled={disabled} />
                  </div>
                  <div>
                    <Label className="text-zinc-400 text-xs mb-1 block">Role</Label>
                    <Input value={char.role} onChange={(e) => updateCharacter(char.slotIndex, { role: e.target.value })}
                      placeholder="e.g. Lead Singer, Dancer" className="bg-zinc-800 border-zinc-700 text-white text-sm" disabled={disabled} />
                  </div>
                </div>

                {/* Mode selector */}
                {!disabled && (
                  <div className="flex rounded-lg overflow-hidden border border-zinc-700">
                    <button
                      type="button"
                      onClick={() => updateCharacter(char.slotIndex, { mode: "photo" })}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-all ${
                        char.mode === "photo" ? "bg-zinc-700 text-white" : "bg-zinc-800/50 text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <Camera className="w-4 h-4" />
                      Upload Photo
                    </button>
                    <button
                      type="button"
                      onClick={() => updateCharacter(char.slotIndex, { mode: "ai_generated" })}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-all ${
                        char.mode === "ai_generated" ? "bg-violet-800 text-white" : "bg-zinc-800/50 text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <Sparkles className="w-4 h-4" />
                      AI Generate
                    </button>
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
                        disabled={isReanalysing}
                        className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium border transition-all ${
                          isReanalysing ? "border-violet-600/40 bg-violet-900/20 text-violet-400 cursor-wait" :
                          hasSavedId ? "border-violet-600/60 bg-violet-900/30 text-violet-300 hover:bg-violet-900/50" :
                          "border-zinc-700 bg-zinc-800/50 text-zinc-500 cursor-not-allowed"
                        }`}
                        title={hasSavedId ? "Re-analyse photo to regenerate detailed appearance description" : "Save characters first to enable re-analysis"}
                      >
                        <RefreshCw className={`w-4 h-4 ${isReanalysing ? "animate-spin" : ""}`} />
                        {isReanalysing ? "Analysing photo..." : "Re-analyse Photo"}
                      </button>
                    )}

                    {/* Photo grid */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-zinc-400 text-xs">Reference Photos ({char.photos.length}/10)</Label>
                        <span className="text-zinc-500 text-xs">★ = primary</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {char.photos.map((photo, photoIdx) => (
                          <div key={photoIdx} className="relative group">
                            <img src={photo.previewUrl} alt={`${char.name} ${photoIdx + 1}`}
                              className={`w-16 h-16 rounded-lg object-cover border-2 ${photo.isPrimary ? "border-yellow-500" : "border-zinc-700 group-hover:border-zinc-500"}`} />
                            <button type="button" onClick={() => setPrimaryPhoto(char.slotIndex, photoIdx)}
                              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full flex items-center justify-center ${photo.isPrimary ? "bg-yellow-500 text-black" : "bg-black/60 text-zinc-400 opacity-0 group-hover:opacity-100"}`}
                              disabled={disabled}>
                              <Star className="w-2.5 h-2.5" fill={photo.isPrimary ? "currentColor" : "none"} />
                            </button>
                            {!disabled && !isLocked && (
                              <button type="button" onClick={() => removePhoto(char.slotIndex, photoIdx)}
                                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100">
                                <X className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        ))}
                        {!disabled && !isLocked && char.photos.length < 10 && (
                          <button type="button" onClick={() => photoInputRefs.current[char.slotIndex]?.click()}
                            className="w-16 h-16 rounded-lg border-2 border-dashed border-zinc-600 hover:border-zinc-400 flex flex-col items-center justify-center gap-1 text-zinc-500 hover:text-zinc-300 transition-all">
                            <ImagePlus className="w-5 h-5" />
                            <span className="text-xs">Add</span>
                          </button>
                        )}
                        <input ref={(el) => { photoInputRefs.current[char.slotIndex] = el; }} type="file"
                          accept="image/jpeg,image/png,image/webp" multiple className="hidden"
                          onChange={(e) => handlePhotoFiles(char.slotIndex, e.target.files)} />
                      </div>
                      {char.photos.length === 0 && (
                        <p className="text-zinc-500 text-xs mt-2">Upload at least one photo so the AI can recognise this character.</p>
                      )}
                    </div>

                    {/* Locked description (photo mode) */}
                    <div className={`rounded-lg border p-3 ${isLocked ? "border-emerald-600/50 bg-emerald-900/10" : "border-zinc-700 bg-zinc-800/30"}`}>
                      <Label className={`text-xs font-medium mb-1.5 block ${isLocked ? "text-emerald-300" : "text-zinc-400"}`}>
                        {isLocked ? "🔒 Locked Visual Brief" : "Visual Appearance Brief"}
                      </Label>
                      <Textarea value={char.lockedDescription}
                        onChange={(e) => updateCharacter(char.slotIndex, { lockedDescription: e.target.value })}
                        placeholder={char.photos.length > 0 ? "AI will auto-analyse your photo. You can override here." : "Describe exact appearance: hair colour, clothing, features, etc."}
                        className={`bg-zinc-900 border-zinc-700 text-sm resize-none min-h-[70px] ${isLocked ? "text-emerald-100 border-emerald-800/50 cursor-not-allowed opacity-80" : "text-white"}`}
                        disabled={disabled || isLocked} rows={3} />
                      {!isLocked && char.photos.length > 0 && (
                        <p className="text-zinc-500 text-xs mt-1 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-500" />
                          AI will analyse your photo and lock the appearance at the confirmation step.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* ── AI GENERATE MODE ── */}
                {char.mode === "ai_generated" && (
                  <div className="space-y-3">
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
                            className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg border text-xs font-medium transition-all ${
                              char.aiStyle === style.id
                                ? "border-violet-500 bg-violet-900/40 text-violet-200"
                                : "border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
                            }`}
                          >
                            <span className="text-base">{style.emoji}</span>
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
                        className="bg-zinc-800 border-zinc-700 text-white text-sm placeholder:text-zinc-600 resize-none min-h-[90px]"
                        disabled={disabled || isGenerating}
                        rows={4}
                      />
                      <p className="text-zinc-600 text-xs mt-1">
                        Be specific: age, gender, clothing style, hair, energy, role in the video.
                      </p>
                    </div>

                    {/* Generate button */}
                    {!disabled && (
                      <Button
                        type="button"
                        onClick={() => handleGenerateCharacter(char.slotIndex)}
                        disabled={isGenerating || !char.aiDescription.trim()}
                        className="w-full bg-violet-700 hover:bg-violet-600 text-white gap-2"
                      >
                        {isGenerating ? (
                          <><RefreshCw className="w-4 h-4 animate-spin" /> Generating Character...</>
                        ) : char.aiGeneratedImageUrl ? (
                          <><RefreshCw className="w-4 h-4" /> Regenerate Character</>
                        ) : (
                          <><Wand2 className="w-4 h-4" /> Generate Character</>
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
                            className="w-full max-h-64 object-cover"
                          />
                          <div className="absolute top-2 right-2">
                            <Badge className="bg-emerald-900/80 text-emerald-300 border-emerald-700 text-xs">
                              ✨ AI Generated
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
                          {isLocked ? "🔒 Locked Visual Brief" : "Visual Brief (editable)"}
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
                <div className={`rounded-lg border p-3 transition-all ${char.enableLipSync ? "border-pink-700/60 bg-pink-900/20" : "border-zinc-700 bg-zinc-800/30"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Mic className={`w-4 h-4 ${char.enableLipSync ? "text-pink-400" : "text-zinc-500"}`} />
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
                          toast.warning(char.mode === "photo" ? "Add a photo first" : "Generate a character first");
                          return;
                        }
                        updateCharacter(char.slotIndex, { enableLipSync: v });
                      }}
                      disabled={disabled}
                    />
                  </div>
                </div>
              </div>
            )}
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
          <span className="text-sm font-medium">Add Character {characters.length + 1} of {maxCharacters}</span>
        </button>
      )}

      {characters.length === 0 && (
        <p className="text-zinc-500 text-xs text-center py-2">
          Characters are optional. Add them if you want specific people or characters to appear in your video.
        </p>
      )}
    </div>
  );
}
