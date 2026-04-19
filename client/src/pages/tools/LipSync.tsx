import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Sparkles, Zap, Upload, Video, Mic, CheckCircle2, ExternalLink } from "@/lib/icons";
import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type Engine = "wizsync" | "wizavatar";

const ENGINE_INFO: Record<Engine, { label: string; badge: string; description: string; inputLabel: string; inputHint: string; accepts: string; creditCost: number }> = {
  wizsync: {
    label: "WizSync™ Lip-Sync",
    badge: "Recommended",
    description: "Audio-driven lip-sync powered by WizSync™. Upload a video with a visible face and any audio track — the face is animated to match the audio in real time.",
    inputLabel: "Source Video",
    inputHint: "MP4, MOV, WebM with a clear face visible — up to 100MB",
    accepts: "video/*",
    creditCost: 75,
  },
  wizavatar: {
    label: "WizSync™ Avatar",
    badge: "Avatar-based",
    description: "Generate a talking avatar video powered by WizSync™. Provide a script and WizSync™ will render a photorealistic avatar speaking your text.",
    inputLabel: "Avatar Image",
    inputHint: "PNG, JPG portrait — up to 10MB",
    accepts: "image/*",
    creditCost: 75,
  },
};

export default function LipSync() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const [engine, setEngine] = useState<Engine>("wizsync");
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [generating, setGenerating] = useState(false);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const sourceInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const info = ENGINE_INFO[engine];

  const uploadFileMutation = trpc.video.getUploadUrl.useMutation();
  const generateMutation = trpc.video.generate.useMutation({
    onSuccess: (data: { projectId: number; taskId: string; status: string; creditCost: number }) => {
      setProjectId(data.projectId);
      toast.success("Lip-sync job started! Polling for results…");
      pollStatus(data.projectId);
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message || "Generation failed");
      setGenerating(false);
    },
  });

  const statusQuery = trpc.video.getStatus.useQuery(
    { projectId: projectId! },
    { enabled: false }
  );

  const pollStatus = (pid: number) => {
    let attempts = 0;
    let backoffMs = 10000; // Start at 10s, back off on 429
    let timeoutId: ReturnType<typeof setTimeout>;

    const poll = async () => {
      attempts++;
      try {
        const result = await statusQuery.refetch();
        const data = result.data;
        if (data?.status === "completed" && data.videoUrl) {
          setResultUrl(data.videoUrl);
          setGenerating(false);
          toast.success("Lip-sync complete!");
          return;
        } else if (data?.status === "failed") {
          setGenerating(false);
          toast.error("Generation failed. Please try again.");
          return;
        } else if (attempts > 60) {
          setGenerating(false);
          toast.error("Timed out waiting for result.");
          return;
        }
        // Reset backoff on success
        backoffMs = 10000;
      } catch (err: any) {
        // On 429, back off exponentially (max 60s)
        if (err?.data?.httpStatus === 429 || err?.message?.includes("429")) {
          backoffMs = Math.min(backoffMs * 2, 60000);
          console.warn(`[LipSync] Rate limited, backing off to ${backoffMs}ms`);
        }
        // keep polling
      }
      timeoutId = setTimeout(poll, backoffMs);
    };

    timeoutId = setTimeout(poll, backoffMs);
    // Return cleanup
    return () => clearTimeout(timeoutId);
  };

  const handleGenerate = async () => {
    if (!sourceFile || !audioFile) {
      toast.error("Please upload both files before generating.");
      return;
    }
    if (!isAuthenticated) {
      toast.error("Please sign in to generate videos.");
      return;
    }

    setGenerating(true);
    setResultUrl(null);

    try {
      // Upload source file via server-side proxy
      const sourceUpload = await uploadFileMutation.mutateAsync({ fileName: sourceFile.name, fileType: sourceFile.type });
      const sourceFormData = new FormData();
      sourceFormData.append("file", sourceFile);
      const sourceRes = await fetch(sourceUpload.uploadUrl, { method: "POST", body: sourceFormData });
      if (!sourceRes.ok) throw new Error("Source file upload failed");
      const sourceData = await sourceRes.json();
      const resolvedSourceUrl = sourceData.url || sourceUpload.fileUrl;

      // Upload audio file via server-side proxy
      const audioUpload = await uploadFileMutation.mutateAsync({ fileName: audioFile.name, fileType: audioFile.type });
      const audioFormData = new FormData();
      audioFormData.append("file", audioFile);
      const audioRes = await fetch(audioUpload.uploadUrl, { method: "POST", body: audioFormData });
      if (!audioRes.ok) throw new Error("Audio file upload failed");
      const audioData = await audioRes.json();
      const resolvedAudioUrl = audioData.url || audioUpload.fileUrl;

      // Submit generation job
      if (engine === "wizsync") {
        await generateMutation.mutateAsync({
          toolType: "musetalk_lip_sync",
          prompt: "Lip-sync the face in the video to the provided audio",
          videoUrl: resolvedSourceUrl,
          audioUrl: resolvedAudioUrl,
        });
      } else {
        await generateMutation.mutateAsync({
          toolType: "lip_sync",
          prompt: "Generate talking avatar",
          imageUrl: resolvedSourceUrl,
          audioUrl: resolvedAudioUrl,
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      toast.error(message);
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/40">
        <div className="container flex h-16 items-center justify-between">
          <a href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back
          </a>
          <h1 className="text-xl font-bold">Lip-Sync & Talking Avatar</h1>
          <div className="w-20" />
        </div>
      </div>

      <div className="container py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Input Section */}
          <div className="lg:col-span-2 space-y-6">

            {/* Engine Selector */}
            <Card className="border-border/40 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-accent" />
                  Lip-Sync Engine
                </CardTitle>
                <CardDescription>Choose the AI engine for your lip-sync</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {(Object.entries(ENGINE_INFO) as [Engine, typeof ENGINE_INFO[Engine]][]).map(([key, eng]) => (
                    <button
                      key={key}
                      onClick={() => { setEngine(key); setSourceFile(null); setAudioFile(null); setResultUrl(null); }}
                      className={`relative rounded-xl border-2 p-4 text-left transition-all ${
                        engine === key
                          ? "border-accent bg-accent/10"
                          : "border-border/40 bg-card/30 hover:border-accent/40"
                      }`}
                    >
                      {engine === key && (
                        <CheckCircle2 className="absolute top-3 right-3 h-4 w-4 text-accent" />
                      )}
                      <div className="flex items-center gap-2 mb-1">
                        {key === "wizsync" ? <Video className="h-4 w-4 text-accent" /> : <Mic className="h-4 w-4 text-[--color-gold]" />}
                        <span className="font-semibold text-sm text-foreground">{eng.label}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs mb-2">{eng.badge}</Badge>
                      <p className="text-xs text-muted-foreground leading-relaxed">{eng.description}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Source File Upload */}
            <Card className="border-border/40 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle>Upload {info.inputLabel}</CardTitle>
                <CardDescription>{info.inputHint}</CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className="border-2 border-dashed border-border/40 rounded-lg p-8 text-center hover:border-accent/50 transition-colors cursor-pointer"
                  onClick={() => sourceInputRef.current?.click()}
                >
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="font-medium text-foreground">Drop {info.inputLabel.toLowerCase()} here or click to upload</p>
                  <p className="text-xs text-muted-foreground mt-1">{info.inputHint}</p>
                  <input
                    ref={sourceInputRef}
                    type="file"
                    accept={info.accepts}
                    className="hidden"
                    onChange={(e) => setSourceFile(e.target.files?.[0] || null)}
                  />
                </div>
                {sourceFile && (
                  <p className="text-sm text-accent mt-3">✓ {sourceFile.name}</p>
                )}
              </CardContent>
            </Card>

            {/* Audio Upload */}
            <Card className="border-border/40 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle>Upload Audio</CardTitle>
                <CardDescription>The audio track to lip-sync to — MP3, WAV, M4A up to 50MB</CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className="border-2 border-dashed border-border/40 rounded-lg p-8 text-center hover:border-accent/50 transition-colors cursor-pointer"
                  onClick={() => audioInputRef.current?.click()}
                >
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="font-medium text-foreground">Drop audio here or click to upload</p>
                  <p className="text-xs text-muted-foreground mt-1">MP3, WAV, M4A up to 50MB</p>
                  <input
                    ref={audioInputRef}
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                  />
                </div>
                {audioFile && (
                  <p className="text-sm text-accent mt-3">✓ {audioFile.name}</p>
                )}
              </CardContent>
            </Card>

            {/* Result */}
            {resultUrl && (
              <Card className="border-accent/40 bg-accent/5 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-accent">
                    <CheckCircle2 className="h-5 w-5" />
                    Lip-Sync Complete
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <video
                    src={resultUrl}
                    controls
                    autoPlay
                    muted
                    playsInline
                    className="w-full rounded-lg"
                  />
                  <Button variant="outline" className="w-full gap-2" asChild>
                    <a href={resultUrl} download target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      Download Video
                    </a>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="border-border/40 bg-accent/5 backdrop-blur sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-accent" />
                  Estimated Cost
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-3xl font-bold text-foreground">{info.creditCost}</p>
                  <p className="text-sm text-muted-foreground">credits</p>
                </div>
                <Button
                  className="w-full gap-2 mt-4"
                  onClick={handleGenerate}
                  disabled={!sourceFile || !audioFile || generating}
                >
                  <Sparkles className="h-4 w-4" />
                  {generating ? "Processing…" : "Create Lip-Sync"}
                </Button>
                {generating && (
                  <p className="text-xs text-muted-foreground text-center animate-pulse">
                    This typically takes 30–90 seconds…
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/40 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-sm">Requirements</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2">
                {engine === "wizsync" ? (
                  <>
                    <p>✓ Clear face visible in video</p>
                    <p>✓ Face should be mostly front-facing</p>
                    <p>✓ Good lighting preferred</p>
                    <p>✓ Audio with clear speech or music</p>
                    <p>✓ Minimum 2 seconds audio</p>
                  </>
                ) : (
                  <>
                    <p>✓ Clear face visible in image</p>
                    <p>✓ Good lighting preferred</p>
                    <p>✓ Audio with clear speech</p>
                    <p>✓ Minimum 2 seconds audio</p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
