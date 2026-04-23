/**
 * WizAudio™ — AI Music Engine
 * Full recording studio environment: 3-column layout with numbered config sidebar,
 * central Recording Booth workspace, and right Upgrade Preview panel.
 * Matches the WizScore mockup quality standard.
 */
import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useSEO } from "@/hooks/useSEO";
import { Link } from "wouter";
import {
  Music2, Sparkles, Play, Pause, Download, Loader2,
  ChevronRight, ArrowLeft, Check, Volume2, Clock, Wand2,
  Film, Upload, Mic2, Plus, FileText, CheckCircle2,
  AlertCircle, Settings, Eye, Headphones, SlidersHorizontal,
  UploadCloud, RefreshCw, Trash2, PenLine, ChevronDown, ChevronUp, X,
} from "@/lib/icons";
import { VoicePromptButton } from "@/components/VoicePromptButton";
import WizAudioPlayer from "@/components/WizAudioPlayer";
import GraphicEqualiser from "@/components/GraphicEqualiser";
import { useGlobalAudio } from "@/contexts/AudioContext";

/* ── Constants ────────────────────────────────────────────────────────────── */
const ENV_IMG = "/manus-storage/env-recording-studio_90a4b01f.jpg";

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
const VOCALS = ["Male vocals", "Female vocals", "Choir", "Rap", "Spoken word", "Instrumental only"];
const PROMPT_EXAMPLES = [
  "A kids pirate adventure song with a catchy chorus and upbeat energy",
  "Cinematic orchestral score for an epic fantasy battle scene",
  "Lo-fi hip hop beats for studying, rainy day vibes",
  "Upbeat pop song about summer love and dancing on the beach",
  "Dark electronic track with heavy bass and futuristic synths",
  "Acoustic folk ballad about missing home and family",
];

type Stage = "compose" | "preview" | "upgrade" | "render";
const STAGES: { id: Stage; label: string }[] = [
  { id: "compose", label: "COMPOSE" },
  { id: "preview", label: "PREVIEW & EDIT" },
  { id: "upgrade", label: "UPGRADE PREVIEW" },
  { id: "render", label: "RENDER & EXPORT" },
];
type RenderQuality = "hd" | "4k" | "8k";
type AudioTier = "original" | "enhanced" | "cinematic";

/* ── Waveform Visualizer ──────────────────────────────────────────────────── */
function TrackWaveform({ color }: { color: string }) {
  return (
    <div className="h-8 rounded-sm overflow-hidden relative" style={{ background: `${color}15` }}>
      <div className="absolute inset-0 flex items-center gap-[1px] px-1">
        {Array.from({ length: 60 }).map((_, i) => (
          <div key={i} className="flex-1 rounded-full" style={{ height: `${Math.random() * 70 + 20}%`, background: `linear-gradient(to top, ${color}40, ${color}cc)` }} />
        ))}
      </div>
    </div>
  );
}

/* ── Spectrum Analyzer ────────────────────────────────────────────────────── */
function SpectrumAnalyzer() {
  return (
    <div className="w-full h-16 flex items-end gap-[2px] px-4 overflow-hidden">
      {Array.from({ length: 120 }).map((_, i) => {
        const h = Math.sin(i * 0.15) * 30 + Math.random() * 25 + 15;
        const hue = (i / 120) * 300;
        return <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${h}%`, background: `hsl(${hue}, 80%, 55%)`, opacity: 0.85 }} />;
      })}
    </div>
  );
}

/* ── Main Component ───────────────────────────────────────────────────────── */
export default function MusicCreator() {
  useSEO({ title: "AI Music Creator — Generate Songs with AI — WIZ AI", path: "/music-creator", description: "Create original songs with AI. Choose style, mood, and genre, then generate full tracks with lyrics. Powered by WizSound™ cinematic audio mastering." });
  const { user, loading: authLoading } = useAuth();

  // ── Form state ──
  const [mode, setMode] = useState<"generate" | "upload">("generate");
  const [prompt, setPrompt] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedMood, setSelectedMood] = useState("");
  const [selectedVocal, setSelectedVocal] = useState("");
  const [instrumental, setInstrumental] = useState(false);
  const [title, setTitle] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [showLyrics, setShowLyrics] = useState(false);
  const [lyricsGenerated, setLyricsGenerated] = useState(false);
  const [model, setModel] = useState<"V3_5" | "V4">("V4");
  const [targetDuration, setTargetDuration] = useState<number>(120);
  const [generationMode, setGenerationMode] = useState<"score" | "song" | "suno">("suno");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedAudioUrl, setUploadedAudioUrl] = useState<string | null>(null);
  const [uploadedAudioName, setUploadedAudioName] = useState<string>("");
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  // ── Mockup state ──
  const [activeStage, setActiveStage] = useState<Stage>("compose");
  const [completedStages] = useState<Stage[]>([]);
  const [activeTier, setActiveTier] = useState<AudioTier>("original");
  const [renderQuality, setRenderQuality] = useState<RenderQuality>("hd");
  const [ambientLevel] = useState(60);

  // ── API mutations ──
  const uploadAudioMutation = trpc.musicVideo.uploadAudio.useMutation({
    onSuccess: (data) => { setUploadedAudioUrl(data.url); toast.success("Audio uploaded!", { description: uploadedAudioName }); },
    onError: (err) => { toast.error("Upload failed", { description: err.message }); setIsUploadingFile(false); },
  });

  const handleFileUpload = async (file: File) => {
    if (!file.type.match(/audio\/(mpeg|wav|mp4|x-m4a|ogg|webm)/)) { toast.error("Invalid file type"); return; }
    if (file.size > 50 * 1024 * 1024) { toast.error("File too large", { description: "Maximum 50MB." }); return; }
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

  const isCustomMode = !!(selectedGenres.length > 0 || selectedMood) && !!title.trim() && !instrumental && selectedVocal !== "Instrumental only";

  const generateLyricsMutation = trpc.suno.generateLyrics.useMutation({
    onSuccess: (data) => { setLyrics(data.lyrics); setLyricsGenerated(true); setShowLyrics(true); toast.success("Lyrics generated!"); },
    onError: (err) => toast.error(err.message || "Failed to generate lyrics."),
  });

  const deleteTaskMutation = trpc.suno.deleteTask.useMutation({
    onSuccess: () => { setGeneratedTracks([]); setTaskId(null); setStatus("idle"); toast.success("Track deleted."); },
    onError: (err) => toast.error("Delete failed", { description: err.message }),
  });

  const generateMutation = trpc.suno.generate.useMutation({
    onSuccess: (data) => { setTaskId(data.id); setStatus("pending"); setIsGenerating(true); },
    onError: (err) => { setError(err.message); setIsGenerating(false); setStatus("failed"); },
  });

  const statusQuery = trpc.suno.getStatus.useQuery(
    { id: taskId! },
    { enabled: taskId !== null && (status === "pending" || status === "processing" || status === "trimming"), refetchInterval: status === "trimming" ? 5000 : 8000, refetchIntervalInBackground: false },
  );

  useEffect(() => {
    if (!statusQuery.data) return;
    const d = statusQuery.data;
    const newStatus = d.status as typeof status;
    setStatus(newStatus);
    if (newStatus === "complete" && d.tracks && d.tracks.length > 0) { setGeneratedTracks(d.tracks as typeof generatedTracks); setIsGenerating(false); }
    else if (newStatus === "trimming") { setIsGenerating(true); }
    else if (newStatus === "failed") { setError(d.errorMessage ?? "Generation failed."); setIsGenerating(false); }
  }, [statusQuery.data]);

  const buildStyleString = () => {
    const parts: string[] = [];
    if (selectedGenres.length > 0) parts.push(selectedGenres.join(", "));
    if (selectedMood) parts.push(selectedMood);
    if (selectedVocal && selectedVocal !== "Instrumental only") parts.push(selectedVocal);
    return parts.join(", ");
  };

  const handleGenerateLyrics = () => {
    if (!prompt.trim()) { toast.error("Please describe your song first."); return; }
    generateLyricsMutation.mutate({ prompt: prompt.trim(), genre: selectedGenres.join(", ") || undefined, mood: selectedMood || undefined, title: title.trim() || undefined });
  };

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    setError(null); setGeneratedTracks([]); setTaskId(null); setStatus("idle");
    const styleStr = buildStyleString();
    const isInstrumental = instrumental || selectedVocal === "Instrumental only";
    generateMutation.mutate({ prompt: prompt.trim(), lyrics: lyrics.trim() || undefined, style: styleStr || undefined, title: title.trim() || undefined, instrumental: isInstrumental, model, origin: window.location.origin, targetDuration: targetDuration ?? undefined, generationMode });
  };

  const toggleGenre = (g: string) => setSelectedGenres((prev) => prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g].slice(0, 3));
  const canGenerate = prompt.trim().length > 0 && !isGenerating;
  const lyricsCharCount = lyrics.length;
  const lyricsCharColor = lyricsCharCount > 2800 ? "text-red-400" : lyricsCharCount > 2000 ? "text-yellow-400" : "text-[#a1a1aa]";
  const durationLabel = targetDuration >= 60 ? `${Math.floor(targetDuration / 60)}:${String(targetDuration % 60).padStart(2, "0")}` : `0:${String(targetDuration).padStart(2, "0")}`;

  // ── Auth gate ──
  if (!authLoading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#06050a" }}>
        <div className="env-bg"><img src={ENV_IMG} alt="" /><div className="env-bg-overlay" /></div>
        <div className="text-center max-w-md relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-[--color-gold]/15 border border-[--color-gold]/30 flex items-center justify-center mx-auto mb-6"><Music2 className="w-8 h-8 text-[--color-gold]" /></div>
          <h1 className="text-3xl font-bold text-white mb-3">WizAudio™</h1>
          <p className="text-white/50 mb-8">Sign in to access the AI Music Engine.</p>
          <Button className="btn-primary btn-sheen px-8 py-3 rounded-xl text-base" asChild><a href={getLoginUrl()}>Sign in to continue</a></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: "#06050a" }}>
      {/* ── VR Environment: Recording Studio ── */}
      <div className="env-bg"><img src={ENV_IMG} alt="" /><div className="env-bg-overlay" /></div>
      <div className="env-ambient env-tint-amber" style={{ opacity: ambientLevel / 100 }} />

      {/* ══════════════ TOP NAV ══════════════ */}
      <header className="sticky top-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-white/40 hover:text-white/70 text-sm flex items-center gap-1.5 transition-colors"><ArrowLeft className="w-3.5 h-3.5" /> Back to Studio</Link>
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-lg tracking-tight">WIZAUDIO</span>
              <span className="bg-[--color-gold] text-black text-[10px] font-bold px-2 py-0.5 rounded tracking-widest">AI MUSIC ENGINE</span>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-1 text-xs text-white/40 font-semibold tracking-widest">
            {["SONGS", "SCORES", "SOUND FX", "VOCALS"].map((g, i) => (
              <span key={g} className="flex items-center gap-1">{i > 0 && <span className="text-white/15 mx-1">·</span>}<span className="hover:text-white/70 cursor-pointer transition-colors">{g}</span></span>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <div className="bg-[--color-gold]/15 border border-[--color-gold]/30 rounded-full px-3 py-1 text-[--color-gold] text-xs font-bold">10,000 Credits</div>
            <div className="w-8 h-8 rounded-full bg-[--color-gold]/20 border border-[--color-gold]/30 flex items-center justify-center text-[--color-gold] text-xs font-bold">{user?.name?.charAt(0) || "T"}</div>
          </div>
        </div>
        {/* ── 4-Stage Workflow Bar ── */}
        <div className="border-t border-white/[0.04] bg-[#0a0a0f]/60">
          <div className="max-w-[1600px] mx-auto px-4 py-2 flex items-center justify-center gap-2">
            {STAGES.map((s, i) => {
              const isActive = activeStage === s.id;
              const isDone = completedStages.includes(s.id);
              return (
                <div key={s.id} className="flex items-center gap-2">
                  <button onClick={() => setActiveStage(s.id)} className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider transition-all ${isActive ? "bg-[--color-gold]/20 border border-[--color-gold]/40 text-[--color-gold] shadow-[0_0_15px_rgba(184,137,42,0.2)]" : isDone ? "text-white/60 hover:text-white/80" : "text-white/30 hover:text-white/50"}`}>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${isDone ? "bg-green-500/20 text-green-400" : isActive ? "bg-[--color-gold]/30 text-[--color-gold]" : "bg-white/10"}`}>{isDone ? <Check className="w-3 h-3" /> : i + 1}</span>
                    <span className="hidden sm:inline">{s.label}</span>
                  </button>
                  {i < STAGES.length - 1 && <ChevronRight className="w-3 h-3 text-white/15" />}
                </div>
              );
            })}
          </div>
        </div>
      </header>

      {/* ── VR Hero Banner with Spectrum ── */}
      <div className="relative h-[200px] overflow-hidden">
        <img src={ENV_IMG} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ filter: "brightness(0.5) saturate(1.3)" }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#06050a] via-[#06050a]/30 to-transparent" />
        <div className="absolute top-4 left-4 z-10 studio-card rounded-xl px-4 py-2.5">
          <p className="text-[9px] text-white/40 font-bold tracking-widest uppercase">CURRENT SESSION</p>
          <p className="text-white/80 text-sm font-bold italic">{title || "New Track"}</p>
          <p className="text-white/30 text-[10px]">{selectedGenres.join(" · ") || "No genre"} · {selectedMood || "No mood"} · {generationMode === "suno" ? "WizAudio" : generationMode === "song" ? "Precision" : "SFX"}</p>
        </div>
        <div className="absolute top-4 right-4 z-10 flex items-center gap-3">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/15 border border-green-500/30 text-green-400 text-[10px] font-bold"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> STUDIO READY</span>
        </div>
        <div className="absolute bottom-0 left-0 right-0"><SpectrumAnalyzer /></div>
      </div>

      {/* ══════════════ MAIN 3-COLUMN LAYOUT ══════════════ */}
      <div className="relative z-10 max-w-[1600px] mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_280px] gap-4">

          {/* ── LEFT SIDEBAR: Song Configuration ── */}
          <aside className="space-y-5">
            {/* 1. Track Duration */}
            <div>
              <h3 className="flex items-center gap-2 text-xs font-bold text-white/70 tracking-widest uppercase mb-3">
                <span className="w-5 h-5 rounded-full bg-[--color-gold]/20 text-[--color-gold] flex items-center justify-center text-[10px] font-bold">1</span>
                Track Duration
              </h3>
              <div className="studio-card rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-white/40" /><span className="text-sm font-bold text-[--color-gold]">{durationLabel}</span></div>
                <div className="flex flex-wrap gap-1">
                  {[30, 60, 120, 180, 300].map(s => (
                    <button key={s} onClick={() => setTargetDuration(s)} className={`text-[9px] px-2 py-1 rounded-full border transition-all ${targetDuration === s ? "bg-[--color-gold]/15 border-[--color-gold]/30 text-[--color-gold]" : "bg-white/5 border-white/10 text-white/40 hover:text-white/60"}`}>{s < 60 ? `${s}s` : `${Math.floor(s/60)}m`}</button>
                  ))}
                </div>
                <input type="range" min={5} max={600} value={targetDuration} onChange={e => setTargetDuration(Number(e.target.value))} className="w-full h-1 accent-[--color-gold] bg-white/10 rounded-full cursor-pointer" />
              </div>
            </div>

            {/* 2. Genre */}
            <div>
              <h3 className="flex items-center gap-2 text-xs font-bold text-white/70 tracking-widest uppercase mb-3">
                <span className="w-5 h-5 rounded-full bg-[--color-gold]/20 text-[--color-gold] flex items-center justify-center text-[10px] font-bold">2</span>
                Genre <span className="text-white/30 text-[9px] font-normal">(pick up to 3)</span>
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {GENRES.map(g => (
                  <button key={g} onClick={() => toggleGenre(g)} className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all ${selectedGenres.includes(g) ? "bg-[--color-gold]/20 border-[--color-gold]/40 text-[--color-gold]" : "bg-white/5 border-white/10 text-white/40 hover:text-white/60 hover:border-white/20"}`}>{g}</button>
                ))}
              </div>
            </div>

            {/* 3. Mood */}
            <div>
              <h3 className="flex items-center gap-2 text-xs font-bold text-white/70 tracking-widest uppercase mb-3">
                <span className="w-5 h-5 rounded-full bg-[--color-gold]/20 text-[--color-gold] flex items-center justify-center text-[10px] font-bold">3</span>
                Mood
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {MOODS.map(m => (
                  <button key={m} onClick={() => setSelectedMood(selectedMood === m ? "" : m)} className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all ${selectedMood === m ? "bg-[--color-gold]/20 border-[--color-gold]/40 text-[--color-gold]" : "bg-white/5 border-white/10 text-white/40 hover:text-white/60 hover:border-white/20"}`}>{m}</button>
                ))}
              </div>
            </div>

            {/* 4. Vocal Style */}
            <div>
              <h3 className="flex items-center gap-2 text-xs font-bold text-white/70 tracking-widest uppercase mb-3">
                <span className="w-5 h-5 rounded-full bg-[--color-gold]/20 text-[--color-gold] flex items-center justify-center text-[10px] font-bold">4</span>
                Vocal Style
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {VOCALS.map(v => (
                  <button key={v} onClick={() => setSelectedVocal(selectedVocal === v ? "" : v)} className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all ${selectedVocal === v ? "bg-[--color-gold]/20 border-[--color-gold]/40 text-[--color-gold]" : "bg-white/5 border-white/10 text-white/40 hover:text-white/60 hover:border-white/20"}`}>{v}</button>
                ))}
              </div>
            </div>

            {/* 5. Song Brief */}
            <div>
              <h3 className="flex items-center gap-2 text-xs font-bold text-white/70 tracking-widest uppercase mb-3">
                <span className="w-5 h-5 rounded-full bg-[--color-gold]/20 text-[--color-gold] flex items-center justify-center text-[10px] font-bold">5</span>
                Song Brief
              </h3>
              <div className="flex items-center gap-2 mb-2">
                <VoicePromptButton toolContext="AI music and song creation" onPromptReady={(refined) => setPrompt(refined)} />
                <span className="text-white/25 text-[10px]">or type below</span>
              </div>
              <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={4} maxLength={400} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white/70 text-xs resize-none focus:border-[--color-gold]/30 focus:outline-none transition-colors" placeholder="e.g. A kids pirate adventure song with a catchy chorus and upbeat energy..." />
              <p className="text-[10px] text-white/30 mt-1">{prompt.length}/400</p>
            </div>

            {/* 6. Advanced */}
            <div>
              <h3 className="flex items-center gap-2 text-xs font-bold text-white/70 tracking-widest uppercase mb-3">
                <span className="w-5 h-5 rounded-full bg-[--color-gold]/20 text-[--color-gold] flex items-center justify-center text-[10px] font-bold">6</span>
                Advanced
              </h3>
              <div className="space-y-2">
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Song title (optional)" maxLength={80} className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white/70 text-xs focus:border-[--color-gold]/30 focus:outline-none" />
                <select value={model} onChange={e => setModel(e.target.value as "V3_5" | "V4")} className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white/70 text-xs focus:border-[--color-gold]/30 focus:outline-none">
                  <option value="V4">WizAudio V4</option>
                  <option value="V3_5">WizAudio V3.5</option>
                </select>
              </div>
            </div>
          </aside>

          {/* ── CENTER: Recording Booth Workspace ── */}
          <main className="space-y-4">
            {/* Mode toggle */}
            <div className="flex items-center gap-3 mb-2">
              <button onClick={() => setMode("generate")} className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold border transition-all ${mode === "generate" ? "bg-[--color-gold]/20 border-[--color-gold]/40 text-[--color-gold]" : "bg-white/5 border-white/10 text-white/40 hover:text-white/60"}`}><Sparkles className="w-3.5 h-3.5" /> Generate with AI</button>
              <button onClick={() => setMode("upload")} className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold border transition-all ${mode === "upload" ? "bg-[--color-gold]/20 border-[--color-gold]/40 text-[--color-gold]" : "bg-white/5 border-white/10 text-white/40 hover:text-white/60"}`}><UploadCloud className="w-3.5 h-3.5" /> Upload Your Track</button>
            </div>

            {/* Recording Booth Console */}
            <div className="studio-card rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[--color-gold]/10 bg-black/40">
                <div className="flex items-center gap-2.5">
                  <span className={`w-2 h-2 rounded-full ${isGenerating ? "bg-red-500 animate-pulse" : prompt.trim() ? "bg-green-500" : "bg-white/20"}`} />
                  <span className="text-[10px] text-white/40 font-bold tracking-widest uppercase">{isGenerating ? "ON AIR — RECORDING" : "RECORDING BOOTH"}</span>
                </div>
                <div className="flex gap-[2px]" style={{ opacity: isGenerating ? 1 : 0.2 }}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <div key={j} className="w-[3px] rounded-full bg-[--color-gold]" style={{ height: `${8 + Math.random() * 12}px`, animationName: isGenerating ? "wizWave" : "none", animationDuration: "0.8s", animationDelay: `${j * 0.1}s`, animationIterationCount: "infinite", animationDirection: "alternate" }} />
                  ))}
                </div>
              </div>
              <div className="p-5">
                <h2 className="text-lg font-bold text-white mb-1">Ready to generate</h2>
                <label className="block text-xs text-[#a1a1aa] mb-2 font-medium uppercase tracking-widest">Generation Engine</label>
                <div className="grid grid-cols-3 gap-1.5 mb-2">
                  {([{ value: "score" as const, label: "Sound FX" }, { value: "song" as const, label: "Precision Audio" }, { value: "suno" as const, label: "WizAudio" }]).map(({ value, label }) => (
                    <button key={value} onClick={() => setGenerationMode(value)} className={`p-2.5 rounded-xl border text-left transition-all ${generationMode === value ? "bg-[--color-gold]/15 border-[--color-gold]/30 text-[--color-gold]" : "bg-white/3 border-white/8 text-[#a1a1aa] hover:border-white/20"}`}>
                      <div className="text-[11px] font-semibold">{label}</div>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-[#666] leading-relaxed mb-4">
                  {generationMode === "score" && "Sound FX — exact-duration sound design. Stingers, cinematic hits, ambient beds up to 30s."}
                  {generationMode === "song" && "Precision Audio — full production music at any length. Cinematic scores, background tracks, vocal songs."}
                  {generationMode === "suno" && "WizAudio — 2 creative track variations. Great for songs with lyrics. If a duration is set, the track is trimmed to fit."}
                </p>

                {/* Summary */}
                <div className="space-y-1.5 mb-4 text-sm">
                  {prompt && <div className="flex gap-2"><span className="text-[#a1a1aa] flex-shrink-0">Prompt:</span><span className="text-white truncate">{prompt.slice(0, 60)}{prompt.length > 60 ? "…" : ""}</span></div>}
                  {selectedGenres.length > 0 && <div className="flex gap-2"><span className="text-[#a1a1aa]">Genre:</span><span className="text-white">{selectedGenres.join(", ")}</span></div>}
                  {selectedMood && <div className="flex gap-2"><span className="text-[#a1a1aa]">Mood:</span><span className="text-white">{selectedMood}</span></div>}
                </div>

                {/* Lyrics */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Button variant="outline" size="sm" onClick={handleGenerateLyrics} disabled={!prompt.trim() || generateLyricsMutation.isPending} className="bg-white/4 border-white/10 text-[#a1a1aa] hover:text-white text-xs h-8 rounded-lg">
                      {generateLyricsMutation.isPending ? <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Writing…</> : <><Sparkles className="w-3 h-3 mr-1.5" />{lyricsGenerated ? "Regenerate Lyrics" : "Generate Lyrics with AI"}</>}
                    </Button>
                    <button onClick={() => setShowLyrics(!showLyrics)} className="text-[10px] text-white/30 hover:text-white/60 transition-colors">{showLyrics ? "Hide" : "Show"} lyrics</button>
                  </div>
                  {showLyrics && (
                    <Textarea value={lyrics} onChange={e => setLyrics(e.target.value)} placeholder="[Verse 1]\nWrite or paste your lyrics here..." className="bg-[#0f0f0f] border-white/10 text-white placeholder:text-[#555] resize-none min-h-[160px] focus:border-[--color-gold]/30 focus:ring-0 rounded-xl font-mono text-sm" maxLength={3000} />
                  )}
                  {showLyrics && <p className={`text-[10px] mt-1 ${lyricsCharColor}`}>{lyricsCharCount}/3000</p>}
                </div>

                {/* Generate button */}
                {!user ? (
                  <Button className="w-full btn-primary btn-sheen py-3 rounded-xl text-sm font-bold" asChild><a href={getLoginUrl()}>Sign in to Generate</a></Button>
                ) : (
                  <Button onClick={handleGenerate} disabled={!canGenerate} className="w-full btn-primary btn-sheen py-3 rounded-xl text-sm font-bold disabled:opacity-40">
                    {isGenerating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{status === "trimming" ? "Trimming…" : "Generating…"}</> : <><Music2 className="w-4 h-4 mr-2" />Generate Song</>}
                  </Button>
                )}

                {/* Loading animation */}
                {isGenerating && (
                  <div className="mt-4 rounded-xl overflow-hidden border border-white/8 bg-gradient-to-b from-[#0f0f18] to-[#0a0a10] p-4">
                    <div className="flex items-center justify-center gap-3 mb-3">
                      {(["pending", "processing", "trimming"] as const).map((phase, idx) => {
                        const labels = ["Queued", "Generating", "Trimming"];
                        const phaseOrder = ["pending", "processing", "trimming"] as const;
                        const currentIdx = phaseOrder.indexOf(status as typeof phaseOrder[number]);
                        const isActive = status === phase;
                        const isDone = currentIdx > idx;
                        return (
                          <div key={phase} className="flex items-center gap-1.5">
                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all ${isActive ? "bg-[--color-gold]/15 text-[--color-gold] border border-[--color-gold]/30" : isDone ? "bg-white/5 text-white/50" : "bg-white/[0.03] text-white/25"}`}>
                              <span>{isDone ? "✓" : labels[idx].charAt(0)}</span><span>{labels[idx]}</span>{isActive && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
                            </div>
                            {idx < 2 && <div className="w-4 h-px bg-white/10" />}
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-end justify-center gap-[3px] h-16">
                      {Array.from({ length: 40 }).map((_, i) => (
                        <div key={i} className="rounded-full flex-shrink-0" style={{ width: 3, minHeight: 4, background: `rgba(184,137,42,${0.3 + (i % 4) * 0.15})`, animationName: "wizWave", animationDuration: "1s", animationDelay: `${i * 0.05}s`, animationTimingFunction: "ease-in-out", animationIterationCount: "infinite", animationDirection: "alternate" }} />
                      ))}
                    </div>
                  </div>
                )}

                {error && <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2"><AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}</div>}
              </div>
            </div>

            {/* Upload mode */}
            {mode === "upload" && (
              <div className="studio-card rounded-2xl p-5">
                <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} />
                {uploadedAudioUrl ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-400" /><span className="text-sm text-white font-medium">{uploadedAudioName}</span></div>
                    <WizAudioPlayer audioUrl={uploadedAudioUrl} title={uploadedAudioName || "Uploaded"} />
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="text-xs">Replace</Button>
                      <Button className="btn-primary btn-sheen text-xs" asChild>
                        <Link href={`/music-video?audio=${encodeURIComponent(uploadedAudioUrl)}&name=${encodeURIComponent(uploadedAudioName || "")}`}><ChevronRight className="w-3.5 h-3.5 mr-1" />Create Music Video</Link>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div onClick={() => fileInputRef.current?.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFileUpload(f); }} className="border-2 border-dashed border-white/12 hover:border-[--color-gold]/40 rounded-2xl p-10 text-center cursor-pointer transition-all group">
                    {isUploadingFile ? <><Loader2 className="w-10 h-10 text-[--color-gold] mx-auto mb-2 animate-spin" /><p className="text-[--color-gold]">Uploading…</p></> :
                    <><UploadCloud className="w-10 h-10 text-white/20 group-hover:text-[--color-gold] mx-auto mb-3 transition-colors" /><p className="text-white/60 group-hover:text-white transition-colors">Drop your audio file here</p><p className="text-white/30 text-sm mt-1">MP3, WAV, M4A · Max 50MB</p></>}
                  </div>
                )}
              </div>
            )}

            {/* Generated tracks */}
            {mode === "generate" && generatedTracks.length > 0 && (
              <div className="studio-card rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-green-400" /><h3 className="text-sm font-semibold text-white">Your tracks are ready</h3></div>
                  <div className="flex items-center gap-3">
                    <button onClick={handleGenerate} disabled={isGenerating || !canGenerate} className="flex items-center gap-1.5 text-xs text-[--color-gold]/70 hover:text-[--color-gold] transition-colors disabled:opacity-40"><RefreshCw className="w-3.5 h-3.5" /> Regenerate</button>
                    {taskId && <button onClick={() => deleteTaskMutation.mutate({ id: taskId })} disabled={deleteTaskMutation.isPending} className="flex items-center gap-1.5 text-xs text-red-400/70 hover:text-red-400 transition-colors disabled:opacity-40">{deleteTaskMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Delete</button>}
                  </div>
                </div>
                {generatedTracks.map((track, i) => (
                  <WizAudioPlayer key={i} audioUrl={track.audioUrl} title={track.title || `Track ${i + 1}`} imageUrl={track.imageUrl} />
                ))}
                <div className="p-4 rounded-xl bg-[--color-gold]/15 border border-[--color-gold]/30 text-center">
                  <p className="text-sm text-[--color-gold] mb-3">Love your track? Turn it into a full music video.</p>
                  <Button className="bg-gradient-to-r from-[#b8892a] to-[#4a3010] hover:from-[#e8c878] hover:to-[#b8892a] text-white text-sm font-semibold rounded-xl h-auto py-2.5 px-5" asChild>
                    <Link href="/music-video"><ChevronRight className="w-4 h-4 mr-1.5" />Start with WizVideo</Link>
                  </Button>
                </div>
              </div>
            )}

            {/* Example prompts */}
            <div className="studio-card rounded-2xl p-5">
              <p className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-widest mb-3">Example Prompts</p>
              <div className="space-y-2">
                {PROMPT_EXAMPLES.map(ex => (
                  <button key={ex} onClick={() => setPrompt(ex)} className="w-full text-left text-sm text-[#a1a1aa] hover:text-white transition-colors p-2.5 rounded-xl hover:bg-white/4 flex items-start gap-2">
                    <ChevronRight className="w-3.5 h-3.5 text-[--color-gold] flex-shrink-0 mt-0.5" /> {ex}
                  </button>
                ))}
              </div>
            </div>
          </main>

          {/* ── RIGHT SIDEBAR: Upgrade Preview ── */}
          <aside className="space-y-4">
            {/* Hear & See the Difference */}
            <div className="studio-card rounded-2xl p-4">
              <h3 className="flex items-center gap-2 text-[--color-gold] text-xs font-bold tracking-wider mb-2"><Sparkles className="w-3.5 h-3.5" /> HEAR & SEE THE DIFFERENCE</h3>
              <p className="text-white/30 text-[10px] leading-relaxed mb-4">Listen before you commit. Preview in all three quality tiers — no download until payment confirmed.</p>
              <div className="flex rounded-lg overflow-hidden border border-white/10 mb-4">
                {(["original", "enhanced", "cinematic"] as AudioTier[]).map(t => (
                  <button key={t} onClick={() => setActiveTier(t)} className={`flex-1 py-2 text-[10px] font-bold tracking-wider transition-all ${activeTier === t ? "bg-[--color-gold]/20 text-[--color-gold]" : "bg-white/5 text-white/30 hover:text-white/50"}`}>
                    {t.toUpperCase()}
                    {t !== "original" && <span className="block text-[8px] text-[--color-gold]/60">+£{t === "enhanced" ? "2.99" : "4.99"}</span>}
                  </button>
                ))}
              </div>
              <div className="rounded-xl overflow-hidden bg-white/[0.03] p-3 mb-3"><TrackWaveform color={activeTier === "cinematic" ? "#e8c878" : activeTier === "enhanced" ? "#78c8e8" : "#888"} /></div>
              <p className="text-white/30 text-[9px] font-bold tracking-widest uppercase mb-1">WIZAUDIO™ — {activeTier.toUpperCase()} MIX</p>
              <p className="text-white/70 text-xs font-semibold mb-2">{title || "New Track"}</p>
              <div className="flex items-center gap-3 mb-3">
                <button className="w-8 h-8 rounded-full bg-[--color-gold] flex items-center justify-center shadow-[0_0_12px_rgba(184,137,42,0.3)]"><Play className="w-3.5 h-3.5 text-black ml-0.5" /></button>
                <span className="text-white/40 text-[11px] font-mono">0:15 / {durationLabel}</span>
              </div>
              <p className="text-white/25 text-[9px] leading-relaxed">Preview in {activeTier} quality — full mastering & spatial audio applied on payment confirmed.</p>
            </div>

            {/* WizLuminar Visual Quality */}
            <div className="studio-card rounded-2xl p-4">
              <h3 className="text-white/60 text-xs font-bold tracking-wider mb-3">WIZLUMINAR™ — VISUAL QUALITY</h3>
              <div className="flex rounded-lg overflow-hidden border border-white/10">
                {["ORIGINAL", "ENHANCED", "CINEMATIC"].map((t, i) => (
                  <button key={t} className={`flex-1 py-2 text-[10px] font-bold tracking-wider transition-all ${i === 0 ? "bg-white/10 text-white/70" : "bg-white/5 text-white/30 hover:text-white/50"}`}>{t}</button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-1.5 mt-3">
                {[0.3, 0.5, 0.8].map((b, i) => (
                  <div key={i} className="aspect-video rounded-lg overflow-hidden bg-white/5"><img src={ENV_IMG} alt="" className="w-full h-full object-cover" style={{ filter: `brightness(${b}) saturate(${0.8 + i * 0.3})` }} /></div>
                ))}
              </div>
            </div>

            {/* Upsell buttons */}
            <button className="w-full btn-primary btn-sheen py-2.5 rounded-xl text-xs font-bold flex items-center justify-between px-4">
              <span className="flex items-center gap-2"><Headphones className="w-3.5 h-3.5" /> WizSound™ Cinematic</span><span>+£4.99</span>
            </button>
            <button className="w-full border border-[--color-gold]/30 bg-[--color-gold]/5 hover:bg-[--color-gold]/10 text-[--color-gold] py-2.5 rounded-xl text-xs font-bold flex items-center justify-between px-4 transition-colors">
              <span className="flex items-center gap-2"><Sparkles className="w-3.5 h-3.5" /> WizLuminar™ Cinematic</span><span>+£3.99</span>
            </button>

            {/* Render Quality */}
            <div className="studio-card rounded-2xl p-4">
              <h3 className="text-white/60 text-xs font-bold tracking-wider mb-3">RENDER QUALITY</h3>
              <div className="grid grid-cols-3 gap-2">
                {([{ id: "hd" as RenderQuality, label: "HD", sub: "standard", price: "Included" }, { id: "4k" as RenderQuality, label: "4K", sub: "studio", price: "+£2.99" }, { id: "8k" as RenderQuality, label: "8K", sub: "master", price: "+£4.99" }]).map(q => (
                  <button key={q.id} onClick={() => setRenderQuality(q.id)} className={`rounded-xl p-3 text-center transition-all border ${renderQuality === q.id ? "bg-[--color-gold]/15 border-[--color-gold]/40 shadow-[0_0_12px_rgba(184,137,42,0.15)]" : "bg-white/5 border-white/10 hover:border-white/20"}`}>
                    <p className={`text-sm font-bold ${renderQuality === q.id ? "text-[--color-gold]" : "text-white/60"}`}>{q.label}</p>
                    <p className="text-[9px] text-white/30">{q.sub}</p>
                    <p className={`text-[10px] font-bold mt-1 ${renderQuality === q.id ? "text-[--color-gold]" : "text-white/40"}`}>{q.price}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Render CTA */}
            <button className="w-full btn-primary btn-sheen py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2">
              <Film className="w-4 h-4" /> RENDER TRACK — {renderQuality.toUpperCase()}
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
}
