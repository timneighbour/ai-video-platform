import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckCircle2, AlertTriangle, XCircle, TrendingUp, TrendingDown,
  Zap, Film, Users, DollarSign, Activity, RefreshCw, Shield,
  BarChart3, Target, Clock, Layers
} from "lucide-react";

// ── helpers ───────────────────────────────────────────────────────────────────

function pct(n: number | null | undefined, decimals = 1): string {
  if (n === null || n === undefined) return "—";
  return `${n.toFixed(decimals)}%`;
}

function usd(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return `$${n.toFixed(2)}`;
}

function num(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString();
}

function ms(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  if (n < 1000) return `${Math.round(n)}ms`;
  return `${(n / 1000).toFixed(1)}s`;
}

type Status = "green" | "amber" | "red" | "grey";

function scoreStatus(val: number | null | undefined, green: number, amber: number): Status {
  if (val === null || val === undefined) return "grey";
  if (val >= green) return "green";
  if (val >= amber) return "amber";
  return "red";
}

function StatusDot({ status }: { status: Status }) {
  const colors: Record<Status, string> = {
    green: "bg-emerald-500",
    amber: "bg-amber-400",
    red: "bg-red-500",
    grey: "bg-muted",
  };
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[status]} mr-1.5`} />;
}

function StatusBadge({ status, label }: { status: Status; label: string }) {
  const variants: Record<Status, string> = {
    green: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    amber: "bg-amber-400/15 text-amber-400 border-amber-400/30",
    red: "bg-red-500/15 text-red-400 border-red-500/30",
    grey: "bg-muted/40 text-muted-foreground border-border/70/30",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${variants[status]}`}>
      <StatusDot status={status} />
      {label}
    </span>
  );
}

function ScoreRing({ score }: { score: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;
  const color = score >= 75 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative w-36 h-36 flex items-center justify-center">
      <svg width="144" height="144" className="rotate-[-90deg]">
        <circle cx="72" cy="72" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
        <circle
          cx="72" cy="72" r={radius} fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={`${filled} ${circumference}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.8s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black text-white">{score}</span>
        <span className="text-[10px] text-white/40 uppercase tracking-widest">/ 100</span>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  status,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  status?: Status;
}) {
  return (
    <Card className="bg-card/60 border-white/[0.06] rounded-2xl">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center">
            <Icon className="w-4 h-4 text-white/50" />
          </div>
          {status && <StatusBadge status={status} label={status === "green" ? "Good" : status === "amber" ? "Watch" : status === "grey" ? "No data" : "Action needed"} />}
        </div>
        <p className="text-xl font-bold text-white mb-0.5">{value}</p>
        <p className="text-xs text-white/40">{label}</p>
        {sub && <p className="text-[10px] text-white/25 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export default function LaunchReadinessDashboard() {
  const [days, setDays] = useState(30);
  const { data, isLoading, refetch } = trpc.analytics.getLaunchReadiness.useQuery({ days });

  const score = data?.launchReadinessScore ?? 0;
  const scoreColor = score >= 75 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-red-400";
  const scoreLabel = score >= 80 ? "Launch Ready" : score >= 60 ? "Near Ready" : score >= 40 ? "Needs Work" : "Not Ready";

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-black text-white">Launch Readiness</h1>
            <p className="text-sm text-white/40 mt-0.5">Platform quality, conversion, and operational health</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-card border border-white/[0.08] rounded-xl p-1">
              {[7, 14, 30, 60].map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    days === d ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-white/10 text-white/50 bg-transparent hover:bg-white/5"
              onClick={() => refetch()}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Refresh
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64 text-white/30">
            <Zap className="w-5 h-5 mr-2 animate-pulse" />
            Loading metrics…
          </div>
        ) : !data ? (
          <div className="text-center text-white/30 py-20">No data available for this period.</div>
        ) : (
          <>
            {/* Launch Score Hero */}
            <div className="rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-white/[0.07] p-6 flex flex-col sm:flex-row items-center gap-8">
              <ScoreRing score={score} />
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className={`text-3xl font-black ${scoreColor}`}>{scoreLabel}</h2>
                  <Badge className={`${score >= 75 ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : score >= 50 ? "bg-amber-400/20 text-amber-400 border-amber-400/30" : "bg-red-500/20 text-red-400 border-red-500/30"} border text-xs`}>
                    Score: {score}/100
                  </Badge>
                </div>
                <p className="text-sm text-white/50 mb-4 max-w-lg">
                  Composite score weighted: render quality (40%), conversion (35%), cost efficiency (25%).
                  Based on the last {days} days of platform activity.
                </p>
                <div className="flex flex-wrap gap-4">
                  {[
                    { label: "Quality", value: data.scoreBreakdown.qualityScore, icon: Film },
                    { label: "Conversion", value: data.scoreBreakdown.conversionScore, icon: TrendingUp },
                    { label: "Efficiency", value: data.scoreBreakdown.efficiencyScore, icon: Zap },
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="flex items-center gap-2 bg-white/[0.04] rounded-xl px-4 py-2">
                      <Icon className="w-4 h-4 text-white/30" />
                      <div>
                        <p className="text-xs text-white/40">{label}</p>
                        <p className="text-sm font-bold text-white">{value}/100</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Render Quality */}
            <section>
              <h3 className="text-xs font-bold uppercase tracking-widest text-white/30 mb-4 flex items-center gap-2">
                <Film className="w-3.5 h-3.5" /> Render Quality
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetricCard
                  icon={CheckCircle2}
                  label="Scene Success Rate"
                  value={pct(data.quality.renderSuccessRate)}
                  sub={`${num(data.quality.completedScenes)} / ${num(data.quality.totalScenes)} scenes`}
                  status={scoreStatus(data.quality.renderSuccessRate, 85, 70)}
                />
                <MetricCard
                  icon={Activity}
                  label="Lip-Sync Pass Rate"
                  value={pct(data.quality.lipSyncPassRate)}
                  sub="Performance scenes (SyncLabs)"
                  status={scoreStatus(data.quality.lipSyncPassRate, 80, 60)}
                />
                <MetricCard
                  icon={Layers}
                  label="Hedra Pass Rate"
                  value={pct(data.quality.hedraPassRate)}
                  sub="Performance mode (Hedra)"
                  status={scoreStatus(data.quality.hedraPassRate, 80, 60)}
                />
                <MetricCard
                  icon={RefreshCw}
                  label="Avg Retry Count"
                  value={data.quality.avgRetryCount.toFixed(2)}
                  sub={`${num(data.quality.quarantinedScenes)} quarantined`}
                  status={scoreStatus(3 - data.quality.avgRetryCount, 2, 1)}
                />
              </div>
            </section>

            {/* Job Completion */}
            <section>
              <h3 className="text-xs font-bold uppercase tracking-widest text-white/30 mb-4 flex items-center gap-2">
                <BarChart3 className="w-3.5 h-3.5" /> Job Completion
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetricCard
                  icon={Target}
                  label="Job Completion Rate"
                  value={pct(data.quality.jobCompletionRate)}
                  sub={`${num(data.quality.completedJobs)} / ${num(data.quality.totalJobs)} jobs`}
                  status={scoreStatus(data.quality.jobCompletionRate, 80, 60)}
                />
                <MetricCard
                  icon={TrendingDown}
                  label="Download Rate"
                  value={pct(data.quality.downloadRate)}
                  sub="Completed jobs → downloaded"
                  status={scoreStatus(data.quality.downloadRate, 60, 40)}
                />
                <MetricCard
                  icon={DollarSign}
                  label="Avg Cost / Job"
                  value={usd(data.spend.avgCostPerJob)}
                  sub={`Total: ${usd(data.spend.totalSpendUsd)}`}
                  status="grey"
                />
                <MetricCard
                  icon={AlertTriangle}
                  label="Wasted Spend Rate"
                  value={pct(data.spend.wasteRate)}
                  sub={`${usd(data.spend.wastedSpendUsd)} wasted`}
                  status={scoreStatus(100 - (data.spend.wasteRate ?? 100), 85, 70)}
                />
              </div>
            </section>

            {/* Conversion Funnel */}
            <section>
              <h3 className="text-xs font-bold uppercase tracking-widest text-white/30 mb-4 flex items-center gap-2">
                <Users className="w-3.5 h-3.5" /> Conversion Funnel
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetricCard
                  icon={Users}
                  label="Total Visitors"
                  value={num(data.conversion.totalVisitors)}
                  sub={`Last ${days} days`}
                  status="grey"
                />
                <MetricCard
                  icon={TrendingUp}
                  label="Visitor → Signup"
                  value={pct(data.conversion.visitorToSignup)}
                  sub={`${num(data.conversion.totalSignups)} signups`}
                  status={scoreStatus(data.conversion.visitorToSignup, 5, 2)}
                />
                <MetricCard
                  icon={DollarSign}
                  label="Signup → Paid"
                  value={pct(data.conversion.signupToPaid)}
                  sub={`${num(data.conversion.totalPaid)} paid`}
                  status={scoreStatus(data.conversion.signupToPaid, 5, 2)}
                />
                <MetricCard
                  icon={Target}
                  label="Visitor → Paid"
                  value={pct(data.conversion.visitorToPaid, 2)}
                  sub="Overall conversion rate"
                  status={scoreStatus(data.conversion.visitorToPaid, 2, 0.5)}
                />
              </div>
            </section>

            {/* Provider Health */}
            <section>
              <h3 className="text-xs font-bold uppercase tracking-widest text-white/30 mb-4 flex items-center gap-2">
                <Shield className="w-3.5 h-3.5" /> Provider Health
              </h3>
              {data.providers.length === 0 ? (
                <p className="text-sm text-white/30 italic">No provider data yet.</p>
              ) : (
                <div className="rounded-2xl bg-card/60 border border-white/[0.06] overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        {["Provider", "Status", "Mode", "Success", "Failures", "Consec. Fail", "Avg Render", "Spend", "Wasted"].map((h) => (
                          <th key={h} className="text-left text-[10px] font-bold uppercase tracking-widest text-white/25 px-4 py-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.providers.map((p) => {
                        const total = p.successCount + p.failureCount;
                        const successRate = total > 0 ? (p.successCount / total) * 100 : null;
                        const st = p.isHealthy ? "green" : p.consecutiveFailures > 3 ? "red" : "amber";
                        return (
                          <tr key={p.provider} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                            <td className="px-4 py-3 font-semibold text-white">{p.provider}</td>
                            <td className="px-4 py-3"><StatusBadge status={st} label={p.isHealthy ? "Healthy" : "Degraded"} /></td>
                            <td className="px-4 py-3 text-white/50 text-xs">{p.mode}</td>
                            <td className="px-4 py-3 text-white/70">{num(p.successCount)} <span className="text-white/30 text-xs">({pct(successRate, 0)})</span></td>
                            <td className="px-4 py-3 text-white/70">{num(p.failureCount)}</td>
                            <td className="px-4 py-3">
                              <span className={p.consecutiveFailures > 3 ? "text-red-400 font-bold" : "text-white/50"}>
                                {p.consecutiveFailures}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-white/50">{ms(p.avgRenderTimeMs)}</td>
                            <td className="px-4 py-3 text-white/70">{usd(Number(p.totalSpendUsd))}</td>
                            <td className="px-4 py-3 text-amber-400/70">{usd(Number(p.wastedSpendUsd))}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Recent Spend Events (7-day breakdown) */}
            <section>
              <h3 className="text-xs font-bold uppercase tracking-widest text-white/30 mb-4 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" /> Recent Spend Events (7 days)
              </h3>
              {data.recentSpend.length === 0 ? (
                <p className="text-sm text-white/30 italic">No spend events in the last 7 days.</p>
              ) : (
                <div className="rounded-2xl bg-card/60 border border-white/[0.06] overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        {["Provider", "Status", "Count", "Total Cost", "Avg Render Time"].map((h) => (
                          <th key={h} className="text-left text-[10px] font-bold uppercase tracking-widest text-white/25 px-4 py-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentSpend.map((row, i) => {
                        const st: Status = row.status === "success" || row.status === "probe_success" ? "green"
                          : row.status === "failure" || row.status === "probe_failure" ? "red" : "amber";
                        return (
                          <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                            <td className="px-4 py-3 font-semibold text-white">{row.provider}</td>
                            <td className="px-4 py-3"><StatusBadge status={st} label={row.status} /></td>
                            <td className="px-4 py-3 text-white/70">{num(row.count)}</td>
                            <td className="px-4 py-3 text-white/70">{usd(Number(row.totalCost))}</td>
                            <td className="px-4 py-3 text-white/50">{ms(Number(row.avgRenderTimeMs))}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Abandonment Analysis */}
            <section>
              <h3 className="text-xs font-bold uppercase tracking-widest text-white/30 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5" /> Top Abandonment Points (Identified)
              </h3>
              <div className="rounded-2xl bg-card/60 border border-white/[0.06] overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      {["#", "Funnel Stage", "Drop-off Signal", "Severity", "Status"].map((h) => (
                        <th key={h} className="text-left text-[10px] font-bold uppercase tracking-widest text-white/25 px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { n: 1, stage: "Landing → Signup", signal: "Hero CTA click → OAuth bounce rate", sev: "red", status: "Tracked" },
                      { n: 2, stage: "Upload → Storyboard", signal: "No audio file → session end", sev: "amber", status: "Fixed: Sample audio CTA" },
                      { n: 3, stage: "Character Confirmation", signal: "No character photo → hard gate", sev: "amber", status: "Fixed: Skip escape route" },
                      { n: 4, stage: "Storyboard → Render", signal: "Paywall surprise (no upfront cost)", sev: "red", status: "Tracked: Cost shown pre-render" },
                      { n: 5, stage: "Render Wait", signal: "Tab close during 5–15 min render", sev: "amber", status: "Fixed: Email + browser notify" },
                      { n: 6, stage: "Post-Render → Subscribe", signal: "Modal dismissed before reading offer", sev: "amber", status: "Tracked: postFirstRenderModalShown" },
                      { n: 7, stage: "Return Visit", signal: "Return banner → /dashboard (context lost)", sev: "amber", status: "Tracked: returnBannerShown" },
                      { n: 8, stage: "Pricing Page", signal: "Scroll-to-bottom without converting", sev: "amber", status: "Fixed: Social proof + exit intent" },
                      { n: 9, stage: "Credit Depletion", signal: "LowCreditBanner fires too late (<20 credits)", sev: "amber", status: "Tracked: creditBalanceLow" },
                      { n: 10, stage: "Post-Download", signal: "No viral/social sharing hook", sev: "green", status: "Fixed: Share panel in PostRenderScreen" },
                    ].map(({ n, stage, signal, sev, status }) => {
                      const st: Status = sev as Status;
                      return (
                        <tr key={n} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-3 text-white/30 font-mono text-xs">{n}</td>
                          <td className="px-4 py-3 font-semibold text-white">{stage}</td>
                          <td className="px-4 py-3 text-white/50 text-xs max-w-xs">{signal}</td>
                          <td className="px-4 py-3"><StatusBadge status={st} label={sev === "red" ? "High" : sev === "amber" ? "Medium" : "Low"} /></td>
                          <td className="px-4 py-3 text-xs text-white/50">{status}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
