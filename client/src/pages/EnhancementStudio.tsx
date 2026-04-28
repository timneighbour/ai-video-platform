/**
 * AI Video Enhancement Studio
 * Air Studios premium dark aesthetic — warm amber console feel
 */

import { useState, useRef, useEffect } from "react";
import { LandscapeHint } from "@/components/LandscapeHint";
import { useAuth } from "@/_core/hooks/useAuth";
import { trackEvent } from "@/lib/analytics";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Upload, CheckCircle2, Loader2, Download, Wand2, Sparkles, ChevronRight, Film, Music2, Zap } from "@/lib/icons";
import BackButton from "@/components/BackButton";
import { useSEO } from "@/hooks/useSEO";
import { getLoginUrl } from "@/const";

type Step = "upload" | "style" | "generate" | "processing" | "complete";

const STYLES = [
  { value: "cinematic", label: "Cinematic", desc: "Hollywood colour grade, dramatic shadows" },
  { value: "emotional", label: "Emotional", desc: "Warm tones, swelling orchestral score" },
  { value: "upbeat", label: "Upbeat", desc: "Bright, energetic, punchy cuts" },
  { value: "documentary", label: "Documentary", desc: "Natural, authentic, clean audio" },
];

const STATUS_MESSAGES: Record<string, string> = {
  analyzing: "Analysing video composition…",
  generating: "Composing AI soundtrack…",
  editing: "Editing and colour grading…",
  rendering: "Rendering final video…",
  completed: "Complete!",
  failed: "Build failed",
};

const PROCESSING_STEPS = ["analyzing", "generating", "editing", "rendering"] as const;

export default function EnhancementStudio() {
  useSEO({
    title: "AI Video Enhancement Studio — WIZ AI",
    path: "/enhancement-studio",
    description: "Enhance any video with AI. Upscale resolution, improve lighting, add cinematic colour grading with WizLumina™, and master audio with WizSound™.",
    noindex: true,
  });

  const { user, isAuthenticated } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [selectedStyle, setSelectedStyle] = useState<"cinematic" | "emotional" | "upbeat" | "documentary" | "dramatic" | "calm" | "energetic" | "ambient">("cinematic");
  const [jobId, setJobId] = useState<number | null>(null);
  const [jobStatus, setJobStatus] = useState<string>("pending");
  const [error, setError] = useState<string>("");
  const [isDownloading, setIsDownloading] = useState(false);

  const createJobMutation = trpc.enhancement.createJob.useMutation();
  const getJobQuery = trpc.enhancement.getJob.useQuery(
    { jobId: jobId || 0 },
    { enabled: !!jobId && step === "processing", refetchInterval: 2000 }
  );

  useEffect(() => {
    if (getJobQuery.data && step === "processing") {
      const status = getJobQuery.data.status;
      setJobStatus(status);
      if (status === "completed") setStep("complete");
      if (status === "failed") {
        setError("Enhancement failed. Please try again.");
        setStep("upload");
      }
    }
  }, [getJobQuery.data, step]);

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleVideoUpload(file);
  };

  const handleVideoUpload = (file: File) => {
    if (!file.type.startsWith("video/")) {
      setError("Please upload a video file (MP4, MOV, WebM)");
      return;
    }
    if (file.size > 500 * 1024 * 1024) {
      setError("File too large. Maximum size is 500MB.");
      return;
    }
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      setVideoDuration(Math.round(video.duration));
      URL.revokeObjectURL(video.src);
    };
    video.src = URL.createObjectURL(file);
    setVideoFile(file);
    setError("");
    setStep("style");
    trackEvent("enhancement_video_selected");
  };

  const handleGenerate = async () => {
    if (!videoFile) return;
    try {
      const formData = new FormData();
      formData.append("video", videoFile);
      const uploadRes = await fetch("/api/upload/video", { method: "POST", body: formData });
      if (!uploadRes.ok) throw new Error("Upload failed");
      const { url: videoUrl } = await uploadRes.json();
      const job = await createJobMutation.mutateAsync({ title: videoFile?.name ?? "Enhancement", videoUrl, videoKey: videoUrl, videoDuration, videoSize: videoFile?.size ?? 0, style: selectedStyle });
      setJobId(job.jobId);
      setStep("processing");
      trackEvent("enhancement_job_created", { style: selectedStyle });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start enhancement");
    }
  };

  const handleDownload = async (format: string) => {
    const outputUrl = format === "16x9" ? getJobQuery.data?.outputUrl16x9 : getJobQuery.data?.outputUrl9x16;
    if (!outputUrl) return;
    setIsDownloading(true);
    try {
      const res = await fetch(outputUrl);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `enhanced-${format}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download video");
    } finally {
      setIsDownloading(false);
    }
  };

  const reset = () => {
    setStep("upload");
    setVideoFile(null);
    setJobId(null);
    setError("");
    setJobStatus("pending");
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen studio-bg flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-[--color-gold]/15 border border-[--color-gold]/30 flex items-center justify-center mx-auto mb-6">
            <Wand2 className="w-8 h-8 text-[--color-gold]" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">Enhancement Studio</h1>
          <p className="text-white/50 mb-8">Sign in to enhance your videos with AI colour grading and soundtrack generation.</p>
          <Button className="btn-primary btn-sheen px-8 py-3 rounded-xl text-base" asChild>
            <a href={getLoginUrl("/enhancement-studio")}>Sign in to continue</a>
          </Button>
        </div>
      </div>
    );
  }

  const selectedStyleData = STYLES.find(s => s.value === selectedStyle);
  const currentStepIndex = PROCESSING_STEPS.indexOf(jobStatus as typeof PROCESSING_STEPS[number]);

  return (
    <div className="min-h-screen studio-bg text-white" style={{backgroundColor:'#06050a'}}>
      {/* ── VR Environment: DaVinci Resolve Colour Grading Suite ── */}
      <div className="env-bg">
        <img src="/manus-storage/env-post-production_03973686.jpg" alt="" />
        <div className="env-bg-overlay" />
      </div>
      <div className="env-ambient env-tint-post" />

      {/* Header */}
      <div className="studio-header sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-5 py-4 flex items-center gap-3">
          <BackButton fallback="/create" label="Back to Studio" />
          <a href="/" className="text-white/40 hover:text-white/70 transition-colors text-sm">WIZ AI</a>
          <ChevronRight className="w-3.5 h-3.5 text-white/20" />
          <a href="/products/wizlumina" className="text-white/40 hover:text-white/70 transition-colors text-sm">WizLumina™</a>
          <ChevronRight className="w-3.5 h-3.5 text-white/20" />
          <span className="text-[--color-gold] font-semibold text-sm">Enhancement Studio</span>
          <div className="ml-auto flex items-center gap-2">
            <div className="studio-led studio-led-green" />
            <span className="text-white/30 text-xs">Studio Ready</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 py-10 relative">
        {/* Page title */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 bg-[--color-gold]/10 border border-[--color-gold]/25 rounded-full px-4 py-1.5 mb-5">
            <Sparkles className="w-3.5 h-3.5 text-[--color-gold]" />
            <span className="text-[--color-gold] text-xs font-semibold tracking-widest uppercase">AI Enhancement Studio</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-3 tracking-tight">
            Video Enhancement<span className="text-[--color-gold]">™</span>
          </h1>
          <p className="text-white/45 text-lg max-w-xl leading-relaxed">
            Upload your video. AI applies cinematic colour grading, WizLumina™ visual enhancement, and WizSound™ audio mastering.
          </p>
        </div>

        {/* Step progress */}
        <div className="flex items-center gap-2 mb-8">
          {["Upload", "Style", "Processing", "Complete"].map((label, i) => {
            const stepMap: Record<string, number> = { upload: 0, style: 1, generate: 1, processing: 2, complete: 3 };
            const current = stepMap[step] ?? 0;
            const done = i < current;
            const active = i === current;
            return (
              <div key={label} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  active ? "bg-[--color-gold]/20 border border-[--color-gold]/40 text-[--color-gold]" :
                  done ? "bg-white/[0.06] border border-white/10 text-white/50" :
                  "bg-white/[0.03] border border-white/[0.06] text-white/25"
                }`}>
                  {done ? <CheckCircle2 className="w-3 h-3" /> : <span className="w-3 h-3 flex items-center justify-center">{i + 1}</span>}
                  {label}
                </div>
                {i < 3 && <div className={`w-8 h-px ${done ? "bg-[--color-gold]/30" : "bg-white/[0.08]"}`} />}
              </div>
            );
          })}
        </div>

        {/* Step 1: Upload */}
        {step === "upload" && (
          <div className="studio-card p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[--color-gold]/15 border border-[--color-gold]/25 flex items-center justify-center">
                <Film className="w-5 h-5 text-[--color-gold]" />
              </div>
              <div>
                <h2 className="text-white font-bold text-lg">Upload Your Video</h2>
                <p className="text-white/40 text-sm">MP4, MOV, WebM — max 500MB, max 3 minutes</p>
              </div>
            </div>

            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/[0.10] rounded-2xl p-16 text-center cursor-pointer hover:border-[--color-gold]/30 hover:bg-[--color-gold]/[0.02] transition-all duration-300 group"
            >
              <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-5 group-hover:border-[--color-gold]/25 transition-colors">
                <Upload className="w-8 h-8 text-white/25 group-hover:text-[--color-gold]/60 transition-colors" />
              </div>
              <p className="text-white/60 font-semibold mb-2">Drop your video here</p>
              <p className="text-white/30 text-sm">or click to browse your files</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={(e) => e.target.files?.[0] && handleVideoUpload(e.target.files[0])}
                className="hidden"
              />
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-900/20 border border-red-700/40 rounded-xl text-red-300 flex items-start gap-2 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Feature highlights */}
            <div className="grid grid-cols-3 gap-4 mt-8">
              {[
                { icon: Zap, label: "WizLumina™", desc: "4K upscale & colour grade" },
                { icon: Music2, label: "WizSound™", desc: "AI audio mastering" },
                { icon: Wand2, label: "AI Edit", desc: "Intelligent scene enhancement" },
              ].map(({ icon: Icon, label, desc }) => (
                <div key={label} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
                  <Icon className="w-5 h-5 text-[--color-gold]/70 mx-auto mb-2" />
                  <p className="text-white/70 text-xs font-semibold">{label}</p>
                  <p className="text-white/30 text-xs mt-0.5">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Style Selection */}
        {step === "style" && (
          <div className="studio-card p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[--color-gold]/15 border border-[--color-gold]/25 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-[--color-gold]" />
              </div>
              <div>
                <h2 className="text-white font-bold text-lg">Choose Enhancement Style</h2>
                <p className="text-white/40 text-sm">{videoFile?.name} · {videoDuration}s</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {STYLES.map((style) => (
                <button
                  key={style.value}
                  onClick={() => setSelectedStyle(style.value as typeof selectedStyle)}
                  className={`p-4 rounded-xl border text-left transition-all duration-200 ${
                    selectedStyle === style.value
                      ? "border-[--color-gold]/50 bg-[--color-gold]/10"
                      : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15]"
                  }`}
                >
                  <p className={`font-semibold text-sm mb-1 ${selectedStyle === style.value ? "text-[--color-gold]" : "text-white/80"}`}>
                    {style.label}
                  </p>
                  <p className="text-white/40 text-xs">{style.desc}</p>
                </button>
              ))}
            </div>

            {selectedStyleData && (
              <div className="p-4 rounded-xl bg-[--color-gold]/[0.06] border border-[--color-gold]/20 mb-6">
                <p className="text-[--color-gold] text-xs font-semibold uppercase tracking-widest mb-1">Selected Style</p>
                <p className="text-white/80 text-sm font-medium">{selectedStyleData.label}</p>
                <p className="text-white/45 text-xs mt-0.5">{selectedStyleData.desc}</p>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-red-900/20 border border-red-700/40 rounded-xl text-red-300 flex items-start gap-2 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={reset}
                className="flex-1 border-white/10 text-white/60 hover:text-white hover:border-white/20 rounded-xl"
              >
                Back
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={createJobMutation.isPending}
                className="flex-1 btn-primary btn-sheen rounded-xl font-bold"
              >
                {createJobMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Starting…</>
                ) : (
                  <><Wand2 className="w-4 h-4 mr-2" />Enhance Video</>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Processing */}
        {step === "processing" && (
          <div className="studio-card p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-[--color-gold]/15 border border-[--color-gold]/25 flex items-center justify-center">
                <div className="studio-led studio-led-gold" />
              </div>
              <div>
                <h2 className="text-white font-bold text-lg">Enhancing Your Video</h2>
                <p className="text-white/40 text-sm">This typically takes 2–5 minutes</p>
              </div>
            </div>

            <div className="space-y-3 mb-8">
              {PROCESSING_STEPS.map((status, i) => {
                const done = i < currentStepIndex;
                const active = status === jobStatus;
                return (
                  <div key={status} className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                    active ? "border-[--color-gold]/30 bg-[--color-gold]/[0.05]" :
                    done ? "border-white/[0.06] bg-white/[0.02]" :
                    "border-white/[0.04] bg-transparent"
                  }`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      active ? "bg-[--color-gold]/20" : done ? "bg-white/[0.06]" : "bg-white/[0.03]"
                    }`}>
                      {active ? (
                        <Loader2 className="w-4 h-4 text-[--color-gold] animate-spin" />
                      ) : done ? (
                        <CheckCircle2 className="w-4 h-4 text-white/50" />
                      ) : (
                        <span className="text-white/20 text-xs">{i + 1}</span>
                      )}
                    </div>
                    <span className={`text-sm font-medium ${active ? "text-[--color-gold]" : done ? "text-white/50" : "text-white/20"}`}>
                      {STATUS_MESSAGES[status]}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <p className="text-white/30 text-xs text-center">
                WizLumina™ and WizSound™ are working on your video. You can close this tab — we'll notify you when it's ready.
              </p>
            </div>
          </div>
        )}

        {/* Step 4: Complete */}
        {step === "complete" && (
          <div className="studio-card p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-white font-bold text-lg">Enhancement Complete</h2>
                <p className="text-white/40 text-sm">Your video is ready to download</p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[--color-gold]/[0.06] border border-[--color-gold]/20 mb-6">
              <p className="text-[--color-gold] text-xs font-semibold uppercase tracking-widest mb-3">Applied Enhancements</p>
              <div className="space-y-2">
                {["WizLumina™ colour grade applied", "WizSound™ audio mastered", `${selectedStyleData?.label} style processed`].map(item => (
                  <div key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[--color-gold]/70 flex-shrink-0" />
                    <span className="text-white/70 text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <Button
                onClick={() => handleDownload("16x9")}
                disabled={isDownloading}
                className="btn-primary btn-sheen rounded-xl font-bold"
              >
                <Download className="w-4 h-4 mr-2" />
                Download 16:9
              </Button>
              <Button
                onClick={() => handleDownload("9x16")}
                disabled={isDownloading}
                className="btn-primary btn-sheen rounded-xl font-bold"
              >
                <Download className="w-4 h-4 mr-2" />
                Download 9:16
              </Button>
            </div>

            <Button
              variant="outline"
              onClick={reset}
              className="w-full border-white/10 text-white/60 hover:text-white hover:border-white/20 rounded-xl"
            >
              Enhance Another Video
            </Button>

            {error && (
              <div className="mt-4 p-3 bg-red-900/20 border border-red-700/40 rounded-xl text-red-300 flex items-start gap-2 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}
      </div>
      <LandscapeHint />
    </div>
  );
}
