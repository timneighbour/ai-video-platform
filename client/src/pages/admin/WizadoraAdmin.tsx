/**
 * WizAdora™ Admin Panel
 * ─────────────────────
 * Internal monitoring dashboard for WizAdora jobs, provider logs,
 * spend caps, webhook logs, and API key management.
 *
 * SECURITY: Admin-only. Not linked from any public page.
 * Route: /admin/wizadora (registered in App.tsx, admin-only guard)
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle, Clock, XCircle, Key, Activity, DollarSign, Webhook } from "lucide-react";

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
    queued: { variant: "secondary", icon: <Clock className="w-3 h-3" /> },
    processing: { variant: "default", icon: <Activity className="w-3 h-3" /> },
    completed: { variant: "outline", icon: <CheckCircle className="w-3 h-3" /> },
    failed: { variant: "destructive", icon: <XCircle className="w-3 h-3" /> },
    cancelled: { variant: "secondary", icon: <XCircle className="w-3 h-3" /> },
    submitted: { variant: "secondary", icon: <Clock className="w-3 h-3" /> },
    delivered: { variant: "outline", icon: <CheckCircle className="w-3 h-3" /> },
    skipped: { variant: "secondary", icon: <AlertTriangle className="w-3 h-3" /> },
  };
  const { variant, icon } = variants[status] ?? { variant: "secondary" as const, icon: null };
  return (
    <Badge variant={variant} className="flex items-center gap-1 w-fit">
      {icon}
      {status}
    </Badge>
  );
}

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" });
}

// ─── JOBS TAB ─────────────────────────────────────────────────────────────────
function JobsTab() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const limit = 25;

  const { data, isLoading, refetch } = trpc.wizadora.jobs.list.useQuery({
    limit,
    offset,
    status: statusFilter === "all" ? undefined : (statusFilter as any),
    search: search || undefined,
  });

  const { data: stats } = trpc.wizadora.jobs.stats.useQuery();

  return (
    <div className="space-y-4">
      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { label: "Total", value: stats.total, color: "text-foreground" },
            { label: "Queued", value: stats.queued, color: "text-yellow-400" },
            { label: "Processing", value: stats.processing, color: "text-blue-400" },
            { label: "Completed", value: stats.completed, color: "text-green-400" },
            { label: "Failed", value: stats.failed, color: "text-red-400" },
            { label: "Cancelled", value: stats.cancelled, color: "text-muted-foreground" },
          ].map(({ label, value, color }) => (
            <Card key={label} className="bg-card/50">
              <CardContent className="p-3 text-center">
                <div className={`text-2xl font-bold ${color}`}>{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <Input
          placeholder="Search prompt..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
          className="max-w-xs"
        />
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setOffset(0); }}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="queued">Queued</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => refetch()}>Refresh</Button>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">Job ID</TableHead>
              <TableHead>Prompt</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Credits</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Loading...</TableCell>
              </TableRow>
            ) : data?.jobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No jobs found.</TableCell>
              </TableRow>
            ) : (
              data?.jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="font-mono text-xs">{job.id.slice(0, 8)}…</TableCell>
                  <TableCell className="max-w-xs truncate text-sm">{job.prompt}</TableCell>
                  <TableCell><StatusBadge status={job.status} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{job.provider}</TableCell>
                  <TableCell className="text-xs">
                    {job.creditsCharged > 0 ? `${job.creditsCharged} charged` : `${job.creditsReserved} reserved`}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(job.createdAt)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex gap-2 items-center text-sm text-muted-foreground">
        <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))}>
          Previous
        </Button>
        <span>Showing {offset + 1}–{offset + (data?.jobs.length ?? 0)} of {data?.total ?? 0}</span>
        <Button
          variant="outline"
          size="sm"
          disabled={(data?.jobs.length ?? 0) < limit}
          onClick={() => setOffset(offset + limit)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

// ─── PROVIDER LOGS TAB ────────────────────────────────────────────────────────
function ProviderLogsTab() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [offset, setOffset] = useState(0);
  const limit = 25;

  const { data, isLoading, refetch } = trpc.wizadora.providerLogs.list.useQuery({
    limit,
    offset,
    status: statusFilter === "all" ? undefined : (statusFilter as any),
    provider: "atlas_cloud",
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <Badge variant="outline" className="text-green-400 border-green-400">Atlas Cloud Only</Badge>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setOffset(0); }}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => refetch()}>Refresh</Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Log ID</TableHead>
              <TableHead>Job ID</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Est. Cost</TableHead>
              <TableHead>Actual Cost</TableHead>
              <TableHead>Submitted</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">Loading...</TableCell>
              </TableRow>
            ) : data?.logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No provider logs found.</TableCell>
              </TableRow>
            ) : (
              data?.logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-xs">{log.id}</TableCell>
                  <TableCell className="font-mono text-xs">{log.jobId.slice(0, 8)}…</TableCell>
                  <TableCell className="text-xs">{log.provider}</TableCell>
                  <TableCell><StatusBadge status={log.status} /></TableCell>
                  <TableCell className="text-xs">£{log.estimatedCost ?? "—"}</TableCell>
                  <TableCell className="text-xs">£{log.actualCost ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(log.submittedAt)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── SPEND CAPS TAB ───────────────────────────────────────────────────────────
function SpendCapsTab() {
  const { data, isLoading, refetch } = trpc.wizadora.spendCaps.list.useQuery({ limit: 50, offset: 0 });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Spend caps are checked before every provider submission. Hard stop if any cap is exceeded.
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>Refresh</Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User ID</TableHead>
              <TableHead>Per-Job Cap</TableHead>
              <TableHead>Daily Cap</TableHead>
              <TableHead>Daily Spent</TableHead>
              <TableHead>Monthly Cap</TableHead>
              <TableHead>Monthly Spent</TableHead>
              <TableHead>Account Cap</TableHead>
              <TableHead>Total Spent</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">Loading...</TableCell>
              </TableRow>
            ) : data?.caps.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">No spend cap records yet.</TableCell>
              </TableRow>
            ) : (
              data?.caps.map((cap) => (
                <TableRow key={cap.id}>
                  <TableCell className="font-mono text-xs">{cap.userId}</TableCell>
                  <TableCell className="text-xs">£{cap.perJobCapGbp}</TableCell>
                  <TableCell className="text-xs">£{cap.dailyCapGbp}</TableCell>
                  <TableCell className="text-xs text-yellow-400">£{cap.dailySpentGbp}</TableCell>
                  <TableCell className="text-xs">£{cap.monthlyCapGbp}</TableCell>
                  <TableCell className="text-xs text-yellow-400">£{cap.monthlySpentGbp}</TableCell>
                  <TableCell className="text-xs">£{cap.accountCapGbp}</TableCell>
                  <TableCell className="text-xs text-yellow-400">£{cap.totalSpentGbp}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(cap.updatedAt)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── WEBHOOK LOGS TAB ─────────────────────────────────────────────────────────
function WebhookLogsTab() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data, isLoading, refetch } = trpc.wizadora.webhookLogs.list.useQuery({
    limit: 25,
    offset: 0,
    status: statusFilter === "all" ? undefined : (statusFilter as any),
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="skipped">Skipped</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => refetch()}>Refresh</Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Job ID</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Attempts</TableHead>
              <TableHead>Response</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">Loading...</TableCell>
              </TableRow>
            ) : data?.logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No webhook logs yet.</TableCell>
              </TableRow>
            ) : (
              data?.logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-xs">{log.id}</TableCell>
                  <TableCell className="font-mono text-xs">{log.jobId.slice(0, 8)}…</TableCell>
                  <TableCell className="text-xs">{log.eventType}</TableCell>
                  <TableCell><StatusBadge status={log.deliveryStatus} /></TableCell>
                  <TableCell className="text-xs">{log.attemptCount}</TableCell>
                  <TableCell className="text-xs">{log.responseCode ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(log.createdAt)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── API KEYS TAB ─────────────────────────────────────────────────────────────
function ApiKeysTab() {
  const [newLabel, setNewLabel] = useState("");
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);

  const { data, refetch } = trpc.wizadora.apiKeys.list.useQuery();

  const createKey = trpc.wizadora.apiKeys.create.useMutation({
    onSuccess: (result) => {
      setNewKey(result.rawKey);
      setNewLabel("");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const revokeKey = trpc.wizadora.apiKeys.revoke.useMutation({
    onSuccess: () => { toast.success("Key revoked"); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      {/* Create new key */}
      <Card className="bg-card/50">
        <CardHeader>
          <CardTitle className="text-base">Create API Key</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Key label (e.g. internal-test-1)"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="max-w-xs"
            />
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={newIsAdmin}
                onChange={(e) => setNewIsAdmin(e.target.checked)}
                className="rounded"
              />
              Admin key
            </label>
            <Button
              size="sm"
              disabled={!newLabel.trim() || createKey.isPending}
              onClick={() => createKey.mutate({ label: newLabel.trim(), isAdmin: newIsAdmin })}
            >
              {createKey.isPending ? "Creating…" : "Create Key"}
            </Button>
          </div>

          {newKey && (
            <div className="p-3 bg-yellow-950/30 border border-yellow-700 rounded-md space-y-1">
              <p className="text-xs text-yellow-400 font-medium">⚠ Store this key securely — it will not be shown again.</p>
              <code className="text-xs font-mono break-all text-yellow-200">{newKey}</code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { navigator.clipboard.writeText(newKey); toast.success("Copied!"); }}
              >
                Copy
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Keys table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Prefix</TableHead>
              <TableHead>Label</TableHead>
              <TableHead>Owner ID</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Used</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.keys.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">No API keys yet.</TableCell>
              </TableRow>
            ) : (
              data?.keys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell className="font-mono text-xs">{key.keyPrefix}</TableCell>
                  <TableCell className="text-sm">{key.label}</TableCell>
                  <TableCell className="text-xs">{key.ownerId}</TableCell>
                  <TableCell>
                    {key.isAdmin ? <Badge variant="default">Admin</Badge> : <Badge variant="secondary">Standard</Badge>}
                  </TableCell>
                  <TableCell>
                    {key.isActive
                      ? <Badge variant="outline" className="text-green-400 border-green-400">Active</Badge>
                      : <Badge variant="destructive">Revoked</Badge>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(key.lastUsedAt)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(key.expiresAt)}</TableCell>
                  <TableCell>
                    {key.isActive && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Revoke key "${key.label}"?`)) {
                            revokeKey.mutate({ keyId: key.id });
                          }
                        }}
                      >
                        Revoke
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function WizadoraAdmin() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading…</div>
      </div>
    );
  }

  const [, navigate] = useLocation();
  if (!user || user.role !== "admin") {
    navigate("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">WizAdora™ Admin</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Internal monitoring — Atlas Cloud only — not publicly linked
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-green-400 border-green-400">
              <CheckCircle className="w-3 h-3 mr-1" />
              Atlas Cloud Active
            </Badge>
            <Badge variant="secondary" className="text-red-400">
              <XCircle className="w-3 h-3 mr-1" />
              fal.ai Disabled
            </Badge>
            <Badge variant="secondary" className="text-red-400">
              <XCircle className="w-3 h-3 mr-1" />
              WaveSpeed Disabled
            </Badge>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="jobs">
          <TabsList className="grid w-full grid-cols-4 max-w-xl">
            <TabsTrigger value="jobs" className="flex items-center gap-1">
              <Activity className="w-3 h-3" />
              Jobs
            </TabsTrigger>
            <TabsTrigger value="provider-logs" className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              Provider Logs
            </TabsTrigger>
            <TabsTrigger value="spend-caps" className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Spend Caps
            </TabsTrigger>
            <TabsTrigger value="api-keys" className="flex items-center gap-1">
              <Key className="w-3 h-3" />
              API Keys
            </TabsTrigger>
          </TabsList>

          <TabsContent value="jobs" className="mt-6">
            <JobsTab />
          </TabsContent>

          <TabsContent value="provider-logs" className="mt-6">
            <ProviderLogsTab />
          </TabsContent>

          <TabsContent value="spend-caps" className="mt-6">
            <SpendCapsTab />
          </TabsContent>

          <TabsContent value="api-keys" className="mt-6">
            <ApiKeysTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
