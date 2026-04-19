import { useState } from "react";
import { Sparkles, Copy, Check, ArrowRight, Loader2 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

export type PromptProductType =
  | "music_video"
  | "kids_video"
  | "shorts"
  | "audio"
  | "script"
  | "lipsync"
  | "general";

interface PromptEnhancerProps {
  /** The current prompt value (controlled) */
  value: string;
  /** Called when the user changes the textarea */
  onChange: (value: string) => void;
  /** Called when the user clicks Apply on the enhanced result */
  onApply?: (enhanced: string) => void;
  /** Placeholder text for the textarea */
  placeholder?: string;
  /** Product type — determines the AI enhancement style */
  productType?: PromptProductType;
  /** Optional genre context */
  genre?: string;
  /** Optional mood context */
  mood?: string;
  /** Optional character names in this scene */
  characters?: string[];
  /** Additional className for the wrapper */
  className?: string;
  /** Rows for the textarea */
  rows?: number;
  /** Whether to show the textarea (false = enhancer-only mode, no textarea) */
  showTextarea?: boolean;
  /** Label shown above the textarea */
  label?: string;
}

export function PromptEnhancer({
  value,
  onChange,
  onApply,
  placeholder = "Describe what you want to see…",
  productType = "general",
  genre,
  mood,
  characters,
  className,
  rows = 3,
  showTextarea = true,
  label,
}: PromptEnhancerProps) {
  const [enhanced, setEnhanced] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const enhanceMutation = trpc.musicVideo.enhancePrompt.useMutation({
    onSuccess: (data) => {
      setEnhanced(data.enhanced);
    },
    onError: () => {
      toast.error("Could not enhance prompt", {
        description: "Please try again or edit manually.",
      });
    },
  });

  const handleEnhance = () => {
    if (!value.trim() || value.trim().length < 3) {
      toast.error("Please enter a description first");
      return;
    }
    setEnhanced(null);
    enhanceMutation.mutate({
      prompt: value.trim(),
      genre,
      mood,
      characters,
      productType,
    });
  };

  const handleCopy = async () => {
    const text = enhanced ?? value;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy — please select and copy manually");
    }
  };

  const handleApply = () => {
    if (enhanced) {
      onChange(enhanced);
      if (onApply) onApply(enhanced);
      setEnhanced(null);
      toast.success("Enhanced prompt applied");
    }
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label && (
        <label className="text-sm font-medium text-foreground">{label}</label>
      )}

      {showTextarea && (
        <div className="relative">
          <Textarea
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setEnhanced(null); // clear enhanced if user edits
            }}
            placeholder={placeholder}
            rows={rows}
            className="resize-none pr-28 text-sm"
          />
          {/* Enhance button inside textarea */}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleEnhance}
            disabled={enhanceMutation.isPending || !value.trim()}
            className="absolute bottom-2 right-2 h-7 gap-1 text-xs bg-background border-amber-500/50 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
          >
            {enhanceMutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            {enhanceMutation.isPending ? "Enhancing…" : "Enhance"}
          </Button>
        </div>
      )}

      {/* Standalone enhance button (when showTextarea=false) */}
      {!showTextarea && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleEnhance}
          disabled={enhanceMutation.isPending || !value.trim()}
          className="self-start gap-1.5 border-amber-500/50 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
        >
          {enhanceMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {enhanceMutation.isPending ? "Enhancing with WIZ AI…" : "Enhance with WIZ AI"}
        </Button>
      )}

      {/* Enhanced result box */}
      {enhanced && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 flex flex-col gap-2">
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wide">
              WIZ AI Enhanced
            </span>
          </div>
          <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
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
              className="h-7 gap-1 text-xs"
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-400" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
              {copied ? "Copied!" : "Copy"}
            </Button>
            <button
              type="button"
              onClick={() => setEnhanced(null)}
              className="ml-auto text-xs text-muted-foreground hover:text-foreground"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
