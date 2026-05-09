import { } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle, XCircle, DollarSign, TrendingUp, TrendingDown, RefreshCw, Shield, Activity } from "lucide-react";

function HealthBadge({ isHealthy, mode }: { isHealthy: boolean; mode: string }) {
  if (mode === "disabled") return <Badge variant="outline" className="text-zinc-400 border-zinc-600">Disabled</Badge>;
  if (mode === "probe-only") return <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">Probe Only</Badge>;
  if (!isHealthy) return <Badge className="bg-red-500/20 text-red-300 border-red-500/30">Unhealthy</Badge>;
  return <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">Healthy</Badge>;
}

function ProviderCard({ provider, onModeChange, onReset }: {
  provider: any;
  onModeChange: (p: string, m: string) => void;
  onReset: (p: string) => void;
}) {
  const successColor = provider.successRate >= 80 ? "text-emerald-400" : provider.successRate >= 50 ? "text-amber-400" : "text-red-400";
  return (
    <Card className="bg-zinc-900 border-zinc-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white capitalize text-lg">{provider.provider.replace(/-/g, " ")}</CardTitle>
            <p className="text-zinc-400 text-sm mt-0.5">{provider.successCount + provider.failureCount} total renders</p>
          </div>
          <HealthBadge isHealthy={provider.isHealthy} mode={provider.mode} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-zinc-800 rounded-lg p-3">
            <p className="text-zinc-400 text-xs mb-1">Success Rate</p>
            <p className={`text-2xl font-bold ${successColor}`}>{provider.successRate}%</p>
            <p className="text-zinc-500 text-xs">{provider.successCount} succeeded</p>
          </div>
          <div className="bg-zinc-800 rounded-lg p-3">
            <p className="text-zinc-400 text-xs mb-1">Failure Rate</p>
            <p className="text-2xl font-bold text-red-400">{provider.failureRate}%</p>
            <p className="text-zinc-500 text-xs">{provider.failureCount} failed</p>
          </div>
          <div className="bg-zinc-800 rounded-lg p-3">
            <p className="text-zinc-400 text-xs mb-1">Total Spend</p>
            <p className="text-2xl font-bold text-white">${provider.totalSpendUsd}</p>
            <p className="text-zinc-500 text-xs">${provider.costPerSuccessUsd} / success</p>
          </div>
          <div className="bg-zinc-800 rounded-lg p-3">
            <p className="text-zinc-400 text-xs mb-1">Wasted Spend</p>
            <p className="text-2xl font-bold text-amber-400">${provider.wastedSpendUsd}</p>
            <p className="text-zinc-500 text-xs">${provider.costPerFailureUsd} / failure</p>
          </div>
        </div>
        {/* Consecutive failures warning */}
        {provider.consecutiveFailures >= 3 && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <p className="text-red-300 text-sm">{provider.consecutiveFailures} consecutive failures</p>
          </div>
        )}
        {/* Avg render time */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-400">Avg render time</span>
          <span className="text-white">{provider.avgRenderTimeSec}s</span>
        </div>
        {/* Controls */}
        <div className="flex items-center gap-2 pt-2 border-t border-zinc-700">
          <Select defaultValue={provider.mode} onValueChange={(v) => onModeChange(provider.provider, v)}>
            <SelectTrigger className="flex-1 bg-zinc-800 border-zinc-600 text-white text-sm h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-600">
              <SelectItem value="full" className="text-white">Full Mode</SelectItem>
              <SelectItem value="probe-only" className="text-amber-300">Probe Only</SelectItem>
              <SelectItem value="disabled" className="text-zinc-400">Disabled</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" className="h-8 border-zinc-600 text-zinc-300 hover:text-white" onClick={() => onReset(provider.provider)}>
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
  if (user && user.role !== "admin") {
    navigate("/");
    return null;
  }

  const { data: summary, refetch: refetchSummary, isLoading: loadingSummary } = trpc.providerHealth.getSummary.useQuery();
  const { data: spendStats, refetch: refetchStats } = trpc.providerHealth.getSpendStats.useQuery();
  const { data: jobCosts, refetch: refetchJobs } = trpc.providerHealth.getJobCostAnalytics.useQuery({ limit: 20 });

  const setMode = trpc.providerHealth.setProviderMode.useMutation({
    onSuccess: () => { refetchSummary(); toast.success("Provider mode updated"); },
    onError: (e) => toast.error(e.message),
  });
  const resetHealth = trpc.providerHealth.resetProviderHealth.useMutation({
    onSuccess: () => { refetchSummary(); toast.success("Provider health reset"); },
    onError: (e) => toast.error(e.message),
  });

  const refetchAll = () => { refetchSummary(); refetchStats(); refetchJobs(); };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-amber-400" />
            <div>
              <h1 className="text-xl font-bold text-white">Provider Reliability Dashboard</h1>
              <p className="text-zinc-400 text-sm">Monitor render costs, provider health, and wasted spend</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="border-zinc-600 text-zinc-300 hover:text-white" onClick={refetchAll}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Top-level spend stats */}
        {spendStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-zinc-900 border-zinc-700">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-zinc-400" />
                  <p className="text-zinc-400 text-sm">Total Provider Spend</p>
                </div>
                <p className="text-3xl font-bold text-white">${spendStats.totalSpendUsd}</p>
                <p className="text-zinc-500 text-xs mt-1">all time</p>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-700">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="w-4 h-4 text-red-400" />
                  <p className="text-zinc-400 text-sm">Wasted Spend</p>
                </div>
                <p className="text-3xl font-bold text-red-400">${spendStats.totalWastedUsd}</p>
                <p className="text-zinc-500 text-xs mt-1">{spendStats.wastedPct}% of total</p>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-700">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <p className="text-zinc-400 text-sm">Avg Cost / Video</p>
                </div>
                <p className="text-3xl font-bold text-emerald-400">${spendStats.avgCostPerCompletedVideo}</p>
                <p className="text-zinc-500 text-xs mt-1">{spendStats.completedJobs} completed videos</p>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-700">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-amber-400" />
                  <p className="text-zinc-400 text-sm">Job Success Rate</p>
                </div>
                <p className="text-3xl font-bold text-amber-400">{spendStats.successRate}%</p>
                <p className="text-zinc-500 text-xs mt-1">{spendStats.completedJobs}/{spendStats.totalJobs} jobs</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Provider cards */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Provider Health</h2>
          {loadingSummary ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1,2,3].map(i => <div key={i} className="h-64 bg-zinc-900 rounded-xl animate-pulse" />)}
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
          <Card className="bg-zinc-900 border-zinc-700">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-700">
                      <th className="text-left text-zinc-400 font-medium px-4 py-3">Job</th>
                      <th className="text-left text-zinc-400 font-medium px-4 py-3">Status</th>
                      <th className="text-right text-zinc-400 font-medium px-4 py-3">Scenes</th>
                      <th className="text-right text-zinc-400 font-medium px-4 py-3">Provider Spend</th>
                      <th className="text-right text-zinc-400 font-medium px-4 py-3">Wasted</th>
                      <th className="text-right text-zinc-400 font-medium px-4 py-3">Output</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(jobCosts ?? []).map((j: any) => (
                      <tr key={j.id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                        <td className="px-4 py-3">
                          <p className="text-white font-medium truncate max-w-[180px]">{j.title ?? `Job #${j.id}`}</p>
                          <p className="text-zinc-500 text-xs">{new Date(j.createdAt).toLocaleDateString()}</p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={
                            j.status === "completed" ? "bg-emerald-500/20 text-emerald-300" :
                            j.status === "failed" ? "bg-red-500/20 text-red-300" :
                            "bg-amber-500/20 text-amber-300"
                          }>{j.status}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right text-zinc-300">
                          {j.completedScenes ?? 0}/{j.totalScenes ?? 0}
                        </td>
                        <td className="px-4 py-3 text-right text-white font-medium">${j.providerSpendUsd}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={j.wastedPct > 20 ? "text-red-400" : "text-zinc-400"}>
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
                  <div className="text-center py-12 text-zinc-500">No job data yet</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
