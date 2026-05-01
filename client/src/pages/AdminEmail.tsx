/**
 * Admin Email Management Page
 *
 * Features:
 *  1. Subscriber list with CSV export (for Zoho CRM import)
 *  2. Broadcast email composer (send to all subscribers via Resend)
 *  3. Past broadcasts history
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Download,
  Send,
  Users,
  Mail,
  Clock,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
} from "@/lib/icons";
import { Link } from "wouter";

// ── CSV export helper ────────────────────────────────────────────────────────
function downloadCSV(
  rows: Array<{
    id: number;
    name: string;
    email: string;
    plan: string;
    role: string;
    joinedAt: Date;
    lastSignedIn: Date;
  }>
) {
  const headers = ["ID", "Name", "Email", "Plan", "Role", "Joined", "Last Sign-In"];
  const csvRows = [
    headers.join(","),
    ...rows.map((r) =>
      [
        r.id,
        `"${(r.name || "").replace(/"/g, '""')}"`,
        r.email,
        r.plan,
        r.role,
        new Date(r.joinedAt).toISOString().split("T")[0],
        new Date(r.lastSignedIn).toISOString().split("T")[0],
      ].join(",")
    ),
  ];
  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `wiz-ai-subscribers-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AdminEmail() {
  const { user } = useAuth();
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState(
    `<p>Hi {{name}},</p>\n\n<p>We have some exciting news to share with you...</p>\n\n<p>Best regards,<br/>Tim<br/><strong>WIZ AI</strong></p>`
  );
  const [showPreview, setShowPreview] = useState(false);
  const [showSubscribers, setShowSubscribers] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);

  const { data: subscribers, isLoading: subLoading } = trpc.adminEmail.listSubscribers.useQuery();
  const { data: broadcasts, isLoading: broadcastLoading, refetch: refetchBroadcasts } =
    trpc.adminEmail.listBroadcasts.useQuery();

  const sendBroadcast = trpc.adminEmail.sendBroadcast.useMutation({
    onSuccess: (result) => {
      toast.success(`Broadcast sent to ${result.recipientCount} subscribers!`, {
        description: `Subject: "${subject}"`,
      });
      setSubject("");
      setBodyHtml(
        `<p>Hi {{name}},</p>\n\n<p>We have some exciting news to share with you...</p>\n\n<p>Best regards,<br/>Tim<br/><strong>WIZ AI</strong></p>`
      );
      setConfirmSend(false);
      refetchBroadcasts();
    },
    onError: (err) => {
      toast.error("Failed to send broadcast", { description: err.message });
      setConfirmSend(false);
    },
  });

  // Access guard
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-destructive" />
              Authentication Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">Please sign in to access the admin panel.</p>
            <Link href="/">
              <Button variant="outline">Go Home</Button>
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
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-destructive" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">This page is restricted to administrators.</p>
            <Link href="/admin">
              <Button variant="outline">Back to Admin</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const subscriberCount = subscribers?.length ?? 0;
  const emailCount = subscribers?.filter((s) => s.email).length ?? 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Link href="/admin" className="hover:text-foreground transition-colors">
                  Admin
                </Link>
                <span>/</span>
                <span>Email</span>
              </div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Mail className="w-6 h-6 text-primary" />
                Email Management
              </h1>
              <p className="text-muted-foreground mt-1">
                Send broadcast emails and export your subscriber list
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-primary">{emailCount}</div>
              <div className="text-sm text-muted-foreground">subscribers with email</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* ── Subscriber Export ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Subscriber List
                </CardTitle>
                <CardDescription>
                  Export your full subscriber list as CSV to import into Zoho CRM or Zoho Campaigns
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSubscribers((v) => !v)}
                  disabled={subLoading}
                >
                  {showSubscribers ? (
                    <ChevronUp className="w-4 h-4 mr-1" />
                  ) : (
                    <ChevronDown className="w-4 h-4 mr-1" />
                  )}
                  {showSubscribers ? "Hide" : "Preview"}
                </Button>
                <Button
                  onClick={() => subscribers && downloadCSV(subscribers)}
                  disabled={subLoading || !subscribers?.length}
                >
                  {subLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Export CSV ({emailCount})
                </Button>
              </div>
            </div>
          </CardHeader>
          {showSubscribers && (
            <CardContent>
              {subLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50 border-b border-border">
                          <th className="text-left px-4 py-2 font-medium text-muted-foreground">Name</th>
                          <th className="text-left px-4 py-2 font-medium text-muted-foreground">Email</th>
                          <th className="text-left px-4 py-2 font-medium text-muted-foreground">Plan</th>
                          <th className="text-left px-4 py-2 font-medium text-muted-foreground">Joined</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subscribers?.slice(0, 20).map((s) => (
                          <tr key={s.id} className="border-b border-border/50 hover:bg-muted/20">
                            <td className="px-4 py-2">{s.name || <span className="text-muted-foreground italic">—</span>}</td>
                            <td className="px-4 py-2 font-mono text-xs">{s.email}</td>
                            <td className="px-4 py-2">
                              <Badge variant={s.plan === "free" ? "secondary" : "default"} className="text-xs">
                                {s.plan}
                              </Badge>
                            </td>
                            <td className="px-4 py-2 text-muted-foreground">
                              {new Date(s.joinedAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {(subscribers?.length ?? 0) > 20 && (
                    <div className="px-4 py-2 text-xs text-muted-foreground bg-muted/30 border-t border-border">
                      Showing 20 of {subscribers?.length} — export CSV for the full list
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* ── Broadcast Composer ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Send Broadcast Email
            </CardTitle>
            <CardDescription>
              Compose a message and send it to all {emailCount} subscribers. Use{" "}
              <code className="bg-muted px-1 rounded text-xs">{"{{name}}"}</code> to personalise with the
              subscriber's first name.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Subject Line</label>
              <Input
                placeholder="e.g. WIZ AI Update — New features just launched 🎬"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground mt-1">{subject.length}/500 characters</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium">Email Body (HTML)</label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreview((v) => !v)}
                  className="text-xs h-7"
                >
                  {showPreview ? (
                    <>
                      <EyeOff className="w-3 h-3 mr-1" /> Hide Preview
                    </>
                  ) : (
                    <>
                      <Eye className="w-3 h-3 mr-1" /> Preview
                    </>
                  )}
                </Button>
              </div>
              <Textarea
                placeholder="Write your email body in HTML..."
                value={bodyHtml}
                onChange={(e) => setBodyHtml(e.target.value)}
                rows={10}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Tip: Use{" "}
                <code className="bg-muted px-1 rounded">{"{{name}}"}</code> to insert the subscriber's
                first name. Wrap links in{" "}
                <code className="bg-muted px-1 rounded">{"<a href='...'>text</a>"}</code>.
              </p>
            </div>

            {/* Preview */}
            {showPreview && (
              <div>
                <p className="text-sm font-medium mb-2">Preview (as rendered in email client):</p>
                <div
                  className="border border-border rounded-lg p-6 bg-[#0f0f17] text-sm"
                  style={{ maxHeight: 400, overflowY: "auto" }}
                >
                  <div
                    dangerouslySetInnerHTML={{
                      __html: bodyHtml.replace(/\{\{name\}\}/g, "Tim"),
                    }}
                  />
                </div>
              </div>
            )}

            <Separator />

            {/* Send confirmation */}
            {!confirmSend ? (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  This will send to <strong>{emailCount} subscribers</strong> via Resend.
                </p>
                <Button
                  onClick={() => setConfirmSend(true)}
                  disabled={!subject.trim() || !bodyHtml.trim() || emailCount === 0}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send Broadcast
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
                <p className="text-sm font-semibold text-amber-400 mb-1">Confirm Send</p>
                <p className="text-sm text-muted-foreground mb-4">
                  You are about to send <strong>"{subject}"</strong> to{" "}
                  <strong>{emailCount} subscribers</strong>. This cannot be undone.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setConfirmSend(false)}
                    disabled={sendBroadcast.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => sendBroadcast.mutate({ subject, bodyHtml })}
                    disabled={sendBroadcast.isPending}
                    className="bg-amber-600 hover:bg-amber-500 text-white"
                  >
                    {sendBroadcast.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Yes, Send Now
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Broadcast History ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Broadcast History
            </CardTitle>
            <CardDescription>Past mailshots sent to your subscribers</CardDescription>
          </CardHeader>
          <CardContent>
            {broadcastLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : !broadcasts?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                <Mail className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No broadcasts sent yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {broadcasts.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-start justify-between p-3 rounded-lg border border-border/60 bg-muted/20"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <p className="font-medium text-sm truncate">{b.subject}</p>
                      </div>
                      <p className="text-xs text-muted-foreground ml-6">
                        Sent to {b.recipientCount} subscribers ·{" "}
                        {new Date(b.sentAt).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant="secondary" className="ml-3 flex-shrink-0 text-xs">
                      {b.recipientCount} sent
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Back link */}
        <div className="pb-8">
          <Link href="/admin">
            <Button variant="ghost" size="sm">
              ← Back to Admin Panel
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
