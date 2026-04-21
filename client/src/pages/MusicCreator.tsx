/**
 * WIZ AI Music Creator — WizAudio
 * Visitors can generate full songs from style, mood, genre, and a text prompt.
 * Custom mode: user can generate + edit lyrics before submitting.
 */

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useGlobalAudio } from "@/contexts/AudioContext";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import {
  Music2, Sparkles, Play, Pause, Download, Loader2,
  ChevronRight, ArrowLeft, Check, Volume2, Clock, Wand2,
  FileText, RefreshCw, PenLine, ChevronDown, ChevronUp, X, Trash2,
} from "@/lib/icons";
import { Link } from "wouter";
import { toast } from "sonner";
import GraphicEqualiser from "@/components/GraphicEqualiser";
import WizAudioPlayer from "@/components/WizAudioPlayer";
import { Upload, UploadCloud } from "@/lib/icons";

// ── Preset data ──────────────────────────────────────────────────────────────

const GENRES = [
  "Pop", "Hip-Hop", "R&B", "Rock", "Electronic", "Country",
  "Jazz", "Classical", "Folk", "Reggae", "Metal", "Indie",
  "K-Pop", "Latin", "Gospel", "Blues",
];

const MOODS = [
  "Upbeat", "Chill", "Romantic", "Epic", "Sad", "Energetic",
  "Dark", "Happy", "Mysterious", "Motivational", "Melancholic",
  "Aggressive", "Dreamy", "Nostalgic", "Triumphant", "Tense",
  "Playful", "Spiritual", "Groovy", "Cinematic",
];

const VOCAL_STYLES = [
  "Male vocals", "Female vocals", "Choir", "Rap", "Spoken word", "Instrumental only",
];

const PROMPT_EXAMPLES = [
  "A kids pirate adventure song with a catchy chorus and upbeat energy",
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
  const { isMuted, requestAudioFocus } = useGlobalAudio();

  // Sync global mute to audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = isMuted;
    if (isMuted) audio.volume = 0;
    else audio.volume = 1;
  }, [isMuted]);
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
    else {
      if (!isMuted) requestAudioFocus("music-creator");
      audio.muted = isMuted;
      audio.play().then(() => setPlaying(true)).catch(() => {});
    }
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
      <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-[#b8892a]/60 to-[#2e2e36] border border-white/8 flex items-center justify-center">
        {imageUrl ? (
          <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
        ) : (
          <Music2 className="w-6 h-6 text-[--color-gold]" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-white font-medium text-sm truncate mb-2">{title}</p>

        {/* Graphic equaliser visualisation */}
        <div className="mb-2">
          <GraphicEqualiser audioRef={audioRef} isPlaying={playing} barCount={32} height={36} />
        </div>

        {/* Waveform progress bar */}
        <div
          className="h-1.5 bg-white/10 rounded-full cursor-pointer mb-2 relative overflow-hidden"
          onClick={seek}
        >
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#b8892a] to-[#e8c878] rounded-full transition-all"
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
  const [generationMode, setGenerationMode] = useState<"score" | "song" | "suno">("suno");
  const [targetDuration, setTargetDuration] = useState<number | null>(null); // null = no limit

  // Lyrics state
  const [lyrics, setLyrics] = useState("");
  const [showLyrics, setShowLyrics] = useState(false);
  const [lyricsGenerated, setLyricsGenerated] = useState(false);

  // Upload mode state
  const [mode, setMode] = useState<"generate" | "upload">("generate");
  const [uploadedAudioUrl, setUploadedAudioUrl] = useState<string | null>(null);
  const [uploadedAudioName, setUploadedAudioName] = useState<string>("");
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadAudioMutation = trpc.musicVideo.uploadAudio.useMutation({
    onSuccess: (data) => {
      setUploadedAudioUrl(data.url);
      toast.success("Audio uploaded!", { description: "Your track is ready to play." });
    },
    onError: (err) => {
      toast.error("Upload failed", { description: err.message });
      setIsUploadingFile(false);
    },
  });

  const handleFileUpload = async (file: File) => {
    if (!file.type.match(/audio\/(mpeg|wav|mp4|x-m4a|ogg|webm)/)) {
      toast.error("Invalid file type", { description: "Please upload an MP3, WAV, M4A, or OGG file." });
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File too large", { description: "Maximum file size is 50MB." });
      return;
    }
    setIsUploadingFile(true);
    setUploadedAudioName(file.name);
    const arrayBuffer = await file.arrayBuffer();
    const bytes = Array.from(new Uint8Array(arrayBuffer));
    const mimeType = file.type.includes("wav") ? "audio/wav" : file.type.includes("mp4") || file.name.endsWith(".m4a") ? "audio/mp4" : "audio/mpeg";
    uploadAudioMutation.mutate({ bytes, mimeType, filename: file.name });
    setIsUploadingFile(false);
  };

  // Generation state
  const [taskId, setTaskId] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTracks, setGeneratedTracks] = useState<Array<{ audioUrl: string; title: string; imageUrl?: string; tags?: string; duration?: number }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "pending" | "processing" | "trimming" | "complete" | "failed">("idle");

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

  const deleteTaskMutation = trpc.suno.deleteTask.useMutation({
    onSuccess: () => {
      setGeneratedTracks([]);
      setTaskId(null);
      setStatus("idle");
      toast.success("Track deleted.");
    },
    onError: (err) => {
      toast.error("Delete failed", { description: err.message });
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
      enabled: taskId !== null && (status === "pending" || status === "processing" || status === "trimming"),
      refetchInterval: status === "trimming" ? 5000 : 8000,
      refetchIntervalInBackground: false,
    }
  );

  useEffect(() => {
    if (!statusQuery.data) return;
    const d = statusQuery.data;
    const newStatus = d.status as typeof status;
    setStatus(newStatus);
    if (newStatus === "complete" && d.tracks && d.tracks.length > 0) {
      setGeneratedTracks(d.tracks as typeof generatedTracks);
      setIsGenerating(false);
    } else if (newStatus === "trimming") {
      // Background trim in progress — keep polling, show progress
      setIsGenerating(true);
    } else if (newStatus === "failed") {
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
      targetDuration: targetDuration ?? undefined,
      generationMode,
    });
  };

  const toggleGenre = (g: string) =>
    setSelectedGenres((prev) => prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g].slice(0, 3));

  const lyricsCharCount = lyrics.length;
  const lyricsCharColor = lyricsCharCount > 2800 ? "text-red-400" : lyricsCharCount > 2000 ? "text-yellow-400" : "text-[#a1a1aa]";

  const canGenerate = prompt.trim().length > 0 && !isGenerating;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Cinematic Hero Banner */}
      <div className="relative w-full h-[340px] md:h-[420px] overflow-hidden">
        {/* Background: studio image */}
        <img
          src="https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-studio-bg_207e72b0.jpg"
          alt="WizAudio Studio"
          className="absolute inset-0 w-full h-full object-cover object-center scale-105"
          style={{ filter: "brightness(0.38) saturate(1.2)" }}
        />
        {/* Layered gradients for depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/60 via-transparent to-[#0a0a0a]/40" />
        {/* Animated ambient glow */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] rounded-full bg-[#b8892a]/10 blur-[80px] pointer-events-none" />
        {/* Nav sits inside the hero */}
        <nav className="relative z-20 flex items-center justify-between px-6 py-5 max-w-5xl mx-auto">
          <Link href="/" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <div className="flex items-center gap-2">
            <Music2 className="w-5 h-5 text-[--color-gold]" />
            <span className="font-bold text-white">Music Creator</span>
            <Badge className="bg-[--color-gold-dark]/15 text-[--color-gold-mid] border-[--color-gold-dark]/20 text-xs">WizAudio</Badge>
          </div>
          {!authLoading && !user && (
            <a href={getLoginUrl()} className="text-sm text-white/60 hover:text-white transition-colors">Sign in</a>
          )}
        </nav>
        {/* Hero content */}
        <div className="relative z-10 flex flex-col items-center justify-center h-[calc(100%-72px)] text-center px-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[--color-gold]/15 border border-[--color-gold]/30 text-[--color-gold] text-xs font-semibold tracking-widest uppercase mb-5">
            <Sparkles className="w-3.5 h-3.5" />
            WizAudio — AI Music Engine
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-4 leading-tight">
            Generate full songs{" "}
            <span className="bg-gradient-to-r from-[#e8c878] via-[#f2dfa0] to-[#b8892a] bg-clip-text text-transparent">
              from any idea
            </span>
          </h1>
          <p className="text-white/60 text-lg max-w-xl">
            Describe your song, choose a style, and WizAudio generates a complete track with vocals and instruments in minutes.
          </p>
          {/* Mode toggle inside hero */}
          <div className="flex items-center gap-3 mt-8">
            <button
              onClick={() => setMode("generate")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold border transition-all ${
                mode === "generate"
                  ? "bg-[--color-gold]/20 border-[--color-gold]/40 text-[--color-gold] shadow-[0_0_20px_rgba(184,137,42,0.25)]"
                  : "bg-white/8 border-white/15 text-white/60 hover:border-white/30 hover:text-white"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Generate with AI
            </button>
            <button
              onClick={() => setMode("upload")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold border transition-all ${
                mode === "upload"
                  ? "bg-[--color-gold]/20 border-[--color-gold]/40 text-[--color-gold] shadow-[0_0_20px_rgba(184,137,42,0.25)]"
                  : "bg-white/8 border-white/15 text-white/60 hover:border-white/30 hover:text-white"
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              Upload Your Track
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10">

        <div className="grid lg:grid-cols-[1fr_380px] gap-8">
          {/* Left: Form */}
          <div className="space-y-6">
            {/* Duration Picker — custom mm:ss input with quick-select shortcuts */}
            <div className="p-6 rounded-2xl bg-[#171717] border border-white/6">
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-semibold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[--color-gold]" />
                  Track Duration
                </label>
                <button
                  onClick={() => setTargetDuration(targetDuration === null ? 60 : null)}
                  className={`text-xs px-3 py-1 rounded-full border transition-all ${
                    targetDuration === null
                      ? "bg-white/4 border-white/8 text-[#a1a1aa] hover:border-white/16 hover:text-white"
                      : "bg-[--color-gold]/15 border-[--color-gold]/30 text-[--color-gold]"
                  }`}
                >
                  {targetDuration === null ? "Set duration" : "Clear"}
                </button>
              </div>
              {targetDuration === null ? (
                <div className="text-center py-3">
                  <p className="text-xs text-[#a1a1aa] mb-3">No duration set — WizAudio will generate a full-length track</p>
                  <button
                    onClick={() => setTargetDuration(60)}
                    className="text-xs text-[--color-gold] hover:text-[--color-gold] transition-colors underline-offset-2 hover:underline"
                  >
                    + Set target duration for your video
                  </button>
                </div>
              ) : (
                <>
                  {/* Custom mm:ss input */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center gap-1.5 bg-[#0f0f0f] border border-white/10 rounded-xl px-4 py-2.5">
                      <input
                        type="number"
                        min={0}
                        max={10}
                        value={Math.floor(targetDuration / 60)}
                        onChange={(e) => {
                          const mins = Math.max(0, Math.min(10, parseInt(e.target.value) || 0));
                          const secs = targetDuration % 60;
                          const total = mins * 60 + secs;
                          setTargetDuration(Math.max(5, Math.min(600, total)));
                        }}
                        className="w-10 bg-transparent text-white text-center text-lg font-bold outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        aria-label="Minutes"
                      />
                      <span className="text-white/40 text-xs font-medium">min</span>
                    </div>
                    <span className="text-white/30 text-xl font-light">:</span>
                    <div className="flex items-center gap-1.5 bg-[#0f0f0f] border border-white/10 rounded-xl px-4 py-2.5">
                      <input
                        type="number"
                        min={0}
                        max={59}
                        value={targetDuration % 60}
                        onChange={(e) => {
                          const mins = Math.floor(targetDuration / 60);
                          const secs = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
                          const total = mins * 60 + secs;
                          setTargetDuration(Math.max(5, Math.min(600, total)));
                        }}
                        className="w-10 bg-transparent text-white text-center text-lg font-bold outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        aria-label="Seconds"
                      />
                      <span className="text-white/40 text-xs font-medium">sec</span>
                    </div>
                    <span className="text-sm font-bold text-[--color-gold] ml-2">
                      {targetDuration >= 60
                        ? `${Math.floor(targetDuration / 60)}:${String(targetDuration % 60).padStart(2, "0")}`
                        : `0:${String(targetDuration).padStart(2, "0")}`}
                    </span>
                  </div>
                  {/* Quick-select shortcuts — two rows */}
                  <div className="mb-3 space-y-2.5">
                    {/* Short: 5–30s (WizAudio SFX exact duration) */}
                    <div>
                      <p className="text-[10px] text-[#555] uppercase tracking-widest mb-1.5">Short – exact (Sound FX)</p>
                      <div className="flex flex-wrap gap-1.5">
                        {[5, 10, 15, 20, 25, 30].map((s) => (
                          <button
                            key={s}
                            onClick={() => setTargetDuration(s)}
                            className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                      targetDuration === s
                        ? "bg-[--color-gold]/15 border-[--color-gold]/30 text-[--color-gold]"
                                : "bg-white/4 border-white/8 text-[#a1a1aa] hover:border-white/16 hover:text-white"
                            }`}
                          >
                            {s}s
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Long: 1m–10m */}
                    <div>
                      <p className="text-[10px] text-[#555] uppercase tracking-widest mb-1.5">Long – composition</p>
                      <div className="flex flex-wrap gap-1.5">
                        {[60, 90, 120, 180, 240, 300, 420, 600].map((s) => (
                          <button
                            key={s}
                            onClick={() => setTargetDuration(s)}
                            className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                              targetDuration === s
                                ? "bg-[--color-gold]/15 border-[--color-gold]/30 text-[--color-gold]"
                                : "bg-white/4 border-white/8 text-[#a1a1aa] hover:border-white/16 hover:text-white"
                            }`}
                          >
                            {`${Math.floor(s / 60)}m${s % 60 ? ` ${s % 60}s` : ""}`}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-[#a1a1aa]">
                    Enter any exact duration (e.g. 2:41 for a 2m 41s video). Min 5s, max 10 min. Short options (≤30s) use Sound FX mode for exact-length output.
                  </p>
                </>
              )}
            </div>

            {/* Prompt */}
            <div className="p-6 rounded-2xl bg-[#171717] border border-white/6">
              <label className="block text-sm font-semibold text-white mb-3">
                <Wand2 className="w-4 h-4 inline mr-2 text-[--color-gold]" />
                Describe your song
              </label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. A kids pirate adventure song with a catchy chorus and upbeat energy..."
                className="bg-[#0f0f0f] border-white/10 text-white placeholder:text-[#666] resize-none min-h-[100px] focus:border-[--color-gold]/30 focus:ring-0 rounded-xl"
                maxLength={400}
              />
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-[#a1a1aa]">{prompt.length}/400 characters</p>
                <div className="flex gap-2 flex-wrap justify-end">
                  {PROMPT_EXAMPLES.slice(0, 2).map((ex) => (
                    <button
                      key={ex}
                      onClick={() => setPrompt(ex)}
                      className="text-xs text-[--color-gold] hover:text-[--color-gold] transition-colors underline-offset-2 hover:underline"
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
                        ? "bg-[--color-gold]/15 border-[--color-gold]/30 text-[--color-gold]"
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
                    key={m}
                    onClick={() => setSelectedMood(selectedMood === m ? "" : m)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                      selectedMood === m
                        ? "bg-[--color-gold]/15 border-[--color-gold]/30 text-[--color-gold]"
                        : "bg-white/4 border-white/8 text-[#a1a1aa] hover:border-white/16 hover:text-white"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Vocal style */}
            <div className="p-6 rounded-2xl bg-[#171717] border border-white/6">
              <label className="block text-sm font-semibold text-white mb-3">
                <Volume2 className="w-4 h-4 inline mr-2 text-[--color-gold]" />
                Vocal style
              </label>
              <div className="flex flex-wrap gap-2">
                {VOCAL_STYLES.map((v) => (
                  <button
                    key={v}
                    onClick={() => setSelectedVocal(selectedVocal === v ? "" : v)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                      selectedVocal === v
                        ? "bg-[--color-gold]/15 border-[--color-gold]/30 text-[--color-gold]"
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
                  <FileText className="w-4 h-4 text-[--color-silver]" />
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
                  className="bg-[--color-silver]/10 border-[--color-silver]/30 text-[--color-silver] hover:bg-[--color-silver]/10 hover:text-[--color-silver] text-xs h-8 rounded-lg"
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
                      className="bg-[#0f0f0f] border-white/10 text-white placeholder:text-[#555] resize-none min-h-[260px] focus:border-[--color-silver]/50 focus:ring-0 rounded-xl font-mono text-sm leading-relaxed"
                      maxLength={3000}
                    />
                    {lyrics.trim() && (
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-[--color-silver]/10 text-[--color-silver] border-[--color-silver]/20 text-[10px]">
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
                    <div className="mt-3 p-3 rounded-xl bg-[--color-gold]/15 border border-[--color-gold]/30 text-[--color-gold] text-xs flex items-start gap-2">
                      <span className="text-base leading-none">⚠️</span>
                      <span>
                        You have a title and style set — WizAudio will use <strong>custom mode</strong>, which requires lyrics.
                        Click <strong>"Generate Lyrics with AI"</strong> above or write your own.
                      </span>
                    </div>
                  )}
                </>
              )}

              {!showLyrics && lyrics.trim() && (
                <div className="flex items-center gap-2 text-xs text-[--color-silver]">
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
                    className="w-full bg-[#0f0f0f] border border-white/10 text-white placeholder:text-[#666] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[--color-gold]/30"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#a1a1aa] mb-1.5">Model</label>
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value as "V3_5" | "V4")}
                    className="w-full bg-[#0f0f0f] border border-white/10 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[--color-gold]/30"
                  >
                    <option value="V4">WizAudio V4 (recommended)</option>
                    <option value="V3_5">WizAudio V3.5</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Generate + Results */}
          <div className="space-y-6">
            {/* Generate card */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-[#b8892a]/20 to-[#1a1a1a] border border-[--color-gold]/30 sticky top-24">
              <h2 className="text-lg font-bold text-white mb-1">Ready to generate</h2>

              {/* Generation Engine Selector */}
              <div className="mb-5">
                <label className="block text-xs text-[#a1a1aa] mb-2 font-medium uppercase tracking-widest">Generation Engine</label>
                <div className="grid grid-cols-3 gap-1.5 mb-2">
                  {([
                    { value: "score" as const, label: "Sound FX", icon: "" },
                    { value: "song" as const, label: "Precision Audio", icon: "" },
                    { value: "suno" as const, label: "WizAudio", icon: "" },
                  ]).map(({ value, label, icon }) => (
                    <button
                      key={value}
                      onClick={() => setGenerationMode(value)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        generationMode === value
                          ? value === "score"
                            ? "bg-[--color-gold]/15 border-[--color-gold]/30 text-[--color-gold]"
                            : value === "song"
                            ? "bg-[--color-silver]/10 border-[--color-silver]/50 text-[--color-silver]"
                            : "bg-[--color-gold]/15 border-[--color-gold]/30 text-[--color-gold]"
                          : "bg-white/3 border-white/8 text-[#a1a1aa] hover:border-white/20 hover:text-white"
                      }`}
                    >
                      <div className="text-base mb-0.5">{icon}</div>
                      <div className="text-[11px] font-semibold leading-tight">{label}</div>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-[#666] leading-relaxed">
                  {generationMode === "score" && "– Sound FX — exact-duration sound design. Perfect for stingers, cinematic hits, ambient beds, and short audio clips up to 30s."}
                  {generationMode === "song" && "– Precision Audio — full production music at any length. Cinematic scores, background tracks, vocal songs — precise duration, no fade, no trim."}
                  {generationMode === "suno" && "– WizAudio — 2 creative track variations. Great for songs with lyrics. If a duration is set, the track is trimmed to fit."}
                </p>
              </div>

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
                    <span className="text-[--color-silver] flex items-center gap-1">
                      <Check className="w-3 h-3" />{lyrics.split("\n").filter(Boolean).length} lines
                    </span>
                  </div>
                )}
              </div>

              {/* Custom mode warning */}
              {isCustomMode && !lyrics.trim() && (
                <div className="mb-4 p-3 rounded-xl bg-[--color-gold]/15 border border-[--color-gold]/30 text-[--color-gold] text-xs">
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
                  className="w-full bg-gradient-to-r from-[#b8892a] to-[#4a3010] hover:from-[#e8c878] hover:to-[#b8892a] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl h-auto py-3 transition-all shadow-lg hover:shadow-[#b8892a]/20"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {status === "pending" ? "Queued…" : status === "trimming" ? "Trimming to exact duration…" : "Generating…"}
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
                  className="w-full mt-2 bg-[--color-silver]/10 border-[--color-silver]/30 text-[--color-silver] hover:bg-[--color-silver]/10 text-xs h-9 rounded-xl"
                >
                  {generateLyricsMutation.isPending ? (
                    <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Writing lyrics…</>
                  ) : (
                    <><Sparkles className="w-3 h-3 mr-1.5" />Generate Lyrics First</>
                  )}
                </Button>
              )}

              {/* ── Premium Multi-Phase Loading Animation ── */}
              {isGenerating && (
                <div className="mt-5 rounded-2xl overflow-hidden border border-white/8 bg-gradient-to-b from-[#0f0f18] to-[#0a0a10]">
                  {/* Phase indicator pills */}
                  <div className="flex items-center justify-center gap-3 pt-5 pb-2">
                    {(["pending", "processing", "trimming"] as const).map((phase, idx) => {
                      const labels = ["Queued", "Generating", "Trimming"];
                      const icons = ["\u23F3", "\u266B", "\u2702\uFE0F"];
                      const isActive = status === phase;
                      const phaseOrder = ["pending", "processing", "trimming"] as const;
                      const currentIdx = phaseOrder.indexOf(status as typeof phaseOrder[number]);
                      const isDone = currentIdx > idx;
                      return (
                        <div key={phase} className="flex items-center gap-1.5">
                          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-wide transition-all duration-500 ${
                            isActive ? "bg-[--color-gold]/15 text-[--color-gold] border border-[--color-gold]/30 shadow-lg shadow-[#b8892a]/10"
                            : isDone ? "bg-[--color-silver]/10 text-[--color-silver]/80 border border-[--color-silver]/20"
                            : "bg-white/[0.03] text-white/25 border border-white/[0.06]"
                          }`}>
                            <span>{isDone ? "\u2713" : icons[idx]}</span>
                            <span>{labels[idx]}</span>
                            {isActive && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
                          </div>
                          {idx < 2 && <div className={`w-6 h-px ${isDone ? "bg-[--color-silver]/10" : "bg-white/10"}`} />}
                        </div>
                      );
                    })}
                  </div>

                  {/* Large waveform visualiser */}
                  <div className="relative flex items-end justify-center gap-[3px] h-24 px-6 pt-4 pb-3">
                    {Array.from({ length: 40 }).map((_, i) => {
                      const isTrimming = status === "trimming";
                      const isPending = status === "pending";
                      const delay = `${(i * 0.05).toFixed(2)}s`;
                      const baseH = isPending ? 3 : isTrimming ? 10 : 7;
                      const color = isTrimming
                        ? `rgba(34,197,94,${0.4 + (i % 3) * 0.2})`
                        : isPending
                        ? `rgba(139,92,246,${0.2 + (i % 4) * 0.08})`
                        : `rgba(139,92,246,${0.45 + (i % 4) * 0.15})`;
                      return (
                        <div
                          key={i}
                          className="rounded-full flex-shrink-0"
                          style={{
                            width: 3,
                            minHeight: baseH,
                            background: color,
                            animationName: "wizWave",
                            animationDuration: isPending ? "2s" : isTrimming ? "0.5s" : "1s",
                            animationDelay: delay,
                            animationTimingFunction: "ease-in-out",
                            animationIterationCount: "infinite",
                            animationDirection: "alternate",
                          }}
                        />
                      );
                    })}
                    {/* Glow */}
                    <div className="absolute inset-0 pointer-events-none" style={{
                      background: status === "trimming"
                        ? "radial-gradient(ellipse at 50% 100%, rgba(34,197,94,0.12) 0%, transparent 70%)"
                        : "radial-gradient(ellipse at 50% 100%, rgba(139,92,246,0.15) 0%, transparent 70%)"
                    }} />
                  </div>

                  {/* Status text + elapsed timer */}
                  <div className="px-5 pb-4 text-center space-y-1">
                    <p className="text-sm font-semibold tracking-wide" style={{
                      color: status === "trimming" ? "rgb(134,239,172)" : status === "pending" ? "rgb(196,181,253)" : "rgb(216,200,255)"
                    }}>
                      {status === "pending" ? "Waiting in queue\u2026"
                        : status === "trimming" ? "\u2702\uFE0F Trimming to exact duration\u2026"
                        : "\u266B Composing your track with WizAudio\u2026"}
                    </p>
                    <p className="text-[11px] text-white/30">
                      {status === "trimming" ? "Almost done \u2014 finalising your audio"
                        : status === "pending" ? "Your request is queued and will start shortly"
                        : "This usually takes 1\u20133 minutes depending on the engine"}
                    </p>
                  </div>

                  {/* Progress bar */}
                  <div className="h-[3px] bg-white/5">
                    <div
                      className="h-full rounded-full transition-all duration-[2000ms] ease-out"
                      style={{
                        width: status === "pending" ? "12%" : status === "trimming" ? "90%" : "55%",
                        background: status === "trimming"
                          ? "linear-gradient(90deg, #16a34a, #22c55e, #4ade80)"
                          : "linear-gradient(90deg, #7c3aed, #6366f1, #818cf8, #3b82f6)",
                      }}
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-4 p-3 rounded-xl bg-red-500/8 border border-red-500/20 text-red-300 text-sm">
                  {error}
                </div>
              )}
            </div>

        {/* Upload mode panel */}
        {mode === "upload" && (
          <div className="p-6 rounded-2xl bg-[#171717] border border-white/6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <UploadCloud className="w-5 h-5 text-[--color-gold]" />
              <h3 className="text-sm font-semibold text-white">Upload Your Track</h3>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp3,.wav,.m4a,.ogg,audio/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }}
            />
            {uploadedAudioUrl ? (
              <div className="space-y-3">
                <WizAudioPlayer
                  audioUrl={uploadedAudioUrl}
                  title={uploadedAudioName || "Uploaded Track"}
                  subtitle="Your uploaded audio"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setUploadedAudioUrl(null); setUploadedAudioName(""); }}
                    className="flex-1 border-white/10 text-white/60 hover:text-white text-xs h-9 rounded-xl"
                  >
                    <X className="w-3 h-3 mr-1.5" />Remove
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 bg-gradient-to-r from-[#b8892a] to-[#4a3010] hover:from-[#e8c878] hover:to-[#b8892a] text-white text-xs h-9 rounded-xl"
                    asChild
                  >
                    <a href={`/music-video/create?audioUrl=${encodeURIComponent(uploadedAudioUrl)}`}>
                      <ChevronRight className="w-3.5 h-3.5 mr-1" />Start with WizVideo
                    </a>
                  </Button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFileUpload(f); }}
                className="border-2 border-dashed border-white/12 hover:border-[--color-gold]/40 rounded-2xl p-10 text-center cursor-pointer transition-all group"
              >
                {isUploadingFile ? (
                  <><Loader2 className="w-10 h-10 text-[--color-gold] mx-auto mb-2 animate-spin" /><p className="text-[--color-gold] font-medium">Uploading…</p></>
                ) : (
                  <><UploadCloud className="w-10 h-10 text-white/20 group-hover:text-[--color-gold] mx-auto mb-3 transition-colors" />
                  <p className="text-white/60 font-medium group-hover:text-white transition-colors">Drop your audio file here</p>
                  <p className="text-white/30 text-sm mt-1">MP3, WAV, M4A, OGG · Max 50MB</p></>
                )}
              </div>
            )}
          </div>
        )}

        {/* Generated tracks */}
        {mode === "generate" && generatedTracks.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[--color-silver]" />
              <h3 className="text-sm font-semibold text-white">Your tracks are ready</h3>
            </div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-[#a1a1aa]">Generated tracks</span>
              <div className="flex items-center gap-3">
                {/* Regenerate — re-run with the same settings */}
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !canGenerate}
                  className="flex items-center gap-1.5 text-xs text-[--color-gold]/70 hover:text-[--color-gold] transition-colors disabled:opacity-40"
                  title="Generate new tracks with the same settings"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Regenerate
                </button>
                {/* Delete */}
                {taskId && (
                  <button
                    onClick={() => deleteTaskMutation.mutate({ id: taskId })}
                    disabled={deleteTaskMutation.isPending}
                    className="flex items-center gap-1.5 text-xs text-red-400/70 hover:text-red-400 transition-colors disabled:opacity-40"
                    title="Delete these tracks"
                  >
                    {deleteTaskMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    Delete
                  </button>
                )}
              </div>
            </div>
            {generatedTracks.map((track, i) => (
              <WizAudioPlayer
                key={i}
                audioUrl={track.audioUrl}
                title={track.title || `Track ${i + 1}`}
                imageUrl={track.imageUrl}
              />
            ))}
                <div className="p-4 rounded-xl bg-[--color-gold]/15 border border-[--color-gold]/30 text-center">
                  <p className="text-sm text-[--color-gold] mb-3">Love your track? Turn it into a full music video.</p>
                  <Button
                    className="bg-gradient-to-r from-[#b8892a] to-[#4a3010] hover:from-[#e8c878] hover:to-[#b8892a] text-white text-sm font-semibold rounded-xl h-auto py-2.5 px-5"
                    asChild
                  >
                    <Link href="/music-video">
                      <ChevronRight className="w-4 h-4 mr-1.5" />Start with WizVideo
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
                    <ChevronRight className="w-3.5 h-3.5 text-[--color-gold] flex-shrink-0 mt-0.5" />
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
