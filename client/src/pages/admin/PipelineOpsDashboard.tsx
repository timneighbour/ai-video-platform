import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "wouter";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ShieldAlert,
  Activity,
  Clock,
  Database,
  Film,
  Zap,
} from "lucide-react";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: "default" | "destructive" | "secondary" | "outline" }> = {
    passed: { label: "Passed", variant: "default" },
    failed: { label: "Failed", variant: "destructive" },
    running: { label: "Running", variant: "secondary" },
    timeout: { label: "Timeout", variant: "destructive" },
    skipped: { label: "Skipped", variant: "outline" },
    pending: { label: "Pending", variant: "outline" },
    completed: { label: "Completed", variant: "default" },
    assembling: { label: "Assembling", variant: "secondary" },
    generating: { label: "Generating", variant: "secondary" },
    export_validation_failed: { label: "Export Failed", variant: "destructive" },
  };
  const cfg = map[status] ?? { label: status, variant: "outline" as const };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

function formatBytes(bytes: number | null | undefined) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDuration(secs: string | number | null | undefined) {
  if (!secs) return "—";
  const s = Number(secs);
  if (s < 60) return `${s.toFixed(1)}s`;
  return `${Math.floor(s / 60)}m ${(s % 60).toFixed(0)}s`;
}

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString();
}

export default function PipelineOpsDashboard() {
  const { user } = useAuth();
  const [renderPage, setRenderPage] = useState(0);
  const PAGE_SIZE = 25;

  const {
    data: health,
    isLoading: healthLoading,
    refetch: refetchHealth,
  } = trpc.pipelineOps.getPipelineHealth.useQuery(undefined, {
    refetchInterval: 60_000,
  });

  const { data: validationRuns, isLoading: vLoading, refetch: refetchValidation } =
    trpc.pipelineOps.getValidationRuns.useQuery({ limit: 20 });

  const { data: exportFailures, isLoading: efLoading, refetch: refetchFailures } =
    trpc.pipelineOps.getExportFailures.useQuery({ limit: 50 });

  const { data: allAttempts, isLoading: attLoading, refetch: refetchAttempts } =
    trpc.pipelineOps.getAllRenderAttempts.useQuery({
      limit: PAGE_SIZE,
      offset: renderPage * PAGE_SIZE,
      statusFilter: "all",
    });

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <ShieldAlert className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
            <CardTitle>Access Restricted</CardTitle>
            <CardDescription>You must be signed in to access this panel.</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/"><Button variant="outline">Return Home</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const refetchAll = () => {
    refetchHealth();
    refetchValidation();
    refetchFailures();
    refetchAttempts();
  };

  const jobStatuses = health?.jobStatusCounts ?? {};
  const totalJobs = Object.values(jobStatuses).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-background text-foreground p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-amber-400" />
            Pipeline Operations Dashboard
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Phase 2 — Autonomous production pipeline visibility
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refetchAll}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
          <Link href="/admin">
            <Button variant="ghost" size="sm">← Admin Panel</Button>
          </Link>
        </div>
      </div>

      {/* Health Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-green-500" /> Validation Pass Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {healthLoading ? "…" : health?.validationPassRate != null ? `${health.validationPassRate}%` : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">Last {health?.totalValidationRuns ?? 0} runs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
              <Film className="w-4 h-4 text-blue-400" /> Export Pass Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {healthLoading ? "…" : health?.exportPassRate != null ? `${health.exportPassRate}%` : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">Last {health?.totalRenderAttempts ?? 0} attempts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
              <Zap className="w-4 h-4 text-amber-400" /> Jobs (7d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{healthLoading ? "…" : totalJobs}</div>
            <p className="text-xs text-muted-foreground">
              {jobStatuses.completed ?? 0} completed · {jobStatuses.failed ?? 0} failed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="w-4 h-4 text-purple-400" /> Last Validation
            </CardTitle>
          </CardHeader>
          <CardContent>
            {healthLoading ? (
              <div className="text-sm">Loading…</div>
            ) : health?.lastValidation ? (
              <>
                <StatusBadge status={health.lastValidation.status} />
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDate(health.lastValidation.runAt)}
                </p>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No runs yet</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Job Status Breakdown */}
      {!healthLoading && Object.keys(jobStatuses).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Job Status Breakdown (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {Object.entries(jobStatuses).map(([status, count]) => (
                <div key={status} className="flex items-center gap-2">
                  <StatusBadge status={status} />
                  <span className="text-sm font-medium">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="validation">
        <TabsList className="grid grid-cols-3 w-full max-w-lg">
          <TabsTrigger value="validation">
            <CheckCircle2 className="w-4 h-4 mr-1" /> Validation Runs
          </TabsTrigger>
          <TabsTrigger value="failures">
            <XCircle className="w-4 h-4 mr-1" /> Export Failures
          </TabsTrigger>
          <TabsTrigger value="attempts">
            <Database className="w-4 h-4 mr-1" /> Render Audit
          </TabsTrigger>
        </TabsList>

        {/* Validation Runs Tab */}
        <TabsContent value="validation" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Golden Validation Run History</CardTitle>
              <CardDescription>
                Daily automated regression runs against the frozen Zara benchmark fixture.
                Failures trigger an owner notification.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {vLoading ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
              ) : !validationRuns?.length ? (
                <div className="text-sm text-muted-foreground py-4 text-center">
                  No validation runs yet. First run scheduled for 03:00 UTC tomorrow.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Run At</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Scenes</TableHead>
                      <TableHead>Video Duration</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {validationRuns.map((run) => (
                      <TableRow key={run.id}>
                        <TableCell className="text-xs">{formatDate(run.runAt)}</TableCell>
                        <TableCell><StatusBadge status={run.status} /></TableCell>
                        <TableCell className="text-xs">
                          {run.durationMs ? `${(run.durationMs / 1000).toFixed(1)}s` : "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {run.sceneCount ?? "—"} / {run.expectedSceneCount ?? "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {formatDuration(run.durationSeconds)}
                        </TableCell>
                        <TableCell className="text-xs text-destructive max-w-xs truncate">
                          {run.errorMessage ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Export Failures Tab */}
        <TabsContent value="failures" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Export Failures (Last 7 Days)</CardTitle>
              <CardDescription>
                Render attempts where the export validator rejected the assembled MP4.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {efLoading ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
              ) : !exportFailures?.length ? (
                <div className="flex items-center gap-2 text-green-500 py-4 justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm font-medium">No export failures in the last 7 days.</span>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job ID</TableHead>
                      <TableHead>Attempt</TableHead>
                      <TableHead>Error Code</TableHead>
                      <TableHead>Error</TableHead>
                      <TableHead>File Size</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Failed At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exportFailures.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell className="text-xs font-mono">{f.jobId}</TableCell>
                        <TableCell className="text-xs">{f.attemptNumber}</TableCell>
                        <TableCell>
                          <Badge variant="destructive" className="text-xs">
                            {f.validationErrorCode ?? "UNKNOWN"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-destructive max-w-xs truncate">
                          {f.validationError ?? "—"}
                        </TableCell>
                        <TableCell className="text-xs">{formatBytes(f.fileSizeBytes)}</TableCell>
                        <TableCell className="text-xs">{formatDuration(f.durationSeconds)}</TableCell>
                        <TableCell className="text-xs">{formatDate(f.attemptedAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Render Audit Tab */}
        <TabsContent value="attempts" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Render Attempt Audit Trail</CardTitle>
              <CardDescription>
                Immutable record of every assembly attempt. Each row is a unique UUID-keyed export.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {attLoading ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
              ) : !allAttempts?.attempts?.length ? (
                <div className="text-sm text-muted-foreground py-4 text-center">
                  No render attempts recorded yet.
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Job ID</TableHead>
                        <TableHead>Attempt</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>SHA256</TableHead>
                        <TableHead>File Size</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Scenes</TableHead>
                        <TableHead>Assembled At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allAttempts.attempts.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell className="text-xs font-mono">{a.jobId}</TableCell>
                          <TableCell className="text-xs">{a.attemptNumber}</TableCell>
                          <TableCell><StatusBadge status={a.validationStatus} /></TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground">
                            {a.sha256 ? `${a.sha256.slice(0, 12)}…` : "—"}
                          </TableCell>
                          <TableCell className="text-xs">{formatBytes(a.fileSizeBytes)}</TableCell>
                          <TableCell className="text-xs">{formatDuration(a.durationSeconds)}</TableCell>
                          <TableCell className="text-xs">{a.sceneCount}</TableCell>
                          <TableCell className="text-xs">{formatDate(a.assembledAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {/* Pagination */}
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-xs text-muted-foreground">
                      Showing {renderPage * PAGE_SIZE + 1}–{Math.min((renderPage + 1) * PAGE_SIZE, allAttempts.total)} of {allAttempts.total}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline" size="sm"
                        disabled={renderPage === 0}
                        onClick={() => setRenderPage((p) => p - 1)}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline" size="sm"
                        disabled={(renderPage + 1) * PAGE_SIZE >= allAttempts.total}
                        onClick={() => setRenderPage((p) => p + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
