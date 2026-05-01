import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Database, RefreshCw, CheckCircle2, XCircle, Loader2, ShieldAlert, Activity } from "@/lib/icons";
import { Link } from "wouter";

export default function AdminPanel() {
  const { user } = useAuth();
  const [isReconnecting, setIsReconnecting] = useState(false);

  const {
    data: dbStatus,
    isLoading: statusLoading,
    refetch: refetchStatus,
  } = trpc.system.dbStatus.useQuery(undefined, {
    refetchInterval: 30_000, // auto-refresh every 30s
    retry: false,
  });

  const reconnect = trpc.system.reconnectDb.useMutation({
    onMutate: () => setIsReconnecting(true),
    onSuccess: (result) => {
      setIsReconnecting(false);
      if (result.success) {
        toast.success("Database reconnected", {
          description: result.message,
        });
      } else {
        toast.error("Reconnect failed", {
          description: result.message,
        });
      }
      refetchStatus();
    },
    onError: (err) => {
      setIsReconnecting(false);
      toast.error("Reconnect failed", { description: err.message });
      refetchStatus();
    },
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <ShieldAlert className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
            <CardTitle>Access Restricted</CardTitle>
            <CardDescription>You must be signed in to access the admin panel.</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/">
              <Button variant="outline">Return Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <ShieldAlert className="w-12 h-12 mx-auto text-destructive mb-2" />
            <CardTitle>Forbidden</CardTitle>
            <CardDescription>This panel is restricted to administrators only.</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/dashboard">
              <Button variant="outline">Return to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const connected = dbStatus?.connected;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">WIZ AI Admin Panel</h1>
              <p className="text-xs text-muted-foreground">System management — owner access only</p>
            </div>
          </div>
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">← Dashboard</Button>
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* Database Status Card */}
        <Card className="border border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-muted-foreground" />
                <CardTitle className="text-base">Database Connection</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetchStatus()}
                disabled={statusLoading}
                className="text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${statusLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
            <CardDescription>
              Live status of the MySQL / TiDB connection. Auto-refreshes every 30 seconds.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Status indicator */}
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/40 border border-border">
              {statusLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              ) : connected ? (
                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-destructive shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {statusLoading ? "Checking…" : connected ? "Connected" : "Disconnected"}
                  </span>
                  {!statusLoading && (
                    <Badge
                      variant={connected ? "default" : "destructive"}
                      className={`text-xs ${connected ? "bg-green-500/15 text-green-600 border-green-500/30 hover:bg-green-500/15" : ""}`}
                    >
                      {connected ? "LIVE" : "OFFLINE"}
                    </Badge>
                  )}
                </div>
                {dbStatus?.message && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{dbStatus.message}</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Reconnect button */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Force Reconnect</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Resets the cached database instance and establishes a fresh connection.
                  Use this if queries are failing after a long idle period.
                </p>
              </div>
              <Button
                onClick={() => reconnect.mutate()}
                disabled={isReconnecting || statusLoading}
                className="shrink-0 bg-gradient-to-r from-[#b8892a] to-[#8a6520] hover:from-[#c99a35] hover:to-[#9a7530] text-white font-semibold"
              >
                {isReconnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Reconnecting…
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reconnect Database
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* System Health Card */}
        <Card className="border border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-muted-foreground" />
              <CardTitle className="text-base">System Health</CardTitle>
            </div>
            <CardDescription>
              Overview of background workers and services.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: "TrimWorker", description: "Background audio trim queue (10s interval)", status: "running" },
                { label: "ReEngagement Cron", description: "Hourly user re-engagement check", status: "running" },
                { label: "OAuth Service", description: "Manus OAuth session management", status: "running" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  <Badge className="bg-green-500/15 text-green-600 border-green-500/30 hover:bg-green-500/15 text-xs">
                    {item.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card className="border border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Admin Tools</CardTitle>
            <CardDescription>Quick access to other admin sections.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Link href="/admin/analytics">
              <Button size="sm" className="bg-gradient-to-r from-[#b8892a] to-[#8a6520] hover:from-[#c99a35] hover:to-[#9a7530] text-white font-semibold">Analytics Dashboard</Button>
            </Link>
            <Link href="/admin/email">
              <Button size="sm" variant="outline" className="border-[#b8892a]/40 text-[#e8c97a] hover:bg-[#b8892a]/10">📧 Email Management</Button>
            </Link>
            <Link href="/blog/admin">
              <Button variant="outline" size="sm">Blog Admin</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" size="sm">User Dashboard</Button>
            </Link>
            <Link href="/pricing">
              <Button variant="outline" size="sm">Pricing Page</Button>
            </Link>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
