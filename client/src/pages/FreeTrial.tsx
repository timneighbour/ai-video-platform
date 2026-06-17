/**
 * Free Trial Page — /free-trial
 *
 * Lets any logged-in user (no subscription required) create one 30-second
 * watermarked music video for free.  After seeing their own music in the
 * output the upgrade CTA is obvious.
 *
 * Flow:
 *  1. User uploads their track (≤ 16 MB)
 *  2. They enter a theme prompt
 *  3. createJob is called with isFreeTrial: true
 *     → server trims audio to 30s, bypasses credit/plan gates, applies watermark
 *  4. Result screen shows the video + "Remove watermark & get full video" CTA
 */
import { useState, useRef } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useSEO } from "@/hooks/useSEO";

const GOLD = "#e8c97a";
const MAX_FILE_MB = 16;

export default function FreeTrial() {
  useSEO({
    title: "Free Trial — Create Your First AI Music Video | WIZ AI",
    path: "/free-trial",
    description: "Try WIZ AI free. Upload your track and get a 30-second AI music video — no credit card required. One free render per account.",
  });

  const { user, isLoading: authLoading } = useAuth();
  const { data: me } = trpc.auth.me.useQuery(undefined, { enabled: !!user });

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [themePrompt, setThemePrompt] = useState("");
  const [jobId, setJobId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createJob = trpc.musicVideo.job.createJob.useMutation({
    onSuccess: (data: { jobId: number }) => {
      setJobId(data.jobId);
    },
    onError: (err: { message: string }) => {
      if (err.message.includes("FREE_TRIAL_USED")) {
        setError("You have already used your free trial. Upgrade to a paid plan to create more videos.");
      } else {
        setError(err.message);
      }
    },
  });

  // Poll job status once we have a jobId
  const { data: jobStatus } = trpc.musicVideo.job.getJob.useQuery(
    { jobId: jobId! },
    {
      enabled: !!jobId,
      refetchInterval: (data: { job?: { status?: string } } | undefined) => {
        if (!data) return 5000;
        const status = data?.job?.status;
        if (status === "completed" || status === "failed") return false;
        return 5000;
      },
    }
  );

  const handleFile = (file: File) => {
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`File too large. Maximum size is ${MAX_FILE_MB} MB.`);
      return;
    }
    setError(null);
    setAudioFile(file);

    // Get duration
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audio.addEventListener("loadedmetadata", () => {
      setAudioDuration(Math.ceil(audio.duration));
      URL.revokeObjectURL(url);
    });

    // Convert to base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      // Strip the data URL prefix
      setAudioBase64(result.split(",")[1]);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleSubmit = () => {
    if (!audioBase64 || !themePrompt.trim()) return;
    setError(null);
    createJob.mutate({
      title: audioFile?.name?.replace(/\.[^.]+$/, "") ?? "Free Trial Video",
      audioBase64,
      audioMimeType: (audioFile?.type as any) ?? "audio/mpeg",
      audioDuration: audioDuration || 30,
      themePrompt: themePrompt.trim(),
      isFreeTrial: true,
    });
  };

  const status = (jobStatus as any)?.job?.status;
  const finalVideoUrl = (jobStatus as any)?.job?.finalVideoUrl;
  const isCompleted = status === "completed" && finalVideoUrl;
  const isFailed = status === "failed";
  const isProcessing = !!jobId && !isCompleted && !isFailed;

  const progressValue = (() => {
    if (!jobId) return 0;
    if (isCompleted) return 100;
    const scenes = (jobStatus as any)?.scenes ?? [];
    const completedScenes = scenes.filter((s: any) => s.status === "completed").length;
    const totalScenes = scenes.length || 1;
    return Math.min(90, Math.round((completedScenes / totalScenes) * 85) + 5);
  })();

  // ── Not logged in ─────────────────────────────────────────────────────────
  if (!authLoading && !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-20 bg-[#0a0a0a]">
        <div className="max-w-md w-full text-center space-y-6">
          <h1 className="text-3xl font-bold text-white">Try WIZ AI Free</h1>
          <p className="text-white/60">Sign in to create your free 30-second AI music video — no credit card required.</p>
          <a href={getLoginUrl("/free-trial")} className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-sm"
            style={{ background: "linear-gradient(135deg, #c4a464, #e8c97a)", color: "#0a0a0a" }}>
            Sign In to Start Free Trial
          </a>
        </div>
      </div>
    );
  }

  // ── Already used free trial ───────────────────────────────────────────────
  if (me?.freeTrialUsed && !jobId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-20 bg-[#0a0a0a]">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="text-5xl">🎬</div>
          <h1 className="text-3xl font-bold text-white">You've Already Used Your Free Trial</h1>
          <p className="text-white/60">Your free trial render has been used. Upgrade to a paid plan to create unlimited videos — starting at £29/month.</p>
          <Link href="/subscribe">
            <Button className="px-8 py-3.5 text-sm font-semibold rounded-xl"
              style={{ background: "linear-gradient(135deg, #c4a464, #e8c97a)", color: "#0a0a0a" }}>
              View Plans from £29/month
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // ── Result screen ─────────────────────────────────────────────────────────
  if (isCompleted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-20 bg-[#0a0a0a]">
        <div className="max-w-2xl w-full space-y-8">
          <div className="text-center space-y-2">
            <div className="text-4xl">🎉</div>
            <h1 className="text-3xl font-bold text-white">Your Free Trial Video is Ready</h1>
            <p className="text-white/50 text-sm">This is a 30-second watermarked preview. Upgrade to get the full video in 4K with no watermark.</p>
          </div>

          <div className="rounded-2xl overflow-hidden border border-white/10 bg-black">
            <video
              src={finalVideoUrl}
              controls
              className="w-full"
              style={{ maxHeight: "420px" }}
            />
          </div>

          {/* Upgrade CTA */}
          <div className="rounded-2xl border p-6 text-center space-y-4"
            style={{ borderColor: `${GOLD}40`, background: `${GOLD}08` }}>
            <h2 className="text-xl font-bold" style={{ color: GOLD }}>Remove Watermark &amp; Get the Full Video</h2>
            <p className="text-white/60 text-sm">
              Upgrade to a paid plan to get the complete video at full length, in 4K, with no watermark — and unlimited future renders.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/subscribe">
                <Button className="px-8 py-3 text-sm font-semibold rounded-xl w-full sm:w-auto"
                  style={{ background: "linear-gradient(135deg, #c4a464, #e8c97a)", color: "#0a0a0a" }}>
                  Upgrade — from £29/month
                </Button>
              </Link>
              <a href={finalVideoUrl} download className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-medium border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-colors">
                Download Preview
              </a>
            </div>
            <p className="text-white/30 text-xs">No credit card required to sign up · Cancel anytime</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Processing screen ─────────────────────────────────────────────────────
  if (isProcessing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-20 bg-[#0a0a0a]">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="text-5xl animate-pulse">🎬</div>
          <h1 className="text-2xl font-bold text-white">Creating Your Video…</h1>
          <p className="text-white/50 text-sm">
            {status === "draft" && "Analysing your track and building the storyboard…"}
            {status === "storyboard_ready" && "Storyboard ready — generating scenes…"}
            {status === "rendering" && "Rendering your scenes with AI…"}
            {status === "assembling" && "Assembling the final video…"}
            {!["draft","storyboard_ready","rendering","assembling"].includes(status ?? "") && "Working on your video…"}
          </p>
          <Progress value={progressValue} className="h-1.5" />
          <p className="text-white/30 text-xs">This usually takes 3–8 minutes. You can leave this page and come back.</p>
          {isFailed && (
            <p className="text-red-400 text-sm">Something went wrong. Please try again.</p>
          )}
        </div>
      </div>
    );
  }

  // ── Upload form ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-20 bg-[#0a0a0a]">
      <div className="max-w-xl w-full space-y-8">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-widest uppercase border"
            style={{ borderColor: `${GOLD}50`, color: GOLD, background: `${GOLD}10` }}>
            Free Trial
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white">Hear Your Music in a Video</h1>
          <p className="text-white/50 text-sm leading-relaxed">
            Upload your track. We'll create a 30-second AI music video — no credit card required.
            One free render per account.
          </p>
        </div>

        {/* Audio upload */}
        <div
          className={`relative rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all ${dragOver ? "border-[#e8c97a] bg-[#e8c97a08]" : "border-white/15 hover:border-white/30"}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          {audioFile ? (
            <div className="space-y-2">
              <div className="text-3xl">🎵</div>
              <p className="text-white font-medium">{audioFile.name}</p>
              <p className="text-white/40 text-xs">{audioDuration > 0 ? `${audioDuration}s` : ""} · Will be trimmed to 30s</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-3xl text-white/20">🎵</div>
              <p className="text-white/60 font-medium">Drop your track here or click to browse</p>
              <p className="text-white/30 text-xs">MP3, WAV, M4A · Max 16 MB</p>
            </div>
          )}
        </div>

        {/* Theme prompt */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-white/70">Describe the visual style</label>
          <Textarea
            value={themePrompt}
            onChange={(e) => setThemePrompt(e.target.value)}
            placeholder="e.g. Cinematic night city, neon lights, slow motion rain, moody atmosphere"
            className="bg-white/5 border-white/10 text-white placeholder:text-white/25 resize-none h-24 rounded-xl"
            maxLength={500}
          />
          <p className="text-white/25 text-xs text-right">{themePrompt.length}/500</p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <Button
          onClick={handleSubmit}
          disabled={!audioBase64 || !themePrompt.trim() || createJob.isPending}
          className="w-full py-4 text-sm font-semibold rounded-xl"
          style={{ background: audioBase64 && themePrompt.trim() ? "linear-gradient(135deg, #c4a464, #e8c97a)" : undefined, color: "#0a0a0a" }}
        >
          {createJob.isPending ? "Starting your render…" : "Create My Free Video →"}
        </Button>

        <p className="text-center text-white/25 text-xs">
          Output is watermarked and 30 seconds. Upgrade to remove the watermark and get the full video.
        </p>
      </div>
    </div>
  );
}
