import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle, XCircle, DollarSign, TrendingUp, TrendingDown, RefreshCw, Shield, Activity, Clock, Play, Zap } from "lucide-react";

function HealthBadge({ isHealthy, mode }: { isHealthy: boolean; mode: string }) {
  if (mode === "disabled") return <Badge variant="outline" className="text-muted-foreground border-border/70">Disabled</Badge>;
  if (mode === "probe-only") return <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">Probe Only</Badge>;
  if (!isHealthy) return <Badge className="bg-red-500/20 text-red-300 border-red-500/30">Unhealthy</Badge>;
  return <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">Healthy</Badge>;
}

function timeAgo(date: string | Date | null | undefined): string {
  if (!date) return "Never";
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d ago`;
}

function ProviderCard({ provider, onModeChange, onReset }: {
  provider: any;
  onModeChange: (p: string, m: string) => void;
  onReset: (p: string) => void;
}) {
  const successColor = provider.successRate >= 80 ? "text-emerald-400" : provider.successRate >= 50 ? "text-amber-400" : "text-red-400";
  const neverRendered = provider.successCount + provider.failureCount === 0;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white capitalize text-lg">{provider.provider.replace(/-/g, " ")}</CardTitle>
            <p className="text-muted-foreground text-sm mt-0.5">{provider.successCount + provider.failureCount} total renders</p>
          </div>
          <HealthBadge isHealthy={provider.isHealthy} mode={provider.mode} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-secondary rounded-lg p-3">
            <p className="text-muted-foreground text-xs mb-1">Success Rate</p>
            <p className={`text-2xl font-bold ${neverRendered ? "text-muted-foreground/70" : successColor}`}>
              {neverRendered ? "—" : `${provider.successRate}%`}
            </p>
            <p className="text-muted-foreground/70 text-xs">{provider.successCount} succeeded</p>
          </div>
          <div className="bg-secondary rounded-lg p-3">
            <p className="text-muted-foreground text-xs mb-1">Failure Rate</p>
            <p className={`text-2xl font-bold ${neverRendered ? "text-muted-foreground/70" : "text-red-400"}`}>
              {neverRendered ? "—" : `${provider.failureRate}%`}
            </p>
            <p className="text-muted-foreground/70 text-xs">{provider.failureCount} failed</p>
          </div>
          <div className="bg-secondary rounded-lg p-3">
            <p className="text-muted-foreground text-xs mb-1">Total Spend</p>
            <p className="text-2xl font-bold text-white">${provider.totalSpendUsd}</p>
            <p className="text-muted-foreground/70 text-xs">${provider.costPerSuccessUsd} / success</p>
          </div>
          <div className="bg-secondary rounded-lg p-3">
            <p className="text-muted-foreground text-xs mb-1">Wasted Spend</p>
            <p className="text-2xl font-bold text-amber-400">${provider.wastedSpendUsd}</p>
            <p className="text-muted-foreground/70 text-xs">${provider.costPerFailureUsd} / failure</p>
          </div>
        </div>

        {/* Last render timestamps */}
        <div className="bg-secondary rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Last success
            </span>
            <span className={provider.lastSuccessAt ? "text-emerald-300" : "text-muted-foreground/70"}>
              {timeAgo(provider.lastSuccessAt)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5 text-red-400" /> Last failure
            </span>
            <span className={provider.lastFailureAt ? "text-red-300" : "text-muted-foreground/70"}>
              {timeAgo(provider.lastFailureAt)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" /> Avg render time
            </span>
            <span className="text-white">{provider.avgRenderTimeSec}s</span>
          </div>
        </div>

        {/* Consecutive failures warning */}
        {provider.consecutiveFailures >= 3 && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <p className="text-red-300 text-sm">{provider.consecutiveFailures} consecutive failures</p>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <Select defaultValue={provider.mode} onValueChange={(v) => onModeChange(provider.provider, v)}>
            <SelectTrigger className="flex-1 bg-secondary border-border/70 text-white text-sm h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-secondary border-border/70">
              <SelectItem value="full" className="text-white">Full Mode</SelectItem>
              <SelectItem value="probe-only" className="text-amber-300">Probe Only</SelectItem>
              <SelectItem value="disabled" className="text-muted-foreground">Disabled</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" className="h-8 border-border/70 text-foreground/80 hover:text-white" onClick={() => onReset(provider.provider)}>
            <RefreshCw className="w-3 h-3 mr-1" /> Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ProviderDashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [resumingJobId, setResumingJobId] = useState<number | null>(null);

  if (user && user.role !== "admin") {
    navigate("/");
    return null;
  }

  const { data: summary, refetch: refetchSummary, isLoading: loadingSummary } = trpc.providerHealth.getSummary.useQuery();
  const { data: spendStats, refetch: refetchStats } = trpc.providerHealth.getSpendStats.useQuery();
  const { data: jobCosts, refetch: refetchJobs } = trpc.providerHealth.getJobCostAnalytics.useQuery({ limit: 20 });
  const { data: stalledJobs, refetch: refetchStalled } = trpc.providerHealth.getProviderUnavailableJobs.useQuery();
  const { data: providerBalances, refetch: refetchBalances } = trpc.providerHealth.getProviderBalances.useQuery(undefined, { refetchInterval: 60000 });

  const setMode = trpc.providerHealth.setProviderMode.useMutation({
    onSuccess: () => { refetchSummary(); toast.success("Provider mode updated"); },
    onError: (e) => toast.error(e.message),
  });
  const resetHealth = trpc.providerHealth.resetProviderHealth.useMutation({
    onSuccess: () => { refetchSummary(); toast.success("Provider health reset"); },
    onError: (e) => toast.error(e.message),
  });
  const resumeJob = trpc.providerHealth.resumeProviderUnavailableJob.useMutation({
    onSuccess: () => {
      refetchStalled();
      refetchJobs();
      setResumingJobId(null);
      toast.success("Job resumed — will retry on next heartbeat");
    },
    onError: (e) => { setResumingJobId(null); toast.error(e.message); },
  });

  const refetchAll = () => { refetchSummary(); refetchStats(); refetchJobs(); refetchStalled(); refetchBalances(); };

  const stalledCount = stalledJobs?.length ?? 0;

  return (
    <div className="min-h-screen bg-background text-white">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-amber-400" />
            <div>
              <h1 className="text-xl font-bold text-white">Provider Reliability Dashboard</h1>
              <p className="text-muted-foreground text-sm">Monitor render costs, provider health, and stalled jobs</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {stalledCount > 0 && (
              <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-sm px-3 py-1">
                <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
                {stalledCount} stalled job{stalledCount !== 1 ? "s" : ""}
              </Badge>
            )}
            <Button variant="outline" size="sm" className="border-border/70 text-foreground/80 hover:text-white" onClick={refetchAll}>
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* Stalled Jobs Alert Panel */}
        {stalledCount > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <h2 className="text-lg font-semibold text-red-300">Stalled Jobs — Provider Unavailable</h2>
            </div>
            <Card className="bg-red-950/20 border-red-500/30">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-red-500/20">
                        <th className="text-left text-muted-foreground font-medium px-4 py-3">Job</th>
                        <th className="text-left text-muted-foreground font-medium px-4 py-3">Subscriber</th>
                        <th className="text-right text-muted-foreground font-medium px-4 py-3">Scenes</th>
                        <th className="text-right text-muted-foreground font-medium px-4 py-3">Stalled</th>
                        <th className="text-right text-muted-foreground font-medium px-4 py-3">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stalledJobs!.map((j: any) => (
                        <tr key={j.id} className="border-b border-red-500/10">
                          <td className="px-4 py-3">
                            <p className="text-white font-medium truncate max-w-[200px]">{j.title ?? `Job #${j.id}`}</p>
                            <p className="text-muted-foreground/70 text-xs">ID: {j.id}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-foreground/80">{j.userName ?? "Unknown"}</p>
                            <p className="text-muted-foreground/70 text-xs">{j.userEmail ?? "—"}</p>
                          </td>
                          <td className="px-4 py-3 text-right text-foreground/80">
                            {j.completedScenes ?? 0}/{j.totalScenes ?? 0}
                          </td>
                          <td className="px-4 py-3 text-right text-red-300 text-xs">
                            {timeAgo(j.updatedAt)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              size="sm"
                              className="h-7 bg-amber-600 hover:bg-amber-500 text-white text-xs"
                              disabled={resumingJobId === j.id}
                              onClick={() => { setResumingJobId(j.id); resumeJob.mutate({ jobId: j.id }); }}
                            >
                              <Play className="w-3 h-3 mr-1" />
                              {resumingJobId === j.id ? "Resuming…" : "Resume"}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Provider Account Balances */}
        {providerBalances && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-semibold text-white">Provider Account Balances</h2>
              <span className="text-muted-foreground/70 text-xs ml-1">(live — refreshes every 60s)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* WaveSpeed Balance */}
              <Card className={`border ${
                providerBalances.wavespeed.isCritical ? "bg-red-950/30 border-red-500/50" :
                providerBalances.wavespeed.isLow ? "bg-amber-950/30 border-amber-500/50" :
                providerBalances.wavespeed.isUnknown ? "bg-card border-border" :
                "bg-emerald-950/20 border-emerald-500/30"
              }`}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-muted-foreground" />
                      <p className="text-foreground/80 text-sm font-medium">WaveSpeed</p>
                    </div>
                    {providerBalances.wavespeed.isCritical && (
                      <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-xs">
                        <AlertTriangle className="w-3 h-3 mr-1" /> CRITICAL
                      </Badge>
                    )}
                    {!providerBalances.wavespeed.isCritical && providerBalances.wavespeed.isLow && (
                      <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">
                        <AlertTriangle className="w-3 h-3 mr-1" /> LOW
                      </Badge>
                    )}
                    {!providerBalances.wavespeed.isLow && !providerBalances.wavespeed.isUnknown && (
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs">
                        <CheckCircle className="w-3 h-3 mr-1" /> OK
                      </Badge>
                    )}
                    {providerBalances.wavespeed.isUnknown && (
                      <Badge variant="outline" className="text-muted-foreground border-border/70 text-xs">Unknown</Badge>
                    )}
                  </div>
                  <p className={`text-3xl font-bold ${
                    providerBalances.wavespeed.isCritical ? "text-red-400" :
                    providerBalances.wavespeed.isLow ? "text-amber-400" :
                    providerBalances.wavespeed.isUnknown ? "text-muted-foreground/70" :
                    "text-emerald-400"
                  }`}>
                    {providerBalances.wavespeed.isUnknown ? "—" : `$${providerBalances.wavespeed.balanceUsd?.toFixed(2)}`}
                  </p>
                  <p className="text-muted-foreground/70 text-xs mt-1">
                    {providerBalances.wavespeed.isCritical ? "⚠️ Top up immediately — renders will fail" :
                     providerBalances.wavespeed.isLow ? "Top up recommended (threshold: $20)" :
                     providerBalances.wavespeed.isUnknown ? "Could not fetch balance" :
                     "Balance healthy (threshold: $20)"}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Top-level spend stats */}
        {spendStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-card border-border">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <p className="text-muted-foreground text-sm">Total Provider Spend</p>
                </div>
                <p className="text-3xl font-bold text-white">${spendStats.totalSpendUsd}</p>
                <p className="text-muted-foreground/70 text-xs mt-1">all time</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="w-4 h-4 text-red-400" />
                  <p className="text-muted-foreground text-sm">Wasted Spend</p>
                </div>
                <p className="text-3xl font-bold text-red-400">${spendStats.totalWastedUsd}</p>
                <p className="text-muted-foreground/70 text-xs mt-1">{spendStats.wastedPct}% of total</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <p className="text-muted-foreground text-sm">Avg Cost / Video</p>
                </div>
                <p className="text-3xl font-bold text-emerald-400">${spendStats.avgCostPerCompletedVideo}</p>
                <p className="text-muted-foreground/70 text-xs mt-1">{spendStats.completedJobs} completed videos</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-amber-400" />
                  <p className="text-muted-foreground text-sm">Job Success Rate</p>
                </div>
                <p className="text-3xl font-bold text-amber-400">{spendStats.successRate}%</p>
                <p className="text-muted-foreground/70 text-xs mt-1">{spendStats.completedJobs}/{spendStats.totalJobs} jobs</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Provider cards */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Provider Health</h2>
          {loadingSummary ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1,2,3].map(i => <div key={i} className="h-64 bg-card rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(summary ?? []).map((p: any) => (
                <ProviderCard
                  key={p.provider}
                  provider={p}
                  onModeChange={(prov, mode) => setMode.mutate({ provider: prov, mode: mode as any })}
                  onReset={(prov) => resetHealth.mutate({ provider: prov })}
                />
              ))}
            </div>
          )}
        </div>

        {/* Job cost analytics */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Recent Job Costs</h2>
          <Card className="bg-card border-border">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-muted-foreground font-medium px-4 py-3">Job</th>
                      <th className="text-left text-muted-foreground font-medium px-4 py-3">Status</th>
                      <th className="text-right text-muted-foreground font-medium px-4 py-3">Scenes</th>
                      <th className="text-right text-muted-foreground font-medium px-4 py-3">Provider Spend</th>
                      <th className="text-right text-muted-foreground font-medium px-4 py-3">Wasted</th>
                      <th className="text-right text-muted-foreground font-medium px-4 py-3">Output</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(jobCosts ?? []).map((j: any) => (
                      <tr key={j.id} className="border-b border-border hover:bg-secondary/50">
                        <td className="px-4 py-3">
                          <p className="text-white font-medium truncate max-w-[180px]">{j.title ?? `Job #${j.id}`}</p>
                          <p className="text-muted-foreground/70 text-xs">{new Date(j.createdAt).toLocaleDateString()}</p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={
                            j.status === "done" ? "bg-emerald-500/20 text-emerald-300" :
                            j.status === "provider_unavailable" ? "bg-red-500/20 text-red-300" :
                            j.status === "error" ? "bg-red-500/20 text-red-300" :
                            "bg-amber-500/20 text-amber-300"
                          }>{j.status}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right text-foreground/80">
                          {j.completedScenes ?? 0}/{j.totalScenes ?? 0}
                        </td>
                        <td className="px-4 py-3 text-right text-white font-medium">${j.providerSpendUsd}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={j.wastedPct > 20 ? "text-red-400" : "text-muted-foreground"}>
                            ${j.wastedSpendUsd} ({j.wastedPct}%)
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {j.hasOutput
                            ? <CheckCircle className="w-4 h-4 text-emerald-400 ml-auto" />
                            : <XCircle className="w-4 h-4 text-red-400 ml-auto" />
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!jobCosts?.length && (
                  <div className="text-center py-12 text-muted-foreground/70">No job data yet</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
