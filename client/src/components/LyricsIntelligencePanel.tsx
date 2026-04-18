import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Sparkles,
  Eye,
  Flame,
  Heart,
  Zap,
  Cloud,
  Music,
  Film,
  Loader2,
  ChevronDown,
  ChevronUp,
  Pencil,
  Check,
  X,
  ArrowRight,
} from "lucide-react";

interface LyricBlock {
  line: string;
  emotion: string;
  sceneType: string;
  visualCues: string[];
  intensity: number; // 1-10
}

interface LyricsIntelligencePanelProps {
  lyrics: string;
  genre: string;
  mood: string;
  style: string;
  onConfirm: (analysedBlocks: LyricBlock[]) => void;
  onBack: () => void;
}

const EMOTION_ICONS: Record<string, React.ReactNode> = {
  intense: <Flame className="w-3.5 h-3.5" />,
  passionate: <Heart className="w-3.5 h-3.5" />,
  energetic: <Zap className="w-3.5 h-3.5" />,
  melancholic: <Cloud className="w-3.5 h-3.5" />,
  dreamy: <Eye className="w-3.5 h-3.5" />,
  powerful: <Zap className="w-3.5 h-3.5" />,
  tender: <Heart className="w-3.5 h-3.5" />,
  dark: <Flame className="w-3.5 h-3.5" />,
  hopeful: <Sparkles className="w-3.5 h-3.5" />,
  triumphant: <Sparkles className="w-3.5 h-3.5" />,
};

const EMOTION_COLORS: Record<string, string> = {
  intense: "bg-red-500/20 text-red-300 border-red-500/30",
  passionate: "bg-[--color-silver]/10 text-[--color-silver] border-[--color-silver]/30",
  energetic: "bg-[--color-gold]/15 text-[--color-gold] border-[--color-gold]/30",
  melancholic: "bg-[--color-gold]/15 text-[--color-gold] border-[--color-gold]/30",
  dreamy: "bg-[--color-gold]/15 text-[--color-gold] border-[--color-gold]/30",
  powerful: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  tender: "bg-[--color-silver]/10 text-[--color-silver] border-rose-500/30",
  dark: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
  hopeful: "bg-[--color-silver]/10 text-[--color-silver] border-[--color-silver]/30",
  triumphant: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
};

function getEmotionColor(emotion: string): string {
  const key = emotion.toLowerCase();
  return EMOTION_COLORS[key] || "bg-[--color-gold]/15 text-[--color-gold] border-[--color-gold]/30";
}

function getEmotionIcon(emotion: string): React.ReactNode {
  const key = emotion.toLowerCase();
  return EMOTION_ICONS[key] || <Sparkles className="w-3.5 h-3.5" />;
}

function getIntensityBar(intensity: number): string {
  const clamped = Math.max(1, Math.min(10, intensity));
  if (clamped >= 8) return "bg-red-500";
  if (clamped >= 6) return "bg-[--color-gold]";
  if (clamped >= 4) return "bg-[--color-gold]";
  return "bg-[--color-gold]";
}

export default function LyricsIntelligencePanel({
  lyrics,
  genre,
  mood,
  style,
  onConfirm,
  onBack,
}: LyricsIntelligencePanelProps) {
  const [blocks, setBlocks] = useState<LyricBlock[]>([]);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [hasAnalysed, setHasAnalysed] = useState(false);
  const [expandedBlock, setExpandedBlock] = useState<number | null>(null);
  const [editingBlock, setEditingBlock] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Partial<LyricBlock>>({});

  const analyseLyricsMutation = trpc.musicVideo.analyseLyrics.useMutation();

  const handleAnalyse = async () => {
    setIsAnalysing(true);
    try {
      const result = await analyseLyricsMutation.mutateAsync({
        lyrics,
        genre,
        mood,
        style,
      });
      setBlocks(result.blocks);
      setHasAnalysed(true);
      toast.success("Lyrics analysed!", { description: `${result.blocks.length} lyric blocks tagged with emotions and visual cues.` });
    } catch (err: any) {
      toast.error("Analysis failed", { description: err?.message ?? "Please try again." });
    } finally {
      setIsAnalysing(false);
    }
  };

  const handleEditBlock = (index: number) => {
    setEditingBlock(index);
    setEditValues({
      emotion: blocks[index].emotion,
      sceneType: blocks[index].sceneType,
      visualCues: [...blocks[index].visualCues],
    });
  };

  const handleSaveEdit = (index: number) => {
    setBlocks(prev => prev.map((b, i) => i === index ? { ...b, ...editValues } : b));
    setEditingBlock(null);
    setEditValues({});
    toast.success("Block updated");
  };

  const handleCancelEdit = () => {
    setEditingBlock(null);
    setEditValues({});
  };

  // Group blocks into verse/chorus sections based on intensity patterns
  const groupedBlocks = useMemo(() => {
    if (blocks.length === 0) return [];
    return blocks;
  }, [blocks]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[--color-gold]" />
            Lyrics Intelligence
          </h2>
          <p className="text-zinc-400 text-sm mt-1">
            See what our AI sees in your lyrics — emotions, scenes, and visual cues
          </p>
        </div>
        <Button
          variant="outline"
          className="border-zinc-700 text-zinc-300 bg-transparent hover:bg-zinc-800"
          onClick={onBack}
        >
          Back
        </Button>
      </div>

      {/* Analysis trigger */}
      {!hasAnalysed && (
        <Card className="bg-gradient-to-br from-[#b8892a]/40 to-zinc-900 border-[--color-gold]/30">
          <CardContent className="pt-6 pb-6 text-center">
            <div className="w-16 h-16 rounded-full bg-[--color-gold]/15 flex items-center justify-center mx-auto mb-4">
              <Music className="w-8 h-8 text-[--color-gold]" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Ready to Analyse Your Lyrics</h3>
            <p className="text-zinc-400 text-sm mb-6 max-w-md mx-auto">
              Our AI will break down each line of your lyrics, tagging emotions, suggesting scene types, and identifying visual cues for your music video.
            </p>
            <Button
              className="bg-gradient-to-r from-[#b8892a] to-[#2e2e36] hover:from-[#b8892a] hover:to-[#2e2e36] text-white px-8"
              onClick={handleAnalyse}
              disabled={isAnalysing}
            >
              {isAnalysing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analysing Lyrics...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" /> Analyse Lyrics</>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Analysed blocks */}
      {hasAnalysed && blocks.length > 0 && (
        <>
          {/* Summary bar */}
          <div className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3">
            <div className="flex items-center gap-2">
              <Film className="w-4 h-4 text-[--color-gold]" />
              <span className="text-sm text-zinc-300">{blocks.length} lyric blocks</span>
            </div>
            <div className="h-4 w-px bg-zinc-700" />
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[--color-gold]" />
              <span className="text-sm text-zinc-300">
                {new Set(blocks.map(b => b.emotion.toLowerCase())).size} unique emotions
              </span>
            </div>
            <div className="h-4 w-px bg-zinc-700" />
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-[--color-silver]" />
              <span className="text-sm text-zinc-300">
                {blocks.reduce((sum, b) => sum + b.visualCues.length, 0)} visual cues
              </span>
            </div>
          </div>

          {/* Lyric blocks */}
          <div className="space-y-3">
            {groupedBlocks.map((block, index) => (
              <Card
                key={index}
                className={`bg-zinc-900/80 border-zinc-800 transition-all duration-200 hover:border-zinc-700 cursor-pointer ${
                  expandedBlock === index ? "ring-1 ring-[--color-gold]/30" : ""
                }`}
                onClick={() => setExpandedBlock(expandedBlock === index ? null : index)}
              >
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-4">
                    {/* Intensity bar */}
                    <div className="flex flex-col items-center gap-1 min-w-[24px]">
                      <div className={`w-1.5 rounded-full ${getIntensityBar(block.intensity)}`} style={{ height: `${Math.max(20, block.intensity * 6)}px` }} />
                      <span className="text-[10px] text-zinc-500">{block.intensity}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Lyric line */}
                      <p className="text-white font-medium text-sm leading-relaxed mb-2">
                        "{block.line}"
                      </p>

                      {/* Tags row */}
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={`text-xs ${getEmotionColor(block.emotion)}`}>
                          {getEmotionIcon(block.emotion)}
                          <span className="ml-1">{block.emotion}</span>
                        </Badge>
                        <Badge variant="outline" className="text-xs bg-zinc-800/50 text-zinc-300 border-zinc-700">
                          <Film className="w-3 h-3 mr-1" />
                          {block.sceneType}
                        </Badge>
                        {block.visualCues.slice(0, 2).map((cue, ci) => (
                          <Badge key={ci} variant="outline" className="text-xs bg-zinc-800/30 text-zinc-400 border-zinc-700/50">
                            {cue}
                          </Badge>
                        ))}
                        {block.visualCues.length > 2 && (
                          <span className="text-xs text-zinc-500">+{block.visualCues.length - 2} more</span>
                        )}
                      </div>

                      {/* Expanded details */}
                      {expandedBlock === index && (
                        <div className="mt-4 pt-3 border-t border-zinc-800" onClick={e => e.stopPropagation()}>
                          {editingBlock === index ? (
                            <div className="space-y-3">
                              <div>
                                <label className="text-xs text-zinc-500 mb-1 block">Emotion</label>
                                <input
                                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
                                  value={editValues.emotion || ""}
                                  onChange={e => setEditValues(prev => ({ ...prev, emotion: e.target.value }))}
                                />
                              </div>
                              <div>
                                <label className="text-xs text-zinc-500 mb-1 block">Scene Type</label>
                                <input
                                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
                                  value={editValues.sceneType || ""}
                                  onChange={e => setEditValues(prev => ({ ...prev, sceneType: e.target.value }))}
                                />
                              </div>
                              <div>
                                <label className="text-xs text-zinc-500 mb-1 block">Visual Cues (comma-separated)</label>
                                <input
                                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
                                  value={(editValues.visualCues || []).join(", ")}
                                  onChange={e => setEditValues(prev => ({ ...prev, visualCues: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }))}
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" className="bg-[--color-gold] hover:bg-[--color-gold]/20 text-white" onClick={() => handleSaveEdit(index)}>
                                  <Check className="w-3 h-3 mr-1" /> Save
                                </Button>
                                <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-300 bg-transparent" onClick={handleCancelEdit}>
                                  <X className="w-3 h-3 mr-1" /> Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-zinc-500">Scene:</span>
                                <span className="text-sm text-zinc-300">{block.sceneType}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-zinc-500">Visual Cues:</span>
                                <div className="flex flex-wrap gap-1">
                                  {block.visualCues.map((cue, ci) => (
                                    <Badge key={ci} variant="outline" className="text-xs bg-zinc-800/30 text-zinc-400 border-zinc-700/50">
                                      {cue}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-zinc-700 text-zinc-400 bg-transparent hover:bg-zinc-800 mt-1"
                                onClick={() => handleEditBlock(index)}
                              >
                                <Pencil className="w-3 h-3 mr-1" /> Edit Tags
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Expand indicator */}
                    <div className="text-zinc-500 mt-1">
                      {expandedBlock === index ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Confirm button */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              className="border-zinc-700 text-zinc-300 bg-transparent hover:bg-zinc-800"
              onClick={handleAnalyse}
              disabled={isAnalysing}
            >
              {isAnalysing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Re-analyse
            </Button>
            <Button
              className="bg-gradient-to-r from-[#b8892a] to-[#2e2e36] hover:from-[#b8892a] hover:to-[#2e2e36] text-white px-8"
              onClick={() => onConfirm(blocks)}
            >
              Looks Good <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export type { LyricBlock };
