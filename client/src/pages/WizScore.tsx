/**
 * WizScore™ — Video-to-Music AI
 * Upload a video → AI analyses mood/pacing/energy → generates a perfectly synced soundtrack
 */
import { useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useSEO } from "@/hooks/useSEO";
import {
  Upload, Music2, Wand2, CheckCircle2, AlertCircle,
  Download, Play, Pause, Film, Sparkles, ChevronRight
} from "@/lib/icons";

const CDN = "/manus-storage";
const WIZSOUND_LOGO = `${CDN}/wizsound-logo-new_c5cced65.png`;

type Step = "idle" | "uploading" | "analyzing" | "generating" | "complete" | "error";

interface Analysis {
  mood: string;
  pacing: string;
  energy: string;
  genre: string;
  videoDurationSeconds: number;
  sunoPrompt: string;
  sunoStyle: string;
}

export default function WizScore() {

  useSEO({ title: "WizScore™ — AI Video-to-Music Generator — WIZ AI", path: "/wizscore", description: "Upload a video and let AI generate a perfectly synced soundtrack. WizScore™ analyses mood, pacing, and energy to create music that fits every frame." });
  const { isAuthenticated } = useAuth();
  const [step, setStep] = useState<Step>("idle");
  const [progress, setProgress] = useState(0);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [jobId, setJobId] = useState<number | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [sunoTaskId, setSunoTaskId] = useState<number | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const createJob = trpc.wizScore.create.useMutation();
  const analyzeJob = trpc.wizScore.analyze.useMutation();
  const generateScore = trpc.wizScore.generateScore.useMutation();
  const completeJob = trpc.wizScore.complete.useMutation();
  const utils = trpc.useUtils();

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith("video/")) {
      toast.error("Invalid file", { description: "Please upload a video file (MP4, MOV, WebM)" });
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      toast.error("File too large", { description: "Maximum video size is 100MB" });
      return;
    }
    setVideoFile(file);
    setVideoPreviewUrl(URL.createObjectURL(file));
    setStep("idle");
    setAnalysis(null);
    setAudioUrl(null);
    setErrorMsg(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const startGeneration = async () => {
    if (!videoFile || !isAuthenticated) return;
    setStep("uploading");
    setProgress(5);
    setErrorMsg(null);

    try {
      // 1. Upload video to S3 via the existing upload endpoint
      const formData = new FormData();
      formData.append("file", videoFile);
      const uploadRes = await fetch("/api/video/upload", { method: "POST", body: formData });
      if (!uploadRes.ok) throw new Error("Upload failed");
      const { key, url } = await uploadRes.json();
      setProgress(20);

      // 2. Create the WizScore job
      const { id } = await createJob.mutateAsync({ videoKey: key, videoUrl: url });
      setJobId(id);
      setStep("analyzing");
      setProgress(30);

      // 3. Analyse the video
      const analysisResult = await analyzeJob.mutateAsync({ jobId: id });
      setAnalysis(analysisResult.analysis as Analysis);
      setProgress(55);
      setStep("generating");

      // 4. Generate the score
      const { sunoTaskId: taskId } = await generateScore.mutateAsync({
        jobId: id,
        sunoPrompt: analysisResult.sunoPrompt,
        sunoStyle: analysisResult.sunoStyle,
        videoDuration: analysisResult.videoDuration,
        origin: window.location.origin,
      });
      setSunoTaskId(taskId);
      setProgress(65);

      // 5. Poll suno task status
      let attempts = 0;
      pollRef.current = setInterval(async () => {
        attempts++;
        try {
          const statusRes = await utils.client.suno.getStatus.query({ id: taskId });
          const pct = Math.min(65 + Math.floor(attempts * 2), 95);
          setProgress(pct);

          if (statusRes.status === "complete") {
            clearInterval(pollRef.current!);
            const tracks: any[] = (statusRes as any).tracks ?? [];
            const firstTrack = tracks[0];
            if (firstTrack?.audioUrl) {
              await completeJob.mutateAsync({ jobId: id, audioUrl: firstTrack.audioUrl });
              setAudioUrl(firstTrack.audioUrl);
              setStep("complete");
              setProgress(100);
              toast.success("– WizScore complete!", { description: "Your synced soundtrack is ready." });
            } else {
              throw new Error("No audio track returned");
            }
          } else if (statusRes.status === "failed") {
            clearInterval(pollRef.current!);
            throw new Error("Music generation failed");
          } else if (attempts > 90) {
            clearInterval(pollRef.current!);
            throw new Error("Generation timed out. Please try again.");
          }
        } catch (pollErr: any) {
          if (pollErr.message !== "Music generation failed" && attempts <= 90) return;
          clearInterval(pollRef.current!);
          setStep("error");
          setErrorMsg(pollErr.message);
        }
      }, 4000);
    } catch (err: any) {
      setStep("error");
      setErrorMsg(err.message ?? "Something went wrong. Please try again.");
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const STEP_LABELS: Record<Step, string> = {
    idle: "Ready",
    uploading: "Uploading video…",
    analyzing: "AI is analysing your video…",
    generating: "Composing your soundtrack…",
    complete: "Your WizScore is ready!",
    error: "Something went wrong",
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#060608] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-[--color-gold]/15 border border-[--color-gold]/30 flex items-center justify-center mx-auto mb-6">
            <Music2 className="w-8 h-8 text-[--color-gold]" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">WizScore™</h1>
          <p className="text-white/50 mb-8">Sign in to generate AI-matched soundtracks for your videos.</p>
          <Button className="btn-primary btn-sheen px-8 py-3 rounded-xl text-base" asChild>
            <a href={getLoginUrl()}>Sign in to continue</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060608] text-white">
      {/* Header */}
      <div className="border-b border-white/[0.06] bg-[#0a0a0c]/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center gap-3">
          <a href="/" className="text-white/40 hover:text-white/70 transition-colors text-sm">WIZ AI</a>
          <ChevronRight className="w-3.5 h-3.5 text-white/20" />
          <span className="text-white/80 font-semibold text-sm">WizScore™</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-[--color-gold]/15 border border-[--color-gold]/30 rounded-full px-4 py-1.5 mb-6">
            <Sparkles className="w-3.5 h-3.5 text-[--color-gold]" />
            <span className="text-[--color-gold] text-xs font-semibold tracking-wide uppercase">AI Video-to-Music</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-white mb-4 tracking-tight">
            WizScore<span className="text-[--color-gold]">™</span>
          </h1>
          <p className="text-xl text-white/50 max-w-xl mx-auto leading-relaxed">
            Upload any video. AI analyses the mood, pacing, and energy — then generates a perfectly synced original soundtrack.
          </p>
        </div>

        {/* Main card */}
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-3xl overflow-hidden">
          <div className="grid md:grid-cols-2 gap-0">
            {/* Left: Upload */}
            <div className="p-8 border-r border-white/[0.06]">
              <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
                <Film className="w-5 h-5 text-[--color-gold]" /> Upload Video
              </h2>

              {!videoFile ? (
                <div
                  className="border-2 border-dashed border-white/[0.12] rounded-2xl p-10 text-center cursor-pointer hover:border-[--color-gold]/30 hover:bg-[--color-gold]/15[0.03] transition-all duration-200"
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-10 h-10 text-white/20 mx-auto mb-3" />
                  <p className="text-white/50 text-sm mb-1">Drag & drop your video here</p>
                  <p className="text-white/25 text-xs">MP4, MOV, WebM — max 100MB</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <video
                    src={videoPreviewUrl!}
                    className="w-full rounded-xl aspect-video object-cover bg-black"
                    controls
                    muted
                    playsInline
                  />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/80 text-sm font-medium truncate max-w-[200px]">{videoFile.name}</p>
                      <p className="text-white/35 text-xs">{(videoFile.size / 1024 / 1024).toFixed(1)} MB</p>
                    </div>
                    <button
                      className="text-white/30 hover:text-white/60 text-xs underline transition-colors"
                      onClick={() => { setVideoFile(null); setVideoPreviewUrl(null); setStep("idle"); }}
                    >
                      Change
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Status + Result */}
            <div className="p-8">
              <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
                <Music2 className="w-5 h-5 text-[--color-silver]" /> Your Soundtrack
              </h2>

              {step === "idle" && (
                <div className="flex flex-col items-center justify-center h-48 text-center">
                  <Wand2 className="w-10 h-10 text-white/15 mb-3" />
                  <p className="text-white/35 text-sm">Upload a video to get started</p>
                </div>
              )}

              {(step === "uploading" || step === "analyzing" || step === "generating") && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[--color-gold]/15 flex items-center justify-center flex-shrink-0">
                      <div className="w-3 h-3 rounded-full bg-[--color-gold] animate-pulse" />
                    </div>
                    <p className="text-white/70 text-sm font-medium">{STEP_LABELS[step]}</p>
                  </div>
                  <Progress value={progress} className="h-1.5 bg-white/[0.06]" />
                  <p className="text-white/30 text-xs">{progress}% complete</p>

                  {/* Step indicators */}
                  <div className="space-y-2.5 mt-4">
                    {[
                      { label: "Upload video", done: progress >= 20 },
                      { label: "AI video analysis", done: progress >= 55 },
                      { label: "Compose soundtrack", done: progress >= 100 },
                    ].map(({ label, done }) => (
                      <div key={label} className="flex items-center gap-2.5">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${done ? "bg-[--color-silver]/10" : "bg-white/[0.05]"}`}>
                          {done && <CheckCircle2 className="w-3 h-3 text-[--color-silver]" />}
                        </div>
                        <span className={`text-xs ${done ? "text-white/60" : "text-white/25"}`}>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {step === "complete" && analysis && audioUrl && (
                <div className="space-y-5">
                  {/* Analysis summary */}
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-2">
                    <p className="text-white/40 text-[11px] font-semibold uppercase tracking-widest mb-3">AI Analysis</p>
                    {[
                      { label: "Mood", value: analysis.mood },
                      { label: "Energy", value: analysis.energy },
                      { label: "Genre", value: analysis.genre },
                      { label: "Duration", value: `${analysis.videoDurationSeconds}s` },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between items-center">
                        <span className="text-white/35 text-xs">{label}</span>
                        <span className="text-white/75 text-xs font-medium capitalize">{value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Audio player */}
                  <div className="bg-gradient-to-r from-[#b8892a]/10 to-[#2e2e36]/10 border border-[--color-gold]/30 rounded-2xl p-4">
                    <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} />
                    <div className="flex items-center gap-3">
                      <button
                        onClick={togglePlay}
                        className="w-10 h-10 rounded-full bg-[--color-gold] hover:bg-[--color-gold]/20 flex items-center justify-center transition-colors flex-shrink-0"
                      >
                        {isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-white/80 text-sm font-semibold truncate">WizScore Soundtrack</p>
                        <p className="text-white/35 text-xs capitalize">{analysis.genre} · {analysis.mood}</p>
                      </div>
                      <a
                        href={audioUrl}
                        download="wizscore-soundtrack.mp3"
                        className="w-9 h-9 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] flex items-center justify-center transition-colors"
                      >
                        <Download className="w-4 h-4 text-white/60" />
                      </a>
                    </div>
                  </div>

                  <Button
                    className="w-full bg-white/[0.06] hover:bg-white/[0.10] text-white/70 rounded-xl text-sm"
                    onClick={() => { setStep("idle"); setVideoFile(null); setVideoPreviewUrl(null); setAnalysis(null); setAudioUrl(null); }}
                  >
                    Score another video
                  </Button>
                </div>
              )}

              {step === "error" && (
                <div className="flex flex-col items-center justify-center h-48 text-center space-y-3">
                  <AlertCircle className="w-10 h-10 text-red-400" />
                  <p className="text-white/60 text-sm">{errorMsg ?? "Something went wrong"}</p>
                  <Button
                    variant="outline"
                    className="text-sm rounded-xl border-white/10"
                    onClick={() => setStep("idle")}
                  >
                    Try again
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Footer CTA */}
          {step === "idle" && videoFile && (
            <div className="border-t border-white/[0.06] p-6 flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm font-medium">Ready to score</p>
                <p className="text-white/30 text-xs">AI will analyse your video and generate a synced soundtrack</p>
              </div>
              <Button
                className="btn-primary btn-sheen px-8 py-3 rounded-xl text-sm font-bold"
                onClick={startGeneration}
                disabled={step !== "idle"}
              >
                <Wand2 className="w-4 h-4 mr-2" /> Generate WizScore
              </Button>
            </div>
          )}
        </div>

        {/* How it works */}
        <div className="mt-16 grid md:grid-cols-3 gap-6">
          {[
            { icon: Film, title: "Upload Your Video", desc: "Drop any video — short film, music video, reel, or YouTube clip. Up to 100MB.", colour: "text-[--color-gold]", bg: "bg-[--color-gold]/15" },
            { icon: Wand2, title: "AI Analyses the Scene", desc: "WizScore reads the mood, pacing, energy, and duration — frame by frame.", colour: "text-[--color-silver]", bg: "bg-[--color-silver]/10" },
            { icon: Music2, title: "Synced Soundtrack", desc: "An original instrumental track is composed and trimmed to end exactly on your final frame.", colour: "text-[--color-gold]", bg: "bg-[--color-gold]/15" },
          ].map(({ icon: Icon, title, desc, colour, bg }) => (
            <div key={title} className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-4`}>
                <Icon className={`w-5 h-5 ${colour}`} />
              </div>
              <h3 className="text-white/85 font-bold text-base mb-2">{title}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
