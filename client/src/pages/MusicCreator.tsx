/**
 * WizVid Music Creator — powered by Suno AI
 * Visitors can generate full songs from style, mood, genre, and a text prompt.
 * Custom mode: user can generate + edit lyrics before submitting.
 */

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import {
  Music2, Sparkles, Play, Pause, Download, Loader2,
  ChevronRight, ArrowLeft, Check, Volume2, Clock, Wand2,
  FileText, RefreshCw, PenLine, ChevronDown, ChevronUp,
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

// ── Preset data ──────────────────────────────────────────────────────────────

const GENRES = [
  "Pop", "Hip-Hop", "R&B", "Rock", "Electronic", "Country",
  "Jazz", "Classical", "Folk", "Reggae", "Metal", "Indie",
  "K-Pop", "Latin", "Gospel", "Blues",
];

const MOODS = [
  { label: "Upbeat", emoji: "🎉" },
  { label: "Chill", emoji: "😌" },
  { label: "Romantic", emoji: "💕" },
  { label: "Epic", emoji: "⚡" },
  { label: "Sad", emoji: "😢" },
  { label: "Energetic", emoji: "🔥" },
  { label: "Dark", emoji: "🌑" },
  { label: "Happy", emoji: "😊" },
  { label: "Mysterious", emoji: "🌙" },
  { label: "Motivational", emoji: "💪" },
];

const VOCAL_STYLES = [
  "Male vocals", "Female vocals", "Choir", "Rap", "Spoken word", "Instrumental only",
];

const PROMPT_EXAMPLES = [
  "A kids pirate adventure song with catchy chorus and fun sound effects",
  "Cinematic orchestral score for an epic fantasy battle scene",
  "Lo-fi hip hop beats for studying, rainy day vibes",
  "Upbeat pop song about summer love and dancing on the beach",
  "Dark electronic track with heavy bass and futuristic synths",
  "Acoustic folk ballad about missing home and family",
];

// ── Audio player component ────────────────────────────────────────────────────

function AudioPlayer({ audioUrl, title, imageUrl }: { audioUrl: string; title: string; imageUrl?: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => { setCurrentTime(audio.currentTime); setProgress((audio.currentTime / audio.duration) * 100 || 0); };
    const onMeta = () => setDuration(audio.duration);
    const onEnd = () => setPlaying(false);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnd);
    return () => { audio.removeEventListener("timeupdate", onTime); audio.removeEventListener("loadedmetadata", onMeta); audio.removeEventListener("ended", onEnd); };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play().then(() => setPlaying(true)).catch(() => {}); }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pct * audio.duration;
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  return (
    <div className="flex gap-4 p-4 rounded-2xl bg-[#1a1a1a] border border-white/8 hover:border-white/14 transition-all">
      {/* Album art */}
      <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-violet-900/60 to-blue-900/60 border border-white/8 flex items-center justify-center">
        {imageUrl ? (
          <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
        ) : (
          <Music2 className="w-6 h-6 text-violet-300" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-white font-medium text-sm truncate mb-2">{title}</p>

        {/* Waveform progress bar */}
        <div
          className="h-1.5 bg-white/10 rounded-full cursor-pointer mb-2 relative overflow-hidden"
          onClick={seek}
        >
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-500 to-blue-500 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-[#a1a1aa]">{fmt(currentTime)} / {duration ? fmt(duration) : "--:--"}</span>
          <div className="flex gap-2">
            <button
              onClick={togglePlay}
              className="w-8 h-8 rounded-full bg-white/8 hover:bg-white/14 flex items-center justify-center transition-colors"
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? <Pause className="w-3.5 h-3.5 text-white" /> : <Play className="w-3.5 h-3.5 text-white ml-0.5" />}
            </button>
            <a
              href={audioUrl}
              download
              className="w-8 h-8 rounded-full bg-white/8 hover:bg-white/14 flex items-center justify-center transition-colors"
              aria-label="Download"
            >
              <Download className="w-3.5 h-3.5 text-white" />
            </a>
          </div>
        </div>
      </div>

      <audio ref={audioRef} src={audioUrl} preload="metadata" />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MusicCreator() {
  const { user, loading: authLoading } = useAuth();

  // Form state
  const [prompt, setPrompt] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedMood, setSelectedMood] = useState<string>("");
  const [selectedVocal, setSelectedVocal] = useState<string>("");
  const [title, setTitle] = useState("");
  const [instrumental, setInstrumental] = useState(false);
  const [model, setModel] = useState<"V3_5" | "V4">("V4");

  // Lyrics state
  const [lyrics, setLyrics] = useState("");
  const [showLyrics, setShowLyrics] = useState(false);
  const [lyricsGenerated, setLyricsGenerated] = useState(false);

  // Generation state
  const [taskId, setTaskId] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTracks, setGeneratedTracks] = useState<Array<{ audioUrl: string; title: string; imageUrl?: string; tags?: string; duration?: number }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "pending" | "processing" | "complete" | "failed">("idle");

  // Derived: is custom mode active (requires style + title → lyrics needed)
  const isCustomMode = !!(selectedGenres.length > 0 || selectedMood) && !!title.trim() && !instrumental && selectedVocal !== "Instrumental only";

  const generateLyricsMutation = trpc.suno.generateLyrics.useMutation({
    onSuccess: (data) => {
      setLyrics(data.lyrics);
      setLyricsGenerated(true);
      setShowLyrics(true);
      toast.success("Lyrics generated! Review and edit them below.");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to generate lyrics. Please try again.");
    },
  });

  const generateMutation = trpc.suno.generate.useMutation({
    onSuccess: (data) => {
      setTaskId(data.id);
      setStatus("pending");
      setIsGenerating(true);
    },
    onError: (err) => {
      setError(err.message);
      setIsGenerating(false);
      setStatus("failed");
    },
  });

  // Poll for status when taskId is set
  const statusQuery = trpc.suno.getStatus.useQuery(
    { id: taskId! },
    {
      enabled: taskId !== null && (status === "pending" || status === "processing"),
      refetchInterval: 8000,
      refetchIntervalInBackground: false,
    }
  );

  useEffect(() => {
    if (!statusQuery.data) return;
    const d = statusQuery.data;
    setStatus(d.status as typeof status);
    if (d.status === "complete" && d.tracks && d.tracks.length > 0) {
      setGeneratedTracks(d.tracks as typeof generatedTracks);
      setIsGenerating(false);
    } else if (d.status === "failed") {
      setError(d.errorMessage ?? "Generation failed. Please try again.");
      setIsGenerating(false);
    }
  }, [statusQuery.data]);

  // Build the style string from selections
  const buildStyleString = () => {
    const parts: string[] = [];
    if (selectedGenres.length > 0) parts.push(selectedGenres.join(", "));
    if (selectedMood) parts.push(selectedMood);
    if (selectedVocal && selectedVocal !== "Instrumental only") parts.push(selectedVocal);
    return parts.join(", ");
  };

  const handleGenerateLyrics = () => {
    if (!prompt.trim()) {
      toast.error("Please describe your song first.");
      return;
    }
    generateLyricsMutation.mutate({
      prompt: prompt.trim(),
      genre: selectedGenres.join(", ") || undefined,
      mood: selectedMood || undefined,
      title: title.trim() || undefined,
    });
  };

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    setError(null);
    setGeneratedTracks([]);
    setTaskId(null);
    setStatus("idle");

    const styleStr = buildStyleString();
    const isInstrumental = instrumental || selectedVocal === "Instrumental only";

    generateMutation.mutate({
      prompt: prompt.trim(),
      lyrics: lyrics.trim() || undefined,
      style: styleStr || undefined,
      title: title.trim() || undefined,
      instrumental: isInstrumental,
      model,
      origin: window.location.origin,
    });
  };

  const toggleGenre = (g: string) =>
    setSelectedGenres((prev) => prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g].slice(0, 3));

  const lyricsCharCount = lyrics.length;
  const lyricsCharColor = lyricsCharCount > 2800 ? "text-red-400" : lyricsCharCount > 2000 ? "text-yellow-400" : "text-[#a1a1aa]";

  const canGenerate = prompt.trim().length > 0 && !isGenerating;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-white/6 bg-[#0f0f0f]/90 backdrop-blur-xl px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-[#a1a1aa] hover:text-white transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <div className="flex items-center gap-2">
            <Music2 className="w-5 h-5 text-violet-400" />
            <span className="font-bold text-white">Music Creator</span>
            <Badge className="bg-blue-500/15 text-blue-300 border-blue-500/20 text-xs">Powered by Suno</Badge>
          </div>
          {!authLoading && !user && (
            <a href={getLoginUrl()} className="text-sm text-[#a1a1aa] hover:text-white transition-colors">Sign in</a>
          )}
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            AI Music Generation
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
            Generate full songs{" "}
            <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
              from any idea
            </span>
          </h1>
          <p className="text-[#a1a1aa] text-lg max-w-xl mx-auto">
            Describe your song, choose a style, and Suno AI generates a complete track with vocals and instruments in minutes.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_380px] gap-8">
          {/* Left: Form */}
          <div className="space-y-6">
            {/* Prompt */}
            <div className="p-6 rounded-2xl bg-[#171717] border border-white/6">
              <label className="block text-sm font-semibold text-white mb-3">
                <Wand2 className="w-4 h-4 inline mr-2 text-violet-400" />
                Describe your song
              </label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. A kids pirate adventure song with catchy chorus and fun sound effects..."
                className="bg-[#0f0f0f] border-white/10 text-white placeholder:text-[#666] resize-none min-h-[100px] focus:border-violet-500/50 focus:ring-0 rounded-xl"
                maxLength={400}
              />
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-[#a1a1aa]">{prompt.length}/400 characters</p>
                <div className="flex gap-2 flex-wrap justify-end">
                  {PROMPT_EXAMPLES.slice(0, 2).map((ex) => (
                    <button
                      key={ex}
                      onClick={() => setPrompt(ex)}
                      className="text-xs text-violet-400 hover:text-violet-300 transition-colors underline-offset-2 hover:underline"
                    >
                      Try example
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Genre */}
            <div className="p-6 rounded-2xl bg-[#171717] border border-white/6">
              <label className="block text-sm font-semibold text-white mb-3">
                Genre <span className="text-[#a1a1aa] font-normal">(pick up to 3)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {GENRES.map((g) => (
                  <button
                    key={g}
                    onClick={() => toggleGenre(g)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                      selectedGenres.includes(g)
                        ? "bg-violet-500/20 border-violet-500/50 text-violet-200"
                        : "bg-white/4 border-white/8 text-[#a1a1aa] hover:border-white/16 hover:text-white"
                    }`}
                  >
                    {selectedGenres.includes(g) && <Check className="w-3 h-3 inline mr-1" />}
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Mood */}
            <div className="p-6 rounded-2xl bg-[#171717] border border-white/6">
              <label className="block text-sm font-semibold text-white mb-3">Mood</label>
              <div className="flex flex-wrap gap-2">
                {MOODS.map((m) => (
                  <button
                    key={m.label}
                    onClick={() => setSelectedMood(selectedMood === m.label ? "" : m.label)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                      selectedMood === m.label
                        ? "bg-blue-500/20 border-blue-500/50 text-blue-200"
                        : "bg-white/4 border-white/8 text-[#a1a1aa] hover:border-white/16 hover:text-white"
                    }`}
                  >
                    {m.emoji} {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Vocal style */}
            <div className="p-6 rounded-2xl bg-[#171717] border border-white/6">
              <label className="block text-sm font-semibold text-white mb-3">
                <Volume2 className="w-4 h-4 inline mr-2 text-blue-400" />
                Vocal style
              </label>
              <div className="flex flex-wrap gap-2">
                {VOCAL_STYLES.map((v) => (
                  <button
                    key={v}
                    onClick={() => setSelectedVocal(selectedVocal === v ? "" : v)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                      selectedVocal === v
                        ? "bg-green-500/20 border-green-500/50 text-green-200"
                        : "bg-white/4 border-white/8 text-[#a1a1aa] hover:border-white/16 hover:text-white"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Lyrics editor */}
            <div className="p-6 rounded-2xl bg-[#171717] border border-white/6">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-pink-400" />
                  Lyrics
                  <span className="text-[#a1a1aa] font-normal text-xs">(optional — recommended for custom mode)</span>
                </label>
                <button
                  onClick={() => setShowLyrics((v) => !v)}
                  className="text-xs text-[#a1a1aa] hover:text-white flex items-center gap-1 transition-colors"
                >
                  {showLyrics ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  {showLyrics ? "Collapse" : "Expand"}
                </button>
              </div>

              {/* AI generate lyrics button */}
              <div className="flex gap-2 mb-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateLyrics}
                  disabled={!prompt.trim() || generateLyricsMutation.isPending}
                  className="bg-pink-500/10 border-pink-500/30 text-pink-300 hover:bg-pink-500/20 hover:text-pink-200 text-xs h-8 rounded-lg"
                >
                  {generateLyricsMutation.isPending ? (
                    <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Writing lyrics…</>
                  ) : (
                    <><Sparkles className="w-3 h-3 mr-1.5" />{lyricsGenerated ? "Regenerate Lyrics" : "Generate Lyrics with AI"}</>
                  )}
                </Button>
                {lyrics.trim() && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setLyrics(""); setLyricsGenerated(false); }}
                    className="bg-white/4 border-white/10 text-[#a1a1aa] hover:text-white text-xs h-8 rounded-lg"
                  >
                    Clear
                  </Button>
                )}
              </div>

              {showLyrics && (
                <>
                  <div className="relative">
                    <Textarea
                      value={lyrics}
                      onChange={(e) => setLyrics(e.target.value)}
                      placeholder={`[Verse 1]\nWrite or paste your lyrics here...\n\n[Chorus]\nOr click "Generate Lyrics with AI" above to get a draft.`}
                      className="bg-[#0f0f0f] border-white/10 text-white placeholder:text-[#555] resize-none min-h-[260px] focus:border-pink-500/50 focus:ring-0 rounded-xl font-mono text-sm leading-relaxed"
                      maxLength={3000}
                    />
                    {lyrics.trim() && (
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-pink-500/15 text-pink-300 border-pink-500/20 text-[10px]">
                          <PenLine className="w-2.5 h-2.5 mr-1" />Editable
                        </Badge>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className={`text-xs ${lyricsCharColor}`}>{lyricsCharCount}/3000 characters</p>
                    <p className="text-xs text-[#666]">
                      Use [Verse 1], [Chorus], [Bridge] section labels
                    </p>
                  </div>
                  {isCustomMode && !lyrics.trim() && (
                    <div className="mt-3 p-3 rounded-xl bg-amber-500/8 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2">
                      <span className="text-base leading-none">⚠️</span>
                      <span>
                        You have a title and style set — Suno will use <strong>custom mode</strong>, which requires lyrics.
                        Click <strong>"Generate Lyrics with AI"</strong> above or write your own.
                      </span>
                    </div>
                  )}
                </>
              )}

              {!showLyrics && lyrics.trim() && (
                <div className="flex items-center gap-2 text-xs text-green-400">
                  <Check className="w-3.5 h-3.5" />
                  {lyrics.split("\n").filter(Boolean).length} lines of lyrics ready
                  <button
                    onClick={() => setShowLyrics(true)}
                    className="text-[#a1a1aa] hover:text-white underline ml-1"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>

            {/* Advanced: title + model */}
            <div className="p-6 rounded-2xl bg-[#171717] border border-white/6">
              <p className="text-sm font-semibold text-white mb-4">Advanced options</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#a1a1aa] mb-1.5">Song title (optional)</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="My Amazing Song"
                    maxLength={80}
                    className="w-full bg-[#0f0f0f] border border-white/10 text-white placeholder:text-[#666] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-violet-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#a1a1aa] mb-1.5">Model</label>
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value as "V3_5" | "V4")}
                    className="w-full bg-[#0f0f0f] border border-white/10 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-violet-500/50"
                  >
                    <option value="V4">Suno V4 (recommended)</option>
                    <option value="V3_5">Suno V3.5</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Generate + Results */}
          <div className="space-y-6">
            {/* Generate card */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-violet-900/20 to-blue-900/20 border border-violet-500/20 sticky top-24">
              <h2 className="text-lg font-bold text-white mb-1">Ready to generate</h2>
              <p className="text-[#a1a1aa] text-sm mb-5">
                Suno will create 2 unique tracks from your prompt. Generation takes 1–3 minutes.
              </p>

              {/* Summary */}
              <div className="space-y-2 mb-5">
                {prompt && (
                  <div className="flex gap-2 text-sm">
                    <span className="text-[#a1a1aa] flex-shrink-0">Prompt:</span>
                    <span className="text-white truncate">{prompt.slice(0, 60)}{prompt.length > 60 ? "…" : ""}</span>
                  </div>
                )}
                {selectedGenres.length > 0 && (
                  <div className="flex gap-2 text-sm">
                    <span className="text-[#a1a1aa] flex-shrink-0">Genre:</span>
                    <span className="text-white">{selectedGenres.join(", ")}</span>
                  </div>
                )}
                {selectedMood && (
                  <div className="flex gap-2 text-sm">
                    <span className="text-[#a1a1aa] flex-shrink-0">Mood:</span>
                    <span className="text-white">{selectedMood}</span>
                  </div>
                )}
                {lyrics.trim() && (
                  <div className="flex gap-2 text-sm">
                    <span className="text-[#a1a1aa] flex-shrink-0">Lyrics:</span>
                    <span className="text-green-400 flex items-center gap-1">
                      <Check className="w-3 h-3" />{lyrics.split("\n").filter(Boolean).length} lines
                    </span>
                  </div>
                )}
              </div>

              {/* Custom mode warning */}
              {isCustomMode && !lyrics.trim() && (
                <div className="mb-4 p-3 rounded-xl bg-amber-500/8 border border-amber-500/20 text-amber-300 text-xs">
                  <strong>Lyrics required:</strong> You have a title and style set. Please add lyrics or click "Generate Lyrics with AI" to avoid a 400 error.
                </div>
              )}

              {!user && !authLoading ? (
                <div className="text-center">
                  <p className="text-[#a1a1aa] text-sm mb-3">Sign in to generate music</p>
                  <Button
                    className="w-full bg-white text-black hover:bg-white/90 font-semibold rounded-xl h-auto py-3"
                    asChild
                  >
                    <a href={getLoginUrl()}>
                      <Sparkles className="w-4 h-4 mr-2" />Sign in to Generate
                    </a>
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={handleGenerate}
                  disabled={!canGenerate || (isCustomMode && !lyrics.trim())}
                  className="w-full bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl h-auto py-3 transition-all shadow-lg hover:shadow-violet-500/20"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {status === "pending" ? "Queued…" : "Generating…"}
                    </>
                  ) : (
                    <>
                      <Music2 className="w-4 h-4 mr-2" />
                      Generate Song
                    </>
                  )}
                </Button>
              )}

              {/* Regenerate lyrics shortcut */}
              {isCustomMode && !lyrics.trim() && user && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateLyrics}
                  disabled={!prompt.trim() || generateLyricsMutation.isPending}
                  className="w-full mt-2 bg-pink-500/10 border-pink-500/30 text-pink-300 hover:bg-pink-500/20 text-xs h-9 rounded-xl"
                >
                  {generateLyricsMutation.isPending ? (
                    <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Writing lyrics…</>
                  ) : (
                    <><Sparkles className="w-3 h-3 mr-1.5" />Generate Lyrics First</>
                  )}
                </Button>
              )}

              {/* Status indicator */}
              {isGenerating && (
                <div className="mt-4 p-3 rounded-xl bg-blue-500/8 border border-blue-500/20">
                  <div className="flex items-center gap-2 text-sm text-blue-300 mb-2">
                    <Clock className="w-4 h-4 animate-pulse" />
                    <span>{status === "pending" ? "Waiting in queue…" : "Composing your track…"}</span>
                  </div>
                  <div className="h-1 bg-white/8 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-violet-500 to-blue-500 rounded-full animate-pulse" style={{ width: status === "pending" ? "25%" : "65%" }} />
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-4 p-3 rounded-xl bg-red-500/8 border border-red-500/20 text-red-300 text-sm">
                  {error}
                </div>
              )}
            </div>

            {/* Generated tracks */}
            {generatedTracks.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-400" />
                  <h3 className="text-sm font-semibold text-white">Your tracks are ready</h3>
                </div>
                {generatedTracks.map((track, i) => (
                  <AudioPlayer
                    key={i}
                    audioUrl={track.audioUrl}
                    title={track.title || `Track ${i + 1}`}
                    imageUrl={track.imageUrl}
                  />
                ))}
                <div className="p-4 rounded-xl bg-violet-500/8 border border-violet-500/20 text-center">
                  <p className="text-sm text-violet-300 mb-3">Love your track? Turn it into a full music video.</p>
                  <Button
                    className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white text-sm font-semibold rounded-xl h-auto py-2.5 px-5"
                    asChild
                  >
                    <Link href="/music-video">
                      <ChevronRight className="w-4 h-4 mr-1.5" />Create Music Video
                    </Link>
                  </Button>
                </div>
              </div>
            )}

            {/* Prompt examples */}
            <div className="p-5 rounded-2xl bg-[#171717] border border-white/6">
              <p className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-widest mb-3">Example prompts</p>
              <div className="space-y-2">
                {PROMPT_EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => setPrompt(ex)}
                    className="w-full text-left text-sm text-[#a1a1aa] hover:text-white transition-colors p-2.5 rounded-xl hover:bg-white/4 flex items-start gap-2"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-violet-400 flex-shrink-0 mt-0.5" />
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
