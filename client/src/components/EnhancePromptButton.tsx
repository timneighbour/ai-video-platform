/**
 * EnhancePromptButton — Powered by WizGenesis™
 *
 * A button that calls the WIZ AI LLM to transform a rough user prompt
 * into a structured, cinematic, AI-friendly description.
 * Shows the enhanced result in a panel with Copy and Apply buttons.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Wand2, Loader2, Sparkles, Copy, Check, ArrowRight, X } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type PromptProductType =
  | "music_video"
  | "kids_video"
  | "shorts"
  | "audio"
  | "script"
  | "lipsync"
  | "general";

interface EnhancePromptButtonProps {
  prompt: string;
  genre?: string;
  mood?: string;
  characters?: string[];
  productType?: PromptProductType;
  onEnhanced: (enhanced: string) => void;
  /** If true, shows the result panel inline below the button */
  showResultPanel?: boolean;
}

export default function EnhancePromptButton({
  prompt,
  genre,
  mood,
  characters,
  productType = "general",
  onEnhanced,
  showResultPanel = true,
}: EnhancePromptButtonProps) {
  const [enhanced, setEnhanced] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const enhanceMutation = trpc.musicVideo.enhancePrompt.useMutation();

  const handleEnhance = async () => {
    if (!prompt || prompt.trim().length < 3) {
      toast.error("Write at least a few words first", {
        description: "Describe your idea, then click Enhance.",
      });
      return;
    }
    setEnhanced(null);
    try {
      const result = await enhanceMutation.mutateAsync({
        prompt: prompt.trim(),
        genre: genre || undefined,
        mood: mood || undefined,
        characters: characters?.filter(Boolean),
        productType,
      });
      if (result.enhanced && result.enhanced !== prompt.trim()) {
        if (showResultPanel) {
          setEnhanced(result.enhanced);
        } else {
          onEnhanced(result.enhanced);
          toast.success("Prompt enhanced by WizGenesis™", {
            description: "Your vision has been refined into cinematic detail.",
            icon: <Sparkles className="w-4 h-4 text-amber-400" />,
          });
        }
      } else {
        toast.info("Prompt looks good already", {
          description: "No further enhancement needed.",
        });
      }
    } catch (err: any) {
      toast.error("Enhancement failed", {
        description: err?.message || "Please try again.",
      });
    }
  };

  const handleCopy = async () => {
    if (!enhanced) return;
    try {
      await navigator.clipboard.writeText(enhanced);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy — please select and copy manually");
    }
  };

  const handleApply = () => {
    if (enhanced) {
      onEnhanced(enhanced);
      setEnhanced(null);
      toast.success("Enhanced prompt applied");
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleEnhance}
            disabled={enhanceMutation.isPending || !prompt || prompt.trim().length < 3}
            className="h-7 px-2.5 gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 border border-amber-500/30 hover:border-amber-500/50 rounded-lg transition-all duration-200 disabled:opacity-40"
          >
            {enhanceMutation.isPending ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Enhancing…
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
            Powered by WizGenesis™ — transforms your rough idea into a precise,
            production-ready AI prompt
          </p>
        </TooltipContent>
      </Tooltip>

      {/* Enhanced result panel */}
      {enhanced && showResultPanel && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between mb-0.5">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wide">
                WizGenesis™ Enhanced
              </span>
            </div>
            <button
              type="button"
              onClick={() => setEnhanced(null)}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
            {enhanced}
          </p>
          <div className="flex items-center gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              onClick={handleApply}
              className="h-7 gap-1 text-xs bg-amber-500 hover:bg-amber-400 text-black font-semibold"
            >
              <ArrowRight className="h-3 w-3" />
              Apply
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleCopy}
              className="h-7 gap-1 text-xs border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-400" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
