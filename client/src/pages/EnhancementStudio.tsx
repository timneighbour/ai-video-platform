/**
 * AI Video Enhancement Studio - Phase 1 MVP
 * Simple 5-step flow: Upload → Style → Generate → Progress → Download
 */

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { analytics } from "@/lib/analytics";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Upload, CheckCircle2, Loader2, Download } from "@/lib/icons";
import BackButton from "@/components/BackButton";
import { useSEO } from "@/hooks/useSEO";

type Step = "upload" | "style" | "generate" | "processing" | "complete";

const STYLES = [
  { value: "cinematic", label: "Cinematic" },
  { value: "emotional", label: "Emotional" },
  { value: "upbeat", label: "Upbeat" },
  { value: "documentary", label: "Documentary" },
];

const STATUS_MESSAGES: Record<string, string> = {
  analyzing: "🔍 Analysing video...",
  generating: "– Generating music...",
  editing: "✂️ Editing video...",
  rendering: "– Building Your Video...",
  completed: "– Complete!",
  failed: "❌ Failed",
};

export default function EnhancementStudio() {

  useSEO({ title: "AI Video Enhancement Studio — WIZ AI", path: "/enhancement-studio", description: "Enhance any video with AI. Upscale resolution, improve lighting, add cinematic colour grading with WizLumina™, and master audio with WizSound™." });
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [step, setStep] = useState<Step>("upload");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [selectedStyle, setSelectedStyle] = useState<string>("cinematic");
  const [jobId, setJobId] = useState<number | null>(null);
  const [jobStatus, setJobStatus] = useState<string>("pending");
  const [error, setError] = useState<string>("");
  const [isDownloading, setIsDownloading] = useState(false);

  // tRPC hooks
  const createJobMutation = trpc.enhancement.createJob.useMutation();
  const getJobQuery = trpc.enhancement.getJob.useQuery(
    { jobId: jobId || 0 },
    { enabled: !!jobId && step === "processing", refetchInterval: 2000 }
  );

  // Update job status from query
  useEffect(() => {
    if (getJobQuery.data && step === "processing") {
      setJobStatus(getJobQuery.data.status);
      if (getJobQuery.data.status === "completed") {
        setStep("complete");
      } else if (getJobQuery.data.status === "failed") {
        setError(getJobQuery.data.errorMessage || "Processing failed");
        setStep("style");
      }
    }
  }, [getJobQuery.data, step]);

  // Handle video upload
  const handleVideoUpload = async (file: File) => {
    if (!file.type.startsWith("video/")) {
      setError("Please upload a valid video file");
      return;
    }

    if (file.size > 500 * 1024 * 1024) {
      setError("Video file must be under 500MB");
      return;
    }

    // Get video duration
    const video = document.createElement("video");
    video.onloadedmetadata = () => {
      const duration = Math.floor(video.duration);
      if (duration > 180) {
        setError("Video must be under 3 minutes");
        return;
      }
      setVideoDuration(duration);
      setVideoFile(file);
      setError("");
      setStep("style");
    };
    video.src = URL.createObjectURL(file);
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleVideoUpload(files[0]);
    }
  };

  // Handle generate
  const handleGenerate = async () => {
    if (!videoFile || !user) return;

    analytics.generateVideoClicked("enhancement_studio");
    setStep("processing");
    setError("");

    try {
      // For now, create a mock URL (in production, upload to S3)
      const videoUrl = URL.createObjectURL(videoFile);
      const videoKey = `enhancement/${user.id}/${Date.now()}-${videoFile.name}`;

      // Create enhancement job
      const result = await createJobMutation.mutateAsync({
        title: videoFile.name.replace(/\.[^/.]+$/, ""),
        videoUrl,
        videoKey,
        videoDuration,
        videoSize: videoFile.size,
        style: selectedStyle as any,
        musicEnabled: true,
        captionsEnabled: true,
      });

      setJobId(result.jobId);
      setJobStatus("analyzing");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create job");
      setStep("style");
    }
  };

  // Handle download
  const handleDownload = async (format: "16x9" | "9x16") => {
    if (!jobId) return;

    setIsDownloading(true);
    try {
      // Use the client to fetch the download URL
      // For now, mock the download URL
      // In production, this would call the actual endpoint
      const result = { url: URL.createObjectURL(videoFile || new Blob()) };

      // Trigger download
      const a = document.createElement("a");
      a.href = result.url;
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <BackButton fallback="/dashboard" label="Back to Dashboard" />
          <h1 className="text-4xl font-bold text-white mb-2 mt-3">Video Enhancement Studio</h1>
          <p className="text-slate-300">Transform your videos with AI-powered music and editing</p>
        </div>

        {/* Step 1: Upload */}
        {step === "upload" && (
          <Card className="border-slate-700 bg-slate-800">
            <CardHeader>
              <CardTitle>Step 1: Upload Video</CardTitle>
              <CardDescription>Drag and drop or click to select (max 3 minutes)</CardDescription>
            </CardHeader>
            <CardContent>
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-600 rounded-lg p-12 text-center cursor-pointer hover:border-[--color-gold]/40 transition"
              >
                <Upload className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                <p className="text-white font-semibold mb-2">Drop your video here</p>
                <p className="text-slate-400 text-sm">or click to browse</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={(e) => e.target.files?.[0] && handleVideoUpload(e.target.files[0])}
                className="hidden"
              />
              {error && (
                <div className="mt-4 p-3 bg-red-900/20 border border-red-700 rounded text-red-300 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Style Selection */}
        {step === "style" && (
          <Card className="border-slate-700 bg-slate-800">
            <CardHeader>
              <CardTitle>Step 2: Select Style</CardTitle>
              <CardDescription>
                {videoFile?.name} • {videoDuration}s
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedStyle} onValueChange={setSelectedStyle}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  {STYLES.map((style) => (
                    <SelectItem key={style.value} value={style.value} className="text-white">
                      {style.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep("upload");
                    setVideoFile(null);
                    setError("");
                  }}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={createJobMutation.isPending}
                  className="flex-1 bg-[--color-gold] hover:bg-[--color-gold]/20"
                >
                  {createJobMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Generate Video"
                  )}
                </Button>
              </div>

              {error && (
                <div className="p-3 bg-red-900/20 border border-red-700 rounded text-red-300 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 3: Processing */}
        {step === "processing" && (
          <Card className="border-slate-700 bg-slate-800">
            <CardHeader>
              <CardTitle>Processing Your Video</CardTitle>
              <CardDescription>This may take a few minutes...</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                {["analyzing", "generating", "editing", "rendering"].map((status) => (
                  <div key={status} className="flex items-center gap-3">
                    {jobStatus === status ? (
                      <Loader2 className="w-5 h-5 text-[--color-gold] animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-slate-500" />
                    )}
                    <span className="text-slate-300">{STATUS_MESSAGES[status]}</span>
                  </div>
                ))}
              </div>

              <div className="bg-slate-700/50 rounded p-4">
                <p className="text-sm text-slate-400">
                  Current status: <span className="text-[--color-gold] font-semibold">{jobStatus}</span>
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Complete */}
        {step === "complete" && (
          <Card className="border-slate-700 bg-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
                Video Ready!
              </CardTitle>
              <CardDescription>Your enhanced video is ready to download</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => handleDownload("16x9")}
                  disabled={isDownloading}
                  className="bg-[--color-gold] hover:bg-[--color-gold]/20"
                >
                  <Download className="w-4 h-4 mr-2" />
                  16:9
                </Button>
                <Button
                  onClick={() => handleDownload("9x16")}
                  disabled={isDownloading}
                  className="bg-[--color-gold] hover:bg-[--color-gold]/20"
                >
                  <Download className="w-4 h-4 mr-2" />
                  9:16
                </Button>
              </div>

              <Button
                variant="outline"
                onClick={() => {
                  setStep("upload");
                  setVideoFile(null);
                  setJobId(null);
                  setError("");
                }}
                className="w-full"
              >
                Process Another Video
              </Button>

              {error && (
                <div className="p-3 bg-red-900/20 border border-red-700 rounded text-red-300 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
