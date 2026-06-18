/**
 * WizSync™ — Voice to Character Assignment System
 *
 * Flow:
 *  1. Upload audio track (or link from existing music video job)
 *  2. Click "Analyse" → AI speaker diarisation + WizGenesis™ stem separation
 *  3. Review detected voices and instrument stems
 *  4. Assign characters to speakers (auto-assigned, manual override available)
 *  5. Generate lip-sync video per character segment (Hedra — coming soon)
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { QuickTopUpModal } from "@/components/QuickTopUpModal";
import { useCreditGuard } from "@/hooks/useCreditGuard";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { NavLink } from "@/components/NavLink";
import BackButton from "@/components/BackButton";
import WizAudioPlayer from "@/components/WizAudioPlayer";
import StudioAmbientLight from "@/components/StudioAmbientLight";
import AnimatedEqualiser from "@/components/AnimatedEqualiser";
import StudioStageFlow, { type Stage as StageItem } from "@/components/StudioStageFlow";
import { useSEO } from "@/hooks/useSEO";
import { mp } from "@/lib/mixpanel";
import {
  Mic2, Upload, UploadCloud, Loader2, CheckCircle2, AlertCircle,
  Music2, Users, Layers, Zap, ChevronRight, RefreshCw,
  UserCircle2, Guitar, Drum, Piano, Radio, Volume2, Waves,
  ArrowRight, Sparkles, Clock, Play, Video, X, Download,
} from "@/lib/icons";

// ─── Types ────────────────────────────────────────────────────────────────────

type JobStatus = "pending" | "analysing" | "ready" | "error";

interface WizSyncJob {
  id: number;
  audioUrl: string;
  audioName: string | null;
  audioDuration: string | null;
  status: JobStatus;
  errorMessage: string | null;
  speakerCount: number | null;
  stems: Record<string, { url: string } | undefined> | null;
  utterances: unknown;
  createdAt: Date;
}

interface Speaker {
  id: number;
  speakerLabel: string;
  displayName: string | null;
  inferredGender: "male" | "female" | "unknown";
  totalDuration: string | null;
  assignedCharacterId: number | null;
  isManualOverride: boolean;
  instrumentRole: string | null;
}

interface Segment {
  id: number;
  wizSyncSpeakerId: number;
  startMs: number;
  endMs: number;
  text: string | null;
  confidence: string | null;
  lipSyncStatus: "pending" | "processing" | "done" | "error";
  previewStatus: "idle" | "generating" | "ready" | "error";
  previewVideoUrl: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDuration(sec: string | null): string {
  if (!sec) return "—";
  const n = parseFloat(sec);
  if (n < 60) return `${n.toFixed(1)}s`;
  const m = Math.floor(n / 60);
  const s = Math.round(n % 60);
  return `${m}m ${s}s`;
}

const STEM_ICONS: Record<string, React.ReactNode> = {
  vocals: <Mic2 className="w-4 h-4" />,
  drums: <Drum className="w-4 h-4" />,
  bass: <Waves className="w-4 h-4" />,
  guitar: <Guitar className="w-4 h-4" />,
  piano: <Piano className="w-4 h-4" />,
  other: <Radio className="w-4 h-4" />,
};

const STEM_LABELS: Record<string, string> = {
  vocals: "Vocals",
  drums: "Drums",
  bass: "Bass",
  guitar: "Guitar",
  piano: "Piano / Keys",
  other: "Other Instruments",
};

const GENDER_COLORS: Record<string, string> = {
  male: "bg-[--color-gold]/15 text-[--color-gold] border-[--color-gold]/30",
  female: "bg-[--color-silver]/10 text-[--color-silver] border-[--color-silver]/30",
  unknown: "bg-muted/40 text-muted-foreground border-border/70/30",
};

const SPEAKER_COLORS = [
  "from-primary to-primary/40",
  "from-muted-foreground to-blue-700",
  "from-muted-foreground to-secondary",
  "from-primary to-orange-700",
  "from-muted-foreground to-teal-700",
  "from-red-600 to-secondary",
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function SpeakerCard({
  speaker,
  segments,
  colorClass,
  onAssign,
}: {
  speaker: Speaker;
  segments: Segment[];
  colorClass: string;
  onAssign: (speakerId: number, gender: "male" | "female" | "unknown", name: string) => void;
}) {
  const speakerSegments = segments.filter((s) => s.wizSyncSpeakerId === speaker.id);
  const totalLines = speakerSegments.length;
  const sampleLines = speakerSegments.slice(0, 3);

  return (
    <div className="rounded-xl border border-white/8 bg-white/3 overflow-hidden">
      {/* Header */}
      <div className={`bg-gradient-to-r ${colorClass} p-4 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <UserCircle2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="font-semibold text-white text-sm">
              {speaker.displayName ?? `Speaker ${speaker.speakerLabel}`}
            </p>
            <p className="text-white/70 text-xs">
              {totalLines} segment{totalLines !== 1 ? "s" : ""} · {formatDuration(speaker.totalDuration)} total
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full border ${GENDER_COLORS[speaker.inferredGender]}`}>
            {speaker.inferredGender === "unknown" ? "Gender TBD" : speaker.inferredGender.charAt(0).toUpperCase() + speaker.inferredGender.slice(1)}
          </span>
        </div>
      </div>

      {/* Sample lines */}
      {sampleLines.length > 0 && (
        <div className="p-4 space-y-2">
          {sampleLines.map((seg) => (
            <div key={seg.id} className="flex items-start gap-2 text-xs text-muted-foreground">
              <span className="text-muted-foreground/50 font-mono shrink-0">{formatMs(seg.startMs)}</span>
              <span className="line-clamp-2">{seg.text ?? "(no transcript)"}</span>
            </div>
          ))}
          {totalLines > 3 && (
            <p className="text-xs text-muted-foreground/50">+{totalLines - 3} more segments</p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="px-4 pb-4 flex items-center gap-2">
        <select
          className="studio-input flex-1 rounded-lg px-3 py-1.5 text-sm text-white"
          value={speaker.inferredGender}
          onChange={(e) => onAssign(speaker.id, e.target.value as "male" | "female" | "unknown", speaker.displayName ?? `Speaker ${speaker.speakerLabel}`)}
        >
          <option value="unknown">Gender: Unknown</option>
          <option value="male">Male Voice</option>
          <option value="female">Female Voice</option>
        </select>
        <Badge variant="outline" className="text-xs border-white/10 text-muted-foreground/70 shrink-0">
          {speaker.isManualOverride ? "Manual" : "Auto"}
        </Badge>
      </div>
    </div>
  );
}

function StemCard({ stemKey, stemData }: { stemKey: string; stemData: { url: string } | undefined }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play(); setPlaying(true); }
  };

  return (
    <div className="rounded-xl border border-white/8 bg-white/3 p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-full bg-white/8 flex items-center justify-center text-muted-foreground">
        {STEM_ICONS[stemKey] ?? <Volume2 className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">{STEM_LABELS[stemKey] ?? stemKey}</p>
        {stemData ? (
          <p className="text-xs text-muted-foreground/70 truncate">{stemData.url.split("/").pop()}</p>
        ) : (
          <p className="text-xs text-muted-foreground/50">Not detected</p>
        )}
      </div>
      {stemData && (
        <>
          <audio ref={audioRef} src={stemData.url} onEnded={() => setPlaying(false)} />
          <Button
            size="sm"
            variant="outline"
            className="border-white/10 text-white hover:bg-white/10 shrink-0"
            onClick={toggle}
          >
            {playing ? "Pause" : <><Play className="w-3 h-3 mr-1" />Play</>}
          </Button>
        </>
      )}
      {!stemData && (
        <Badge variant="outline" className="text-xs border-border text-muted-foreground/50 shrink-0">None</Badge>
      )}
    </div>
  );
}

// ─── SegmentPreviewPlayer ────────────────────────────────────────────────────
// Per-segment free 5-second preview. Calls generatePreview mutation and polls
// until the Atlas Cloud job is done, then shows an inline video player with
// a "WIZ AI PREVIEW" watermark overlay and a full-render upgrade CTA.

function SegmentPreviewPlayer({
  segment,
  speaker,
  onPreviewReady,
}: {
  segment: Segment;
  speaker: Speaker | undefined;
  onPreviewReady: (segmentId: number, url: string) => void;
}) {
  const [localStatus, setLocalStatus] = useState<"idle" | "generating" | "ready" | "error">(
    segment.previewStatus ?? "idle"
  );
  const [localUrl, setLocalUrl] = useState<string | null>(segment.previewVideoUrl ?? null);

  const generatePreview = trpc.wizSync.generatePreview.useMutation({
    onSuccess: (data) => {
      setLocalStatus(data.status);
      if (data.status === "ready" && data.previewVideoUrl) {
        setLocalUrl(data.previewVideoUrl);
        onPreviewReady(segment.id, data.previewVideoUrl);
      }
    },
    onError: (err) => {
      setLocalStatus("error");
      toast.error("Preview failed", { description: err.message });
    },
  });

  const pollQuery = trpc.wizSync.pollPreview.useQuery(
    { segmentId: segment.id },
    {
      enabled: localStatus === "generating",
      refetchInterval: localStatus === "generating" ? 3000 : false,
    }
  );

  useEffect(() => {
    if (!pollQuery.data) return;
    const { status, previewVideoUrl } = pollQuery.data;
    setLocalStatus(status);
    if (status === "ready" && previewVideoUrl) {
      setLocalUrl(previewVideoUrl);
      onPreviewReady(segment.id, previewVideoUrl);
    }
  }, [pollQuery.data]);

  const speakerName = speaker?.displayName ?? `Speaker ${speaker?.speakerLabel ?? "?"}`;

  return (
    <div className="mt-3 rounded-xl border border-[--color-gold]/20 bg-[--color-gold]/5 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 flex items-center justify-between border-b border-[--color-gold]/10">
        <div className="flex items-center gap-2">
          <Video className="w-4 h-4 text-[--color-gold]" />
          <span className="text-xs font-semibold text-[--color-gold]">5-Second Preview</span>
          <span className="text-xs text-muted-foreground/70">— Free, no credits</span>
        </div>
        {localStatus === "ready" && (
          <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs">Ready</Badge>
        )}
        {localStatus === "generating" && (
          <Badge className="bg-[--color-gold]/15 text-[--color-gold] border-[--color-gold]/30 text-xs">Generating…</Badge>
        )}
        {localStatus === "error" && (
          <Badge className="bg-red-500/15 text-red-400 border-red-500/30 text-xs">Error</Badge>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* Idle — show generate button */}
        {localStatus === "idle" && (
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Generate a free 5-second AI preview for <strong className="text-white">{speakerName}</strong> to see how lip-sync will look before committing Build Credits.
            </p>
            <Button
              size="sm"
              className="shrink-0 bg-gradient-to-r from-primary to-primary/40 hover:opacity-90 text-white font-semibold rounded-lg text-xs"
              onClick={() => {
                setLocalStatus("generating");
                generatePreview.mutate({ segmentId: segment.id });
              }}
              disabled={generatePreview.isPending}
            >
              <Play className="w-3 h-3 mr-1.5" />
              Preview (Free)
            </Button>
          </div>
        )}

        {/* Generating — spinner */}
        {localStatus === "generating" && (
          <div className="flex items-center gap-3 py-2">
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-full border border-[--color-gold]/30 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-[--color-gold] animate-spin" />
              </div>
              <div className="absolute inset-0 rounded-full border border-[--color-gold]/20 animate-ping" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Generating your 5-second preview…</p>
              <p className="text-xs text-muted-foreground/70 mt-0.5">This takes 20–60 seconds. You can continue working.</p>
            </div>
          </div>
        )}

        {/* Ready — inline video player with watermark */}
        {localStatus === "ready" && localUrl && (
          <div className="space-y-3">
            <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
              <video
                src={localUrl}
                controls
                autoPlay
                loop
                playsInline
                className="w-full h-full object-contain"
              />
              {/* WIZ AI PREVIEW watermark */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="px-4 py-2 rounded-lg bg-black/40 backdrop-blur-sm border border-[--color-gold]/30">
                  <span className="text-[--color-gold] font-black text-sm tracking-[0.25em] uppercase opacity-70">WIZ AI PREVIEW</span>
                </div>
              </div>
            </div>

            {/* Upgrade CTA */}
            <div className="rounded-lg border border-[--color-gold]/20 bg-gradient-to-r from-primary/10 to-primary/40/5 p-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-white">Like what you see?</p>
                <p className="text-xs text-muted-foreground mt-0.5">Generate the full lip-sync render — uses Build Credits from your plan.</p>
              </div>
              <Button
                size="sm"
                className="shrink-0 bg-gradient-to-r from-primary to-primary/40 hover:opacity-90 text-white font-semibold rounded-lg text-xs"
                onClick={() => toast.info("Full lip-sync render coming soon!", { description: "WizPerformer™ is in active development. Your segments are saved and ready." })}
              >
                <Zap className="w-3 h-3 mr-1.5" />
                Full Render
              </Button>
            </div>
          </div>
        )}

        {/* Error state */}
        {localStatus === "error" && (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-xs text-red-400">Preview generation failed. Please try again.</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-lg text-xs"
              onClick={() => {
                setLocalStatus("generating");
                generatePreview.mutate({ segmentId: segment.id });
              }}
              disabled={generatePreview.isPending}
            >
              <RefreshCw className="w-3 h-3 mr-1.5" />
              Retry
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WizSyncPage() {

  useSEO({ title: "WizSync™ — AI Voice to Character Assignment — WIZ AI", path: "/wizsync", description: "Automatically assign voices to characters in your AI video. WizSync™ analyses your audio and maps each voice to the right character for perfect lip-sync.", noindex: true });
  const { user, loading: authLoading } = useAuth();
  const { balance: creditBalance } = useCreditGuard();
  const [topUpOpen, setTopUpOpen] = useState(false);
  const WIZSYNC_CREDIT_COST = 5;
  // Studio entry tracking — fires once when an authenticated user lands on this page
  useEffect(() => { if (user) { mp.studioEntered("WizSync"); } }, [user]);

  // ── Upload state ──────────────────────────────────────────────────────────
  const [uploadedAudioUrl, setUploadedAudioUrl] = useState<string | null>(null);
  const [uploadedAudioName, setUploadedAudioName] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [ambience, setAmbience] = useState(65);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Analysis state ────────────────────────────────────────────────────────
  const [currentJobId, setCurrentJobId] = useState<number | null>(null);
  const [pollingEnabled, setPollingEnabled] = useState(false);
  const [jobData, setJobData] = useState<{
    job: WizSyncJob;
    speakers: Speaker[];
    segments: Segment[];
  } | null>(null);

  // ── Full render state ─────────────────────────────────────────────────────
  const [fullRenderStatus, setFullRenderStatus] = useState<"idle" | "rendering" | "completed" | "failed">("idle");
  const [fullRenderUrl, setFullRenderUrl] = useState<string | null>(null);
  const [fullRenderPolling, setFullRenderPolling] = useState(false);
  // ── Mutations ─────────────────────────────────────────────────────────────
  const uploadAudioMutation = trpc.musicVideo.uploadAudio.useMutation({
    onSuccess: (data) => {
      setUploadedAudioUrl(data.url);
      setIsUploadingFile(false);
      toast.success("Audio uploaded!", { description: "Click Analyse to detect voices and stems." });
    },
    onError: (err) => {
      toast.error("Upload failed", { description: err.message });
      setIsUploadingFile(false);
    },
  });

  const analyseAudioMutation = trpc.wizSync.analyseAudio.useMutation({
    onSuccess: (data) => {
      setCurrentJobId(data.jobId);
      setPollingEnabled(true);
      mp.generationStarted("WizSync", undefined, !!uploadedAudioUrl);
      toast.success("Analysis started!", { description: "Detecting voices and separating stems…" });
    },
    onError: (err) => {
      mp.generationFailed("WizSync", "analysis_failed");
      toast.error("Analysis failed", { description: err.message });
    },
  });

  const assignCharacterMutation = trpc.wizSync.assignCharacter.useMutation({
    onSuccess: () => {
      toast.success("Character assignment saved.");
    },
    onError: (err) => {
      toast.error("Assignment failed", { description: err.message });
    },
  });
  const fullRenderMutation = trpc.wizSync.fullRender.useMutation({
    onSuccess: () => {
      setFullRenderStatus("rendering");
      setFullRenderPolling(true);
      toast.success("Full render started!", { description: "Your video is being assembled. This may take a few minutes." });
    },
    onError: (err) => {
      setFullRenderStatus("failed");
      toast.error("Full render failed", { description: err.message });
    },
  });
  const pollFullRenderQuery = trpc.wizSync.pollFullRender.useQuery(
    { jobId: currentJobId! },
    {
      enabled: fullRenderPolling && currentJobId !== null,
      refetchInterval: fullRenderPolling ? 4000 : false,
    }
  );
  // Handle full render poll results
  useEffect(() => {
    if (!pollFullRenderQuery.data) return;
    const { fullRenderStatus: status, outputUrl } = pollFullRenderQuery.data;
    if (status === "completed" && outputUrl) {
      setFullRenderStatus("completed");
      setFullRenderUrl(outputUrl);
      setFullRenderPolling(false);
      toast.success("Full render complete!", { description: "Your video is ready to download." });
    } else if (status === "failed") {
      setFullRenderStatus("failed");
      setFullRenderPolling(false);
      toast.error("Full render failed", { description: "Please try again." });
    }
  }, [pollFullRenderQuery.data]);

  // ── Polling ───────────────────────────────────────────────────────────────
  const pollQuery = trpc.wizSync.pollAnalysis.useQuery(
    { jobId: currentJobId! },
    {
      enabled: pollingEnabled && currentJobId !== null,
      refetchInterval: (data) => {
        if (!data) return 3000;
        const status = (data as { job?: WizSyncJob })?.job?.status;
        if (status === "ready" || status === "error") return false;
        return 3000;
      },
    }
  );

  useEffect(() => {
    if (!pollQuery.data) return;
    const d = pollQuery.data as { job: WizSyncJob; speakers: Speaker[]; segments: Segment[] };
    setJobData(d);
    if (d.job.status === "ready") {
      setPollingEnabled(false);
      mp.generationCompleted("WizSync");
    } else if (d.job.status === "error") {
      setPollingEnabled(false);
      mp.generationFailed("WizSync", "analysis_failed");
    }
  }, [pollQuery.data]);

  // ── Job list ──────────────────────────────────────────────────────────────
  const listJobsQuery = trpc.wizSync.listJobs.useQuery(undefined, { enabled: !!user });

  // ── Handlers ──────────────────────────────────────────────────────────────
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
    const mimeType = file.type.includes("wav") ? "audio/wav"
      : file.type.includes("mp4") || file.name.endsWith(".m4a") ? "audio/mp4"
      : "audio/mpeg";
    uploadAudioMutation.mutate({ bytes, mimeType, filename: file.name });
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, []);

  const handleAnalyse = () => {
    if (!uploadedAudioUrl) return;
    analyseAudioMutation.mutate({
      audioUrl: uploadedAudioUrl,
      audioName: uploadedAudioName || "Audio Track",
    });
  };

  const handleAssign = (speakerId: number, gender: "male" | "female" | "unknown", name: string) => {
    assignCharacterMutation.mutate({ speakerId, characterId: null, inferredGender: gender, displayName: name });
    // Optimistic update
    if (jobData) {
      setJobData({
        ...jobData,
        speakers: jobData.speakers.map((s) =>
          s.id === speakerId ? { ...s, inferredGender: gender, isManualOverride: true } : s
        ),
      });
    }
  };

  const handleLoadJob = (jobId: number) => {
    setCurrentJobId(jobId);
    setPollingEnabled(false);
    // Fetch job data
    setJobData(null);
  };

  const handlePreviewReady = (segmentId: number, url: string) => {
    if (!jobData) return;
    setJobData({
      ...jobData,
      segments: jobData.segments.map((s) =>
        s.id === segmentId ? { ...s, previewStatus: "ready" as const, previewVideoUrl: url } : s
      ),
    });
  };

  // Load job data when currentJobId changes (for history loads)
  const getJobQuery = trpc.wizSync.getJob.useQuery(
    { jobId: currentJobId! },
    { enabled: currentJobId !== null && !pollingEnabled }
  );

  useEffect(() => {
    if (getJobQuery.data && !pollingEnabled) {
      setJobData(getJobQuery.data as { job: WizSyncJob; speakers: Speaker[]; segments: Segment[] });
    }
  }, [getJobQuery.data, pollingEnabled]);

  // ── Auth guard ────────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen studio-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[--color-gold] animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen studio-bg flex flex-col items-center justify-center gap-6 px-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/40 flex items-center justify-center">
          <Mic2 className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white text-center">WizSync™ requires an account</h1>
        <p className="text-muted-foreground text-center max-w-sm">Sign in to analyse audio, detect voices, and assign characters to your music videos.</p>
        <NavLink href={getLoginUrl("/wizsync")} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[--color-gold] hover:bg-[--color-gold]/80 text-white font-semibold transition-colors">
          Sign in to continue <ArrowRight className="w-4 h-4" />
        </NavLink>
      </div>
    );
  }

  const isAnalysing = jobData?.job.status === "analysing" || analyseAudioMutation.isPending || pollingEnabled;
  const isReady = jobData?.job.status === "ready";

  const SYNC_STAGES: StageItem[] = [
    { id: "upload", label: "Upload Audio", icon: "AU" },
    { id: "analyse", label: "AI Analysis", icon: "AI" },
    { id: "assign", label: "Assign Characters", icon: "CH" },
    { id: "lipsync", label: "Lip-Sync", icon: "VI" },
  ];
  const currentSyncStage = uploadedAudioUrl ? (isReady ? "assign" : "analyse") : "upload";
  const hasError = jobData?.job.status === "error";
  const stems = isReady ? (jobData?.job.stems as Record<string, { url: string } | undefined> | null) : null;

  return (
    <div className="min-h-screen studio-bg text-white" style={{backgroundColor:'#06050a'}}>
      {/* ── VR Environment: Professional Post-Production Suite ── */}
      <div className="env-bg">
        <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/env-wizsync-dubbing-hqdm3nA5LxMyE4Mjr5RygR.webp" alt="" style={{ filter: `brightness(${ambience/100})`, transition: "filter 0.6s ease" }} />
        <div className="env-bg-overlay" />
      </div>
      <div className="env-ambient env-tint-amber" />
      {/* ── Nav ── */}
      <nav className="studio-header sticky top-0 z-50 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackButton fallback="/create" label="Back" />
            <div className="flex items-center gap-3">
              <img
                src="/manus-storage/wizsync-logo-new_9563f007_70cef76a.png"
                alt="WizSync™"
                className="h-8 w-auto object-contain"
              />
              <Badge className="bg-[--color-gold]/15 text-[--color-gold] border-[--color-gold]/30 text-xs">Beta</Badge>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StudioAmbientLight value={ambience} onChange={setAmbience} accentColor="#8b5cf6" />
            <NavLink href="/create" className="text-sm text-muted-foreground hover:text-white transition-colors">All Tools</NavLink>
            <NavLink href="/music-video/create" className="text-sm text-muted-foreground hover:text-white transition-colors">Music Video</NavLink>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">

        {/* ── Hero ── */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[--color-gold]/15 border border-[--color-gold]/30 text-[--color-gold] text-sm">
            <Sparkles className="w-4 h-4" />
            Voice-to-Character Assignment System
          </div>
          <div className="flex justify-center mb-2">
            <img
              src="/manus-storage/wizsync-logo-new_9563f007_70cef76a.png"
              alt="WizSync™"
              className="h-16 w-auto object-contain drop-shadow-[0_0_24px_rgba(139,92,246,0.6)]"
            />
          </div>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Upload any audio track. WizSync detects every voice, separates instrument stems, and maps each speaker to a character — ready for AI lip-sync generation.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {[
              { icon: <Users className="w-3.5 h-3.5" />, label: "Multi-speaker detection" },
              { icon: <Layers className="w-3.5 h-3.5" />, label: "6-stem separation" },
              { icon: <Zap className="w-3.5 h-3.5" />, label: "Character assignment" },
              { icon: <Mic2 className="w-3.5 h-3.5" />, label: "Lip-sync ready" },
            ].map((f) => (
              <span key={f.label} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-[--color-gold]/[0.06] border border-[--color-gold]/20 text-white/60">
                {f.icon}{f.label}
              </span>
            ))}
          </div>
        </div>

        {/* ── Stage Flow ── */}
        <StudioStageFlow stages={SYNC_STAGES} currentStage={currentSyncStage} accentColor="#8b5cf6" className="mb-2" />

        {/* ── EQ Visualiser ── */}
        <div className="rounded-xl overflow-hidden border border-white/6" style={{ background: "rgba(0,0,0,0.4)", height: 56, padding: "4px 12px" }}>
          <AnimatedEqualiser barCount={36} color="#8b5cf6" height={48} alwaysAnimate={true} />
        </div>

        {/* ── Upload Banner (when no audio) ── */}
        {!uploadedAudioUrl && (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className="rounded-2xl border-2 border-dashed cursor-pointer transition-all flex items-center gap-5 px-6 py-5"
            style={{
              borderColor: isDragging ? "#8b5cf6" : "rgba(139,92,246,0.3)",
              background: isDragging ? "rgba(139,92,246,0.12)" : "rgba(139,92,246,0.06)",
            }}
          >
            <div className="w-14 h-14 rounded-xl flex items-center justify-center text-sm flex-shrink-0" style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}></div>
            <div className="flex-1">
              <div className="text-sm font-bold text-white mb-1">DROP YOUR AUDIO TRACK HERE TO BEGIN</div>
              <div className="text-xs text-muted-foreground/70">MP3, WAV, M4A, OGG · max 50MB · WizSync™ detects every voice and separates stems automatically</div>
            </div>
            <div className="text-xs font-bold px-4 py-2 rounded-lg flex-shrink-0" style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)", color: "#8b5cf6" }}>UPLOAD</div>
          </div>
        )}

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── Left: Upload + Analyse ── */}
          <div className="lg:col-span-1 space-y-6">

            {/* Upload card */}
            <div className="rounded-2xl border border-white/8 bg-white/3 overflow-hidden">
              <div className="p-5 border-b border-white/6">
                <h2 className="font-semibold text-white flex items-center gap-2">
                  <UploadCloud className="w-4 h-4 text-[--color-gold]" />
                  Upload Audio
                </h2>
                <p className="text-xs text-muted-foreground/70 mt-1">MP3, WAV, M4A, OGG · max 50MB</p>
              </div>

              <div className="p-5 space-y-4">
                {/* Drop zone */}
                <div
                  className={`relative rounded-xl border-2 border-dashed transition-colors cursor-pointer ${
                    isDragging ? "border-violet-500 bg-[--color-gold]/15" : "border-white/10 hover:border-white/20 bg-white/2"
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/mpeg,audio/wav,audio/mp4,audio/x-m4a,audio/ogg"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }}
                  />
                  <div className="py-8 flex flex-col items-center gap-3 text-center px-4">
                    {isUploadingFile || uploadAudioMutation.isPending ? (
                      <>
                        <Loader2 className="w-8 h-8 text-[--color-gold] animate-spin" />
                        <p className="text-sm text-muted-foreground">Uploading…</p>
                      </>
                    ) : uploadedAudioUrl ? (
                      <>
                        <CheckCircle2 className="w-8 h-8 text-[--color-silver]" />
                        <p className="text-sm text-white font-medium truncate max-w-full">{uploadedAudioName}</p>
                        <p className="text-xs text-muted-foreground/70">Click to replace</p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-muted-foreground/50" />
                        <p className="text-sm text-muted-foreground">Drop audio here or <span className="text-[--color-gold]">browse</span></p>
                      </>
                    )}
                  </div>
                </div>

                {/* Preview player */}
                {uploadedAudioUrl && (
                  <WizAudioPlayer
                    audioUrl={uploadedAudioUrl}
                    title={uploadedAudioName || "Uploaded Track"}
                    barCount={20}
                    showBadge={false}
                  />
                )}

                {/* Analyse button */}
                <Button
                  className="w-full btn-primary btn-sheen rounded-xl h-11 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!uploadedAudioUrl || isAnalysing || analyseAudioMutation.isPending}
                  onClick={handleAnalyse}
                >
                  {isAnalysing ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analysing…</>
                  ) : (
                    <><Zap className="w-4 h-4 mr-2" />Analyse Audio</>
                  )}
                </Button>

                {/* Status indicator */}
                {isAnalysing && (
                  <div className="rounded-xl bg-[--color-gold]/15 border border-[--color-gold]/30 p-3 text-xs text-[--color-gold] space-y-1">
                    <p className="font-medium flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" />Processing…</p>
                    <p className="text-[--color-gold]/70">Speaker diarisation + stem separation running in parallel. This takes 30–120 seconds.</p>
                  </div>
                )}

                {hasError && (
                  <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-300">
                    <p className="font-medium flex items-center gap-1.5"><AlertCircle className="w-3 h-3" />Analysis failed</p>
                    <p className="text-red-400/70 mt-1">{jobData?.job.errorMessage ?? "Unknown error"}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Previous jobs */}
            {listJobsQuery.data && listJobsQuery.data.length > 0 && (
              <div className="rounded-2xl border border-white/8 bg-white/3 overflow-hidden">
                <div className="p-5 border-b border-white/6">
                  <h2 className="font-semibold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    Previous Analyses
                  </h2>
                </div>
                <div className="divide-y divide-white/5">
                  {(listJobsQuery.data as WizSyncJob[]).slice(0, 5).map((job) => (
                    <button
                      key={job.id}
                      className="w-full px-5 py-3 flex items-center justify-between hover:bg-white/3 transition-colors text-left"
                      onClick={() => handleLoadJob(job.id)}
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-white truncate">{job.audioName ?? "Audio Track"}</p>
                        <p className="text-xs text-muted-foreground/70">
                          {job.speakerCount ? `${job.speakerCount} speaker${job.speakerCount !== 1 ? "s" : ""}` : ""}
                          {" · "}
                          <span className={job.status === "ready" ? "text-[--color-silver]" : job.status === "error" ? "text-red-400" : "text-[--color-gold]"}>
                            {job.status}
                          </span>
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Right: Results ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Empty state */}
            {!jobData && !isAnalysing && (
              <div className="rounded-2xl border border-white/8 bg-white/3 p-12 flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/40/20 border border-[--color-gold]/30 flex items-center justify-center">
                  <Mic2 className="w-8 h-8 text-[--color-gold]" />
                </div>
                <h3 className="text-lg font-semibold text-white">No analysis yet</h3>
                <p className="text-muted-foreground/70 text-sm max-w-sm">Upload an audio track and click <strong className="text-white">Analyse Audio</strong> to detect voices, identify speakers, and separate instrument stems.</p>
                <div className="grid grid-cols-3 gap-4 mt-4 w-full max-w-sm">
                  {[
                    { icon: <Users className="w-5 h-5 text-[--color-gold]" />, label: "Detect Voices" },
                    { icon: <Layers className="w-5 h-5 text-[--color-silver]" />, label: "Separate Stems" },
                    { icon: <Zap className="w-5 h-5 text-[--color-silver]" />, label: "Assign Characters" },
                  ].map((step) => (
                    <div key={step.label} className="rounded-xl bg-white/3 border border-white/8 p-3 flex flex-col items-center gap-2">
                      {step.icon}
                      <p className="text-xs text-muted-foreground text-center">{step.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Analysing skeleton */}
            {isAnalysing && !isReady && (
              <div className="rounded-2xl border border-[--color-gold]/30 bg-[--color-gold]/15 p-8 flex flex-col items-center gap-4 text-center">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-2 border-[--color-gold]/30 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-[--color-gold] animate-spin" />
                  </div>
                  <div className="absolute inset-0 rounded-full border-2 border-[--color-gold]/30 animate-ping" />
                </div>
                <h3 className="text-lg font-semibold text-white">Analysing your audio…</h3>
                <p className="text-muted-foreground text-sm max-w-sm">
                  WizGenesis™ is detecting every voice and separating instrument stems. This typically takes 30–120 seconds.
                </p>
                <div className="flex gap-4 text-xs text-muted-foreground/70">
                  <span className="flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin text-[--color-gold]" />Speaker detection</span>
                  <span className="flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin text-[--color-silver]" />Stem separation</span>
                </div>
              </div>
            )}

            {/* Results */}
            {isReady && jobData && (
              <>
                {/* Summary bar */}
                <div className="rounded-2xl border border-[--color-silver]/20 bg-[--color-silver]/10 p-5 flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-[--color-silver] shrink-0" />
                    <div>
                      <p className="font-semibold text-white">Analysis complete</p>
                      <p className="text-sm text-muted-foreground">
                        {jobData.speakers.length} speaker{jobData.speakers.length !== 1 ? "s" : ""} detected
                        {stems ? ` · ${Object.keys(stems).filter((k) => stems[k]).length} stems separated` : ""}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/10 text-foreground/80 hover:bg-white/10"
                    onClick={() => { setJobData(null); setCurrentJobId(null); setUploadedAudioUrl(null); setUploadedAudioName(""); }}
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />New Analysis
                  </Button>
                </div>

                {/* Speakers */}
                <div>
                  <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-[--color-gold]" />
                    Detected Speakers
                    <Badge className="bg-[--color-gold]/15 text-[--color-gold] border-[--color-gold]/30 text-xs ml-1">
                      {jobData.speakers.length}
                    </Badge>
                  </h2>
                  {jobData.speakers.length === 0 ? (
                    <div className="rounded-xl border border-white/8 bg-white/3 p-6 text-center text-muted-foreground/70 text-sm">
                      No speakers detected. The track may be instrumental only.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {jobData.speakers.map((speaker, i) => (
                        <SpeakerCard
                          key={speaker.id}
                          speaker={speaker}
                          segments={jobData.segments}
                          colorClass={SPEAKER_COLORS[i % SPEAKER_COLORS.length]}
                          onAssign={handleAssign}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Stems */}
                {stems && (
                  <div>
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Layers className="w-5 h-5 text-[--color-silver]" />
                      Instrument Stems
                      <Badge className="bg-[--color-silver]/10 text-[--color-silver] border-[--color-silver]/30 text-xs ml-1">
                        {Object.keys(stems).filter((k) => stems[k]).length} / {Object.keys(stems).length}
                      </Badge>
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {["vocals", "drums", "bass", "guitar", "piano", "other"].map((stemKey) => (
                        <StemCard key={stemKey} stemKey={stemKey} stemData={stems[stemKey]} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Segments timeline with per-segment preview */}
                {jobData.segments.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Music2 className="w-5 h-5 text-[--color-silver]" />
                      Voice Timeline
                      <Badge className="bg-[--color-silver]/10 text-[--color-silver] border-[--color-silver]/30 text-xs ml-1">
                        {jobData.segments.length} segments
                      </Badge>
                      <span className="ml-auto text-xs text-muted-foreground/70 font-normal">Click any segment to preview</span>
                    </h2>
                    <div className="rounded-2xl border border-white/8 bg-white/3 overflow-hidden">
                      <div className="divide-y divide-white/5">
                        {jobData.segments.slice(0, 50).map((seg) => {
                          const speaker = jobData.speakers.find((s) => s.id === seg.wizSyncSpeakerId);
                          const speakerIdx = jobData.speakers.findIndex((s) => s.id === seg.wizSyncSpeakerId);
                          const colorClass = SPEAKER_COLORS[speakerIdx % SPEAKER_COLORS.length];
                          return (
                            <div key={seg.id} className="px-5 py-3 hover:bg-white/2 transition-colors">
                              <div className="flex items-start gap-3">
                                <span className="text-xs font-mono text-muted-foreground/50 shrink-0 pt-0.5">{formatMs(seg.startMs)}</span>
                                <div className={`w-2 h-2 rounded-full bg-gradient-to-br ${colorClass} shrink-0 mt-1.5`} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-muted-foreground/70 mb-0.5">{speaker?.displayName ?? `Speaker ${speaker?.speakerLabel}`}</p>
                                  <p className="text-sm text-foreground/80 leading-relaxed">{seg.text ?? "(no transcript)"}</p>
                                  {/* Per-segment preview player */}
                                  <SegmentPreviewPlayer
                                    segment={seg}
                                    speaker={speaker}
                                    onPreviewReady={handlePreviewReady}
                                  />
                                </div>
                                <span className="text-xs text-muted-foreground/40 shrink-0">{formatMs(seg.endMs)}</span>
                              </div>
                            </div>
                          );
                        })}
                        {jobData.segments.length > 50 && (
                          <div className="px-5 py-3 text-xs text-muted-foreground/50 text-center">
                            +{jobData.segments.length - 50} more segments
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Full Lip Sync CTA */}
                <div className="rounded-2xl border border-[--color-gold]/20 bg-gradient-to-br from-primary/15 to-primary/40/8 p-6">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <h3 className="font-semibold text-white flex items-center gap-2">
                        <Zap className="w-4 h-4 text-[--color-gold]" />
                        Generate Full Lip Sync
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1 max-w-md">
                        Happy with the previews? Generate a full-length AI lip-sync video for every segment. Uses Build Credits from your plan.
                      </p>
                    </div>
                    <Button
                      className="bg-gradient-to-r from-primary to-primary/40 hover:opacity-90 text-white font-semibold rounded-xl"
                      onClick={() => toast.info("Full lip-sync render coming soon!", { description: "WizPerformer™ is in active development. Your segments and previews are saved." })}
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Full Lip Sync
                      <Badge className="ml-2 bg-white/20 text-white text-xs">Soon</Badge>
                    </Button>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground/70">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    Previews are free — 5 Build Credits are used for a full render
                  </div>
                  {/* Credit balance panel */}
                  {user && (
                    <div className="mt-3 rounded-xl border px-3 py-2.5" style={{ background: "rgba(184,137,42,0.06)", borderColor: "rgba(184,137,42,0.25)" }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5" style={{ color: "#b8892a" }} />
                          <span className="text-[11px] font-semibold" style={{ color: "#b8892a" }}>Full Render — 5 credits</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] font-bold text-white">{creditBalance.toLocaleString()}</span>
                          <span className="text-[10px] text-white/40 ml-1">balance</span>
                        </div>
                      </div>
                      {creditBalance < WIZSYNC_CREDIT_COST && (
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-[10px] text-red-400">Need {WIZSYNC_CREDIT_COST - creditBalance} more credits</span>
                          <button onClick={() => setTopUpOpen(true)} className="text-[10px] font-semibold px-2 py-0.5 rounded-lg text-white" style={{ background: "#b8892a" }}>Top up →</button>
                        </div>
                      )}
                    </div>
                  )}
                  {/* Full render result */}
                  {fullRenderStatus === "completed" && fullRenderUrl && (
                    <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                      <p className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Full render complete!
                      </p>
                      <video src={fullRenderUrl} controls className="w-full rounded-lg max-h-64 bg-black mb-3" />
                      <a
                        href={fullRenderUrl}
                        download
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-primary/40 text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity"
                      >
                        <Download className="w-4 h-4" />
                        Download Video
                      </a>
                    </div>
                  )}
                  {fullRenderStatus === "failed" && (
                    <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
                      <p className="text-sm text-red-400 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Render failed. Please try again.
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── How it works ── */}
        <div className="rounded-2xl border border-white/8 bg-white/2 p-8">
          <h2 className="text-xl font-bold text-white mb-6 text-center">How WizSync™ Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: "01",
                icon: <Upload className="w-6 h-6 text-[--color-gold]" />,
                title: "Upload Track",
                desc: "Upload any audio file — a full song, a demo, or a voice recording.",
              },
              {
                step: "02",
                icon: <Users className="w-6 h-6 text-[--color-silver]" />,
                title: "Detect Voices",
                desc: "WizGenesis™ identifies every speaker with precise timestamps and transcripts.",
              },
              {
                step: "03",
                icon: <Layers className="w-6 h-6 text-[--color-silver]" />,
                title: "Separate Stems",
                desc: "WizGenesis™ splits the track into 6 stems: vocals, drums, bass, guitar, piano, other.",
              },
              {
                step: "04",
                icon: <Zap className="w-6 h-6 text-[--color-gold]" />,
                title: "Assign & Sync",
                desc: "Map each voice to a character, then generate AI lip-sync video per segment.",
              },
            ].map((item) => (
              <div key={item.step} className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-muted-foreground/50">{item.step}</span>
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center">
                    {item.icon}
                  </div>
                </div>
                <h3 className="font-semibold text-white">{item.title}</h3>
                <p className="text-sm text-muted-foreground/70 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Key Features ── */}
        <div className="rounded-2xl border border-white/8 bg-white/2 p-8">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[--color-gold]/[0.12] bg-[--color-gold]/[0.03] text-[11px] font-bold tracking-[0.2em] uppercase text-[--color-gold-dark] mb-4">
              Key Features
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white">What makes WizSync™ different</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: <Mic2 className="w-5 h-5 text-[--color-gold]" />, title: "AI Speaker Detection", desc: "WizGenesis™ identifies every unique voice in your track with precise timestamps — even in complex multi-speaker recordings." },
              { icon: <Layers className="w-5 h-5 text-[--color-gold]" />, title: "6-Stem Audio Separation", desc: "WizGenesis™ splits your track into 6 independent stems — vocals, drums, bass, guitar, piano, and other — for granular creative control." },
              { icon: <Users className="w-5 h-5 text-[--color-gold]" />, title: "Character-to-Voice Mapping", desc: "Assign any detected voice to any character automatically or manually — with full override control for every segment." },
              { icon: <Zap className="w-5 h-5 text-[--color-gold]" />, title: "AI Lip Sync Generation", desc: "Generates frame-accurate lip sync animation per character segment using AI — no manual keyframing or rotoscoping required." },
              { icon: <RefreshCw className="w-5 h-5 text-[--color-gold]" />, title: "Segment-Level Regeneration", desc: "Unhappy with a specific character's sync? Regenerate individual segments without affecting the rest of the timeline." },
              { icon: <ArrowRight className="w-5 h-5 text-[--color-gold]" />, title: "Full Pipeline Integration", desc: "WizSync output flows directly into WizGenesis for final assembly — voice assignments, stem data, and lip sync are all passed automatically." },
            ].map((feat) => (
              <div key={feat.title} className="group p-5 rounded-2xl border border-[--color-gold]/[0.06] bg-white/[0.02] hover:border-[--color-gold]/[0.18] hover:bg-[--color-gold]/[0.03] transition-all duration-300">
                <div className="w-10 h-10 rounded-xl bg-[--color-gold]/[0.08] border border-[--color-gold]/[0.12] flex items-center justify-center mb-4 group-hover:bg-[--color-gold]/[0.14] transition-colors">
                  {feat.icon}
                </div>
                <h3 className="text-sm font-bold text-white mb-2 group-hover:text-[--color-gold-light] transition-colors">{feat.title}</h3>
                <p className="text-xs text-muted-foreground/70 leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
         </div>
      </div>
      <QuickTopUpModal
        open={topUpOpen}
        onOpenChange={setTopUpOpen}
        currentBalance={creditBalance}
        estimatedCost={WIZSYNC_CREDIT_COST}
      />
    </div>
  );
}
