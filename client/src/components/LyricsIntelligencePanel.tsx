import React, { useState } from "react";
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
} from "@/lib/icons";

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
  return EMOTION_COLORS[key] || "bg-zinc-700/30 text-zinc-300 border-zinc-600/30";
}

function getEmotionIcon(emotion: string): React.ReactNode {
  const key = emotion.toLowerCase();
  return EMOTION_ICONS[key] || <Music className="w-3.5 h-3.5" />;
}

function getSceneBgGradient(emotion: string): string {
  const key = emotion.toLowerCase();
  if (key.includes("intense") || key.includes("dark")) return "from-red-900/40 to-zinc-900/80";
  if (key.includes("energetic") || key.includes("triumphant")) return "from-amber-900/40 to-zinc-900/80";
  if (key.includes("passionate") || key.includes("tender")) return "from-rose-900/40 to-zinc-900/80";
  if (key.includes("dreamy") || key.includes("hopeful")) return "from-indigo-900/40 to-zinc-900/80";
  if (key.includes("powerful")) return "from-orange-900/40 to-zinc-900/80";
  if (key.includes("melancholic")) return "from-blue-900/40 to-zinc-900/80";
  return "from-zinc-800/60 to-zinc-900/80";
}

export function LyricsIntelligencePanel({
  lyrics,
  genre,
  mood,
  style,
  onConfirm,
  onBack,
}: LyricsIntelligencePanelProps) {
  const [blocks, setBlocks] = useState<LyricBlock[]>([]);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [expandedBlock, setExpandedBlock] = useState<number | null>(null);
  const [editingBlock, setEditingBlock] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Partial<LyricBlock>>({});
  const [showScenePreview, setShowScenePreview] = useState(true);

  const analyseLyricsMutation = trpc.musicVideo.analyseLyrics.useMutation({
    onSuccess: (result) => {
      setBlocks(result.blocks);
      setIsAnalysing(false);
      toast.success("Lyrics analysed!", { description: `${result.blocks.length} lyric blocks tagged with emotions and visual cues.` });
    },
    onError: (err) => {
      setIsAnalysing(false);
      toast.error("Analysis failed", { description: err.message });
    },
  });

  function handleEditBlock(index: number) {
    setEditingBlock(index);
    setEditValues({
      emotion: blocks[index].emotion,
      sceneType: blocks[index].sceneType,
      visualCues: [...blocks[index].visualCues],
    });
  }

  function handleSaveEdit(index: number) {
    setBlocks(prev => prev.map((b, i) => i === index ? { ...b, ...editValues } : b));
    setEditingBlock(null);
    setEditValues({});
  }

  function handleCancelEdit() {
    setEditingBlock(null);
    setEditValues({});
  }

  function handleAnalyse() {
    setIsAnalysing(true);
    analyseLyricsMutation.mutate({ lyrics, genre, mood, style });
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="w-5 h-5 text-[--color-gold]" />
          <h3 className="text-lg font-bold text-white">Lyrics Intelligence</h3>
        </div>
        <p className="text-sm text-zinc-400">
          See what our AI sees in your lyrics — emotions, scenes, and visual cues
        </p>
      </div>

      {blocks.length === 0 ? (
        <div className="rounded-xl border border-zinc-700/50 bg-zinc-900/60 p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-[--color-gold]/10 border border-[--color-gold]/20 flex items-center justify-center mx-auto">
            <Eye className="w-6 h-6 text-[--color-gold]" />
          </div>
          <div>
            <p className="text-white font-medium mb-1">Analyse Your Lyrics</p>
            <p className="text-sm text-zinc-400">
              Our AI will break down each line of your lyrics, tagging emotions, suggesting scene types, and identifying visual cues for your music video.
            </p>
          </div>
          <Button
            className="bg-gradient-to-r from-[#b8892a] to-[#2e2e36] hover:from-[#b8892a] hover:to-[#2e2e36] text-white"
            onClick={handleAnalyse}
            disabled={isAnalysing}
          >
            {isAnalysing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            {isAnalysing ? "Analysing lyrics..." : "Analyse Lyrics"}
          </Button>
        </div>
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-zinc-800/50 border border-zinc-700/40 p-2 text-center">
              <div className="text-lg font-bold text-white">{blocks.length}</div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Lyric Blocks</div>
            </div>
            <div className="rounded-lg bg-zinc-800/50 border border-zinc-700/40 p-2 text-center">
              <div className="text-lg font-bold text-white">{new Set(blocks.map(b => b.emotion.toLowerCase())).size}</div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Unique Emotions</div>
            </div>
            <div className="rounded-lg bg-zinc-800/50 border border-zinc-700/40 p-2 text-center">
              <div className="text-lg font-bold text-white">{blocks.reduce((sum, b) => sum + b.visualCues.length, 0)}</div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Visual Cues</div>
            </div>
          </div>

          {/* Lyric blocks */}
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {blocks.map((block, index) => (
              <Card key={index} className="bg-zinc-900/60 border-zinc-700/50">
                <CardContent className="p-3">
                  <div
                    className="flex items-start gap-3 cursor-pointer"
                    onClick={() => setExpandedBlock(expandedBlock === index ? null : index)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="outline" className={`text-xs ${getEmotionColor(block.emotion)}`}>
                          {getEmotionIcon(block.emotion)}
                          <span className="ml-1">{block.emotion}</span>
                        </Badge>
                        <Badge variant="outline" className="text-xs bg-zinc-800/50 text-zinc-400 border-zinc-700/50">
                          {block.sceneType}
                        </Badge>
                        {block.visualCues.slice(0, 2).map((cue, ci) => (
                          <Badge key={ci} variant="outline" className="text-xs bg-zinc-800/30 text-zinc-500 border-zinc-700/30">
                            {cue}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-sm text-zinc-300 italic truncate">"{block.line}"</p>

                      {expandedBlock === index && (
                        <div className="mt-3 space-y-3">
                          {editingBlock === index ? (
                            <div className="space-y-2">
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
                                <Button size="sm" className="bg-[--color-gold] hover:bg-[--color-gold]/80 text-white" onClick={() => handleSaveEdit(index)}>
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

          {/* Scene Preview Grid */}
          <div className="rounded-xl border border-zinc-700/50 bg-zinc-900/60 overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-800/40 transition-colors"
              onClick={() => setShowScenePreview(v => !v)}
            >
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-[--color-gold]" />
                <span className="text-sm font-semibold text-white">Scene Preview</span>
                <span className="text-xs text-zinc-500">— your music video, scene by scene</span>
              </div>
              {showScenePreview ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
            </button>
            {showScenePreview && (
              <div className="px-4 pb-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {blocks.map((block, i) => (
                    <div
                      key={i}
                      className={`relative rounded-lg bg-gradient-to-br ${getSceneBgGradient(block.emotion)} border border-zinc-700/40 p-2.5 flex flex-col gap-1.5 min-h-[90px]`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Scene {i + 1}</span>
                        <Badge variant="outline" className={`text-[9px] px-1 py-0 ${getEmotionColor(block.emotion)}`}>
                          {getEmotionIcon(block.emotion)}
                          <span className="ml-0.5">{block.emotion}</span>
                        </Badge>
                      </div>
                      <p className="text-[11px] text-zinc-300 leading-tight line-clamp-2 italic">"{block.line}"</p>
                      <div className="mt-auto">
                        <span className="text-[10px] text-zinc-500 block truncate">{block.sceneType}</span>
                        {block.visualCues[0] && (
                          <span className="text-[10px] text-[--color-gold]/70 block truncate">✦ {block.visualCues[0]}</span>
                        )}
                      </div>
                      {/* Intensity bar */}
                      <div className="w-full h-0.5 bg-zinc-700/50 rounded-full mt-1">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[--color-gold] to-amber-400"
                          style={{ width: `${(block.intensity / 10) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
