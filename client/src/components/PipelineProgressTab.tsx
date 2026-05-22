/**
 * PipelineProgressTab — Real-time 5-stage compositing pipeline progress bar
 *
 * Polls trpc.pipelineOps.getPipelineStatus every 10 seconds.
 * Shows per-job overall progress, per-stage status bars, and a per-scene
 * detail table with stage-level status for each scene.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Loader2,
  Film,
  Mic,
  Layers,
  Clapperboard,
  Music,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";

// ─── Helpers ────────────────────────────────────────────────────────────────

function stageStatusColor(status: string) {
  switch (status) {
    case "done": return "text-emerald-400";
    case "processing": return "text-amber-400";
    case "error": return "text-red-400";
    case "waiting": return "text-muted-foreground";
    default: return "text-muted-foreground";
  }
}

function stageStatusIcon(status: string) {
  switch (status) {
    case "done": return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
    case "processing": return <Loader2 className="w-4 h-4 text-amber-400 shrink-0 animate-spin" />;
    case "error": return <XCircle className="w-4 h-4 text-red-400 shrink-0" />;
    default: return <Clock className="w-4 h-4 text-muted-foreground shrink-0" />;
  }
}

function sceneStatusBadge(status: string) {
  const map: Record<string, string> = {
    done: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    skipped: "bg-slate-500/20 text-slate-400 border-slate-500/30",
    processing: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    pending: "bg-slate-600/20 text-slate-500 border-slate-600/30",
    error: "bg-red-500/20 text-red-400 border-red-500/30",
    completed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    generating: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    n_a: "bg-slate-600/20 text-slate-500 border-slate-600/30",
  };
  const key = status.replace(/[^a-z_]/g, "_");
  const cls = map[key] ?? "bg-slate-600/20 text-slate-500 border-slate-600/30";
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${cls}`}>
      {status}
    </span>
  );
}

function jobStatusColor(status: string) {
  switch (status) {
    case "completed": return "text-emerald-400";
    case "rendering": return "text-amber-400";
    case "assembling": return "text-blue-400";
    case "failed": return "text-red-400";
    default: return "text-muted-foreground";
  }
}

function formatRelativeTime(d: Date | string | null | undefined) {
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(d).toLocaleDateString();
}

// ─── Stage Row ───────────────────────────────────────────────────────────────

function StageRow({
  icon,
  label,
  status,
  done,
  total,
  pending,
  error,
}: {
  icon: React.ReactNode;
  label: string;
  status: string;
  done?: number;
  total?: number;
  pending?: number;
  error?: number;
}) {
  const pct = total && total > 0 ? Math.round(((done ?? 0) / total) * 100) : status === "done" ? 100 : 0;

  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-5 flex justify-center">{stageStatusIcon(status)}</div>
      <div className="w-6 text-muted-foreground">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className={`text-xs font-medium ${stageStatusColor(status)}`}>{label}</span>
          <span className="text-xs text-muted-foreground">
            {total != null ? `${done ?? 0} / ${total}` : status === "done" ? "done" : status}
            {pending != null && pending > 0 && (
              <span className="ml-1 text-amber-400">({pending} running)</span>
            )}
            {error != null && error > 0 && (
              <span className="ml-1 text-red-400">({error} err)</span>
            )}
          </span>
        </div>
        <Progress value={pct} className="h-1.5" />
      </div>
    </div>
  );
}

// ─── Job Card ────────────────────────────────────────────────────────────────

function JobPipelineCard({ jobData }: { jobData: any }) {
  const [expanded, setExpanded] = useState(false);
  const { job, stages, scenes } = jobData;

  const performanceScenes = scenes.filter((s: any) => s.sceneType === "performance");
  const cinematicScenes = scenes.filter((s: any) => s.sceneType !== "performance");

  return (
    <Card className="border border-border/60 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base truncate">{job.title}</CardTitle>
              <span className="text-xs font-mono text-muted-foreground">#{job.id}</span>
              <span className={`text-xs font-semibold uppercase tracking-wide ${jobStatusColor(job.status)}`}>
                {job.status}
              </span>
              {job.probePassed === false && (
                <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-400">
                  Probe Pending
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {job.totalScenes} scenes · updated {formatRelativeTime(job.updatedAt)}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {job.finalVideoUrl && (
              <a href={job.finalVideoUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="text-xs h-7">
                  <ExternalLink className="w-3 h-3 mr-1" /> Final Video
                </Button>
              </a>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setExpanded((e) => !e)}
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Overall progress bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted-foreground">Overall Pipeline Progress</span>
            <span className="text-xs font-bold text-foreground">{job.overallProgress}%</span>
          </div>
          <div className="relative">
            <Progress value={job.overallProgress} className="h-3" />
            {/* Stage markers at 20%, 45%, 70%, 95% */}
            {[20, 45, 70, 95].map((pct) => (
              <div
                key={pct}
                className="absolute top-0 bottom-0 w-px bg-background/60"
                style={{ left: `${pct}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-1 text-[9px] text-muted-foreground/60 select-none">
            <span>S1</span>
            <span>S2</span>
            <span>S3/4</span>
            <span>S5</span>
            <span>Done</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-1">
        {/* Per-stage rows */}
        <div className="border border-border/40 rounded-lg px-3 py-1 bg-muted/20">
          <StageRow
            icon={<Film className="w-3.5 h-3.5" />}
            label={stages.stage1.label}
            status={stages.stage1.status}
            done={stages.stage1.done}
            total={stages.stage1.total}
          />
          <div className="border-t border-border/30" />
          <StageRow
            icon={<Mic className="w-3.5 h-3.5" />}
            label={stages.stage2.label}
            status={stages.stage2.status}
            done={stages.stage2.done}
            total={stages.stage2.total}
            pending={stages.stage2.pending}
          />
          <div className="border-t border-border/30" />
          <StageRow
            icon={<Layers className="w-3.5 h-3.5" />}
            label={stages.stage3_4.label}
            status={stages.stage3_4.status}
            done={stages.stage3_4.done}
            total={stages.stage3_4.total}
            pending={stages.stage3_4.pending}
            error={stages.stage3_4.error}
          />
          <div className="border-t border-border/30" />
          <StageRow
            icon={<Music className="w-3.5 h-3.5" />}
            label={stages.stage5.label}
            status={stages.stage5.status}
          />
        </div>

        {/* Expandable per-scene detail table */}
        {expanded && (
          <div className="mt-3 space-y-3">
            {performanceScenes.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-amber-400 mb-1.5 flex items-center gap-1">
                  <Clapperboard className="w-3.5 h-3.5" />
                  Performance Scenes ({performanceScenes.length})
                </p>
                <div className="rounded-lg border border-border/40 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-border/40">
                        <TableHead className="text-[10px] h-7 py-1">Scene</TableHead>
                        <TableHead className="text-[10px] h-7 py-1">S1 Seedance</TableHead>
                        <TableHead className="text-[10px] h-7 py-1">S2 InfiniteTalk</TableHead>
                        <TableHead className="text-[10px] h-7 py-1">S3/4 Composite</TableHead>
                        <TableHead className="text-[10px] h-7 py-1">Attempts</TableHead>
                        <TableHead className="text-[10px] h-7 py-1">Updated</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {performanceScenes.map((s: any) => (
                        <TableRow key={s.id} className="border-border/30 hover:bg-muted/20">
                          <TableCell className="text-xs py-1.5 font-mono">#{s.sceneIndex}</TableCell>
                          <TableCell className="text-xs py-1.5">{sceneStatusBadge(s.stage1)}</TableCell>
                          <TableCell className="text-xs py-1.5">{sceneStatusBadge(s.stage2)}</TableCell>
                          <TableCell className="text-xs py-1.5">{sceneStatusBadge(s.stage3_4)}</TableCell>
                          <TableCell className="text-xs py-1.5 text-muted-foreground">{s.compositeAttempts}</TableCell>
                          <TableCell className="text-xs py-1.5 text-muted-foreground">{formatRelativeTime(s.updatedAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {cinematicScenes.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-blue-400 mb-1.5 flex items-center gap-1">
                  <Film className="w-3.5 h-3.5" />
                  Cinematic Scenes ({cinematicScenes.length})
                </p>
                <div className="rounded-lg border border-border/40 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-border/40">
                        <TableHead className="text-[10px] h-7 py-1">Scene</TableHead>
                        <TableHead className="text-[10px] h-7 py-1">S1 Seedance</TableHead>
                        <TableHead className="text-[10px] h-7 py-1">Composite</TableHead>
                        <TableHead className="text-[10px] h-7 py-1">Updated</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cinematicScenes.map((s: any) => (
                        <TableRow key={s.id} className="border-border/30 hover:bg-muted/20">
                          <TableCell className="text-xs py-1.5 font-mono">#{s.sceneIndex}</TableCell>
                          <TableCell className="text-xs py-1.5">{sceneStatusBadge(s.stage1)}</TableCell>
                          <TableCell className="text-xs py-1.5">{sceneStatusBadge(s.stage3_4)}</TableCell>
                          <TableCell className="text-xs py-1.5 text-muted-foreground">{formatRelativeTime(s.updatedAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Tab Component ──────────────────────────────────────────────────────

export function PipelineProgressTab() {
  const [jobIdFilter, setJobIdFilter] = useState("");
  const parsedJobId = jobIdFilter.trim() ? parseInt(jobIdFilter.trim(), 10) : undefined;

  const { data, isLoading, refetch, dataUpdatedAt } = trpc.pipelineOps.getPipelineStatus.useQuery(
    { jobId: parsedJobId && !isNaN(parsedJobId) ? parsedJobId : undefined },
    {
      refetchInterval: 10_000, // poll every 10 seconds
      refetchIntervalInBackground: false,
    }
  );

  const jobs = data?.jobs ?? [];
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : null;

  return (
    <TabsContent value="pipeline" className="mt-4 space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-amber-400" />
            5-Stage Compositing Pipeline
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Auto-refreshes every 10 seconds
            {lastUpdated && <span className="ml-1">· Last updated: {lastUpdated}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Filter by Job ID…"
            className="h-8 w-40 text-xs"
            value={jobIdFilter}
            onChange={(e) => setJobIdFilter(e.target.value)}
          />
          <Button variant="outline" size="sm" className="h-8" onClick={() => refetch()}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {/* Stage legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground border border-border/30 rounded-lg px-3 py-2 bg-muted/10">
        <span className="font-semibold text-foreground/60 mr-1">Stages:</span>
        <span><Film className="w-3 h-3 inline mr-0.5" />S1 Cinematic World (Seedance)</span>
        <span><Mic className="w-3 h-3 inline mr-0.5" />S2 Performance Plate (InfiniteTalk)</span>
        <span><Layers className="w-3 h-3 inline mr-0.5" />S3/4 Matte + Composite (ffmpeg)</span>
        <span><Music className="w-3 h-3 inline mr-0.5" />S5 Final Audio Restoration</span>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading pipeline status…</span>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && jobs.length === 0 && (
        <Card className="border-dashed border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-12 gap-2">
            <Clapperboard className="w-10 h-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {jobIdFilter ? `No job found with ID ${jobIdFilter}` : "No active rendering jobs"}
            </p>
            <p className="text-xs text-muted-foreground/60">
              Jobs appear here when status is rendering, assembling, or completed (last 10)
            </p>
          </CardContent>
        </Card>
      )}

      {/* Job cards */}
      {!isLoading && jobs.map((jobData: any) => (
        <JobPipelineCard key={jobData.job.id} jobData={jobData} />
      ))}
    </TabsContent>
  );
}
