/**
 * GoldenBenchmarkLibrary.tsx
 *
 * Admin page: /admin/benchmarks
 *
 * Displays the Golden Benchmark Library — the definitive quality bar for the
 * Wiz AI platform. Shows:
 *   1. Frozen Zara benchmark fixture spec
 *   2. Validation run history with pass/fail trend
 *   3. Composite quality score (render success + lip-sync + continuity)
 *   4. Trigger manual validation run
 *   5. Benchmark showcase items (category = "Golden Benchmark")
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { toast } from "sonner";
import {
  ShieldAlert, CheckCircle2, XCircle, Clock, Play, RefreshCw,
  Loader2, Crown, Star, Zap, Film, Music, Rocket, TrendingUp,
  AlertTriangle, ArrowLeft,
} from "@/lib/icons";

// ── FROZEN FIXTURE CONSTANTS (mirrored from server/golden-validation.ts) ─────
const GOLDEN_FIXTURE = {
  title: "Zara — Golden Benchmark",
  audioDurationMs: 30_000,
  themePrompt: "Solo artist performing on a dark stage with dramatic lighting, close-up shots, powerful energy",
  genre: "pop",
  mood: "powerful",
  expectedSceneCount: 5,
  expectedDurationSeconds: 30,
  durationToleranceSeconds: 5,
} as const;

// ── BENCHMARK PROJECTS ────────────────────────────────────────────────────────
const BENCHMARK_PROJECTS = [
  {
    id: "zara-golden",
    name: "Zara — Golden Benchmark",
    description: "The definitive quality bar. Solo artist, dark stage, dramatic lighting. 5 scenes × 6s = 30s.",
    category: "Cinematic Solo",
    status: "active",
    icon: "🎤",
    metrics: {
      renderSuccessTarget: 95,
      lipSyncPassTarget: 90,
      continuityTarget: 85,
      renderTimeTarget: "< 12 min",
    },
    tags: ["performance", "close-up", "lip-sync", "Air Studios"],
  },
  {
    id: "ensemble-benchmark",
    name: "Ensemble — Band Performance",
    description: "Multi-character band scene. Tests character consistency, crowd energy, wide-angle composition.",
    category: "Ensemble",
    status: "planned",
    icon: "🎸",
    metrics: {
      renderSuccessTarget: 90,
      lipSyncPassTarget: 85,
      continuityTarget: 80,
      renderTimeTarget: "< 18 min",
    },
    tags: ["ensemble", "wide-angle", "character-consistency"],
  },
  {
    id: "cinematic-benchmark",
    name: "Cinematic — Atmospheric Journey",
    description: "No performer. Pure cinematic world-building. Tests environment quality, camera movement, mood.",
    category: "Cinematic",
    status: "planned",
    icon: "🎬",
    metrics: {
      renderSuccessTarget: 98,
      lipSyncPassTarget: null,
      continuityTarget: 90,
      renderTimeTarget: "< 8 min",
    },
    tags: ["cinematic", "atmospheric", "no-character"],
  },
];

// ── STATUS BADGE ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  if (status === "passed") return (
    <Badge className="bg-green-500/15 text-green-400 border-green-500/30 text-xs">✓ Passed</Badge>
  );
  if (status === "failed") return (
    <Badge className="bg-red-500/15 text-red-400 border-red-500/30 text-xs">✗ Failed</Badge>
  );
  if (status === "running") return (
    <Badge className="bg-yellow-500/15 text-yellow-400 border-yellow-500/30 text-xs animate-pulse">⟳ Running</Badge>
  );
  if (status === "timeout") return (
    <Badge className="bg-orange-500/15 text-orange-400 border-orange-500/30 text-xs">⏱ Timeout</Badge>
  );
  return <Badge variant="outline" className="text-xs">{status}</Badge>;
}

// ── QUALITY SCORE RING ────────────────────────────────────────────────────────
function QualityRing({ score, label, color }: { score: number | null; label: string; color: string }) {
  const pct = score ?? 0;
  const circumference = 2 * Math.PI * 36;
  const dashOffset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
          <circle
            cx="40" cy="40" r="36" fill="none"
            stroke={color} strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={score === null ? circumference : dashOffset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-white">
            {score === null ? "—" : `${pct}%`}
          </span>
        </div>
      </div>
      <span className="text-xs text-white/50 text-center leading-tight">{label}</span>
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function GoldenBenchmarkLibrary() {
  const { user } = useAuth();
  const [isTriggering, setIsTriggering] = useState(false);

  const { data: validationRuns, isLoading: runsLoading, refetch: refetchRuns } =
    trpc.pipelineOps.getValidationRuns.useQuery({ limit: 20 });

  const { data: pipelineHealth } = trpc.pipelineOps.getPipelineHealth.useQuery();

  const triggerMutation = trpc.pipelineOps.triggerGoldenValidation.useMutation({
    onMutate: () => setIsTriggering(true),
    onSuccess: (data) => {
      setIsTriggering(false);
      toast.success("Benchmark triggered", { description: data.message });
      setTimeout(() => refetchRuns(), 3000);
    },
    onError: (err) => {
      setIsTriggering(false);
      toast.error("Failed to trigger benchmark", { description: err.message });
    },
  });

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md bg-card border-white/10">
          <CardHeader className="text-center">
            <ShieldAlert className="w-12 h-12 mx-auto text-red-400 mb-2" />
            <CardTitle className="text-white">Access Restricted</CardTitle>
            <CardDescription>Admin access required.</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/"><Button variant="outline">Return Home</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Compute quality scores from pipeline health
  const validationPassRate = pipelineHealth?.validationPassRate ?? null;
  const exportPassRate = pipelineHealth?.exportPassRate ?? null;
  const lastRun = pipelineHealth?.lastValidation;

  // Pass/fail trend from last 10 runs
  const recentRuns = validationRuns?.slice(0, 10) ?? [];
  const passCount = recentRuns.filter(r => r.status === "passed").length;
  const trendScore = recentRuns.length > 0 ? Math.round((passCount / recentRuns.length) * 100) : null;

  return (
    <div className="min-h-screen bg-background text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-background">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
              <Crown className="w-5 h-5 text-black" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Golden Benchmark Library</h1>
              <p className="text-xs text-white/40">Quality bar for Wiz AI platform — automated regression testing</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin">
              <Button variant="ghost" size="sm" className="text-white/60 hover:text-white">
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                Admin
              </Button>
            </Link>
            <Button
              size="sm"
              onClick={() => triggerMutation.mutate()}
              disabled={isTriggering}
              className="bg-gradient-to-r from-primary to-primary/50 hover:from-primary/90 hover:to-primary/60 text-white font-semibold"
            >
              {isTriggering ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Running…</>
              ) : (
                <><Play className="w-3.5 h-3.5 mr-1.5" />Run Benchmark</>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* Quality Score Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-card border-white/10">
            <CardContent className="pt-6 pb-5 flex flex-col items-center gap-4">
              <QualityRing score={validationPassRate} label="Validation Pass Rate" color="#22c55e" />
              <div className="text-center">
                <p className="text-xs text-white/40">Golden Benchmark (all-time)</p>
                {lastRun && (
                  <p className="text-xs text-white/30 mt-0.5">
                    Last run: {new Date(lastRun.runAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-white/10">
            <CardContent className="pt-6 pb-5 flex flex-col items-center gap-4">
              <QualityRing score={exportPassRate} label="Export Pass Rate" color="#3b82f6" />
              <div className="text-center">
                <p className="text-xs text-white/40">Final video validation (last 50)</p>
                <p className="text-xs text-white/30 mt-0.5">{pipelineHealth?.totalRenderAttempts ?? 0} total attempts</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-white/10">
            <CardContent className="pt-6 pb-5 flex flex-col items-center gap-4">
              <QualityRing score={trendScore} label="7-Day Trend" color="#f59e0b" />
              <div className="text-center">
                <p className="text-xs text-white/40">Last {recentRuns.length} validation runs</p>
                <p className="text-xs text-white/30 mt-0.5">{passCount} passed / {recentRuns.length - passCount} failed</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Benchmark Projects */}
        <div>
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-4">Benchmark Projects</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {BENCHMARK_PROJECTS.map((project) => (
              <Card key={project.id} className={`bg-card border-white/10 relative overflow-hidden ${project.status === "active" ? "ring-1 ring-[#b8892a]/40" : ""}`}>
                {project.status === "active" && (
                  <div className="absolute top-3 right-3">
                    <Badge className="bg-primary/20 text-primary/90 border-primary/40 text-xs">Active</Badge>
                  </div>
                )}
                {project.status === "planned" && (
                  <div className="absolute top-3 right-3">
                    <Badge className="bg-white/5 text-white/40 border-white/10 text-xs">Planned</Badge>
                  </div>
                )}
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{project.icon}</span>
                    <div>
                      <CardTitle className="text-sm text-white">{project.name}</CardTitle>
                      <CardDescription className="text-xs mt-1">{project.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white/5 rounded-lg p-2">
                      <p className="text-white/40">Render Success</p>
                      <p className="text-white font-semibold mt-0.5">{project.metrics.renderSuccessTarget}%</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2">
                      <p className="text-white/40">Lip-Sync Pass</p>
                      <p className="text-white font-semibold mt-0.5">
                        {project.metrics.lipSyncPassTarget !== null ? `${project.metrics.lipSyncPassTarget}%` : "N/A"}
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2">
                      <p className="text-white/40">Continuity</p>
                      <p className="text-white font-semibold mt-0.5">{project.metrics.continuityTarget}%</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2">
                      <p className="text-white/40">Render Time</p>
                      <p className="text-white font-semibold mt-0.5">{project.metrics.renderTimeTarget}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {project.tags.map(tag => (
                      <span key={tag} className="text-xs bg-white/5 text-white/40 rounded px-1.5 py-0.5">{tag}</span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Frozen Fixture Spec */}
        <Card className="bg-card border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-primary/90" />
              <CardTitle className="text-sm text-white">Frozen Fixture Spec — Zara Golden Benchmark</CardTitle>
            </div>
            <CardDescription className="text-xs">
              These constants are frozen. Changing them invalidates all historical validation run comparisons.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {[
                { label: "Title", value: GOLDEN_FIXTURE.title },
                { label: "Genre", value: GOLDEN_FIXTURE.genre },
                { label: "Mood", value: GOLDEN_FIXTURE.mood },
                { label: "Duration", value: `${GOLDEN_FIXTURE.audioDurationMs / 1000}s` },
                { label: "Scene Count", value: GOLDEN_FIXTURE.expectedSceneCount },
                { label: "Scene Duration", value: `${GOLDEN_FIXTURE.expectedDurationSeconds / GOLDEN_FIXTURE.expectedSceneCount}s each` },
                { label: "Duration Tolerance", value: `±${GOLDEN_FIXTURE.durationToleranceSeconds}s` },
                { label: "Timeout", value: "25 min" },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white/5 rounded-lg p-2.5">
                  <p className="text-white/40">{label}</p>
                  <p className="text-white font-medium mt-0.5 truncate">{String(value)}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 p-2.5 bg-white/5 rounded-lg">
              <p className="text-white/40 text-xs">Theme Prompt</p>
              <p className="text-white/80 text-xs mt-0.5 italic">"{GOLDEN_FIXTURE.themePrompt}"</p>
            </div>
          </CardContent>
        </Card>

        {/* Validation Run History */}
        <Card className="bg-card border-white/10">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-white/60" />
                <CardTitle className="text-sm text-white">Validation Run History</CardTitle>
              </div>
              <Button
                variant="ghost" size="sm"
                onClick={() => refetchRuns()}
                className="text-white/40 hover:text-white h-7 px-2"
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
            </div>
            <CardDescription className="text-xs">Last 20 automated Golden Benchmark runs</CardDescription>
          </CardHeader>
          <CardContent>
            {runsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-white/40" />
              </div>
            ) : !validationRuns || validationRuns.length === 0 ? (
              <div className="text-center py-8 text-white/30">
                <Rocket className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No validation runs yet.</p>
                <p className="text-xs mt-1">Click "Run Benchmark" to start the first run.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {/* Pass/fail sparkline */}
                <div className="flex gap-0.5 mb-3">
                  {validationRuns.slice(0, 20).reverse().map((run, i) => (
                    <div
                      key={run.id}
                      title={`${new Date(run.runAt).toLocaleDateString()} — ${run.status}`}
                      className={`flex-1 h-5 rounded-sm ${
                        run.status === "passed" ? "bg-green-500/60" :
                        run.status === "failed" ? "bg-red-500/60" :
                        run.status === "running" ? "bg-yellow-500/60 animate-pulse" :
                        "bg-white/10"
                      }`}
                    />
                  ))}
                </div>
                {/* Run table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-2 text-white/40 font-medium">Run</th>
                        <th className="text-left py-2 text-white/40 font-medium">Date</th>
                        <th className="text-left py-2 text-white/40 font-medium">Status</th>
                        <th className="text-right py-2 text-white/40 font-medium">Duration</th>
                        <th className="text-right py-2 text-white/40 font-medium">Scenes</th>
                        <th className="text-right py-2 text-white/40 font-medium">Video</th>
                      </tr>
                    </thead>
                    <tbody>
                      {validationRuns.map((run) => (
                        <tr key={run.id} className="border-b border-white/5 hover:bg-white/3">
                          <td className="py-2 text-white/60">#{run.id}</td>
                          <td className="py-2 text-white/60">
                            {new Date(run.runAt).toLocaleDateString()} {new Date(run.runAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td className="py-2"><StatusBadge status={run.status} /></td>
                          <td className="py-2 text-right text-white/60">
                            {run.durationMs ? `${Math.round(run.durationMs / 1000 / 60)}m ${Math.round((run.durationMs / 1000) % 60)}s` : "—"}
                          </td>
                          <td className="py-2 text-right text-white/60">
                            {run.sceneCount !== null ? `${run.sceneCount}/${run.expectedSceneCount}` : "—"}
                          </td>
                          <td className="py-2 text-right">
                            {run.finalVideoUrl ? (
                              <a
                                href={run.finalVideoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary/90 hover:underline"
                              >
                                ▶ Watch
                              </a>
                            ) : (
                              <span className="text-white/20">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Last Run Error (if any) */}
        {lastRun?.errorMessage && (
          <Card className="bg-red-950/30 border-red-500/20">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <CardTitle className="text-sm text-red-300">Last Run Error</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-red-200/70 font-mono bg-red-950/40 rounded p-2">
                {lastRun.errorMessage}
              </p>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}
