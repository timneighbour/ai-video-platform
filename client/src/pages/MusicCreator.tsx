/**
 * WizAudio™ — Recording Booth v4
 * SSL console aesthetic: Live Room Window + console rail (EQ + VU) + channel area + master bus
 * Matches mockup-v4-wizaudio.html exactly.
 */
import { useState, useRef, useEffect } from "react";
import { LandscapeHint } from "@/components/LandscapeHint";
import { WIZSOUND_TIERS } from "@/lib/pricing";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useSEO } from "@/hooks/useSEO";
import { Link } from "wouter";
import {
  Music2, Sparkles, Play, Pause, Download, Loader2,
  ChevronRight, ArrowLeft, Check, AlertCircle, Headphones,
  UploadCloud, RefreshCw, Trash2, Film,
} from "@/lib/icons";
import { VoicePromptButton } from "@/components/VoicePromptButton";
import EnhancePromptButton from "@/components/EnhancePromptButton";
import WizAudioPlayer from "@/components/WizAudioPlayer";
import GraphicEqualiser from "@/components/GraphicEqualiser";
import { useGlobalAudio } from "@/contexts/AudioContext";
import { mp } from "@/lib/mixpanel";
import PastGenerations from "@/components/PastGenerations";

/* ── Constants ────────────────────────────────────────────────────────────── */
const ENV_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/env-wizaudio-producer-TJv4iFWWsQCVnrNJxEfy7J.webp";

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
const VOCALS = ["Male Vocals", "Female Vocals", "Choir", "Rap", "Spoken Word", "Instrumental Only"];
const PROMPT_EXAMPLES = [
  "A kids pirate adventure song with a catchy chorus and upbeat energy",
  "Cinematic orchestral score for an epic fantasy battle scene",
  "Lo-fi hip hop beats for studying, rainy day vibes",
  "Upbeat pop song about summer love and dancing on the beach",
  "Dark electronic track with heavy bass and futuristic synths",
  "Acoustic folk ballad about missing home and family",
];
const GENRE_DATA: Record<string, { bpm: string; key: string; bars: string; stems: string }> = {
  "Pop":        { bpm: "120", key: "C",  bars: "32", stems: "10" },
  "Hip-Hop":    { bpm: "90",  key: "Cm", bars: "32", stems: "8"  },
  "R&B":        { bpm: "85",  key: "Fm", bars: "32", stems: "10" },
  "Rock":       { bpm: "140", key: "Em", bars: "32", stems: "8"  },
  "Electronic": { bpm: "128", key: "Am", bars: "64", stems: "12" },
  "Country":    { bpm: "100", key: "G",  bars: "32", stems: "7"  },
  "Jazz":       { bpm: "110", key: "Bb", bars: "48", stems: "6"  },
  "Classical":  { bpm: "60",  key: "Gm", bars: "64", stems: "20" },
  "Folk":       { bpm: "95",  key: "D",  bars: "32", stems: "5"  },
  "Reggae":     { bpm: "80",  key: "Dm", bars: "32", stems: "7"  },
  "Metal":      { bpm: "160", key: "Em", bars: "32", stems: "8"  },
  "Indie":      { bpm: "115", key: "Am", bars: "32", stems: "9"  },
  "K-Pop":      { bpm: "125", key: "C",  bars: "32", stems: "14" },
  "Latin":      { bpm: "105", key: "Am", bars: "32", stems: "11" },
  "Gospel":     { bpm: "90",  key: "Eb", bars: "32", stems: "12" },
  "Blues":      { bpm: "75",  key: "Bb", bars: "24", stems: "5"  },
};
const MOOD_KNOBS = ["Energy", "Darkness", "Tension", "Warmth", "Space", "Drive"];
const DURATION_OPTIONS = [
  { value: 30,  label: "30s", sub: "Clip" },
  { value: 60,  label: "60s", sub: "Short" },
  { value: 120, label: "2m",  sub: "Standard" },
  { value: 180, label: "3m",  sub: "Full" },
  { value: 300, label: "5m",  sub: "Extended" },
];

type AudioTier = "original" | "enhanced" | "cinematic";
type RenderQuality = "hd" | "4k" | "8k";
type GenerationMode = "score" | "song" | "suno";
type StudioMode = "generate" | "cover" | "extend";

/* ── Animated EQ Bars (console rail) ─────────────────────────────────────── */
function ConsoleEQDisplay({ isActive }: { isActive: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const levelsRef = useRef<number[]>(Array.from({ length: 13 }, () => 0));
  const peaksRef = useRef<number[]>(Array.from({ length: 13 }, () => 0));
  const peakHoldRef = useRef<number[]>(Array.from({ length: 13 }, () => 0));
  const freqCurve = [0.4, 0.55, 0.7, 0.85, 0.95, 1.0, 0.98, 0.92, 0.82, 0.68, 0.52, 0.38, 0.25];
  const freqLabels = ["20", "50", "100", "200", "400", "800", "1k", "2k", "4k", "8k", "12k", "16k", "20k"];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height - 14; // leave room for labels
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const bandW = Math.floor(W / 13);

      levelsRef.current.forEach((level, i) => {
        const curve = freqCurve[i] || 0.5;
        const target = isActive ? (0.2 + Math.random() * 0.8) * curve : 0;
        levelsRef.current[i] += (target - level) * 0.25;
        const l = levelsRef.current[i];
        const segCount = 10;
        const activeSeg = Math.floor(l * segCount);

        if (activeSeg > peaksRef.current[i]) {
          peaksRef.current[i] = activeSeg;
          peakHoldRef.current[i] = 80;
        } else {
          peakHoldRef.current[i]--;
          if (peakHoldRef.current[i] <= 0) peaksRef.current[i] = Math.max(0, peaksRef.current[i] - 0.3);
        }

        const x = i * bandW + 1;
        const segH = Math.floor(H / segCount) - 1;
        for (let si = 0; si < segCount; si++) {
          const y = H - (si + 1) * (segH + 1);
          if (si < activeSeg) {
            if (si >= 9) ctx.fillStyle = "#ff3b30";
            else if (si >= 8) ctx.fillStyle = "#ffd60a";
            else if (si >= 6) ctx.fillStyle = "#30d158";
            else if (si >= 4) ctx.fillStyle = "#40c8e0";
            else ctx.fillStyle = "#0a84ff";
          } else {
            ctx.fillStyle = "rgba(255,255,255,0.04)";
          }
          ctx.fillRect(x, y, bandW - 2, segH);
        }

        // Peak dot
        const peakY = H - (Math.floor(peaksRef.current[i]) + 1) * (segH + 1);
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.fillRect(x, peakY, bandW - 2, 2);

        // Freq label
        ctx.fillStyle = "rgba(255,255,255,0.22)";
        ctx.font = "6px 'Courier Prime', monospace";
        ctx.textAlign = "center";
        ctx.fillText(freqLabels[i], x + (bandW - 2) / 2, canvas.height - 2);
      });

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isActive]);

  return (
    <canvas
      ref={canvasRef}
      width={390}
      height={66}
      className="w-full"
      style={{ imageRendering: "pixelated" }}
    />
  );
}

/* ── VU Meter ─────────────────────────────────────────────────────────────── */
function VUMeter({ channel, isActive }: { channel: "L" | "R"; isActive: boolean }) {
  const [level, setLevel] = useState(0);
  useEffect(() => {
    if (!isActive) { setLevel(0); return; }
    const t = setInterval(() => setLevel(0.4 + Math.random() * 0.6), 100);
    return () => clearInterval(t);
  }, [isActive]);

  const segs = 10;
  const active = Math.floor(level * segs);
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[8px] text-white/16 tracking-widest">{channel}</span>
      <div className="flex flex-col-reverse gap-[2px]">
        {Array.from({ length: segs }).map((_, i) => (
          <div
            key={i}
            className="w-[22px] h-[5px] rounded-[1px] transition-all duration-75"
            style={{
              background: i < active
                ? i >= 9 ? "#ff3b30" : i >= 8 ? "#ffd60a" : "#30d158"
                : "rgba(255,255,255,0.04)",
              boxShadow: i < active
                ? i >= 9 ? "0 0 4px #ff3b30" : i >= 8 ? "0 0 4px #ffd60a" : "0 0 4px #30d158"
                : "none",
            }}
          />
        ))}
      </div>
      <LandscapeHint />
    </div>
  );
}

/* ── Rail Meters (horizontal, console-mounted) ───────────────────────────── */
function RailMeters({ isActive }: { isActive: boolean }) {
  const [levelsL, setLevelsL] = useState<number[]>(Array(8).fill(0));
  const [levelsR, setLevelsR] = useState<number[]>(Array(8).fill(0));

  useEffect(() => {
    if (!isActive) { setLevelsL(Array(8).fill(0)); setLevelsR(Array(8).fill(0)); return; }
    const t = setInterval(() => {
      const lvl = () => Math.floor(3 + Math.random() * 5);
      const fill = (n: number) => Array.from({ length: 8 }, (_, i) => i < n ? 1 : 0);
      setLevelsL(fill(lvl()));
      setLevelsR(fill(lvl()));
    }, 110);
    return () => clearInterval(t);
  }, [isActive]);

  const segColor = (i: number, active: number) => {
    if (!active) return "rgba(255,255,255,0.04)";
    if (i >= 7) return "#ff3b30";
    if (i >= 5) return "#ffd60a";
    return "#30d158";
  };
  const segShadow = (i: number, active: number) => {
    if (!active) return "none";
    if (i >= 7) return "0 0 3px #ff3b30";
    if (i >= 5) return "0 0 3px #ffd60a";
    return "0 0 3px #30d158";
  };

  return (
    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
      <div className="text-[9px] font-bold tracking-[2.5px] uppercase text-white/15">Master</div>
      <div className="flex flex-col gap-1">
        {([levelsL, levelsR] as const).map((segs, ci) => (
          <div key={ci} className="flex items-center gap-1.5">
            <span className="text-[8px] text-white/15 w-2">{ci === 0 ? "L" : "R"}</span>
            <div className="flex gap-[2px]">
              {segs.map((active, i) => (
                <div key={i} style={{
                  width: 7, height: 9, borderRadius: 1,
                  background: segColor(i, active),
                  boxShadow: segShadow(i, active),
                  transition: "background 0.08s",
                }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main Component ───────────────────────────────────────────────────────── */
export default function MusicCreator() {
  useSEO({ title: "WizAudio™ — Original Songs & Studio Voiceover — WIZ AI", path: "/music-creator", description: "Create original AI songs and studio-quality voiceover. 2 credits/min for music · 4 credits for voice. One wallet unlocks all WIZ AI studios." });
  const { user, loading: authLoading } = useAuth();
  // Studio entry tracking — fires once when an authenticated user lands on this page
  useEffect(() => { if (user) { mp.studioEntered("WizAudio"); } }, [user]);

  // ── Form state ──
  const [prompt, setPrompt] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [selectedVocal, setSelectedVocal] = useState("");
  const [title, setTitle] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [showExamples, setShowExamples] = useState(false);
  const [model, setModel] = useState<"V3_5" | "V4">("V4");
  const [targetDuration, setTargetDuration] = useState<number | null>(null);
  const [generationMode, setGenerationMode] = useState<GenerationMode>("suno");
  const [variations, setVariations] = useState<2 | 4>(2);
  const [activeTier, setActiveTier] = useState<AudioTier>("original");
  const [renderQuality, setRenderQuality] = useState<RenderQuality>("hd");
  const [ambience, setAmbience] = useState(72);
  const [activeKnobs, setActiveKnobs] = useState<string[]>(["Energy", "Space"]);
  const [studioMode, setStudioMode] = useState<StudioMode>("generate");
  const [uploadedAudioUrl, setUploadedAudioUrl] = useState<string | null>(null);
  const [uploadedAudioName, setUploadedAudioName] = useState<string>("");
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [coverStyleWeight, setCoverStyleWeight] = useState(0.7);
  const [coverAudioWeight, setCoverAudioWeight] = useState(0.5);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);

  // ── Generation state ──
  const [taskId, setTaskId] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTracks, setGeneratedTracks] = useState<Array<{ audioUrl: string; title: string; imageUrl?: string; tags?: string; duration?: number }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "pending" | "processing" | "trimming" | "complete" | "failed">("idle");

  // ── Derived ──
  const firstGenre = selectedGenres[0] || "";
  const genreInfo = GENRE_DATA[firstGenre] || { bpm: "—", key: "—", bars: "—", stems: "—" };
  const isOnAir = isGenerating;

  // ── API mutations ──
  const uploadAudioMutation = trpc.musicVideo.uploadAudio.useMutation({
    onSuccess: (data) => { setUploadedAudioUrl(data.url); toast.success("Audio uploaded!", { description: uploadedAudioName }); },
    onError: (err) => { toast.error("Upload failed", { description: err.message }); setIsUploadingFile(false); },
  });
  const transcribeTrackMutation = trpc.suno.transcribeTrack.useMutation({
    onSuccess: (data) => {
      if (data.text.trim()) {
        setLyrics(data.text.trim());
        toast.success("Lyrics extracted from your track!");
      }
    },
    // Silently ignore transcription errors — not a blocking step
    onError: () => {},
  });
  const uploadTrackForCoverMutation = trpc.suno.uploadTrackForCover.useMutation({
    onSuccess: (data) => {
      setUploadedAudioUrl(data.url);
      setIsUploadingFile(false);
      toast.success("Track uploaded — ready to transform!", { description: uploadedAudioName });
      // Auto-transcribe to extract lyrics
      transcribeTrackMutation.mutate({ audioUrl: data.url });
    },
    onError: (err) => { toast.error("Upload failed", { description: err.message }); setIsUploadingFile(false); },
  });
  const generateCoverMutation = trpc.suno.generateCover.useMutation({
    onSuccess: (data) => { setTaskId(data.id); setStatus("pending"); setIsGenerating(true); },
    onError: (err) => { setError(err.message); setIsGenerating(false); setStatus("failed"); mp.generationFailed("WizAudio", "api_error"); },
  });
  const generateExtendMutation = trpc.suno.generateExtend.useMutation({
    onSuccess: (data) => { setTaskId(data.id); setStatus("pending"); setIsGenerating(true); },
    onError: (err) => { setError(err.message); setIsGenerating(false); setStatus("failed"); mp.generationFailed("WizAudio", "api_error"); },
  });

  /**
   * Upload audio via multipart/form-data to /api/video/upload.
   * Using tRPC bytes-array inflates a 10MB file to ~30MB of JSON and can
   * exceed the body parser limit, causing an HTML 413/500 response that
   * triggers "Unexpected token '<', <!DOCTYPE..." on the client.
   */
  const uploadAudioViaFormData = async (
    file: File,
    onSuccess: (url: string) => void
  ) => {
    const ext = file.name.split(".").pop() || "mp3";
    const key = `audio-uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const mimeType = file.type.includes("wav") ? "audio/wav" : file.type.includes("mp4") || file.name.endsWith(".m4a") ? "audio/mp4" : "audio/mpeg";
    const formData = new FormData();
    formData.append("file", file);
    const resp = await fetch(
      `/api/video/upload?key=${encodeURIComponent(key)}&type=${encodeURIComponent(mimeType)}`,
      { method: "POST", body: formData }
    );
    if (!resp.ok) {
      const text = await resp.text();
      let msg = `Upload failed (${resp.status})`;
      try { msg = JSON.parse(text).error ?? msg; } catch { /* non-JSON body */ }
      throw new Error(msg);
    }
    const data = await resp.json();
    onSuccess(data.url as string);
  };

  const handleFileUpload = async (file: File) => {
    if (!file.type.match(/audio\/(mpeg|wav|mp4|x-m4a|ogg|webm)/)) { toast.error("Invalid file type"); return; }
    if (file.size > 50 * 1024 * 1024) { toast.error("File too large", { description: "Maximum 50MB." }); return; }
    setIsUploadingFile(true);
    setUploadedAudioName(file.name);
    try {
      await uploadAudioViaFormData(file, (url) => {
        setUploadedAudioUrl(url);
        toast.success("Audio uploaded!", { description: file.name });
      });
    } catch (err: any) {
      toast.error("Upload failed", { description: err.message });
    } finally {
      setIsUploadingFile(false);
    }
  };
  const handleCoverFileUpload = async (file: File) => {
    if (!file.type.match(/audio\/(mpeg|wav|mp4|x-m4a|ogg|webm)/)) { toast.error("Invalid file type. Use MP3, WAV, M4A, or OGG."); return; }
    if (file.size > 50 * 1024 * 1024) { toast.error("File too large", { description: "Maximum 50MB." }); return; }
    setIsUploadingFile(true);
    setUploadedAudioName(file.name);
    setUploadedAudioUrl(null);
    try {
      await uploadAudioViaFormData(file, (url) => {
        setUploadedAudioUrl(url);
        setIsUploadingFile(false);
        toast.success("Track uploaded — ready to transform!", { description: file.name });
        transcribeTrackMutation.mutate({ audioUrl: url });
      });
    } catch (err: any) {
      toast.error("Upload failed", { description: err.message });
      setIsUploadingFile(false);
    }
  };
  const handleCoverGenerate = () => {
    if (!uploadedAudioUrl) { toast.error("Please upload a track first."); return; }
    mp.generationStarted("WizAudio", undefined, true);
    setError(null); setGeneratedTracks([]); setTaskId(null); setStatus("idle");
    const styleStr = buildStyleString();
    const isInstrumental = selectedVocal === "Instrumental Only";
    if (studioMode === "cover") {
      generateCoverMutation.mutate({
        uploadedTrackUrl: uploadedAudioUrl,
        prompt: prompt.trim().slice(0, 5000) || undefined,
        style: styleStr || undefined,
        title: title.trim() || undefined,
        instrumental: isInstrumental,
        styleWeight: coverStyleWeight,
        audioWeight: coverAudioWeight,
        origin: window.location.origin,
      });
    } else {
      generateExtendMutation.mutate({
        uploadedTrackUrl: uploadedAudioUrl,
        prompt: prompt.trim().slice(0, 5000) || undefined,
        style: styleStr || undefined,
        title: title.trim() || undefined,
        instrumental: isInstrumental,
        origin: window.location.origin,
      });
    }
  };

  const generateLyricsMutation = trpc.suno.generateLyrics.useMutation({
    onSuccess: (data) => { setLyrics(data.lyrics); toast.success("Lyrics generated!"); },
    onError: (err) => toast.error(err.message || "Failed to generate lyrics."),
  });

  const deleteTaskMutation = trpc.suno.deleteTask.useMutation({
    onSuccess: () => { setGeneratedTracks([]); setTaskId(null); setStatus("idle"); toast.success("Track deleted."); },
    onError: (err) => toast.error("Delete failed", { description: err.message }),
  });

  const generateMutation = trpc.suno.generate.useMutation({
    onSuccess: (data) => { setTaskId(data.id); setStatus("pending"); setIsGenerating(true); },
    onError: (err) => { setError(err.message); setIsGenerating(false); setStatus("failed"); mp.generationFailed("WizAudio", "api_error"); },
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
    if (newStatus === "complete" && d.tracks && d.tracks.length > 0) { setGeneratedTracks(d.tracks as typeof generatedTracks); setIsGenerating(false); mp.generationCompleted("WizAudio"); }
    else if (newStatus === "trimming") { setIsGenerating(true); }
    else if (newStatus === "failed") { setError(d.errorMessage ?? "Generation failed."); setIsGenerating(false); mp.generationFailed("WizAudio", "generation_failed"); }
  }, [statusQuery.data]);

  const buildStyleString = () => {
    const parts: string[] = [];
    if (selectedGenres.length > 0) parts.push(selectedGenres.join(", "));
    if (selectedMoods.length > 0) parts.push(selectedMoods.join(", "));
    if (selectedVocal && selectedVocal !== "Instrumental Only") parts.push(selectedVocal);
    return parts.join(", ");
  };

  const handleGenerateLyrics = () => {
    if (!prompt.trim()) { toast.error("Please describe your song first."); return; }
    generateLyricsMutation.mutate({ prompt: prompt.trim(), genre: selectedGenres.join(", ") || undefined, mood: selectedMoods.join(", ") || undefined, title: title.trim() || undefined });
  };

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    mp.generationStarted("WizAudio", undefined, !!prompt.trim());
    setError(null); setGeneratedTracks([]); setTaskId(null); setStatus("idle");
    const styleStr = buildStyleString();
    const isInstrumental = selectedVocal === "Instrumental Only";
    generateMutation.mutate({ prompt: prompt.trim().slice(0, 5000), lyrics: lyrics.trim() || undefined, style: styleStr || undefined, title: title.trim() || undefined, instrumental: isInstrumental, model, origin: window.location.origin, targetDuration: targetDuration ?? undefined, generationMode });
  };

  const toggleGenre = (g: string) => setSelectedGenres((prev) => prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g].slice(0, 3));
  const toggleMood = (m: string) => setSelectedMoods((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m].slice(0, 3));
  const toggleKnob = (k: string) => setActiveKnobs((prev) => prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]);
  const canGenerate = studioMode === "generate" ? (prompt.trim().length > 0 && !isGenerating) : (uploadedAudioUrl !== null && !isGenerating);


  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: "#050407", fontFamily: "'Inter', sans-serif" }}>
      {/* ── Ambient: Gold recording studio glow ── */}
      <div className="pointer-events-none fixed inset-0 z-0" style={{ background: "radial-gradient(ellipse 70% 50% at 20% 0%, rgba(201,168,76,0.10) 0%, transparent 65%), radial-gradient(ellipse 50% 40% at 80% 100%, rgba(180,140,50,0.07) 0%, transparent 60%)" }} />

      {/* ── TOP NAV ── */}
      <header className="sticky top-0 z-50 h-[52px] flex items-center justify-between px-7" style={{ background: "rgba(4,4,6,0.97)", borderBottom: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(20px)" }}>
        <div className="flex items-center gap-3.5">
          <Link href="/" className="flex items-center gap-1 text-xs text-white/35 hover:text-[--color-gold] transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Link>
          <div className="w-px h-[18px] bg-white/7" />
          <div className="flex items-center gap-2.5">
            <span className="font-bold text-[19px] tracking-[2px]" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>WIZAUDIO</span>
            <span className="text-[8px] font-bold tracking-[2.5px] text-[--color-gold] px-1.5 py-0.5 rounded-sm border border-[--color-gold]/22 uppercase" style={{ background: "rgba(201,168,76,0.1)" }}>MUSIC STUDIO</span>
          </div>
        </div>
        <div className="flex items-center gap-3.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[--color-gold] px-3 py-1.5 rounded-[4px] border border-[--color-gold]/20" style={{ background: "rgba(201,168,76,0.08)" }}>
            10,000 Credits
          </div>
          <div className="w-[30px] h-[30px] rounded-full border border-[--color-gold]/30 flex items-center justify-center text-xs font-bold text-[--color-gold]" style={{ background: "rgba(201,168,76,0.15)" }}>
            {user?.name?.charAt(0) || "T"}
          </div>
        </div>
      </header>

      {/* ── LIVE ROOM WINDOW ── */}
      <div className="relative w-full overflow-hidden" style={{ height: "clamp(160px, 40vw, 280px)", background: "#000" }}>
        <img src={ENV_IMG} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: "center 30%", filter: `brightness(${ambience / 100})`, transition: "filter 0.6s ease" }} />
        {/* Ambient overlay */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: "rgba(0,0,0,0.28)" }} />
        {/* Glass reflection */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(160deg, rgba(255,255,255,0.04) 0%, transparent 30%, rgba(255,255,255,0.02) 60%, transparent 100%)" }} />
        {/* Bottom vignette */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ height: 90, background: "linear-gradient(0deg, rgba(14,14,18,1) 0%, rgba(14,14,18,0.6) 50%, transparent 100%)" }} />

        {/* Session info */}
        <div className="absolute top-4 left-6 z-20">
          <div className="text-[9px] font-semibold tracking-[2.5px] uppercase text-white/40 mb-0.5">Current Session</div>
          <div className="text-[28px] leading-none tracking-[3px] text-white/90" style={{ fontFamily: "'Bebas Neue', sans-serif", textShadow: "0 2px 20px rgba(0,0,0,0.8)" }}>
            {title || "New Track"}
          </div>
          <div className="text-[11px] font-medium text-[--color-gold] mt-0.5" style={{ letterSpacing: '0.5px' }}>
            {selectedGenres.join(" · ") || "No genre"} · {selectedMoods.join(" · ") || "No mood"}
          </div>
          <div className="text-[8px] font-bold tracking-[3px] uppercase mt-1.5" style={{ color: 'rgba(201,168,76,0.4)' }}>WizAudio™ · AI Music Studio</div>
        </div>

        {/* Wiz Studios brand */}
        <div className="absolute bottom-[60px] left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1 pointer-events-none">
          <div className="flex items-center gap-2.5 w-full justify-center">
            <div className="h-px w-[60px]" style={{ background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.3), transparent)" }} />
          </div>
          <div className="text-[42px] leading-none tracking-[12px] text-white/18" style={{ fontFamily: "'Bebas Neue', sans-serif", textShadow: "0 0 40px rgba(201,168,76,0.3)", WebkitTextStroke: "0.5px rgba(255,255,255,0.12)" }}>WIZ AUDIO</div>
          <div className="flex items-center gap-2.5 w-full justify-center">
            <div className="h-px w-[60px]" style={{ background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.3), transparent)" }} />
            <div className="text-[9px] font-semibold tracking-[5px] uppercase text-[--color-gold]/40" style={{ textShadow: "0 0 20px rgba(201,168,76,0.25)" }}>Recording · Mixing · Mastering</div>
            <div className="h-px w-[60px]" style={{ background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.3), transparent)" }} />
          </div>
        </div>

        {/* ON AIR sign */}
        <div className={`absolute top-4 right-6 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-[3px] border transition-all ${isOnAir ? "border-[rgba(255,59,48,0.8)] bg-[rgba(255,20,10,0.18)]" : "border-[rgba(255,59,48,0.3)] bg-[rgba(0,0,0,0.75)]"}`} style={{ boxShadow: isOnAir ? "0 0 20px rgba(255,59,48,0.3)" : "none" }}>
          <div className={`w-2 h-2 rounded-full border transition-all ${isOnAir ? "bg-[#ff3b30] border-[#ff3b30] animate-pulse" : "bg-[rgba(255,59,48,0.2)] border-[rgba(255,59,48,0.35)]"}`} style={{ boxShadow: isOnAir ? "0 0 8px #ff3b30" : "none" }} />
          <span className={`text-[10px] font-extrabold tracking-[3px] uppercase transition-all ${isOnAir ? "text-[#ff3b30]" : "text-white/65"}`}>ON AIR</span>
        </div>
      </div>

      {/* ── SSL CONSOLE ── */}
        <div className="flex flex-col" style={{ background: "#13111a", borderTop: "2px solid rgba(201,168,76,0.18)", minHeight: "calc(100vh - 332px)" }}>

          {/* Console Rail */}
          <div className="hidden md:flex items-center px-4 gap-3 flex-shrink-0" style={{ height: 82, background: "#0b0910", borderBottom: "1px solid rgba(201,168,76,0.10)" }}>
            {/* Left: brand + ambient knob */}
            <div className="flex flex-col gap-1.5 flex-shrink-0">
              <div className="text-[9px] font-bold tracking-[2.5px] uppercase text-white/15">SSL 9000 — Master Bus · WizSound™</div>
              <div className="flex items-center gap-2.5 px-3 py-1 rounded-[4px] border border-[--color-gold]/15" style={{ background: "rgba(0,0,0,0.3)" }}>
                <span className="text-[8px] font-bold tracking-[2px] uppercase text-white/20">Studio Ambience</span>
                {/* Circular draggable knob — drag up to increase, down to decrease */}
                <div
                  style={{ position: "relative", width: 26, height: 26, cursor: "ns-resize", userSelect: "none", flexShrink: 0 }}
                  onPointerDown={(e) => {
                    const startY = e.clientY;
                    const startVal = ambience;
                    const onMove = (me: PointerEvent) => {
                      const delta = Math.round((startY - me.clientY) / 1.5);
                      setAmbience(Math.max(20, Math.min(100, startVal + delta)));
                    };
                    const onUp = () => {
                      window.removeEventListener("pointermove", onMove);
                      window.removeEventListener("pointerup", onUp);
                    };
                    window.addEventListener("pointermove", onMove);
                    window.addEventListener("pointerup", onUp);
                    e.currentTarget.setPointerCapture(e.pointerId);
                  }}
                >
                  {/* Knob body */}
                  <div style={{
                    width: 26, height: 26, borderRadius: "50%",
                    background: "radial-gradient(circle at 35% 35%, #3a3a46, #14141c)",
                    border: ambience > 20 ? "1px solid #c9a84c" : "1px solid rgba(255,255,255,0.12)",
                    boxShadow: ambience > 20 ? "0 0 12px rgba(201,168,76,0.4)" : "0 2px 8px rgba(0,0,0,0.6)",
                    position: "relative",
                  }}>
                    {/* Indicator line — rotates with value: -135deg (min 20) → +135deg (max 100) */}
                    <div style={{
                      position: "absolute", top: 3, left: "50%",
                      width: 2, height: 7,
                      background: ambience > 20 ? "#c9a84c" : "rgba(255,255,255,0.3)",
                      borderRadius: 1,
                      transformOrigin: "50% 100%",
                      transform: `translateX(-50%) rotate(${-135 + ((ambience - 20) / 80) * 270}deg)`,
                    }} />
                  </div>
                </div>
                <span className="text-[11px] font-bold text-[--color-gold] font-mono w-8">{ambience}%</span>
              </div>
            </div>

          {/* Centre: EQ display */}
          <div className="flex-1 max-w-[520px] rounded-[4px] overflow-hidden px-2.5 pt-1.5 pb-0.5" style={{ background: "#080810", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "inset 0 2px 8px rgba(0,0,0,0.8)" }}>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[7px] font-bold tracking-[2px] uppercase text-white/18 font-mono">Spectrum Analyser — 13 Band</span>
              <span className="text-[7px] font-semibold tracking-[1.5px] text-[#40c8e0]/50 font-mono">● LIVE</span>
            </div>
            <ConsoleEQDisplay isActive={isOnAir} />
          </div>

          {/* Right: horizontal rail meters */}
          <RailMeters isActive={isOnAir} />
        </div>

        {/* Console Body */}
          <div className="flex flex-col md:grid flex-1 overflow-hidden" style={{ gridTemplateColumns: "1fr 300px", background: "#0f0d15" }}>

            {/* ── LEFT: Channel Area ── */}
            <div className="overflow-y-auto p-3.5 flex flex-col gap-3" style={{ borderRight: "1px solid rgba(201,168,76,0.08)" }}>

            {/* ── STUDIO MODE SWITCHER ── */}
            <div className="rounded-[10px] overflow-hidden" style={{ background: "linear-gradient(160deg, #13101c, #0c0912)", border: "1px solid rgba(201,168,76,0.18)", boxShadow: "0 0 0 1px rgba(0,0,0,0.6), 0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)" }}>
              {/* Header */}
              <div className="flex items-center gap-2.5 px-4 py-3" style={{ background: "linear-gradient(90deg, rgba(201,168,76,0.08), transparent)", borderBottom: "1px solid rgba(201,168,76,0.1)" }}>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#c9a84c", boxShadow: "0 0 8px #c9a84c" }} />
                  <span className="text-[9px] font-black tracking-[3.5px] uppercase" style={{ color: "rgba(201,168,76,0.7)" }}>Studio Mode</span>
                </div>
                <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(201,168,76,0.15), transparent)" }} />
                <span className="text-[8px] tracking-[1.5px] uppercase" style={{ color: "rgba(255,255,255,0.2)" }}>Choose Your Workflow</span>
              </div>
              {/* Mode cards */}
              <div className="flex flex-col xs:flex-row gap-0 p-3">
                {([
                  { id: "generate" as StudioMode, icon: "✦", badge: "CREATE", label: "Generate", sub: "Create from scratch", color: "#f0c040", glow: "rgba(240,192,64,0.55)", badgeColor: "rgba(240,192,64,0.22)", badgeText: "#f0c040" },
                  { id: "cover"    as StudioMode, icon: "⟳", badge: "UPLOAD", label: "Cover & Transform", sub: "Upload your track, change the style", color: "#4da6ff", glow: "rgba(77,166,255,0.50)", badgeColor: "rgba(77,166,255,0.22)", badgeText: "#4da6ff" },
                  { id: "extend"   as StudioMode, icon: "⇥", badge: "UPLOAD", label: "Extend & Continue", sub: "Upload your track, AI continues it", color: "#30d158", glow: "rgba(48,209,88,0.50)", badgeColor: "rgba(48,209,88,0.22)", badgeText: "#30d158" },
                ]).map((m, i, arr) => {
                  const active = studioMode === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => { setStudioMode(m.id); if (m.id !== "generate") setUploadedAudioUrl(null); }}
                      className="flex-1 flex flex-col gap-2.5 p-3.5 transition-all duration-200 relative text-left"
                      style={{
                        background: active
                          ? `linear-gradient(160deg, ${m.glow}, rgba(0,0,0,0.5))`
                          : "rgba(255,255,255,0.025)",
                        border: active ? `1.5px solid ${m.color}cc` : "1px solid rgba(255,255,255,0.07)",
                        borderRadius: i === 0 ? "8px 0 0 8px" : i === arr.length - 1 ? "0 8px 8px 0" : "0",
                        marginLeft: i > 0 ? "-1px" : 0,
                        zIndex: active ? 2 : 1,
                        boxShadow: active
                          ? `0 0 40px ${m.glow}, 0 0 80px ${m.glow.replace(/[\d.]+\)$/, "0.25)")}, inset 0 1px 0 rgba(255,255,255,0.12), inset 0 0 20px ${m.glow.replace(/[\d.]+\)$/, "0.15)")}`
                          : "none",
                        cursor: "pointer",
                      }}
                    >
                      {/* Icon badge row */}
                      <div className="flex items-start justify-between gap-1">
                        <div
                          className="w-10 h-10 rounded-[7px] flex items-center justify-center flex-shrink-0"
                          style={{
                            background: active ? `radial-gradient(circle at 35% 30%, ${m.color}55, rgba(0,0,0,0.85))` : "rgba(255,255,255,0.04)",
                            border: active ? `1.5px solid ${m.color}99` : "1px solid rgba(255,255,255,0.07)",
                            boxShadow: active ? `0 0 24px ${m.glow}, 0 0 48px ${m.glow.replace(/[\d.]+\)$/, "0.3)")}` : "none",
                          }}
                        >
                          <span className="text-[22px] leading-none" style={{ color: active ? "#fff" : "rgba(255,255,255,0.18)", filter: active ? `drop-shadow(0 0 12px ${m.color}) drop-shadow(0 0 24px ${m.color})` : "none" }}>{m.icon}</span>
                        </div>
                        <span className="text-[7px] font-black tracking-[1.5px] px-1.5 py-0.5 rounded-[3px] mt-0.5" style={{ background: active ? m.badgeColor : "rgba(255,255,255,0.04)", color: active ? m.badgeText : "rgba(255,255,255,0.15)", border: active ? `1px solid ${m.color}30` : "1px solid rgba(255,255,255,0.06)" }}>{m.badge}</span>
                      </div>
                      {/* Label */}
                      <div>
                        <div className="text-[12px] font-bold leading-tight" style={{ color: active ? "#fff" : "rgba(255,255,255,0.3)", textShadow: active ? `0 0 16px ${m.color}, 0 0 32px ${m.color}80` : "none" }}>{m.label}</div>
                        <div className="text-[9px] leading-[1.4] mt-0.5" style={{ color: active ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.14)" }}>{m.sub}</div>
                      </div>
                      {/* Active bottom bar */}
                      {/* Top glow bar */}
                      {active && (
                        <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-[8px]" style={{ background: `linear-gradient(90deg, transparent, ${m.color}, transparent)`, boxShadow: `0 0 16px ${m.color}, 0 0 32px ${m.color}80` }} />
                      )}
                      {/* Bottom glow bar */}
                      {active && (
                        <div className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full" style={{ background: `linear-gradient(90deg, transparent, ${m.color}, transparent)`, boxShadow: `0 0 12px ${m.color}` }} />
                      )}
                    </button>
                  );
                })}
              </div>
              {/* Upload zone — visible for cover and extend modes */}
              {studioMode !== "generate" && (
                <div className="mx-4 mb-3.5 mt-2">
                  <input ref={coverFileInputRef} type="file" accept="audio/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCoverFileUpload(f); e.target.value = ""; }} />
                  {!uploadedAudioUrl ? (
                    <div
                      className="border-2 border-dashed rounded-[6px] p-5 text-center cursor-pointer transition-all hover:border-[--color-gold]/40 hover:bg-[--color-gold]/4"
                      style={{ borderColor: "rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.25)" }}
                      onClick={() => coverFileInputRef.current?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleCoverFileUpload(f); }}
                    >
                      {isUploadingFile ? (
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="w-6 h-6 text-[--color-gold] animate-spin" />
                          <span className="text-[11px] text-white/50">Uploading {uploadedAudioName}…</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <UploadCloud className="w-7 h-7 text-[--color-gold]/50" />
                          <div>
                            <div className="text-[13px] font-semibold text-white/70">Drop your track here</div>
                            <div className="text-[10px] text-white/30 mt-0.5">MP3, WAV, M4A, OGG · Max 50MB</div>
                          </div>
                          <div className="px-4 py-1.5 rounded-[4px] border border-[--color-gold]/25 text-[11px] font-semibold text-[--color-gold]/70 mt-1" style={{ background: "rgba(201,168,76,0.08)" }}>Browse files</div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-3 rounded-[6px] border border-green-500/25" style={{ background: "rgba(48,209,88,0.06)" }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(48,209,88,0.15)" }}>
                        <Check className="w-4 h-4 text-green-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-semibold text-green-400 truncate">{uploadedAudioName}</div>
                        <div className="text-[10px] text-white/35 mt-0.5">Track uploaded — ready to {studioMode === "cover" ? "transform" : "extend"}</div>
                      </div>
                      <button onClick={() => { setUploadedAudioUrl(null); setUploadedAudioName(""); }} className="text-white/25 hover:text-red-400 transition-colors flex-shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  {/* Cover-specific controls */}
                  {studioMode === "cover" && uploadedAudioUrl && (
                    <div className="mt-2.5 flex flex-col gap-2 p-3 rounded-[6px] border border-white/7" style={{ background: "rgba(0,0,0,0.2)" }}>
                      <div className="text-[9px] font-bold tracking-[2px] uppercase text-white/25">Cover Controls</div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-white/35 w-24">Style strength</span>
                        <input type="range" min={0} max={1} step={0.05} value={coverStyleWeight} onChange={(e) => setCoverStyleWeight(Number(e.target.value))} className="flex-1 h-1 cursor-pointer" style={{ WebkitAppearance: "none", appearance: "none", background: `linear-gradient(to right, #4da6ff ${coverStyleWeight * 100}%, rgba(255,255,255,0.08) ${coverStyleWeight * 100}%)`, borderRadius: 2, outline: "none" }} />
                        <span className="text-[10px] font-semibold text-[#4da6ff] w-8 text-right">{Math.round(coverStyleWeight * 100)}%</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-white/35 w-24">Melody retain</span>
                        <input type="range" min={0} max={1} step={0.05} value={coverAudioWeight} onChange={(e) => setCoverAudioWeight(Number(e.target.value))} className="flex-1 h-1 cursor-pointer" style={{ WebkitAppearance: "none", appearance: "none", background: `linear-gradient(to right, #30d158 ${coverAudioWeight * 100}%, rgba(255,255,255,0.08) ${coverAudioWeight * 100}%)`, borderRadius: 2, outline: "none" }} />
                        <span className="text-[10px] font-semibold text-[#30d158] w-8 text-right">{Math.round(coverAudioWeight * 100)}%</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Engine Selector */}
            <div className="rounded-[10px] overflow-hidden" style={{ background: "linear-gradient(160deg, #0e0c16, #0a0910)", border: "1px solid rgba(255,255,255,0.07)", boxShadow: "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)" }}>
              {/* Header */}
              <div className="flex items-center gap-2.5 px-4 py-3" style={{ background: "rgba(0,0,0,0.3)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="w-1.5 h-1.5 rounded-full bg-[#30d158] animate-pulse" style={{ boxShadow: "0 0 8px #30d158" }} />
                <span className="text-[9px] font-black tracking-[3px] uppercase" style={{ color: "rgba(255,255,255,0.35)" }}>Generation Engine</span>
                <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(255,255,255,0.06), transparent)" }} />
                <span className="text-[7px] tracking-[1.5px] uppercase px-2 py-0.5 rounded-[3px]" style={{ background: "rgba(48,209,88,0.1)", color: "rgba(48,209,88,0.7)", border: "1px solid rgba(48,209,88,0.15)" }}>● LIVE</span>
              </div>
              <div className="flex flex-col xs:flex-row gap-0 p-3">
                {([
                  { value: "score" as GenerationMode, icon: "FX",  label: "Sound FX",       desc: "Cinematic effects & ambience",                color: "#f0c040", glow: "rgba(240,192,64,0.55)",  tag: "EFFECTS"  },
                  { value: "song"  as GenerationMode, icon: "PRO", label: "Precision Audio", desc: "Full production, any length",                 color: "#c084fc", glow: "rgba(192,132,252,0.50)", tag: "STUDIO"   },
                  { value: "suno"  as GenerationMode, icon: "AI",  label: "WizAudio™",       desc: "2 creative variations with lyrics",           color: "#f0c040", glow: "rgba(240,192,64,0.55)", tag: "POPULAR"  },
                ]).map((e, i, arr) => {
                  const active = generationMode === e.value;
                  return (
                    <button
                      key={e.value}
                      onClick={() => setGenerationMode(e.value)}
                      className="flex-1 flex flex-col items-center gap-2 py-4 px-2.5 transition-all duration-200 relative"
                      style={{
                        background: active ? `linear-gradient(180deg, ${e.glow}, rgba(0,0,0,0.5))` : "rgba(255,255,255,0.025)",
                        border: active ? `1.5px solid ${e.color}cc` : "1px solid rgba(255,255,255,0.07)",
                        borderRadius: i === 0 ? "8px 0 0 8px" : i === arr.length - 1 ? "0 8px 8px 0" : "0",
                        marginLeft: i > 0 ? "-1px" : 0,
                        zIndex: active ? 2 : 1,
                        boxShadow: active
                          ? `0 0 40px ${e.glow}, 0 0 80px ${e.glow.replace(/[\d.]+\)$/, "0.25)")}, inset 0 1px 0 rgba(255,255,255,0.12), inset 0 0 20px ${e.glow.replace(/[\d.]+\)$/, "0.15)")}`
                          : "none",
                        cursor: "pointer",
                      }}
                    >
                      {/* Icon circle */}
                      <div
                        className="w-11 h-11 rounded-full flex items-center justify-center"
                        style={{
                          background: active ? `radial-gradient(circle at 35% 30%, ${e.color}55, rgba(0,0,0,0.85))` : "rgba(255,255,255,0.04)",
                          border: active ? `1.5px solid ${e.color}99` : "1px solid rgba(255,255,255,0.07)",
                          boxShadow: active ? `0 0 28px ${e.glow}, 0 0 56px ${e.glow.replace(/[\d.]+\)$/, "0.3)")}` : "none",
                        }}
                      >
                        <span className="text-[13px] font-black tracking-tight" style={{ color: active ? "#fff" : "rgba(255,255,255,0.25)", textShadow: active ? `0 0 14px ${e.color}, 0 0 28px ${e.color}` : "none" }}>{e.icon}</span>
                      </div>
                      {/* Label */}
                      <div className="text-center">
                        <div className="text-[11px] font-bold" style={{ color: active ? "#fff" : "rgba(255,255,255,0.3)", textShadow: active ? `0 0 16px ${e.color}, 0 0 32px ${e.color}80` : "none" }}>{e.label}</div>
                        <div className="text-[8px] leading-[1.35] mt-0.5" style={{ color: active ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.14)" }}>{e.desc}</div>
                      </div>
                      {/* Tag badge */}
                      <span className="text-[7px] font-black tracking-[1.5px] px-1.5 py-0.5 rounded-[3px]" style={{ background: active ? `${e.color}18` : "rgba(255,255,255,0.04)", color: active ? e.color : "rgba(255,255,255,0.2)", border: active ? `1px solid ${e.color}30` : "1px solid rgba(255,255,255,0.05)" }}>{e.tag}</span>
                      {/* Active bottom bar */}
                      {/* Top glow bar */}
                      {active && (
                        <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-[8px]" style={{ background: `linear-gradient(90deg, transparent, ${e.color}, transparent)`, boxShadow: `0 0 16px ${e.color}, 0 0 32px ${e.color}80` }} />
                      )}
                      {/* Bottom glow bar */}
                      {active && (
                        <div className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full" style={{ background: `linear-gradient(90deg, transparent, ${e.color}, transparent)`, boxShadow: `0 0 12px ${e.color}` }} />
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center justify-between px-3.5 py-1.5 border-t border-white/7" style={{ background: "rgba(0,0,0,0.2)" }}>
                <span className="text-[9px] font-semibold tracking-[1.5px] uppercase text-white/22">Model</span>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value as "V3_5" | "V4")}
                  className="text-[11px] font-semibold text-[--color-gold] px-2.5 py-1 rounded-[3px] border border-[--color-gold]/20 cursor-pointer focus:outline-none"
                  style={{ background: "rgba(201,168,76,0.08)" }}
                >
                  <option value="V4">WizAudio V4 (recommended)</option>
                  <option value="V3_5">WizAudio V3.5</option>
                </select>
              </div>
            </div>

            {/* Track Brief */}
            <div className="rounded-[6px] overflow-hidden border border-white/7" style={{ background: "#0b0910" }}>
              <div className="flex items-center justify-between px-3.5 py-2 border-b border-white/7" style={{ background: "rgba(0,0,0,0.35)" }}>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#30d158] animate-pulse" style={{ boxShadow: "0 0 5px #30d158" }} />
                  <span className="text-[9px] font-bold tracking-[2.5px] uppercase text-white/35">Recording Booth — Track Brief</span>
                </div>
                <VoicePromptButton toolContext="AI music and song creation" onPromptReady={(refined) => setPrompt(refined.slice(0, lyrics.trim().length >= 20 ? 5000 : 500))} />
                <EnhancePromptButton prompt={prompt} genre={selectedGenres[0]} mood={selectedMoods[0]} productType="audio" onEnhanced={(text) => setPrompt(text.slice(0, lyrics.trim().length >= 20 ? 5000 : 500))} />
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                maxLength={lyrics.trim().length >= 20 ? 5000 : 500}
                className="w-full bg-transparent border-none outline-none resize-none px-4 py-3 text-[13px] leading-[1.65] text-[#f5f0e8] placeholder:text-[#f5f0e8]/16 placeholder:italic"
                style={{ fontFamily: "'Courier Prime', monospace", caretColor: "#c9a84c" }}
                placeholder={`Describe your track. Think like you're briefing the session musicians — the vibe, the tempo, the instruments, the emotion…\n\nA driving cinematic orchestral piece with building strings and pounding percussion, like a film trailer…`}
              />
              <div className="flex items-center justify-between px-3.5 py-1.5 border-t border-white/7">
                {(() => {
                  const maxChars = lyrics.trim().length >= 20 ? 5000 : 500;
                  const nearLimit = prompt.length >= maxChars * 0.9;
                  const atLimit = prompt.length >= maxChars;
                  return (
                    <span className={`text-[9px] font-mono transition-colors ${atLimit ? 'text-red-400' : nearLimit ? 'text-yellow-400' : 'text-white/18'}`}>
                      {prompt.length} / {maxChars}
                    </span>
                  );
                })()}
                <button onClick={() => setShowExamples(!showExamples)} className="flex items-center gap-1 text-[9px] text-[--color-gold]/50 hover:text-[--color-gold] transition-colors">
                  {showExamples ? "▾" : "▸"} Example prompts
                </button>
              </div>
              {showExamples && (
                <div className="flex flex-col gap-1 px-3.5 pb-2.5">
                  {PROMPT_EXAMPLES.map((ex) => (
                    <button key={ex} onClick={() => { setPrompt(ex); setShowExamples(false); }} className="flex items-center gap-2 px-2.5 py-1.5 rounded-[3px] text-[11px] text-left text-white/38 hover:text-white/65 transition-all border border-white/5 hover:border-[--color-gold]/20 hover:bg-[--color-gold]/5" style={{ fontFamily: "'Courier Prime', monospace", background: "rgba(255,255,255,0.02)" }}>
                      <span className="text-[--color-gold]/60 text-[9px] flex-shrink-0">→</span>{ex}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Genre */}
            <div className="rounded-[6px] overflow-hidden border border-white/7" style={{ background: "#0e0e12" }}>
              <div className="flex items-center justify-between px-3.5 py-2 border-b border-white/7" style={{ background: "rgba(0,0,0,0.3)" }}>
                <span className="text-[9px] font-bold tracking-[2.5px] uppercase text-white/28">Genre</span>
                <span className="text-[9px] text-white/18">Pick up to 3</span>
              </div>
              <div className="flex flex-wrap gap-1.5 p-2.5">
                {GENRES.map((g) => (
                  <button key={g} onClick={() => toggleGenre(g)} className={`px-2.5 py-1.5 rounded-[3px] border text-[11px] font-medium transition-all ${selectedGenres.includes(g) ? "border-[--color-gold] bg-[--color-gold]/12 text-[--color-gold] font-semibold" : "border-white/7 bg-white/3 text-white/42 hover:border-[--color-gold]/30 hover:text-white/65 hover:bg-[--color-gold]/5"}`}>
                    {selectedGenres.includes(g) && <span className="text-[9px] mr-1"></span>}{g}
                  </button>
                ))}
              </div>
            </div>

            {/* Mood */}
            <div className="rounded-[6px] overflow-hidden border border-white/7" style={{ background: "#0e0e12" }}>
              <div className="flex items-center justify-between px-3.5 py-2 border-b border-white/7" style={{ background: "rgba(0,0,0,0.3)" }}>
                <span className="text-[9px] font-bold tracking-[2.5px] uppercase text-white/28">Mood</span>
                <span className="text-[9px] text-white/18">Pick up to 3</span>
              </div>
              <div className="flex flex-wrap gap-1.5 p-2.5">
                {MOODS.map((m) => (
                  <button key={m} onClick={() => toggleMood(m)} className={`px-2.5 py-1.5 rounded-[3px] border text-[11px] font-medium transition-all ${selectedMoods.includes(m) ? "border-[--color-gold] bg-[--color-gold]/12 text-[--color-gold] font-semibold" : "border-white/7 bg-white/3 text-white/42 hover:border-[--color-gold]/30 hover:text-white/65 hover:bg-[--color-gold]/5"}`}>
                    {selectedMoods.includes(m) && <span className="text-[9px] mr-1"></span>}{m}
                  </button>
                ))}
              </div>
            </div>

            {/* Vocal Style */}
            <div className="rounded-[6px] overflow-hidden border border-white/7" style={{ background: "#0e0e12" }}>
              <div className="px-3.5 py-2 border-b border-white/7 text-[9px] font-bold tracking-[2.5px] uppercase text-white/28" style={{ background: "rgba(0,0,0,0.3)" }}>Vocal Style</div>
              <div className="flex flex-wrap gap-1.5 p-2.5">
                {VOCALS.map((v) => (
                  <button key={v} onClick={() => setSelectedVocal(selectedVocal === v ? "" : v)} className={`px-2.5 py-1.5 rounded-[3px] border text-[11px] font-medium transition-all ${selectedVocal === v ? "border-[--color-gold] bg-[--color-gold]/12 text-[--color-gold] font-semibold" : "border-white/7 bg-white/3 text-white/42 hover:border-[--color-gold]/30 hover:text-white/65 hover:bg-[--color-gold]/5"}`}>
                    {selectedVocal === v && <span className="text-[9px] mr-1"></span>}{v}
                  </button>
                ))}
              </div>
            </div>

            {/* Lyrics */}
            <div className="rounded-[6px] overflow-hidden border border-white/7" style={{ background: "#0e0e12" }}>
              <div className="flex items-center justify-between px-3.5 py-2 border-b border-white/7" style={{ background: "rgba(0,0,0,0.3)" }}>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold tracking-[2.5px] uppercase text-white/28">Lyrics</span>
                  <span className="text-[9px] text-[--color-gold]/50 italic">(optional — no character limit)</span>
                </div>
                <VoicePromptButton
                  toolContext="song lyrics writing"
                  onPromptReady={(refined) => setLyrics(prev => prev ? prev + "\n\n" + refined : refined)}
                />
              </div>
              <div className="p-2.5 flex flex-col gap-2">
                <textarea
                  value={lyrics}
                  onChange={(e) => setLyrics(e.target.value)}
                  rows={5}
                  maxLength={5000}
                  className="w-full rounded-[4px] px-3 py-2.5 text-[12px] leading-[1.6] text-[#f5f0e8] placeholder:text-white/14 placeholder:italic resize-y focus:outline-none border border-white/6"
                  style={{ background: "rgba(0,0,0,0.3)", fontFamily: "'Courier Prime', monospace", caretColor: "#c9a84c" }}
                  placeholder={`Paste your own lyrics here, or use one of the options below to create them…

[Verse 1]
Your lyrics go here…

[Chorus]
Your chorus here…`}
                />
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleGenerateLyrics}
                    disabled={!prompt.trim() || generateLyricsMutation.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] border border-[#0a84ff]/22 text-[11px] font-semibold text-[#4da6ff] transition-all hover:bg-[#0a84ff]/14 hover:border-[#0a84ff]/38 disabled:opacity-40"
                    style={{ background: "rgba(10,132,255,0.08)" }}
                  >
                    {generateLyricsMutation.isPending ? <><Loader2 className="w-3 h-3 animate-spin" />Generating…</> : <>Generate Lyrics with AI</>}
                  </button>
                  {lyrics.trim().length > 0 && (
                    <button
                      onClick={() => setLyrics("")}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-[4px] border border-white/8 text-[10px] text-white/30 hover:text-white/55 hover:border-white/18 transition-all"
                    >
                      Clear
                    </button>
                  )}
                </div>
                {lyrics.trim().length === 0 && (
                  <p className="text-[10px] text-white/20 italic leading-relaxed">
                    Tip: Speak your song idea using the mic above — describe the story, theme, or characters and AI will write the full lyrics. Or paste your own lyrics directly.
                  </p>
                )}
              </div>
            </div>

            {/* Song Title */}
            <div className="rounded-[6px] overflow-hidden border border-white/7" style={{ background: "#0e0e12" }}>
              <div className="px-3.5 py-2 border-b border-white/7 text-[9px] font-bold tracking-[2.5px] uppercase text-white/28" style={{ background: "rgba(0,0,0,0.3)" }}>Song Title (optional)</div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="My Amazing Song"
                maxLength={80}
                className="w-full bg-transparent border-none outline-none px-3.5 py-2.5 text-[14px] text-[#f5f0e8] placeholder:text-white/16 placeholder:italic"
                style={{ fontFamily: "'Courier Prime', monospace", caretColor: "#c9a84c" }}
              />
            </div>

            {/* Duration */}
            <div className="rounded-[6px] overflow-hidden border border-white/7" style={{ background: "#0e0e12" }}>
              <div className="px-3.5 py-2 border-b border-white/7 text-[9px] font-bold tracking-[2.5px] uppercase text-white/28" style={{ background: "rgba(0,0,0,0.3)" }}>Track Duration</div>
              <div className="p-2.5 flex flex-col gap-2">
                <button
                  onClick={() => setTargetDuration(null)}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-[4px] border text-[11px] transition-all ${targetDuration === null ? "border-[--color-gold]/18 bg-[--color-gold]/6 text-[--color-gold]/65" : "border-white/7 text-white/35 hover:border-[--color-gold]/18"}`}
                >
                  <div className={`w-3.5 h-3.5 rounded-full border-[1.5px] flex items-center justify-center text-[8px] flex-shrink-0 ${targetDuration === null ? "border-[--color-gold] bg-[--color-gold]/18 text-[--color-gold]" : "border-white/30"}`}>{targetDuration === null && ""}</div>
                  <div>
                    <div className="text-[11px] font-semibold">No duration set</div>
                    <div className="text-[9px] text-white/28 mt-0.5">WizAudio will generate a full-length track</div>
                  </div>
                </button>
                <div className="text-[10px] text-white/22 px-0.5">+ Set target duration for your video</div>
                <div className="flex gap-1.5">
                  {DURATION_OPTIONS.map((d) => (
                    <button
                      key={d.value}
                      onClick={() => setTargetDuration(d.value)}
                      className={`flex-1 py-1.5 px-1 rounded-[4px] border flex flex-col items-center gap-0.5 transition-all ${targetDuration === d.value ? "border-[--color-gold] bg-[--color-gold]/10" : "border-white/6 bg-white/2 hover:border-[--color-gold]/30 hover:bg-[--color-gold]/4"}`}
                    >
                      <span className={`text-[13px] font-bold ${targetDuration === d.value ? "text-[--color-gold]" : "text-white/55"}`}>{d.label}</span>
                      <span className="text-[8px] text-white/22 text-center">{d.sub}</span>
                    </button>
                  ))}
                </div>
                <div className="text-[10px] text-white/18 italic px-0.5">Track is trimmed to fit if duration is set</div>
              </div>
            </div>

            {/* Generated Tracks */}
            {generatedTracks.length > 0 && (
              <div className="rounded-[6px] overflow-hidden border border-green-500/20" style={{ background: "#0e0e12" }}>
                <div className="flex items-center justify-between px-3.5 py-2 border-b border-white/7" style={{ background: "rgba(0,0,0,0.3)" }}>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-green-400" />
                    <span className="text-[9px] font-bold tracking-[2.5px] uppercase text-green-400">Tracks Ready</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={handleGenerate} disabled={isGenerating || !canGenerate} className="flex items-center gap-1 text-[10px] text-[--color-gold]/70 hover:text-[--color-gold] transition-colors disabled:opacity-40">
                      <RefreshCw className="w-3 h-3" /> Regenerate
                    </button>
                    {taskId && <button onClick={() => deleteTaskMutation.mutate({ id: taskId })} disabled={deleteTaskMutation.isPending} className="flex items-center gap-1 text-[10px] text-red-400/70 hover:text-red-400 transition-colors disabled:opacity-40">
                      {deleteTaskMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />} Delete
                    </button>}
                  </div>
                </div>
                <div className="p-2.5 flex flex-col gap-2">
                  {generatedTracks.map((track, i) => (
                    <WizAudioPlayer
                      key={i}
                      audioUrl={track.audioUrl}
                      title={track.title || `Track ${i + 1}`}
                      imageUrl={track.imageUrl}
                      taskId={taskId ?? undefined}
                      trackIndex={i}
                    />
                  ))}
                  <div className="p-3 rounded-[6px] border border-[--color-gold]/30 text-center mt-1" style={{ background: "rgba(201,168,76,0.08)" }}>
                    <p className="text-sm text-[--color-gold] mb-2">Love your track? Turn it into a full music video.</p>
                    <Link href="/music-video" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[6px] text-xs font-bold text-white btn-primary btn-sheen">
                      <Film className="w-3.5 h-3.5" /> Start with WizVideo
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Past Generations — user's recent songs */}
            <PastGenerations />

            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-[6px] border border-red-500/20 text-red-400 text-xs" style={{ background: "rgba(255,59,48,0.08)" }}>
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
              </div>
            )}

            {isGenerating && (
              <div className="rounded-[6px] border border-[--color-gold]/20 p-4 text-center" style={{ background: "rgba(201,168,76,0.04)" }}>
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
                          <span>{isDone ? "" : labels[idx]}</span>
                          {isActive && <Loader2 className="w-3 h-3 animate-spin" />}
                        </div>
                        {idx < 2 && <ChevronRight className="w-3 h-3 text-white/15" />}
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-end justify-center gap-[3px] h-10">
                  {Array.from({ length: 30 }).map((_, i) => (
                    <div key={i} className="rounded-full flex-shrink-0" style={{ width: 3, minHeight: 4, background: `rgba(201,168,76,${0.3 + (i % 4) * 0.15})`, animationName: "wizWave", animationDuration: "1s", animationDelay: `${i * 0.07}s`, animationTimingFunction: "ease-in-out", animationIterationCount: "infinite", animationDirection: "alternate" }} />
                  ))}
                </div>
              </div>
            )}

            <div className="h-4" />
          </div>

          {/* ── RIGHT: Master Section ── */}
          <div className="flex flex-col gap-3 overflow-y-auto p-3.5 md:max-h-none" style={{ background: "#09080e" }}>
            <div className="text-[9px] font-bold tracking-[3px] uppercase text-white/16 text-center pb-2.5 border-b border-white/7">Master Bus · WizSound™</div>

            {/* ── LIVE ROOM WINDOW ── */}
            <div className="rounded-[6px] overflow-hidden border border-white/10 flex-shrink-0" style={{ background: "#08070d" }}>
              {/* Window header bar — brushed-metal rail */}
              <div className="flex items-center justify-between px-2.5 py-1.5" style={{ background: "linear-gradient(180deg, #1e1c26 0%, #141220 100%)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex items-center gap-1.5">
                  {/* Traffic-light dots */}
                  <div className="w-2 h-2 rounded-full" style={{ background: "#ff5f57", boxShadow: "0 0 4px rgba(255,95,87,0.6)" }} />
                  <div className="w-2 h-2 rounded-full" style={{ background: "#febc2e", boxShadow: "0 0 4px rgba(254,188,46,0.5)" }} />
                  <div className="w-2 h-2 rounded-full" style={{ background: "#28c840", boxShadow: "0 0 4px rgba(40,200,64,0.5)" }} />
                </div>
                <span className="text-[8px] font-bold tracking-[2.5px] uppercase" style={{ color: "rgba(201,168,76,0.55)" }}>Live Room</span>
                <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] transition-all ${ isOnAir ? "bg-[rgba(255,59,48,0.18)] border border-[rgba(255,59,48,0.5)]" : "bg-transparent border border-white/8" }`}>
                  <div className={`w-1.5 h-1.5 rounded-full transition-all ${ isOnAir ? "bg-[#ff3b30] animate-pulse" : "bg-white/15" }`} style={{ boxShadow: isOnAir ? "0 0 5px #ff3b30" : "none" }} />
                  <span className={`text-[7px] font-extrabold tracking-[2px] uppercase transition-all ${ isOnAir ? "text-[#ff3b30]" : "text-white/18" }`}>REC</span>
                </div>
              </div>

              {/* Viewport — framed glass window into the booth */}
              <div className="relative" style={{ height: 128 }}>
                {/* Studio environment image */}
                <div
                  className="absolute inset-0 bg-cover bg-center transition-all duration-700"
                  style={{
                    backgroundImage: `url('${ENV_IMG}')`,
                    backgroundPosition: "center 30%",
                    filter: isOnAir ? "brightness(0.75) saturate(1.1)" : "brightness(0.45) saturate(0.7)",
                  }}
                />
                {/* Inner vignette — gives depth and frames the view */}
                <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.72) 100%)" }} />
                {/* Horizontal scan-line overlay for CRT/monitor feel */}
                <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px)" }} />
                {/* Gold ambient glow when ON AIR */}
                { isOnAir && (
                  <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 80%, rgba(201,168,76,0.12) 0%, transparent 70%)" }} />
                )}
                {/* Corner label */}
                <div className="absolute bottom-1.5 left-2.5">
                  <span className="text-[7px] font-mono tracking-[1.5px] uppercase" style={{ color: "rgba(201,168,76,0.45)" }}>Booth A · ISO</span>
                </div>
                {/* Timecode readout top-right */}
                <div className="absolute top-1.5 right-2.5">
                  <span className="text-[8px] font-mono" style={{ color: isOnAir ? "rgba(255,59,48,0.8)" : "rgba(255,255,255,0.15)" }}>
                    {isOnAir ? "● REC" : "○ STANDBY"}
                  </span>
                </div>
              </div>

              {/* Window sill — frosted glass strip */}
              <div className="flex items-center justify-between px-2.5 py-1" style={{ background: "rgba(255,255,255,0.025)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <span className="text-[7px] font-mono tracking-[1px]" style={{ color: "rgba(255,255,255,0.18)" }}>WizSound™ Studio · Control Room B</span>
                <span className="text-[7px] font-mono" style={{ color: isOnAir ? "rgba(201,168,76,0.7)" : "rgba(255,255,255,0.12)" }}>{isOnAir ? "● GENERATING" : "○ IDLE"}</span>
              </div>
            </div>

            {/* VU Meters */}
            <div className="flex justify-center gap-2.5">
              <VUMeter channel="L" isActive={isOnAir} />
              <VUMeter channel="R" isActive={isOnAir} />
            </div>

            {/* Track Params */}
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { label: "BPM",   value: genreInfo.bpm },
                { label: "Key",   value: genreInfo.key },
                { label: "Bars",  value: genreInfo.bars },
                { label: "Stems", value: genreInfo.stems },
              ].map((p) => (
                <div key={p.label} className="rounded-[4px] px-2.5 py-2 border border-white/7" style={{ background: "rgba(0,0,0,0.35)" }}>
                  <div className="text-[7px] font-bold tracking-[2px] uppercase text-white/18 mb-0.5">{p.label}</div>
                  <div className="text-[17px] font-bold text-[--color-gold] leading-none font-mono">{p.value}</div>
                </div>
              ))}
            </div>

            {/* Mood Dial Knobs */}
            <div className="flex flex-col gap-1.5">
              <div className="text-[8px] font-bold tracking-[2px] uppercase text-white/16">Mood Dial</div>
              <div className="grid grid-cols-3 gap-1.5">
                {MOOD_KNOBS.map((k) => (
                  <button
                    key={k}
                    onClick={() => toggleKnob(k)}
                    className={`flex flex-col items-center gap-1 cursor-pointer transition-all`}
                  >
                    <div
                      className={`w-[30px] h-[30px] rounded-full relative transition-all`}
                      style={{
                        background: "radial-gradient(circle at 35% 35%, #3a3a42, #16161e)",
                        border: activeKnobs.includes(k) ? "1px solid #c9a84c" : "1px solid rgba(255,255,255,0.1)",
                        boxShadow: activeKnobs.includes(k) ? "0 0 10px rgba(201,168,76,0.35)" : "0 2px 6px rgba(0,0,0,0.5)",
                      }}
                    >
                      <div
                        className="absolute top-1 left-1/2 -translate-x-1/2 w-0.5 h-[7px] rounded-[1px]"
                        style={{ background: activeKnobs.includes(k) ? "#c9a84c" : "rgba(255,255,255,0.3)" }}
                      />
                    </div>
                    <span className={`text-[7px] font-semibold text-center leading-tight ${activeKnobs.includes(k) ? "text-[--color-gold]" : "text-white/65"}`}>{k}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Variations */}
            <div className="flex flex-col gap-1.5">
              <div className="text-[8px] font-bold tracking-[2px] uppercase text-white/16">Variations</div>
              <div className="flex gap-1.5">
                {([2, 4] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setVariations(v)}
                    className={`flex-1 py-2 rounded-[4px] border flex flex-col items-center gap-0.5 transition-all ${variations === v ? "border-[--color-gold] bg-[--color-gold]/10" : "border-white/7 bg-white/2 hover:border-[--color-gold]/30"}`}
                  >
                    <span className={`text-[15px] font-bold ${variations === v ? "text-[--color-gold]" : "text-white/35"}`}>{v}</span>
                    <span className="text-[8px] text-white/22">{v === 2 ? "Standard" : "Extended"}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Upgrade Preview */}
            <div className="rounded-[6px] p-3.5 border border-[--color-gold]/15" style={{ background: "#0d0d10" }}>
              <div className="text-[10px] font-bold tracking-[1.5px] text-white/50 mb-2.5">
                UPGRADE PREVIEW <span className="text-[#555] font-normal">— Listen only · No download</span>
              </div>
              <div className="flex gap-1.5 mb-3">
                {(["original", "enhanced", "cinematic"] as AudioTier[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setActiveTier(t)}
                    className={`flex-1 py-1.5 px-1.5 rounded-[4px] border text-center transition-all ${
                      activeTier === t
                        ? t === "cinematic"
                          ? "border-[#9b59f5] bg-[#1a1020]"
                          : "border-[--color-gold]/20 bg-[#1a1a20]"
                        : "border-[#333] bg-[#1a1a1a] hover:border-[--color-gold]/20"
                    }`}
                    style={{ borderWidth: t === "cinematic" && activeTier === t ? 2 : 1 }}
                  >
                    <div className={`text-[9px] font-bold tracking-[1px] ${t === "cinematic" ? "text-[#9b59f5]" : "text-[--color-gold]"}`}>
                      {t.toUpperCase()}
                    </div>
                    <div className={`text-[8px] mt-0.5 ${t === "original" ? "text-[#555]" : t === "cinematic" ? "text-[#6a3fa0]" : "text-[--color-gold]/60]"}`}>
                      {t === "original" ? WIZSOUND_TIERS.ORIGINAL.price : t === "enhanced" ? WIZSOUND_TIERS.ENHANCED.price : WIZSOUND_TIERS.CINEMATIC.price}
                    </div>
                  </button>
                ))}
              </div>

              {/* Mini EQ bars */}
              <div className="flex items-end gap-0.5 mb-2" style={{ height: 32 }}>
                {Array.from({ length: 20 }).map((_, i) => {
                  const h = Math.sin(i * 0.4) * 40 + Math.random() * 30 + 20;
                  const color = activeTier === "cinematic" ? "#9b59f5" : activeTier === "enhanced" ? "#4da6ff" : "#c9a84c";
                  return <div key={i} className="flex-1 rounded-t-[1px]" style={{ height: `${h}%`, background: `${color}60` }} />;
                })}
              </div>

              {/* Preview player */}
              <div className="flex items-center gap-2 rounded-[4px] px-2.5 py-1.5" style={{ background: "#080810" }}>
                <button className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-white text-[10px]" style={{ background: "#c9a84c" }}>▶</button>
                <div className="flex-1 h-[3px] rounded-[2px] overflow-hidden" style={{ background: "#1a1a1a" }}>
                  <div className="h-full w-[22%] rounded-[2px]" style={{ background: "linear-gradient(90deg, #c9a84c, #f0c040)" }} />
                </div>
                <span className="text-[9px] text-[#555]">0:22 / 3:00</span>
                <span className="text-[9px] text-[#333]">Preview only</span>
              </div>

              {/* WizSound CTA */}
              <button
                onClick={() => { mp.upgradeCTAClicked("WizAudio", "WizSound Cinematic"); toast.info("WizSound Cinematic — add to order at checkout"); }}
                className="w-full mt-2.5 py-2.5 px-3 rounded-[5px] border border-[#9b59f5]/40 flex items-center justify-between transition-all hover:bg-[#9b59f5]/20"
                style={{ background: "linear-gradient(135deg, rgba(155,89,245,0.15), rgba(155,89,245,0.08))" }}
              >
                <div className="text-left">
                  <div className="text-[10px] font-bold tracking-[1px] text-[#9b59f5]">WIZSOUND™ CINEMATIC</div>
                  <div className="text-[9px] text-[#6a3fa0] mt-0.5">Stereo widening · EQ mastering · Spatial depth</div>
                </div>
                <div className="text-[13px] font-bold text-[#9b59f5]">{WIZSOUND_TIERS.CINEMATIC.price}</div>
              </button>
            </div>

            {/* Studio Ambience Dimmer */}
            <div className="rounded-[6px] p-3 border border-white/6" style={{ background: "#0d0d10" }}>
              <div className="text-[10px] font-bold tracking-[1.5px] text-white/40 mb-2">STUDIO AMBIENCE</div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[10px] text-[#555]">Dim</span>
                <span className="text-[11px] font-semibold text-[--color-gold]">{ambience}%</span>
                <span className="text-[10px] text-[#555]"> Bright</span>
              </div>
              <input
                type="range" min={20} max={100} value={ambience}
                onChange={(e) => setAmbience(Number(e.target.value))}
                className="w-full h-1 cursor-pointer"
                style={{ WebkitAppearance: "none", appearance: "none", background: `linear-gradient(to right, #4a3000 0%, #c9a84c ${ambience}%, #f0c040 100%)`, borderRadius: 2, outline: "none" }}
              />
            </div>

            {/* Generate / Cover / Extend Button */}
            <button
              onClick={studioMode === "generate" ? handleGenerate : handleCoverGenerate}
              disabled={!canGenerate}
              className="w-full rounded-xl font-extrabold text-sm tracking-[2px] uppercase transition-all hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed btn-primary btn-sheen"
              style={{
                padding: "14px",
                background: studioMode === "cover"
                  ? "linear-gradient(135deg, #1a6abf, #0d4a8a)"
                  : studioMode === "extend"
                  ? "linear-gradient(135deg, #1a7a3a, #0d5a28)"
                  : "linear-gradient(135deg, #d4a843, #a07820)",
                boxShadow: studioMode === "cover"
                  ? "0 4px 24px rgba(77,166,255,0.3), 0 0 0 1px rgba(77,166,255,0.2)"
                  : studioMode === "extend"
                  ? "0 4px 24px rgba(48,209,88,0.3), 0 0 0 1px rgba(48,209,88,0.2)"
                  : "0 4px 24px rgba(212,168,67,0.35), 0 0 0 1px rgba(201,168,76,0.2)",
              }}
            >
              {isGenerating ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {status === "trimming" ? "Trimming…" : "Generating…"}
                </span>
              ) : studioMode === "cover" ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="text-lg">⟳</span>
                  <span>Transform Track</span>
                </span>
              ) : studioMode === "extend" ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="text-lg">↦</span>
                  <span>Extend Track</span>
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <span className="text-lg">●</span>
                  <span>Generate Song</span>
                </span>
              )}
            </button>
            <div className="text-[10px] text-white/18 text-center">Credits deducted on generation</div>
          </div>
        </div>
      </div>
    </div>
  );
}
