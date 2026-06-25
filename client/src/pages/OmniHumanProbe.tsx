import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, CheckCircle2, XCircle, Clock, Video } from "lucide-react";
import { toast } from "sonner";

type GenStatus = "idle" | "submitting" | "polling" | "done" | "failed";
const DEFAULT_IMAGE = "https://raw.githubusercontent.com/aimlapi/api-docs/main/reference-files/mona_lisa_extended.jpg";
const DEFAULT_AUDIO = "https://storage.googleapis.com/falserverless/example_inputs/omnihuman_audio.mp3";

export default function OmniHumanProbe() {
  const [imageUrl, setImageUrl] = useState(DEFAULT_IMAGE);
  const [audioUrl, setAudioUrl] = useState(DEFAULT_AUDIO);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [status, setStatus] = useState<GenStatus>("idle");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [pollCount, setPollCount] = useState(0);
  const startRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const submitMutation = trpc.omniHuman.submit.useMutation({
    onSuccess: (data) => { setGenerationId(data.generationId); setStatus("polling"); startRef.current = Date.now(); setElapsed(0); setPollCount(0); toast.success("Task submitted — polling..."); },
    onError: (err) => { setStatus("failed"); setErrorMsg(err.message); toast.error(`Failed: ${err.message}`); },
  });

  const pollQuery = trpc.omniHuman.poll.useQuery(
    { generationId: generationId ?? "" },
    { enabled: status === "polling" && !!generationId, refetchInterval: status === "polling" ? 10_000 : false, refetchIntervalInBackground: true }
  );

  useEffect(() => {
    if (!pollQuery.data || status !== "polling") return;
    const { status: ts, videoUrl: tv, errorMessage: te } = pollQuery.data;
    setPollCount((c) => c + 1);
    if (ts === "done" && tv) { setStatus("done"); setVideoUrl(tv); toast.success("Video generated!"); }
    else if (ts === "failed") { setStatus("failed"); setErrorMsg(te ?? "Failed"); toast.error(`Failed: ${te ?? "unknown"}`); }
  }, [pollQuery.data, status]);

  useEffect(() => {
    if (status === "polling" || status === "submitting") {
      timerRef.current = setInterval(() => { if (startRef.current) setElapsed(Math.floor((Date.now() - startRef.current) / 1000)); }, 1000);
    } else { if (timerRef.current) clearInterval(timerRef.current); }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [status]);

  const handleSubmit = () => {
    if (!imageUrl.trim() || !audioUrl.trim()) { toast.error("Both URLs required"); return; }
    setStatus("submitting"); setVideoUrl(null); setErrorMsg(null); setGenerationId(null); startRef.current = Date.now();
    submitMutation.mutate({ imageUrl: imageUrl.trim(), audioUrl: audioUrl.trim() });
  };
  const handleReset = () => { setStatus("idle"); setVideoUrl(null); setErrorMsg(null); setGenerationId(null); setElapsed(0); setPollCount(0); startRef.current = null; };
  const isRunning = status === "submitting" || status === "polling";

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-foreground">WIZ Avatar Probe</h1><p className="text-sm text-muted-foreground mt-1">Internal test — OmniHuman 1.5 via AI/ML API</p></div>
          {status === "idle" && <Badge variant="secondary">Ready</Badge>}
          {status === "submitting" && <Badge className="bg-blue-500 text-white">Submitting...</Badge>}
          {status === "polling" && <Badge className="bg-amber-500 text-white animate-pulse">Generating...</Badge>}
          {status === "done" && <Badge className="bg-green-500 text-white">Complete</Badge>}
          {status === "failed" && <Badge variant="destructive">Failed</Badge>}
        </div>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Play className="h-4 w-4" /> Generate Avatar Video</CardTitle><CardDescription>Portrait image + audio (max 30s) → lip-synced avatar video</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label htmlFor="img">Character Image URL</Label><Input id="img" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} disabled={isRunning} className="font-mono text-sm" /><p className="text-xs text-muted-foreground">JPG/PNG, publicly accessible, face clearly visible</p></div>
            <div className="space-y-2"><Label htmlFor="aud">Audio URL</Label><Input id="aud" value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)} disabled={isRunning} className="font-mono text-sm" /><p className="text-xs text-muted-foreground">MP3/WAV, publicly accessible, under 30 seconds</p></div>
            <div className="flex gap-3 pt-2">
              <Button onClick={handleSubmit} disabled={isRunning} className="flex-1">{isRunning ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{status === "submitting" ? "Submitting..." : "Generating..."}</> : <><Play className="h-4 w-4 mr-2" />Generate Video</>}</Button>
              {(status === "done" || status === "failed") && <Button variant="outline" onClick={handleReset}>Reset</Button>}
            </div>
          </CardContent>
        </Card>
        {(isRunning || status === "done" || status === "failed") && (
          <Card><CardHeader><CardTitle className="text-base">Generation Status</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {generationId && <div className="flex items-center gap-2 text-sm"><span className="text-muted-foreground">ID:</span><code className="text-xs bg-muted px-2 py-1 rounded font-mono break-all">{generationId}</code></div>}
              {(isRunning || status === "done") && <div className="flex items-center gap-4 text-sm"><div className="flex items-center gap-1.5 text-muted-foreground"><Clock className="h-3.5 w-3.5" /><span>{elapsed}s elapsed</span></div>{pollCount > 0 && <div className="text-muted-foreground">{pollCount} poll{pollCount !== 1 ? "s" : ""}</div>}</div>}
              {status === "polling" && <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm"><Loader2 className="h-4 w-4 animate-spin" /><span>Generating — typically 2–5 minutes...</span></div>}
              {status === "done" && <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm"><CheckCircle2 className="h-4 w-4" /><span>Completed in {elapsed}s</span></div>}
              {status === "failed" && <div className="flex items-center gap-2 text-destructive text-sm"><XCircle className="h-4 w-4" /><span>{errorMsg ?? "Generation failed"}</span></div>}
            </CardContent>
          </Card>
        )}
        {status === "done" && videoUrl && (
          <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Video className="h-4 w-4 text-green-500" />Generated Video</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg overflow-hidden bg-black aspect-video"><video src={videoUrl} controls autoPlay loop className="w-full h-full object-contain" /></div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => window.open(videoUrl, "_blank")} className="flex-1">Open in New Tab</Button>
                <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(videoUrl); toast.success("URL copied"); }} className="flex-1">Copy URL</Button>
              </div>
              <code className="text-xs text-muted-foreground break-all block">{videoUrl}</code>
            </CardContent>
          </Card>
        )}
        <Card className="border-dashed"><CardContent className="pt-4"><div className="grid grid-cols-2 gap-4 text-sm">
          <div><p className="text-muted-foreground font-medium mb-1">Provider</p><p>AI/ML API — bytedance/omnihuman</p></div>
          <div><p className="text-muted-foreground font-medium mb-1">Pricing</p><p>~$0.156 / second of output</p></div>
          <div><p className="text-muted-foreground font-medium mb-1">Audio limit</p><p>30 seconds per request</p></div>
          <div><p className="text-muted-foreground font-medium mb-1">Aspect ratio</p><p>16:9 (cinematic)</p></div>
        </div></CardContent></Card>
      </div>
    </div>
  );
}
