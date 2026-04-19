/**
 * WIZ AI — Real-Time Analytics Dashboard
 * Admin-only page accessible at /admin/analytics
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// ── constants ─────────────────────────────────────────────────────────────────

const GOLD = "#d4af37";
const GOLD_DIM = "#a8892a";
const COLORS = [GOLD, "#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"];
const FUNNEL_COLORS = [GOLD, "#6366f1", "#22c55e", "#f59e0b"];

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function fmtDuration(secs: number): string {
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s}s`;
}

function TrendBadge({ change }: { change: number }) {
  if (change === 0) return <span className="text-xs text-zinc-500">—</span>;
  const up = change > 0;
  return (
    <span className={`text-xs font-semibold ${up ? "text-emerald-400" : "text-red-400"}`}>
      {up ? "▲" : "▼"} {Math.abs(change)}%
    </span>
  );
}

function KPICard({
  title, value, change, sub, accent,
}: { title: string; value: string; change?: number; sub?: string; accent?: boolean }) {
  return (
    <Card className={`border-zinc-800 bg-zinc-900/60 backdrop-blur ${accent ? "border-[#d4af37]/40 shadow-[0_0_20px_rgba(212,175,55,0.08)]" : ""}`}>
      <CardContent className="pt-5 pb-4">
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">{title}</p>
        <div className="flex items-end gap-3">
          <span className={`text-3xl font-bold ${accent ? "text-[#d4af37]" : "text-white"}`}>{value}</span>
          {change !== undefined && <TrendBadge change={change} />}
        </div>
        {sub && <p className="text-xs text-zinc-600 mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ── custom tooltip ────────────────────────────────────────────────────────────

function GoldTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm shadow-xl">
      <p className="text-zinc-400 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.name}: {typeof p.value === "number" ? fmtNum(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export default function AnalyticsDashboard() {
  const { user } = useAuth();
  const [days, setDays] = useState(30);

  const overviewQ = trpc.analytics.getOverview.useQuery({ days }, { refetchInterval: 60_000 });
  const timeSeriesQ = trpc.analytics.getTimeSeriesVisitors.useQuery({ days }, { refetchInterval: 120_000 });
  const pageStatsQ = trpc.analytics.getPageStats.useQuery({ days, limit: 20 }, { refetchInterval: 120_000 });
  const topEventsQ = trpc.analytics.getTopEvents.useQuery({ days, limit: 15 }, { refetchInterval: 120_000 });
  const deviceQ = trpc.analytics.getDeviceBreakdown.useQuery({ days }, { refetchInterval: 120_000 });
  const sourcesQ = trpc.analytics.getTrafficSources.useQuery({ days }, { refetchInterval: 120_000 });
  const funnelQ = trpc.analytics.getConversionFunnel.useQuery({ days }, { refetchInterval: 120_000 });
  const recentQ = trpc.analytics.getRecentSessions.useQuery({ limit: 20 }, { refetchInterval: 30_000 });

  // Access guard
  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Card className="border-zinc-800 bg-zinc-900 p-8 text-center">
          <p className="text-zinc-400 mb-4">Sign in to access analytics.</p>
          <Link href="/"><Button variant="outline">Return Home</Button></Link>
        </Card>
      </div>
    );
  }
  if (user.role !== "admin") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Card className="border-zinc-800 bg-zinc-900 p-8 text-center">
          <p className="text-red-400 font-semibold mb-2">Access Forbidden</p>
          <p className="text-zinc-500 text-sm mb-4">This page is restricted to administrators.</p>
          <Link href="/dashboard"><Button variant="outline">Return to Dashboard</Button></Link>
        </Card>
      </div>
    );
  }

  const ov = overviewQ.data;
  const ts = timeSeriesQ.data ?? [];
  const pages = pageStatsQ.data ?? [];
  const events = topEventsQ.data ?? [];
  const devices = deviceQ.data;
  const sources = sourcesQ.data ?? [];
  const funnel = funnelQ.data ?? [];
  const recent = recentQ.data ?? [];

  // Prepare device pie data
  const devicePie = useMemo(() => (devices?.devices ?? []).map((d) => ({
    name: d.device ?? "Unknown",
    value: Number(d.count),
  })), [devices]);

  const browserPie = useMemo(() => (devices?.browsers ?? []).map((b) => ({
    name: b.browser ?? "Unknown",
    value: Number(b.count),
  })), [devices]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-screen-xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white gap-2">
                ← Admin
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-bold text-white">Analytics Dashboard</h1>
              <p className="text-xs text-zinc-500">Real-time visitor behaviour &amp; page performance</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
              <SelectTrigger className="w-36 bg-zinc-900 border-zinc-700 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="14">Last 14 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="60">Last 60 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="border-zinc-700 text-zinc-400"
              onClick={() => {
                overviewQ.refetch();
                timeSeriesQ.refetch();
                pageStatsQ.refetch();
                recentQ.refetch();
              }}
            >
              ↻ Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-8">

        {/* ── KPI Row ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <KPICard
            title="Unique Visitors"
            value={ov ? fmtNum(ov.visitors.value) : "—"}
            change={ov?.visitors.change}
            accent
          />
          <KPICard
            title="Sessions"
            value={ov ? fmtNum(ov.sessions.value) : "—"}
            change={ov?.sessions.change}
          />
          <KPICard
            title="Page Views"
            value={ov ? fmtNum(ov.pageViews.value) : "—"}
            change={ov?.pageViews.change}
          />
          <KPICard
            title="Bounce Rate"
            value={ov ? `${ov.bounceRate.value}%` : "—"}
            sub="Lower is better"
          />
          <KPICard
            title="Conversion Rate"
            value={ov ? `${ov.conversionRate.value}%` : "—"}
            sub="Render or purchase"
          />
          <KPICard
            title="Avg Session"
            value={ov ? fmtDuration(ov.avgSessionDuration.value) : "—"}
          />
          <KPICard
            title="New Sign-ups"
            value={ov ? fmtNum(ov.newUsers.value) : "—"}
          />
        </div>

        {/* ── Visitor Time Series ──────────────────────────────────────────── */}
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader>
            <CardTitle className="text-white text-base">Visitors &amp; Sessions Over Time</CardTitle>
            <CardDescription className="text-zinc-500">Daily unique visitors and total sessions</CardDescription>
          </CardHeader>
          <CardContent>
            {ts.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-zinc-600 text-sm">
                No data yet — visitors will appear here as they browse the site.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={ts} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gVisitors" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={GOLD} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={GOLD} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gSessions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: "#71717a", fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<GoldTooltip />} />
                  <Legend wrapperStyle={{ color: "#a1a1aa", fontSize: 12 }} />
                  <Area type="monotone" dataKey="visitors" name="Visitors" stroke={GOLD} strokeWidth={2} fill="url(#gVisitors)" />
                  <Area type="monotone" dataKey="sessions" name="Sessions" stroke="#6366f1" strokeWidth={2} fill="url(#gSessions)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* ── Two-column: Funnel + Traffic Sources ───────────────────────── */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Conversion Funnel */}
          <Card className="border-zinc-800 bg-zinc-900/60">
            <CardHeader>
              <CardTitle className="text-white text-base">Conversion Funnel</CardTitle>
              <CardDescription className="text-zinc-500">Visitor → Sign-up → Render → Purchase</CardDescription>
            </CardHeader>
            <CardContent>
              {funnel.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-zinc-600 text-sm">No data yet</div>
              ) : (
                <div className="space-y-3">
                  {funnel.map((step, i) => (
                    <div key={step.stage}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-zinc-300">{step.stage}</span>
                        <span className="text-zinc-400">{fmtNum(step.count)} <span className="text-zinc-600 ml-1">({step.pct}%)</span></span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${step.pct}%`, backgroundColor: FUNNEL_COLORS[i] }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Traffic Sources */}
          <Card className="border-zinc-800 bg-zinc-900/60">
            <CardHeader>
              <CardTitle className="text-white text-base">Traffic Sources</CardTitle>
              <CardDescription className="text-zinc-500">Where visitors are coming from</CardDescription>
            </CardHeader>
            <CardContent>
              {sources.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-zinc-600 text-sm">No data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={sources} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                    <XAxis type="number" tick={{ fill: "#71717a", fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="source" tick={{ fill: "#a1a1aa", fontSize: 12 }} tickLine={false} axisLine={false} width={70} />
                    <Tooltip content={<GoldTooltip />} />
                    <Bar dataKey="sessions" name="Sessions" fill={GOLD} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Device & Browser Breakdown ───────────────────────────────────── */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border-zinc-800 bg-zinc-900/60">
            <CardHeader>
              <CardTitle className="text-white text-base">Device Types</CardTitle>
            </CardHeader>
            <CardContent>
              {devicePie.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-zinc-600 text-sm">No data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={devicePie} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                      {devicePie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<GoldTooltip />} />
                    <Legend wrapperStyle={{ color: "#a1a1aa", fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/60">
            <CardHeader>
              <CardTitle className="text-white text-base">Browsers</CardTitle>
            </CardHeader>
            <CardContent>
              {browserPie.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-zinc-600 text-sm">No data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={browserPie} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                      {browserPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<GoldTooltip />} />
                    <Legend wrapperStyle={{ color: "#a1a1aa", fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Tabs: Pages / Events / Live Sessions ────────────────────────── */}
        <Tabs defaultValue="pages">
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="pages" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400">
              Top Pages
            </TabsTrigger>
            <TabsTrigger value="events" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400">
              Top Events
            </TabsTrigger>
            <TabsTrigger value="live" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400">
              Live Sessions
            </TabsTrigger>
          </TabsList>

          {/* Top Pages */}
          <TabsContent value="pages">
            <Card className="border-zinc-800 bg-zinc-900/60">
              <CardContent className="pt-4">
                {pages.length === 0 ? (
                  <div className="py-12 text-center text-zinc-600 text-sm">No page view data yet — visit some pages to populate this table.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-zinc-800 hover:bg-transparent">
                        <TableHead className="text-zinc-500">Page</TableHead>
                        <TableHead className="text-zinc-500 text-right">Views</TableHead>
                        <TableHead className="text-zinc-500 text-right">Unique Visitors</TableHead>
                        <TableHead className="text-zinc-500 text-right">Avg Time</TableHead>
                        <TableHead className="text-zinc-500 text-right">Scroll Depth</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pages.map((p) => (
                        <TableRow key={p.path} className="border-zinc-800 hover:bg-zinc-800/50">
                          <TableCell className="text-zinc-200 font-mono text-sm max-w-xs truncate">{p.path}</TableCell>
                          <TableCell className="text-right text-white font-semibold">{fmtNum(Number(p.views))}</TableCell>
                          <TableCell className="text-right text-zinc-400">{fmtNum(Number(p.uniqueVisitors))}</TableCell>
                          <TableCell className="text-right text-zinc-400">{fmtDuration(Math.round(Number(p.avgTimeOnPage ?? 0)))}</TableCell>
                          <TableCell className="text-right">
                            <span className="text-zinc-400">{Math.round(Number(p.avgScrollDepth ?? 0))}%</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Top Events */}
          <TabsContent value="events">
            <Card className="border-zinc-800 bg-zinc-900/60">
              <CardContent className="pt-4">
                {events.length === 0 ? (
                  <div className="py-12 text-center text-zinc-600 text-sm">No events tracked yet — events fire as users interact with the site.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-zinc-800 hover:bg-transparent">
                        <TableHead className="text-zinc-500">Event</TableHead>
                        <TableHead className="text-zinc-500">Category</TableHead>
                        <TableHead className="text-zinc-500 text-right">Count</TableHead>
                        <TableHead className="text-zinc-500 text-right">Unique Users</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {events.map((e) => (
                        <TableRow key={e.event} className="border-zinc-800 hover:bg-zinc-800/50">
                          <TableCell className="text-zinc-200 font-mono text-sm">{e.event}</TableCell>
                          <TableCell>
                            {e.category && (
                              <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-xs">{e.category}</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-white font-semibold">{fmtNum(Number(e.count))}</TableCell>
                          <TableCell className="text-right text-zinc-400">{fmtNum(Number(e.uniqueUsers))}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Live Sessions */}
          <TabsContent value="live">
            <Card className="border-zinc-800 bg-zinc-900/60">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <CardTitle className="text-white text-base">Recent Sessions</CardTitle>
                  <CardDescription className="text-zinc-500 ml-2">Auto-refreshes every 30s</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {recent.length === 0 ? (
                  <div className="py-12 text-center text-zinc-600 text-sm">No sessions yet — sessions appear as visitors browse the site.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-zinc-800 hover:bg-transparent">
                        <TableHead className="text-zinc-500">Visitor</TableHead>
                        <TableHead className="text-zinc-500">Entry Page</TableHead>
                        <TableHead className="text-zinc-500">Device</TableHead>
                        <TableHead className="text-zinc-500 text-right">Pages</TableHead>
                        <TableHead className="text-zinc-500 text-right">Status</TableHead>
                        <TableHead className="text-zinc-500 text-right">Last Seen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recent.map((s) => (
                        <TableRow key={s.id} className="border-zinc-800 hover:bg-zinc-800/50">
                          <TableCell className="text-zinc-400 font-mono text-xs">{s.visitorId.substring(0, 10)}…</TableCell>
                          <TableCell className="text-zinc-300 text-sm max-w-xs truncate">{s.entryPage ?? "/"}</TableCell>
                          <TableCell className="text-zinc-400 text-sm capitalize">{s.device ?? "—"}</TableCell>
                          <TableCell className="text-right text-zinc-400">{s.pageCount}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              {s.converted && (
                                <Badge className="bg-emerald-900/50 text-emerald-400 border-emerald-800 text-xs">Converted</Badge>
                              )}
                              {s.bounced && !s.converted && (
                                <Badge className="bg-zinc-800 text-zinc-500 border-zinc-700 text-xs">Bounced</Badge>
                              )}
                              {!s.bounced && !s.converted && (
                                <Badge className="bg-blue-900/50 text-blue-400 border-blue-800 text-xs">Engaged</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-zinc-500 text-xs">
                            {new Date(s.lastSeenAt).toLocaleTimeString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
}
