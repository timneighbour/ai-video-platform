/**
 * EnhancePromptButton — "✦ Enhance Prompt" button that calls the LLM
 * to expand a vague prompt into a detailed, cinematic scene description.
 */
import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface EnhancePromptButtonProps {
  prompt: string;
  toolType: "text_to_video" | "music_video" | "kids_video";
  style?: string;
  characterNames?: string[];
  onEnhanced: (enhanced: string) => void;
  disabled?: boolean;
  className?: string;
}

export function EnhancePromptButton({
  prompt,
  toolType,
  style,
  characterNames,
  onEnhanced,
  disabled,
  className = "",
}: EnhancePromptButtonProps) {
  const [loading, setLoading] = useState(false);
  const enhanceMutation = trpc.engine.enhancePrompt.useMutation();

  const handleEnhance = async () => {
    if (!prompt.trim() || prompt.trim().length < 3) {
      toast.error("Enter at least 3 characters before enhancing");
      return;
    }

    setLoading(true);
    try {
      const result = await enhanceMutation.mutateAsync({
        prompt: prompt.trim(),
        toolType,
        style,
        characterNames,
      });

      if (result.enhanced && result.enhanced !== result.original) {
        onEnhanced(result.enhanced);
        toast.success("Prompt enhanced with cinematic detail");
      } else {
        toast.info("Prompt is already detailed enough");
      }
    } catch {
      toast.error("Enhancement failed — using original prompt");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleEnhance}
      disabled={disabled || loading || !prompt.trim()}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
      style={{
        background: "linear-gradient(135deg, rgba(109,40,217,0.3), rgba(217,70,239,0.2))",
        border: "1px solid rgba(139,92,246,0.3)",
        color: "rgba(196,181,253,1)",
      }}
      title="Enhance your prompt with cinematic detail using AI"
    >
      {loading ? (
        <Loader2 size={13} className="animate-spin" />
      ) : (
        <Sparkles size={13} />
      )}
      {loading ? "Enhancing…" : "Enhance Prompt"}
    </button>
  );
}
