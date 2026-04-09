import { useState, useRef, useCallback, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { CharacterManager, type Character } from "@/components/CharacterManager";
import CreditBalance from "@/components/CreditBalance";
import {
  Music,
  Upload,
  Sparkles,
  Film,
  Download,
  Play,
  Pencil,
  Check,
  X,
  Loader2,
  ChevronRight,
  Clock,
  Coins,
  RefreshCw,
  User,
  Mic,
  ChevronDown,
  ChevronUp,
  FileText,
  AlertCircle,
} from "lucide-react";

type Step = "upload" | "storyboard" | "render";

interface SceneCard {
  id: number;
  sceneIndex: number;
  startTime: number;
  duration: number;
  prompt: string;
  lyrics?: string | null;
  visualStyle: string;
  status: string;
  videoUrl?: string | null;
  previewImageUrl?: string | null;
  previewImageLoading?: boolean;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export default function MusicVideoAutopilot() {
  const { user, isAuthenticated } = useAuth();
  const [step, setStep] = useState<Step>("upload");
  const [jobId, setJobId] = useState<number | null>(null);

  // Step 1: Upload form state
  const [title, setTitle] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [themePrompt, setThemePrompt] = useState("");
  const [genre, setGenre] = useState("");
  const [mood, setMood] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("cinematic");

  // Multi-character state (replaces single character + lip sync)
  const [characters, setCharacters] = useState<Character[]>([]);

  // Transcription / lyrics state — starts immediately on audio file select
  const [transcriptionStatus, setTranscriptionStatus] = useState<string>("idle"); // idle | transcribing | done | failed | quota
  const [quotaError, setQuotaError] = useState<string | null>(null);
  const [transcriptionText, setTranscriptionText] = useState<string | null>(null);
  const [lyricsExpanded, setLyricsExpanded] = useState(false);
  // Keep segments for later use by storyboard
  const [transcriptionSegments, setTranscriptionSegments] = useState<Array<{ start: number; end: number; text: string }>>([]);
  const transcriptionPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const VIDEO_STYLES = [
    {
      id: "cinematic",
      label: "Cinematic",
      desc: "Hollywood-quality realism",
      image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-cinematic-UvoChSsK7xZ9a7MR2bUHeq.webp",
    },
    {
      id: "anime",
      label: "Anime",
      desc: "Japanese animation style",
      image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-anime-bCLhyWeYo6mek5pWMnEUV7.webp",
    },
    {
      id: "pixar3d",
      label: "Pixar 3D",
      desc: "Vibrant 3D animation",
      image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-pixar3d-eN2z5fKQJJTuTc3Ghd84dV.webp",
    },
    {
      id: "documentary",
      label: "Documentary",
      desc: "Authentic & raw footage",
      image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-documentary-nyjoHJnTHZU2hdjABnnjBm.webp",
    },
    {
      id: "abstract",
      label: "Abstract",
      desc: "Artistic visual journey",
      image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-abstract-E9NdxWuFeAHfGRiGpsbW9Y.webp",
    },
    {
      id: "vintage",
      label: "Vintage",
      desc: "Retro film aesthetic",
      image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-vintage-iCZFjq9buUWkDWVxu3J7Qy.webp",
    },
  ];
  const [isDragging, setIsDragging] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2: Storyboard state
  const [scenes, setScenes] = useState<SceneCard[]>([]);
  const [editingSceneId, setEditingSceneId] = useState<number | null>(null);
  const [editPrompt, setEditPrompt] = useState("");

  // Step 3: Render state
  const [renderStatus, setRenderStatus] = useState<string>("rendering");
  const [completedScenes, setCompletedScenes] = useState(0);
  const [totalScenes, setTotalScenes] = useState(0);
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);
  const [sceneStatuses, setSceneStatuses] = useState<Record<number, string>>({});
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const transcribeAudioDirect = trpc.musicVideo.transcribeAudioDirect.useMutation();
  const createJob = trpc.musicVideo.createJob.useMutation();
  const generateStoryboardMutation = trpc.musicVideo.generateStoryboard.useMutation();
  const updateScene = trpc.musicVideo.updateScene.useMutation();
  const startRender = trpc.musicVideo.startRender.useMutation();
  const pollProgress = trpc.musicVideo.pollProgress.useMutation();
  const generateScenePreviewMutation = trpc.musicVideo.generateScenePreview.useMutation();

  // No polling needed — transcription is a direct mutation that resolves when done

  // Cleanup poll interval on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (transcriptionPollRef.current) clearInterval(transcriptionPollRef.current);
    };
  }, []);

  const handleFileDrop = useCallback((file: File) => {
    const validTypes = ["audio/mpeg", "audio/wav", "audio/mp4", "audio/ogg", "audio/m4a", "audio/x-m4a"];
    const isValid = validTypes.some(t => file.type === t || file.name.endsWith(".mp3") || file.name.endsWith(".wav") || file.name.endsWith(".m4a"));
    if (!isValid) {
      toast.error("Invalid file type", { description: "Please upload an MP3, WAV, or M4A file." });
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      toast.error("File too large", { description: "Maximum file size is 100MB." });
      return;
    }
    setAudioFile(file);
    // Reset transcription state for the new file
    setTranscriptionText(null);
    setTranscriptionSegments([]);
    setTranscriptionStatus("idle");
    setLyricsExpanded(false);

    // Get duration
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audio.onloadedmetadata = () => {
      const dur = Math.round(audio.duration);
      if (dur > 360) {
        toast.error("Song too long", { description: "Maximum song length is 6 minutes." });
        setAudioFile(null);
        setTranscriptionStatus("idle");
        return;
      }
      setAudioDuration(dur);

      // Immediately start transcription in the background
      setTranscriptionStatus("transcribing");
      setLyricsExpanded(true);

      // Read file as base64 and call the direct transcription mutation
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = (reader.result as string).split(",")[1];
          const mimeType = file.type.includes("wav") ? "audio/wav" :
                           file.type.includes("mp4") || file.name.endsWith(".m4a") ? "audio/mp4" : "audio/mpeg";
          const result = await transcribeAudioDirect.mutateAsync({
            audioBase64: base64,
            audioMimeType: mimeType as any,
          });
          setTranscriptionText(result.text);
          setTranscriptionSegments(result.segments);
          setTranscriptionStatus("done");
        } catch (err: any) {
          console.error("Transcription error:", err);
          const isQuota = err?.data?.code === "TOO_MANY_REQUESTS" || /usage exhausted|quota|rate limit|TOO_MANY/i.test(err?.message ?? "");
          if (isQuota) {
            setTranscriptionStatus("quota");
          } else {
            setTranscriptionStatus("failed");
          }
        }
      };
      reader.readAsDataURL(file);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // handleCharacterFileDrop removed — replaced by CharacterManager component

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileDrop(file);
  };

  const sceneCount = audioDuration > 0 ? Math.max(3, Math.min(45, Math.ceil(audioDuration / 8))) : 0;
  const creditCost = sceneCount * 10;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _unused = user;

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Strip the data:...;base64, prefix
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleUploadAndGenerate = async () => {
    if (!audioFile || !title || !themePrompt) {
      toast.error("Missing fields", { description: "Please fill in all required fields and upload your song." });
      return;
    }

    try {
      // Convert audio file to base64
      const arrayBuffer = await audioFile.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < uint8Array.length; i++) binary += String.fromCharCode(uint8Array[i]);
      const base64 = btoa(binary);
      const mimeType = audioFile.type.includes("wav") ? "audio/wav" :
                       audioFile.type.includes("mp4") || audioFile.name.endsWith(".m4a") ? "audio/mp4" : "audio/mpeg";

      // Build character data for the job (primary photo per character)
      const firstCharWithPhoto = characters.find(c => c.photos.length > 0);
      const characterImageBase64 = firstCharWithPhoto?.photos.find(p => p.isPrimary)?.base64 ?? firstCharWithPhoto?.photos[0]?.base64;
      const characterImageMimeType = firstCharWithPhoto?.photos.find(p => p.isPrimary)?.mimeType ?? firstCharWithPhoto?.photos[0]?.mimeType;
      const enableLipSync = characters.some(c => c.enableLipSync);

      toast.loading("Uploading song...", { description: "This may take a moment." });

      // Append the selected visual style to the theme prompt so the LLM uses it
      const styleLabel = VIDEO_STYLES.find(s => s.id === selectedStyle)?.label ?? selectedStyle;
      const enrichedThemePrompt = `${themePrompt}\n\nVisual Style: ${styleLabel}`;

      const result = await createJob.mutateAsync({
        title,
        audioBase64: base64,
        audioMimeType: mimeType as any,
        audioDuration,
        themePrompt: enrichedThemePrompt,
        genre: genre || undefined,
        mood: mood || undefined,
        characterImageBase64,
        characterImageMimeType: characterImageMimeType as any,
        enableLipSync,
      });

      setJobId(result.jobId);
      setTotalScenes(result.sceneCount);
      // Transcription was already started when the file was selected; no need to re-trigger;

      toast.loading("Generating storyboard...", { description: "Our AI director is crafting your scenes." });

      const storyboard = await generateStoryboardMutation.mutateAsync({ jobId: result.jobId });
      setScenes(storyboard.scenes.map((s: any) => ({ ...s, id: s.sceneIndex, status: "pending" })));

      // Fetch actual scene IDs from server
      setStep("storyboard");
      toast.success("Storyboard ready!", { description: `${storyboard.scenes.length} scenes created. Review and edit before rendering.` });
    } catch (err: any) {
      const isQuota = err?.data?.code === "TOO_MANY_REQUESTS" || /usage exhausted|quota|rate limit|TOO_MANY/i.test(err?.message ?? "");
      if (isQuota) {
        setQuotaError("The AI service is temporarily unavailable due to high demand. Please wait a few minutes and try again. Your progress has been saved.");
      } else {
        toast.error("Error", { description: err.message || "Failed to create job" });
      }
    }
  };
  // Fetch full job data (with real scene IDs) after moving to storyboard stepp
  const jobQuery = trpc.musicVideo.getJob.useQuery(
    { jobId: jobId! },
    { enabled: !!jobId && step === "storyboard" }
  );

  useEffect(() => {
    if (jobQuery.data?.scenes) {
      const mappedScenes = jobQuery.data.scenes.map((s: any) => ({
        id: s.id,
        sceneIndex: s.sceneIndex,
        startTime: s.startTime,
        duration: s.duration,
        prompt: s.prompt,
        lyrics: s.lyrics,
        visualStyle: s.visualStyle ?? "",
        status: s.status,
        videoUrl: s.videoUrl,
        previewImageUrl: s.previewImageUrl ?? null,
        previewImageLoading: !s.previewImageUrl,
      }));
      setScenes(mappedScenes);
      // Trigger image generation for scenes that don't have a preview yet
      mappedScenes.forEach((scene) => {
        if (!scene.previewImageUrl && jobId) {
          generateScenePreviewMutation.mutateAsync({ sceneId: scene.id, jobId })
            .then(({ imageUrl }) => {
              if (imageUrl) {
                setScenes(prev => prev.map(s =>
                  s.id === scene.id ? { ...s, previewImageUrl: imageUrl, previewImageLoading: false } : s
                ));
              } else {
                setScenes(prev => prev.map(s =>
                  s.id === scene.id ? { ...s, previewImageLoading: false } : s
                ));
              }
            })
            .catch(() => {
              setScenes(prev => prev.map(s =>
                s.id === scene.id ? { ...s, previewImageLoading: false } : s
              ));
            });
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobQuery.data]);

  const handleSaveEdit = async (sceneId: number) => {
    try {
      await updateScene.mutateAsync({ sceneId, prompt: editPrompt });
      // Clear the old preview so a fresh one is generated from the new prompt
      setScenes(prev => prev.map(s =>
        s.id === sceneId
          ? { ...s, prompt: editPrompt, previewImageUrl: null, previewImageLoading: true }
          : s
      ));
      setEditingSceneId(null);
      toast.success("Scene updated", { description: "Regenerating preview image..." });
      // Regenerate the preview image for this scene
      if (jobId) {
        generateScenePreviewMutation.mutateAsync({ sceneId, jobId })
          .then(({ imageUrl }) => {
            setScenes(prev => prev.map(s =>
              s.id === sceneId ? { ...s, previewImageUrl: imageUrl ?? null, previewImageLoading: false } : s
            ));
          })
          .catch(() => {
            setScenes(prev => prev.map(s =>
              s.id === sceneId ? { ...s, previewImageLoading: false } : s
            ));
          });
      }
    } catch (err: any) {
      toast.error("Error", { description: err.message });
    }
  };

  const handleRegenerateStoryboard = async () => {
    if (!jobId) return;
    try {
      toast.loading("Regenerating storyboard...");
      const storyboard = await generateStoryboardMutation.mutateAsync({ jobId });
      setScenes(storyboard.scenes.map((s: any) => ({ ...s, id: s.sceneIndex, status: "pending" })));
      toast.success("Storyboard regenerated!");
    } catch (err: any) {
      toast.error("Error", { description: err.message });
    }
  };

  const handleStartRender = async () => {
    if (!jobId) return;
    try {
      await startRender.mutateAsync({ jobId });
      setStep("render");
      setRenderStatus("rendering");
      setCompletedScenes(0);

      // Start polling
      pollIntervalRef.current = setInterval(async () => {
        try {
          const progress = await pollProgress.mutateAsync({ jobId });
          setCompletedScenes(progress.completedScenes);
          setTotalScenes(progress.totalScenes);
          setRenderStatus(progress.status);

          if (progress.status === "completed" && progress.finalVideoUrl) {
            setFinalVideoUrl(progress.finalVideoUrl);
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            toast.success("Your music video is ready!", { description: "Click Download to save it." });
          }

          if (progress.status === "failed") {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            toast.error("Render failed", { description: "Some scenes could not be generated." });
          }
        } catch (err) {
          console.error("Poll error:", err);
        }
      }, 15000); // Poll every 15 seconds

    } catch (err: any) {
      toast.error("Error", { description: err.message });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Card className="bg-zinc-900 border-zinc-800 max-w-md w-full mx-4">
          <CardContent className="pt-8 pb-8 text-center">
            <Music className="w-12 h-12 text-purple-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Music Video WizPilot</h2>
            <p className="text-zinc-400 mb-6">Sign in to create your AI music video</p>
            <Button
              className="bg-purple-600 hover:bg-purple-700 text-white w-full"
              onClick={() => window.location.href = getLoginUrl()}
            >
              Sign In to Get Started
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-950">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
              <Music className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.05em" }}>
                MUSIC VIDEO WIZPILOT
              </h1>
              <p className="text-zinc-400 text-sm">Upload your song. Describe your vision. We'll create the video.</p>
            </div>
          </div>

          {/* Step indicators */}
          <div className="flex items-center gap-2 mt-4">
            {(["upload", "storyboard", "render"] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  step === s ? "bg-purple-600 text-white" :
                  (["upload", "storyboard", "render"].indexOf(step) > i) ? "bg-zinc-700 text-zinc-300" :
                  "bg-zinc-900 text-zinc-500"
                }`}>
                  <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">{i + 1}</span>
                  <span className="capitalize hidden sm:inline">{s === "upload" ? "Upload & Theme" : s === "storyboard" ? "Review Storyboard" : "Render & Download"}</span>
                </div>
                {i < 2 && <ChevronRight className="w-4 h-4 text-zinc-600" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* ===== STEP 1: UPLOAD ===== */}
        {step === "upload" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Audio Upload */}
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Upload className="w-5 h-5 text-purple-400" />
                    Upload Your Song
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                      isDragging ? "border-purple-500 bg-purple-500/10" :
                      audioFile ? "border-green-500 bg-green-500/10" :
                      "border-zinc-700 hover:border-zinc-500"
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".mp3,.wav,.m4a,audio/*"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileDrop(f); }}
                    />
                    {audioFile ? (
                      <div>
                        <Check className="w-10 h-10 text-green-400 mx-auto mb-2" />
                        <p className="text-green-400 font-medium">{audioFile.name}</p>
                        <p className="text-zinc-400 text-sm mt-1">Duration: {formatDuration(audioDuration)}</p>
                        <p className="text-zinc-500 text-xs mt-1">Click to change</p>
                      </div>
                    ) : (
                      <div>
                        <Music className="w-10 h-10 text-zinc-500 mx-auto mb-2" />
                        <p className="text-zinc-300 font-medium">Drop your song here</p>
                        <p className="text-zinc-500 text-sm mt-1">MP3, WAV, M4A · Max 100MB · Max 6 minutes</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label className="text-zinc-300">Song Title *</Label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Midnight Dreams"
                      className="mt-1 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                    />
                  </div>

                  {/* Lyrics / Transcription Panel — shows as soon as audio is selected */}
                  {transcriptionStatus !== "idle" && (
                    <div className="rounded-xl border border-zinc-700 overflow-hidden">
                      <button
                        type="button"
                        className="w-full flex items-center justify-between px-4 py-3 bg-zinc-800 hover:bg-zinc-750 transition-colors"
                        onClick={() => setLyricsExpanded(!lyricsExpanded)}
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-purple-400" />
                          <span className="text-sm font-medium text-white">Detected Lyrics</span>
                          {transcriptionStatus === "transcribing" ? (
                            <Badge className="bg-yellow-900/50 text-yellow-300 border-yellow-800 text-xs">
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              Transcribing...
                            </Badge>
                          ) : transcriptionStatus === "done" ? (
                            <Badge className="bg-green-900/50 text-green-300 border-green-800 text-xs">
                              <Check className="w-3 h-3 mr-1" />
                              Ready
                            </Badge>
                          ) : transcriptionStatus === "quota" ? (
                            <Badge className="bg-orange-900/50 text-orange-300 border-orange-800 text-xs">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Service busy
                            </Badge>
                          ) : (
                            <Badge className="bg-zinc-700 text-zinc-400 text-xs">Not available</Badge>
                          )}
                        </div>
                        {lyricsExpanded ? (
                          <ChevronUp className="w-4 h-4 text-zinc-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-zinc-400" />
                        )}
                      </button>
                      {lyricsExpanded && (
                        <div className="px-4 py-3 bg-zinc-900/50">
                          {transcriptionStatus === "done" && transcriptionText ? (
                            <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap font-mono">
                              {transcriptionText}
                            </p>
                          ) : transcriptionStatus === "transcribing" ? (
                            <div className="flex items-center gap-2 text-zinc-400 text-sm py-2">
                              <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                              <span>AI is transcribing your song's lyrics... This takes 30–60 seconds.</span>
                            </div>
                          ) : transcriptionStatus === "quota" ? (
                            <div className="flex items-start gap-2 text-sm py-2">
                              <AlertCircle className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
                              <div>
                                <p className="text-orange-300 font-medium">AI service temporarily busy</p>
                                <p className="text-zinc-400 mt-0.5">Lyrics could not be transcribed right now. You can still generate a storyboard from your theme description. Try again in a few minutes.</p>
                              </div>
                            </div>
                          ) : (
                            <p className="text-zinc-500 text-sm py-2">
                              Could not transcribe lyrics. The storyboard will be generated from your theme description instead.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Theme & Vision */}
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-pink-400" />
                    Describe Your Vision
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-zinc-300">Theme & Concept *</Label>
                    <Textarea
                      value={themePrompt}
                      onChange={(e) => setThemePrompt(e.target.value)}
                      placeholder="Describe the visual story you want. E.g. 'A lone astronaut drifting through a neon galaxy, searching for home. Dark and cinematic with purple and blue tones. Emotional and introspective.'"
                      className="mt-1 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 min-h-[120px]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-zinc-300">Genre</Label>
                      <Input
                        value={genre}
                        onChange={(e) => setGenre(e.target.value)}
                        placeholder="e.g. Indie Rock, EDM, R&B"
                        className="mt-1 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                      />
                    </div>
                    <div>
                      <Label className="text-zinc-300">Mood</Label>
                      <Input
                        value={mood}
                        onChange={(e) => setMood(e.target.value)}
                        placeholder="e.g. Dark, Euphoric, Melancholic"
                        className="mt-1 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                      />
                    </div>
                  </div>

                  {/* Video Style Picker */}
                  <div>
                    <Label className="text-zinc-300 mb-3 block">Video Style</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {VIDEO_STYLES.map((style) => (
                        <button
                          key={style.id}
                          type="button"
                          onClick={() => setSelectedStyle(style.id)}
                          className={`relative rounded-xl overflow-hidden text-left transition-all focus:outline-none group ${
                            selectedStyle === style.id
                              ? "ring-2 ring-purple-500 ring-offset-2 ring-offset-zinc-900"
                              : "ring-1 ring-zinc-700 hover:ring-zinc-500"
                          }`}
                        >
                          {/* Thumbnail */}
                          <div className="relative" style={{ aspectRatio: "3/2" }}>
                            <img
                              src={style.image}
                              alt={style.label}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            {/* Dark overlay */}
                            <div className={`absolute inset-0 transition-opacity ${
                              selectedStyle === style.id
                                ? "bg-purple-900/40"
                                : "bg-black/40 group-hover:bg-black/20"
                            }`} />
                            {/* Selected checkmark */}
                            {selectedStyle === style.id && (
                              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </div>
                          {/* Label */}
                          <div className={`px-3 py-2 ${
                            selectedStyle === style.id ? "bg-purple-900/60" : "bg-zinc-800"
                          }`}>
                            <p className={`text-sm font-semibold ${
                              selectedStyle === style.id ? "text-purple-200" : "text-white"
                            }`}>{style.label}</p>
                            <p className="text-xs text-zinc-400">{style.desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Characters & Lip Sync — multi-character */}
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <User className="w-5 h-5 text-purple-400" />
                    Characters & Lip Sync
                    <Badge variant="outline" className="border-zinc-600 text-zinc-400 text-xs ml-1">Optional · Up to 4</Badge>
                  </CardTitle>
                  <p className="text-zinc-500 text-xs mt-1">
                    Add up to 4 characters with reference photos. The AI will use their appearance consistently across all scenes.
                  </p>
                </CardHeader>
                <CardContent>
                  <CharacterManager
                    characters={characters}
                    onChange={setCharacters}
                    maxCharacters={4}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Summary sidebar */}
            <div className="space-y-4">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white text-base">Video Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400 flex items-center gap-1.5"><Clock className="w-4 h-4" /> Duration</span>
                    <span className="text-white">{audioDuration > 0 ? formatDuration(audioDuration) : "—"}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400 flex items-center gap-1.5"><Film className="w-4 h-4" /> Scenes</span>
                    <span className="text-white">{sceneCount > 0 ? sceneCount : "—"}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400 flex items-center gap-1.5"><Coins className="w-4 h-4" /> Credits</span>
                    <span className="text-white">{creditCost > 0 ? creditCost : "—"}</span>
                  </div>
                  {characters.length > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-400 flex items-center gap-1.5"><User className="w-4 h-4" /> Characters</span>
                      <span className="text-blue-400">{characters.length} added</span>
                    </div>
                  )}
                  {characters.some(c => c.enableLipSync) && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-400 flex items-center gap-1.5"><Mic className="w-4 h-4" /> Lip Sync</span>
                      <span className="text-pink-400">✓ Enabled</span>
                    </div>
                  )}
                  <div className="border-t border-zinc-800 pt-3 text-xs text-zinc-500">
                    Storyboard generation is free & unlimited. Credits are only charged when you start rendering.
                  </div>
                </CardContent>
              </Card>

              <CreditBalance variant="card" cost={creditCost > 0 ? creditCost : undefined} />
              <Card className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 border-purple-800/50">
                <CardContent className="pt-4 pb-4">
                  <p className="text-purple-300 text-sm font-medium mb-1">How it works</p>
                  <ol className="text-zinc-400 text-xs space-y-1.5 list-decimal list-inside">
                    <li>Upload your song & describe your vision</li>
                    <li>AI transcribes lyrics & generates a free storyboard</li>
                    <li>Review & edit any scene prompts</li>
                    <li>Render all scenes (credits charged here)</li>
                    <li>Download your finished music video</li>
                  </ol>
                </CardContent>
              </Card>

              {quotaError && (
                <div className="flex items-start gap-3 rounded-xl border border-orange-800 bg-orange-950/40 px-4 py-3">
                  <AlertCircle className="w-5 h-5 text-orange-400 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-orange-300 font-medium text-sm">AI service temporarily busy</p>
                    <p className="text-orange-200/70 text-xs mt-0.5">{quotaError}</p>
                  </div>
                  <button
                    type="button"
                    className="text-orange-400 hover:text-orange-200 transition-colors"
                    onClick={() => setQuotaError(null)}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <Button
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3"
                onClick={() => { setQuotaError(null); handleUploadAndGenerate(); }}
                disabled={createJob.isPending || generateStoryboardMutation.isPending || !audioFile || !title || !themePrompt}
              >
                {createJob.isPending || generateStoryboardMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating Storyboard...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" /> Generate Free Storyboard</>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ===== STEP 2: STORYBOARD ===== */}
        {step === "storyboard" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">Your Storyboard</h2>
                <p className="text-zinc-400 text-sm mt-1">{scenes.length} scenes · Review and edit any scene before rendering</p>
              </div>
              <div className="flex items-center gap-3">
                <CreditBalance variant="badge" />
                <Button
                  variant="outline"
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 bg-transparent"
                  onClick={handleRegenerateStoryboard}
                  disabled={generateStoryboardMutation.isPending}
                >
                  {generateStoryboardMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Regenerate
                </Button>
                <Button
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                  onClick={handleStartRender}
                  disabled={startRender.isPending || scenes.length === 0}
                >
                  {startRender.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Starting...</>
                  ) : (
                    <><Film className="w-4 h-4 mr-2" /> Render Video ({creditCost} credits)</>
                  )}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scenes.map((scene) => (
                <Card key={scene.id} className="bg-zinc-900 border-zinc-800 hover:border-zinc-600 transition-colors overflow-hidden">
                  {/* Scene preview image */}
                  <div className="relative w-full aspect-video bg-zinc-800">
                    {scene.previewImageUrl ? (
                      <img
                        src={scene.previewImageUrl}
                        alt={`Scene ${scene.sceneIndex + 1} preview`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {scene.previewImageLoading ? (
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                            <span className="text-zinc-500 text-xs">Generating preview...</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <Film className="w-6 h-6 text-zinc-600" />
                            <span className="text-zinc-600 text-xs">No preview</span>
                          </div>
                        )}
                      </div>
                    )}
                    {/* Scene number overlay */}
                    <div className="absolute top-2 left-2">
                      <Badge className="bg-black/70 text-white border-0 text-xs backdrop-blur-sm">
                        Scene {scene.sceneIndex + 1}
                      </Badge>
                    </div>
                    {/* Duration overlay */}
                    <div className="absolute bottom-2 right-2">
                      <span className="text-xs text-white/80 bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-sm">
                        {formatTime(scene.startTime)} · {scene.duration}s
                      </span>
                    </div>
                  </div>
                  <CardContent className="pt-3 pb-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {scene.visualStyle && (
                          <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-xs">
                            {scene.visualStyle}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Lyrics for this scene */}
                    {scene.lyrics && (
                      <div className="mb-3 px-3 py-2 rounded-lg bg-purple-900/20 border border-purple-800/40">
                        <p className="text-purple-300 text-xs font-medium mb-1 flex items-center gap-1">
                          <Mic className="w-3 h-3" /> Lyrics
                        </p>
                        <p className="text-zinc-300 text-xs italic leading-relaxed">"{scene.lyrics}"</p>
                      </div>
                    )}

                    {editingSceneId === scene.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editPrompt}
                          onChange={(e) => setEditPrompt(e.target.value)}
                          className="bg-zinc-800 border-zinc-700 text-white text-sm min-h-[100px]"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                            onClick={() => handleSaveEdit(scene.id)}
                            disabled={updateScene.isPending}
                          >
                            <Check className="w-3 h-3 mr-1" /> Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-zinc-700 text-zinc-300 bg-transparent hover:bg-zinc-800"
                            onClick={() => setEditingSceneId(null)}
                          >
                            <X className="w-3 h-3 mr-1" /> Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-zinc-300 text-sm leading-relaxed line-clamp-3">{scene.prompt}</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="mt-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 -ml-2 text-xs"
                          onClick={() => { setEditingSceneId(scene.id); setEditPrompt(scene.prompt); }}
                        >
                          <Pencil className="w-3 h-3 mr-1" /> Edit prompt
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ===== STEP 3: RENDER ===== */}
        {step === "render" && (
          <div className="max-w-2xl mx-auto">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="pt-8 pb-8">
                {renderStatus === "completed" && finalVideoUrl ? (
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                      <Check className="w-8 h-8 text-green-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Your Music Video is Ready!</h2>
                    <p className="text-zinc-400 mb-6">All {totalScenes} scenes have been rendered and assembled with your audio track.</p>

                    <video
                      src={finalVideoUrl}
                      controls
                      autoPlay
                      loop
                      playsInline
                      className="w-full rounded-xl mb-6 max-h-80 bg-black"
                    />

                    <div className="flex gap-3 justify-center">
                      <a href={finalVideoUrl} download target="_blank" rel="noopener noreferrer">
                        <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8">
                          <Download className="w-4 h-4 mr-2" /> Download Video
                        </Button>
                      </a>
                      <Button
                        variant="outline"
                        className="border-zinc-700 text-zinc-300 bg-transparent hover:bg-zinc-800"
                        onClick={() => { setStep("upload"); setJobId(null); setAudioFile(null); setTitle(""); setThemePrompt(""); setGenre(""); setMood(""); setAudioDuration(0); setScenes([]); setFinalVideoUrl(null); setCharacters([]); setTranscriptionText(null); setTranscriptionSegments([]); setTranscriptionStatus("idle"); setLyricsExpanded(false); }}
                      >
                        Create Another
                      </Button>
                    </div>
                  </div>
                ) : renderStatus === "failed" ? (
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                      <X className="w-8 h-8 text-red-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Render Failed</h2>
                    <p className="text-zinc-400 mb-6">Some scenes could not be generated. Please try again.</p>
                    <Button
                      variant="outline"
                      className="border-zinc-700 text-zinc-300 bg-transparent hover:bg-zinc-800"
                      onClick={() => setStep("storyboard")}
                    >
                      Back to Storyboard
                    </Button>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
                      <Film className="w-8 h-8 text-purple-400 animate-pulse" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                      {renderStatus === "assembling" ? "Assembling Your Video..." : "Rendering Scenes..."}
                    </h2>
                    <p className="text-zinc-400 mb-6">
                      {renderStatus === "assembling"
                        ? "All scenes are done! Stitching clips together with your audio track..."
                        : `Generating ${totalScenes} cinematic scenes. This takes 5–15 minutes.`}
                    </p>

                    <div className="mb-4">
                      <div className="flex justify-between text-sm text-zinc-400 mb-2">
                        <span>{completedScenes} of {totalScenes} scenes complete</span>
                        <span>{totalScenes > 0 ? Math.round((completedScenes / totalScenes) * 100) : 0}%</span>
                      </div>
                      <Progress
                        value={totalScenes > 0 ? (completedScenes / totalScenes) * 100 : 0}
                        className="h-3 bg-zinc-800"
                      />
                    </div>

                    <p className="text-zinc-500 text-xs">
                      Each scene takes 1–3 minutes to generate. You can leave this page and come back — we'll keep rendering.
                    </p>

                    <div className="mt-6 grid grid-cols-5 gap-2">
                      {Array.from({ length: Math.min(totalScenes, 20) }).map((_, i) => (
                        <div
                          key={i}
                          className={`h-2 rounded-full transition-all ${
                            i < completedScenes ? "bg-purple-500" :
                            i === completedScenes ? "bg-purple-500/50 animate-pulse" :
                            "bg-zinc-800"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
