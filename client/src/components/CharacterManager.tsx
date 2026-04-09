/**
 * CharacterManager
 * Allows users to define up to 4 named characters for a music/animation video.
 * Each character can have multiple reference photos and an optional lip sync toggle.
 *
 * Usage:
 *   <CharacterManager
 *     characters={characters}
 *     onChange={setCharacters}
 *     maxCharacters={4}
 *   />
 */
import { useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  User,
  Mic,
  ImagePlus,
  X,
  Star,
  Crown,
} from "lucide-react";

export interface CharacterPhoto {
  /** Local preview URL (object URL) — only used before upload */
  previewUrl: string;
  /** Base64 content (without data: prefix) — sent to server */
  base64: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  isPrimary: boolean;
}

export interface Character {
  slotIndex: number; // 0-3
  name: string;
  role: string;
  enableLipSync: boolean;
  photos: CharacterPhoto[];
}

interface CharacterManagerProps {
  characters: Character[];
  onChange: (characters: Character[]) => void;
  maxCharacters?: number;
  disabled?: boolean;
}

const SLOT_COLORS = [
  { ring: "ring-purple-500", bg: "bg-purple-900/30", badge: "bg-purple-900/50 text-purple-300 border-purple-800", icon: "bg-purple-600", label: "Character 1" },
  { ring: "ring-blue-500",   bg: "bg-blue-900/30",   badge: "bg-blue-900/50 text-blue-300 border-blue-800",     icon: "bg-blue-600",   label: "Character 2" },
  { ring: "ring-pink-500",   bg: "bg-pink-900/30",   badge: "bg-pink-900/50 text-pink-300 border-pink-800",     icon: "bg-pink-600",   label: "Character 3" },
  { ring: "ring-amber-500",  bg: "bg-amber-900/30",  badge: "bg-amber-900/50 text-amber-300 border-amber-800",  icon: "bg-amber-600",  label: "Character 4" },
];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function validateImageFile(file: File): boolean {
  const validTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!validTypes.includes(file.type)) {
    toast.error("Invalid image type", { description: "Please upload a JPG, PNG, or WebP image." });
    return false;
  }
  if (file.size > 10 * 1024 * 1024) {
    toast.error("Image too large", { description: "Maximum image size is 10MB." });
    return false;
  }
  return true;
}

export function CharacterManager({
  characters,
  onChange,
  maxCharacters = 4,
  disabled = false,
}: CharacterManagerProps) {
  const photoInputRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null]);

  const addCharacter = () => {
    if (characters.length >= maxCharacters) return;
    const nextSlot = characters.length;
    onChange([
      ...characters,
      {
        slotIndex: nextSlot,
        name: `Character ${nextSlot + 1}`,
        role: "",
        enableLipSync: false,
        photos: [],
      },
    ]);
  };

  const removeCharacter = (slotIndex: number) => {
    const updated = characters
      .filter((c) => c.slotIndex !== slotIndex)
      .map((c, i) => ({ ...c, slotIndex: i })); // Re-index
    onChange(updated);
  };

  const updateCharacter = (slotIndex: number, patch: Partial<Character>) => {
    onChange(characters.map((c) => c.slotIndex === slotIndex ? { ...c, ...patch } : c));
  };

  const handlePhotoFiles = useCallback(async (slotIndex: number, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const char = characters.find((c) => c.slotIndex === slotIndex);
    if (!char) return;

    const remaining = 10 - char.photos.length;
    if (remaining <= 0) {
      toast.error("Photo limit reached", { description: "Maximum 10 photos per character." });
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remaining);
    const newPhotos: CharacterPhoto[] = [];

    for (const file of filesToProcess) {
      if (!validateImageFile(file)) continue;
      const base64 = await fileToBase64(file);
      const previewUrl = URL.createObjectURL(file);
      newPhotos.push({
        previewUrl,
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
    // Ensure first photo is primary
    if (updated.length > 0 && !updated.some((p) => p.isPrimary)) {
      updated[0] = { ...updated[0], isPrimary: true };
    }
    updateCharacter(slotIndex, { photos: updated });
  };

  const setPrimaryPhoto = (slotIndex: number, photoIndex: number) => {
    const char = characters.find((c) => c.slotIndex === slotIndex);
    if (!char) return;
    const updated = char.photos.map((p, i) => ({ ...p, isPrimary: i === photoIndex }));
    updateCharacter(slotIndex, { photos: updated });
  };

  return (
    <div className="space-y-4">
      {/* Character slots */}
      {characters.map((char) => {
        const colors = SLOT_COLORS[char.slotIndex] ?? SLOT_COLORS[0];
        return (
          <div
            key={char.slotIndex}
            className={`rounded-xl border border-zinc-700 overflow-hidden transition-all ${char.photos.length > 0 ? `ring-1 ${colors.ring}` : ""}`}
          >
            {/* Character header */}
            <div className={`px-4 py-3 flex items-center gap-3 ${colors.bg} border-b border-zinc-700/50`}>
              <div className={`w-8 h-8 rounded-lg ${colors.icon} flex items-center justify-center flex-shrink-0`}>
                {char.slotIndex === 0 ? <Crown className="w-4 h-4 text-white" /> : <User className="w-4 h-4 text-white" />}
              </div>
              <Badge className={`${colors.badge} text-xs`}>{colors.label}</Badge>
              <div className="flex-1" />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeCharacter(char.slotIndex)}
                  className="text-zinc-500 hover:text-red-400 transition-colors p-1 rounded"
                  title="Remove character"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="p-4 space-y-4">
              {/* Name + Role */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-zinc-400 text-xs mb-1 block">Character Name *</Label>
                  <Input
                    value={char.name}
                    onChange={(e) => updateCharacter(char.slotIndex, { name: e.target.value })}
                    placeholder="e.g. Alex, Lead Singer"
                    className="bg-zinc-800 border-zinc-700 text-white text-sm placeholder:text-zinc-500"
                    disabled={disabled}
                  />
                </div>
                <div>
                  <Label className="text-zinc-400 text-xs mb-1 block">Role / Description</Label>
                  <Input
                    value={char.role}
                    onChange={(e) => updateCharacter(char.slotIndex, { role: e.target.value })}
                    placeholder="e.g. Lead Singer, Dancer"
                    className="bg-zinc-800 border-zinc-700 text-white text-sm placeholder:text-zinc-500"
                    disabled={disabled}
                  />
                </div>
              </div>

              {/* Photos */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-zinc-400 text-xs">Reference Photos ({char.photos.length}/10)</Label>
                  <span className="text-zinc-500 text-xs">First photo = primary. Click ★ to change.</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {/* Existing photos */}
                  {char.photos.map((photo, photoIdx) => (
                    <div key={photoIdx} className="relative group">
                      <img
                        src={photo.previewUrl}
                        alt={`${char.name} photo ${photoIdx + 1}`}
                        className={`w-16 h-16 rounded-lg object-cover border-2 transition-all ${
                          photo.isPrimary ? "border-yellow-500" : "border-zinc-700 group-hover:border-zinc-500"
                        }`}
                      />
                      {/* Primary star */}
                      <button
                        type="button"
                        onClick={() => setPrimaryPhoto(char.slotIndex, photoIdx)}
                        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                          photo.isPrimary
                            ? "bg-yellow-500 text-black"
                            : "bg-black/60 text-zinc-400 opacity-0 group-hover:opacity-100"
                        }`}
                        title={photo.isPrimary ? "Primary photo" : "Set as primary"}
                        disabled={disabled}
                      >
                        <Star className="w-2.5 h-2.5" fill={photo.isPrimary ? "currentColor" : "none"} />
                      </button>
                      {/* Remove button */}
                      {!disabled && (
                        <button
                          type="button"
                          onClick={() => removePhoto(char.slotIndex, photoIdx)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove photo"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  ))}

                  {/* Add photo button */}
                  {!disabled && char.photos.length < 10 && (
                    <button
                      type="button"
                      onClick={() => photoInputRefs.current[char.slotIndex]?.click()}
                      className="w-16 h-16 rounded-lg border-2 border-dashed border-zinc-600 hover:border-zinc-400 flex flex-col items-center justify-center gap-1 text-zinc-500 hover:text-zinc-300 transition-all"
                      title="Add photo"
                    >
                      <ImagePlus className="w-5 h-5" />
                      <span className="text-xs">Add</span>
                    </button>
                  )}

                  <input
                    ref={(el) => { photoInputRefs.current[char.slotIndex] = el; }}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="hidden"
                    onChange={(e) => handlePhotoFiles(char.slotIndex, e.target.files)}
                  />
                </div>

                {char.photos.length === 0 && (
                  <p className="text-zinc-500 text-xs mt-2">
                    No photos yet. Add at least one so the AI can recognise this character.
                  </p>
                )}
              </div>

              {/* Lip sync toggle */}
              <div className={`rounded-lg border p-3 transition-all ${
                char.enableLipSync ? "border-pink-700/60 bg-pink-900/20" : "border-zinc-700 bg-zinc-800/30"
              }`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Mic className={`w-4 h-4 ${char.enableLipSync ? "text-pink-400" : "text-zinc-500"}`} />
                    <div>
                      <p className="text-white text-sm font-medium">Lip Sync</p>
                      <p className="text-zinc-400 text-xs">
                        Sync this character's mouth to the audio track
                        {char.photos.length === 0 && (
                          <span className="text-yellow-400 ml-1">— add a photo first</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={char.enableLipSync}
                    onCheckedChange={(v) => {
                      if (v && char.photos.length === 0) {
                        toast.warning("Add a photo first", { description: "Lip sync requires at least one reference photo." });
                        return;
                      }
                      updateCharacter(char.slotIndex, { enableLipSync: v });
                    }}
                    disabled={disabled}
                  />
                </div>
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
          <span className="text-sm font-medium">
            Add Character {characters.length + 1} of {maxCharacters}
          </span>
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
