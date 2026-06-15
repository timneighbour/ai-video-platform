/**
 * AdminJobsPanel — /admin/jobs
 *
 * Lists all music video jobs across all users.
 * Click a job to see per-scene detail with provider spend, error codes,
 * and per-scene re-render controls.
 */
import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Film,
  Copy,
} from "@/lib/icons";

// ── Helpers ──────────────────────────────────────────────────────────────────

function statusColor(status: string): string {
  switch (status) {
    case "completed": return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "rendering": return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    case "assembling": return "bg-purple-500/15 text-purple-400 border-purple-500/30";
    case "storyboard_ready": return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    case "failed":
    case "provider_unavailable": return "bg-red-500/15 text-red-400 border-red-500/30";
    case "draft": return "bg-white/10 text-white/40 border-white/15";
    default: return "bg-white/10 text-white/40 border-white/15";
  }
}

function sceneStatusColor(status: string): string {
  switch (status) {
    case "completed": return "text-emerald-400";
    case "generating": return "text-blue-400";
    case "pending": return "text-white/40";
    case "failed":
    case "failed_retryable": return "text-red-400";
    default: return "text-white/30";
  }
}

function lipSyncStatusColor(status: string): string {
  switch (status) {
    case "done": return "text-emerald-400";
    case "processing": return "text-blue-400";
    case "pending": return "text-white/30";
    case "error": return "text-red-400";
    default: return "text-white/30";
  }
}

function formatDuration(seconds?: number | null): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatMs(ms?: number | null): string {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function copyRef(ref: string) {
  navigator.clipboard.writeText(ref);
  toast.success("Copied", { description: ref });
}

// ── Scene Detail Row ──────────────────────────────────────────────────────────

function SceneRow({
  scene,
  onReset,
  resetting,
}: {
  scene: any;
  onReset: (sceneId: number) => void;
  resetting: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const sceneRef = `S-${String(scene.id).padStart(6, "0")}`;

  return (
    <>
      <tr
        className="border-b border-white/5 hover:bg-white/[0.02] cursor-pointer transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <td className="px-3 py-2 text-[11px] font-mono text-white/40">
          <button
            className="hover:text-[--color-gold] transition-colors"
            onClick={(e) => { e.stopPropagation(); copyRef(sceneRef); }}
            title="Copy scene ref"
          >
            {sceneRef}
          </button>
        </td>
        <td className="px-3 py-2 text-[11px] text-white/60">
          {scene.sceneIndex + 1}
        </td>
        <td className="px-3 py-2 text-[11px]">
          <span className={`font-mono ${sceneStatusColor(scene.status)}`}>{scene.status}</span>
        </td>
        <td className="px-3 py-2 text-[11px]">
          <span className={`font-mono ${lipSyncStatusColor(scene.lipSyncStatus ?? "pending")}`}>
            {scene.lipSyncStatus ?? "pending"}
          </span>
        </td>
        <td className="px-3 py-2 text-[11px]">
          <span className={`font-mono ${scene.compositeStatus === "done" || scene.compositeStatus === "skipped" ? "text-emerald-400" : scene.compositeStatus === "processing" ? "text-blue-400" : scene.compositeStatus === "error" ? "text-red-400" : "text-white/30"}`}>
            {scene.compositeStatus ?? "—"}
          </span>
        </td>
        <td className="px-3 py-2 text-[11px] text-white/40 font-mono">
          {formatMs(scene.renderDurationMs)}
        </td>
        <td className="px-3 py-2 text-[11px] text-white/40 font-mono">
          {formatMs(scene.lipSyncDurationMs)}
        </td>
        <td className="px-3 py-2 text-[11px] text-white/40">
          {scene.overallSceneScore ? Number(scene.overallSceneScore).toFixed(2) : "—"}
        </td>
        <td className="px-3 py-2">
          <button
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-white/5 border border-white/10 text-white/40 hover:text-white hover:border-white/30 transition-colors disabled:opacity-40"
            disabled={resetting}
            onClick={(e) => { e.stopPropagation(); onReset(scene.id); }}
            title="Reset scene to pending"
          >
            {resetting ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
            Reset
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-white/5 bg-[rgba(24,20,16,0.5)]">
          <td colSpan={9} className="px-4 py-3">
            <div className="grid grid-cols-2 gap-4 text-[11px]">
              <div className="space-y-1">
                <p className="text-white/30 uppercase tracking-wider text-[9px] font-bold">Prompt</p>
                <p className="text-white/60 leading-relaxed">{scene.prompt || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-white/30 uppercase tracking-wider text-[9px] font-bold">Lyrics</p>
                <p className="text-white/60 font-mono leading-relaxed">{scene.lyrics || "—"}</p>
              </div>
              {scene.errorMessage && (
                <div className="col-span-2 space-y-1">
                  <p className="text-red-400/60 uppercase tracking-wider text-[9px] font-bold">Error</p>
                  <p className="text-red-400/80 font-mono text-[10px] bg-red-950/20 rounded p-2 border border-red-500/20">{scene.errorMessage}</p>
                </div>
              )}
              <div className="space-y-1">
                <p className="text-white/30 uppercase tracking-wider text-[9px] font-bold">Render Provider</p>
                <p className="text-white/50 font-mono">{scene.renderProvider || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-white/30 uppercase tracking-wider text-[9px] font-bold">Lip Sync Provider</p>
                <p className="text-white/50 font-mono">{scene.lipSyncProvider || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-white/30 uppercase tracking-wider text-[9px] font-bold">Retry Count</p>
                <p className="text-white/50 font-mono">{scene.retryCount ?? 0}</p>
              </div>
              <div className="space-y-1">
                <p className="text-white/30 uppercase tracking-wider text-[9px] font-bold">Timing</p>
                <p className="text-white/50 font-mono">{scene.startTime}s → {(scene.startTime + scene.duration).toFixed(1)}s ({scene.duration}s)</p>
              </div>
              {scene.videoUrl && (
                <div className="col-span-2 space-y-1">
                  <p className="text-white/30 uppercase tracking-wider text-[9px] font-bold">Video URL</p>
                  <a href={scene.videoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400/70 hover:text-blue-400 text-[10px] font-mono break-all">{scene.videoUrl}</a>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Job Detail View ───────────────────────────────────────────────────────────

function JobDetailView({ jobId, onBack }: { jobId: number; onBack: () => void }) {
  const { data, isLoading, refetch } = trpc.pipelineOps.adminGetJobDetail.useQuery({ jobId });
  const resetScene = trpc.pipelineOps.adminResetScene.useMutation({
    onSuccess: () => { toast.success("Scene reset to pending"); refetch(); },
    onError: (e) => toast.error("Reset failed", { description: e.message }),
  });
  const resetJob = trpc.pipelineOps.adminResetJob.useMutation({
    onSuccess: () => { toast.success("Job reset to rendering"); refetch(); },
    onError: (e) => toast.error("Reset failed", { description: e.message }),
  });

  const [resettingScenes, setResettingScenes] = useState<Set<number>>(new Set());

  const handleResetScene = async (sceneId: number) => {
    setResettingScenes((s) => new Set(s).add(sceneId));
    try {
      await resetScene.mutateAsync({ sceneId });
    } finally {
      setResettingScenes((s) => { const n = new Set(s); n.delete(sceneId); return n; });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-[--color-gold] animate-spin" />
      </div>
    );
  }

  if (!data) return <div className="text-white/40 p-8">Job not found.</div>;

  const { job, scenes } = data;
  const jobRef = `WIZ-${String(job.id).padStart(6, "0")}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={onBack}
          className="mt-1 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-white truncate">{job.title}</h1>
            <button
              onClick={() => copyRef(jobRef)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[rgba(184,137,42,0.12)] border border-[rgba(184,137,42,0.25)] text-[--color-gold]/70 text-[10px] font-mono hover:text-[--color-gold] transition-colors"
            >
              {jobRef} <Copy className="w-2.5 h-2.5" />
            </button>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${statusColor(job.status)}`}>
              {job.status}
            </span>
          </div>
          <p className="text-white/40 text-sm mt-1">
            {job.userName || "Unknown"} · {job.userEmail || "—"} · {job.genre || "—"} · {formatDuration(job.audioDuration)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-white/20 text-white/60 hover:text-white bg-transparent text-xs"
            onClick={() => refetch()}
          >
            <RefreshCw className="w-3 h-3 mr-1" /> Refresh
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 bg-transparent text-xs"
            onClick={() => resetJob.mutateAsync({ jobId: job.id, clearFallbackProvider: true })}
            disabled={resetJob.isPending}
          >
            {resetJob.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RotateCcw className="w-3 h-3 mr-1" />}
            Reset Job
          </Button>
        </div>
      </div>

      {/* Job stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Scenes", value: `${job.completedScenes ?? 0} / ${job.totalScenes ?? 0}` },
          { label: "Credits", value: job.creditCost ?? "—" },
          { label: "Aspect Ratio", value: job.aspectRatio || "16:9" },
          { label: "Vocals Status", value: job.vocalsStatus || "—" },
        ].map(({ label, value }) => (
          <div key={label} className="bg-[rgba(255,255,255,0.03)] border border-white/8 rounded-lg p-3">
            <p className="text-[10px] text-white/30 uppercase tracking-wider font-bold mb-1">{label}</p>
            <p className="text-sm text-white/80 font-mono">{String(value)}</p>
          </div>
        ))}
      </div>

      {/* Scenes table */}
      <div className="rounded-xl border border-white/10 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Scenes ({scenes.length})</h2>
          <p className="text-[11px] text-white/30">Click a row to expand details · Reset sends scene back to pending</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02]">
                {["Ref", "#", "Render", "Lip Sync", "Composite", "Render Time", "LS Time", "Score", ""].map((h) => (
                  <th key={h} className="px-3 py-2 text-[10px] text-white/30 uppercase tracking-wider font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scenes.map((scene) => (
                <SceneRow
                  key={scene.id}
                  scene={scene}
                  onReset={handleResetScene}
                  resetting={resettingScenes.has(scene.id)}
                />
              ))}
              {scenes.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-white/30 text-sm">No scenes found for this job.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────

export default function AdminJobsPanel() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const limit = 50;

  // Debounce search
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, refetch } = trpc.pipelineOps.adminListJobs.useQuery({
    limit,
    offset: page * limit,
    search: debouncedSearch || undefined,
    statusFilter: statusFilter !== "all" ? statusFilter : undefined,
  });

  const jobs = data?.jobs ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  // ISS-023: Client-side admin guard (placed after all hooks to satisfy Rules of Hooks)
  if (!user || user.role !== "admin") {
    return <div className="flex items-center justify-center h-screen text-muted-foreground">Access denied.</div>;
  }

  if (selectedJobId !== null) {
    return (
      <div className="min-h-screen bg-background text-white p-6">
        <JobDetailView jobId={selectedJobId} onBack={() => setSelectedJobId(null)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Job Management</h1>
            <p className="text-white/40 text-sm mt-1">All music video jobs across all users · {total.toLocaleString()} total</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-white/20 text-white/60 hover:text-white bg-transparent"
            onClick={() => refetch()}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Search by title, user name or email…"
              className="pl-8 bg-white/5 border-white/15 text-white placeholder:text-white/25 text-sm h-9"
            />
          </div>
          <div className="flex items-center gap-1.5">
            {["all", "rendering", "completed", "failed", "storyboard_ready", "draft"].map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(0); }}
                className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${
                  statusFilter === s
                    ? "bg-[--color-gold]/15 border-[--color-gold]/40 text-[--color-gold]"
                    : "bg-white/5 border-white/10 text-white/40 hover:text-white/70"
                }`}
              >
                {s === "all" ? "All" : s.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02]">
                  {["Ref", "Title", "User", "Status", "Scenes", "Duration", "Credits", "Genre", "Created"].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-[10px] text-white/30 uppercase tracking-wider font-bold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center">
                      <Loader2 className="w-5 h-5 text-[--color-gold] animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : jobs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-white/30 text-sm">
                      No jobs found{debouncedSearch ? ` matching "${debouncedSearch}"` : ""}.
                    </td>
                  </tr>
                ) : jobs.map((job) => {
                  const jobRef = `WIZ-${String(job.id).padStart(6, "0")}`;
                  return (
                    <tr
                      key={job.id}
                      className="border-b border-white/5 hover:bg-white/[0.03] cursor-pointer transition-colors"
                      onClick={() => setSelectedJobId(job.id)}
                    >
                      <td className="px-3 py-2.5">
                        <button
                          className="text-[11px] font-mono text-[--color-gold]/50 hover:text-[--color-gold] transition-colors"
                          onClick={(e) => { e.stopPropagation(); copyRef(jobRef); }}
                          title="Copy job ref"
                        >
                          {jobRef}
                        </button>
                      </td>
                      <td className="px-3 py-2.5 max-w-[200px]">
                        <p className="text-sm text-white/80 truncate">{job.title}</p>
                      </td>
                      <td className="px-3 py-2.5 max-w-[140px]">
                        <p className="text-[11px] text-white/50 truncate">{job.userName || "—"}</p>
                        <p className="text-[10px] text-white/25 truncate">{job.userEmail || ""}</p>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${statusColor(job.status)}`}>
                          {job.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-[11px] text-white/50 font-mono">
                        {job.completedScenes ?? 0}/{job.totalScenes ?? 0}
                      </td>
                      <td className="px-3 py-2.5 text-[11px] text-white/40 font-mono">
                        {formatDuration(job.audioDuration)}
                      </td>
                      <td className="px-3 py-2.5 text-[11px] text-white/40 font-mono">
                        {job.creditCost ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 text-[11px] text-white/40">
                        {job.genre || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-[11px] text-white/30 font-mono whitespace-nowrap">
                        {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-white/30">
              Showing {page * limit + 1}–{Math.min((page + 1) * limit, total)} of {total.toLocaleString()} jobs
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="border-white/15 text-white/50 hover:text-white bg-transparent"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <span className="text-[11px] text-white/40 font-mono">
                {page + 1} / {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="border-white/15 text-white/50 hover:text-white bg-transparent"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
