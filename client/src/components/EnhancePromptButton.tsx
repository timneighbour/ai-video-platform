/**
 * EnhancePromptButton — Powered by WizGenesis™
 *
 * A small button that calls the LLM to transform a rough user prompt
 * into a structured, cinematic, AI-friendly video description.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Wand2, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface EnhancePromptButtonProps {
  prompt: string;
  genre?: string;
  mood?: string;
  onEnhanced: (enhanced: string) => void;
}

export default function EnhancePromptButton({
  prompt,
  genre,
  mood,
  onEnhanced,
}: EnhancePromptButtonProps) {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const enhanceMutation = trpc.musicVideo.enhancePrompt.useMutation();

  const handleEnhance = async () => {
    if (!prompt || prompt.trim().length < 3) {
      toast.error("Write at least a few words first", {
        description: "Describe your video idea, then click Enhance.",
      });
      return;
    }
    if (isEnhancing) return;

    setIsEnhancing(true);
    try {
      const result = await enhanceMutation.mutateAsync({
        prompt: prompt.trim(),
        genre: genre || undefined,
        mood: mood || undefined,
      });
      if (result.enhanced && result.enhanced !== prompt.trim()) {
        onEnhanced(result.enhanced);
        toast.success("Prompt enhanced by WizGenesis™", {
          description: "Your vision has been refined into cinematic detail.",
          icon: <Sparkles className="w-4 h-4 text-[--color-silver]" />,
        });
      } else {
        toast.info("Prompt looks good already", {
          description: "No further enhancement needed.",
        });
      }
    } catch (err: any) {
      console.error("[EnhancePrompt] Error:", err);
      toast.error("Enhancement failed", {
        description: err?.message || "Please try again.",
      });
    } finally {
      setIsEnhancing(false);
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleEnhance}
          disabled={isEnhancing || !prompt || prompt.trim().length < 3}
          className="h-7 px-2.5 gap-1.5 text-xs font-semibold text-[--color-silver] hover:text-[--color-silver] hover:bg-[--color-silver]/10 border border-[--color-silver]/20 hover:border-[--color-silver]/40 rounded-lg transition-all duration-200 disabled:opacity-40"
        >
          {isEnhancing ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              Enhancing...
            </>
          ) : (
            <>
              <Wand2 className="w-3 h-3" />
              Enhance
            </>
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[240px] text-center">
        <p className="text-xs font-medium">
          Powered by WizGenesis™ — transforms your rough idea into a structured,
          cinematic video description
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
