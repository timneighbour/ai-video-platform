/**
 * Admin Credits Panel — /admin/credits
 * Allows Tim to:
 * - Search users and view their credit balances
 * - Manually add or deduct credits with a reason note
 * - View and resolve credit disputes submitted by users
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Zap, ArrowLeft, CheckCircle2, XCircle, AlertCircle, User, Clock } from "@/lib/icons";

const GOLD = "#C9A84C";

function formatDate(d: Date | string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

type DisputeStatus = "pending" | "approved" | "partial" | "rejected";

const STATUS_COLORS: Record<DisputeStatus, string> = {
  pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  approved: "bg-green-500/20 text-green-400 border-green-500/30",
  partial: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  rejected: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function AdminCreditsPanel() {
  const { user, loading: isLoading } = useAuth();
  const [, navigate] = useLocation();

  // User search
  const [searchQuery, setSearchQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const { data: searchResults, isFetching: searching } = trpc.adminCredits.searchUsers.useQuery(
    { query: activeQuery },
    { enabled: activeQuery.length >= 2 }
  );

  // Selected user for credit adjustment
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const { data: userCredits, refetch: refetchUser } = trpc.adminCredits.getUserCredits.useQuery(
    { userId: selectedUserId! },
    { enabled: !!selectedUserId }
  );

  // Credit adjustment dialog
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const adjustMutation = trpc.adminCredits.adjustCredits.useMutation({
    onSuccess: (data) => {
      toast.success(`Credits adjusted. New balance: ${data.newBalance}`);
      setAdjustOpen(false);
      setAdjustAmount("");
      setAdjustReason("");
      refetchUser();
    },
    onError: (e) => toast.error(e.message),
  });

  // Disputes
  const [disputeStatus, setDisputeStatus] = useState<"pending" | "all">("pending");
  const { data: disputes, refetch: refetchDisputes } = trpc.adminCredits.listDisputes.useQuery({ status: disputeStatus });

  // Resolve dispute dialog
  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolveDispute, setResolveDispute] = useState<{ id: number; creditsCharged: number; userName: string } | null>(null);
  const [resolveAmount, setResolveAmount] = useState("");
  const [resolveNote, setResolveNote] = useState("");
  const [resolveType, setResolveType] = useState<"approved" | "partial" | "rejected">("approved");
  const resolveMutation = trpc.adminCredits.resolveDispute.useMutation({
    onSuccess: () => {
      toast.success("Dispute resolved");
      setResolveOpen(false);
      setResolveAmount("");
      setResolveNote("");
      refetchDisputes();
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center"><div className="animate-spin w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent" /></div>;
  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Card className="bg-[#111] border-white/10 max-w-sm w-full mx-4">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="text-white font-semibold mb-1">Admin Access Required</p>
            <p className="text-gray-400 text-sm">This panel is restricted to administrators.</p>
            <Button className="mt-4" variant="outline" onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-200">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-white/10 backdrop-blur-md bg-[#0a0a0a]/90">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate("/admin")} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <Zap className="w-5 h-5" style={{ color: GOLD }} />
          <span className="font-bold text-white">Credit Management</span>
          <Badge variant="outline" className="ml-auto border-amber-500/40 text-amber-400 text-xs">Admin Only</Badge>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <Tabs defaultValue="users">
          <TabsList className="bg-white/5 border border-white/10 mb-6">
            <TabsTrigger value="users" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
              <User className="w-4 h-4 mr-2" />Users
            </TabsTrigger>
            <TabsTrigger value="disputes" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
              <AlertCircle className="w-4 h-4 mr-2" />
              Disputes
              {disputes && disputes.filter(d => d.dispute.status === "pending").length > 0 && (
                <Badge className="ml-2 bg-red-500 text-white text-xs px-1.5 py-0">{disputes.filter(d => d.dispute.status === "pending").length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── Users Tab ── */}
          <TabsContent value="users">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Search */}
              <div>
                <Card className="bg-[#111] border-white/10">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-white">Search Users</CardTitle>
                    <CardDescription>Search by name or email address</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 mb-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <Input
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && setActiveQuery(searchQuery)}
                          placeholder="Name or email…"
                          className="pl-9 bg-white/5 border-white/10 text-white"
                        />
                      </div>
                      <Button onClick={() => setActiveQuery(searchQuery)} disabled={searchQuery.length < 2} className="shrink-0" style={{ background: GOLD, color: "#000" }}>
                        Search
                      </Button>
                    </div>

                    {searching && <p className="text-sm text-gray-500 text-center py-4">Searching…</p>}

                    {searchResults && searchResults.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">No users found for "{activeQuery}"</p>
                    )}

                    <div className="space-y-2">
                      {searchResults?.map(u => (
                        <button
                          key={u.id}
                          onClick={() => setSelectedUserId(u.id)}
                          className={`w-full text-left p-3 rounded-xl transition-colors ${selectedUserId === u.id ? "bg-amber-500/15 border border-amber-500/30" : "bg-white/4 border border-white/8 hover:bg-white/8"}`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-white">{u.name ?? "—"}</p>
                              <p className="text-xs text-gray-500">{u.email}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold" style={{ color: GOLD }}>{u.creditBalance} cr</p>
                              <Badge variant="outline" className="text-xs border-white/20 text-gray-500">{u.role}</Badge>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* User Detail */}
              <div>
                {!selectedUserId ? (
                  <Card className="bg-[#111] border-white/10 h-full flex items-center justify-center">
                    <CardContent className="text-center py-12">
                      <User className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-500 text-sm">Select a user to view their credits</p>
                    </CardContent>
                  </Card>
                ) : userCredits ? (
                  <Card className="bg-[#111] border-white/10">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base text-white">{userCredits.user.name ?? "—"}</CardTitle>
                          <CardDescription>{userCredits.user.email}</CardDescription>
                        </div>
                        <Button size="sm" onClick={() => setAdjustOpen(true)} style={{ background: GOLD, color: "#000" }}>
                          Adjust Credits
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* Balance summary */}
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        {[
                          { label: "Balance", value: userCredits.credits.balance, color: GOLD },
                          { label: "Total Earned", value: userCredits.credits.totalEarned, color: "#4ade80" },
                          { label: "Total Spent", value: userCredits.credits.totalSpent, color: "#f87171" },
                        ].map(item => (
                          <div key={item.label} className="p-3 rounded-xl text-center bg-white/4 border border-white/8">
                            <p className="text-lg font-bold" style={{ color: item.color }}>{item.value}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{item.label}</p>
                          </div>
                        ))}
                      </div>

                      {/* Transaction history */}
                      <p className="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wider">Recent Transactions</p>
                      <div className="space-y-1.5 max-h-64 overflow-y-auto">
                        {userCredits.history.length === 0 && <p className="text-xs text-gray-600 text-center py-4">No transactions yet</p>}
                        {userCredits.history.map(tx => (
                          <div key={tx.id} className="flex items-center justify-between p-2.5 rounded-lg bg-white/3 border border-white/6">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-gray-300 truncate">{tx.description ?? tx.type}</p>
                              <p className="text-xs text-gray-600">{formatDate(tx.createdAt)}</p>
                            </div>
                            <span className={`text-sm font-bold ml-3 shrink-0 ${tx.amount > 0 ? "text-green-400" : "text-red-400"}`}>
                              {tx.amount > 0 ? "+" : ""}{tx.amount}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            </div>
          </TabsContent>

          {/* ── Disputes Tab ── */}
          <TabsContent value="disputes">
            <div className="flex items-center gap-3 mb-4">
              <Button
                size="sm"
                variant={disputeStatus === "pending" ? "default" : "outline"}
                onClick={() => setDisputeStatus("pending")}
                style={disputeStatus === "pending" ? { background: GOLD, color: "#000" } : {}}
              >Pending</Button>
              <Button
                size="sm"
                variant={disputeStatus === "all" ? "default" : "outline"}
                onClick={() => setDisputeStatus("all")}
                style={disputeStatus === "all" ? { background: GOLD, color: "#000" } : {}}
              >All Disputes</Button>
            </div>

            {!disputes || disputes.length === 0 ? (
              <Card className="bg-[#111] border-white/10">
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3" />
                  <p className="text-gray-400">No {disputeStatus === "pending" ? "pending " : ""}disputes</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {disputes.map(({ dispute, userName, userEmail }) => (
                  <Card key={dispute.id} className="bg-[#111] border-white/10">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={`text-xs border ${STATUS_COLORS[dispute.status as DisputeStatus] ?? ""}`}>{dispute.status}</Badge>
                            <span className="text-xs text-gray-500">#{dispute.id}</span>
                            <span className="text-xs text-gray-500">·</span>
                            <span className="text-xs text-gray-500">{formatDate(dispute.createdAt)}</span>
                          </div>
                          <p className="text-sm font-semibold text-white">{userName ?? userEmail ?? `User #${dispute.userId}`}</p>
                          <p className="text-xs text-gray-500 mb-2">{userEmail}</p>
                          <div className="flex items-center gap-3 text-xs text-gray-400 mb-2">
                            <span>Charged: <strong className="text-white">{dispute.creditsCharged} cr</strong></span>
                            {dispute.creditsRequested && <span>Requested: <strong className="text-amber-400">{dispute.creditsRequested} cr</strong></span>}
                            {dispute.creditsRefunded > 0 && <span>Refunded: <strong className="text-green-400">{dispute.creditsRefunded} cr</strong></span>}
                            <span>Type: <strong className="text-white">{dispute.jobType}</strong></span>
                          </div>
                          <p className="text-sm text-gray-300 bg-white/4 rounded-lg p-3 border border-white/8">{dispute.reason}</p>
                          {dispute.adminNote && (
                            <p className="text-xs text-gray-500 mt-2 italic">Admin note: {dispute.adminNote}</p>
                          )}
                        </div>
                        {dispute.status === "pending" && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setResolveDispute({ id: dispute.id, creditsCharged: dispute.creditsCharged, userName: userName ?? userEmail ?? `User #${dispute.userId}` });
                              setResolveAmount(String(dispute.creditsCharged));
                              setResolveType("approved");
                              setResolveOpen(true);
                            }}
                            style={{ background: GOLD, color: "#000" }}
                          >
                            Resolve
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Adjust Credits Dialog */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent className="bg-[#111] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust Credits — {userCredits?.user.name ?? "User"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">Amount (positive = add, negative = deduct)</label>
              <Input
                type="number"
                value={adjustAmount}
                onChange={e => setAdjustAmount(e.target.value)}
                placeholder="e.g. 100 or -50"
                className="bg-white/5 border-white/10 text-white"
              />
              <p className="text-xs text-gray-600 mt-1">Current balance: <strong className="text-amber-400">{userCredits?.credits.balance ?? 0} credits</strong></p>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">Reason (required)</label>
              <Textarea
                value={adjustReason}
                onChange={e => setAdjustReason(e.target.value)}
                placeholder="e.g. Goodwill credit for render issue on 2 May 2026"
                className="bg-white/5 border-white/10 text-white resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                const amount = parseInt(adjustAmount);
                if (isNaN(amount) || amount === 0) return toast.error("Enter a non-zero amount");
                if (!adjustReason.trim()) return toast.error("Reason is required");
                if (!selectedUserId) return;
                adjustMutation.mutate({ userId: selectedUserId, amount, reason: adjustReason });
              }}
              disabled={adjustMutation.isPending}
              style={{ background: GOLD, color: "#000" }}
            >
              {adjustMutation.isPending ? "Saving…" : "Apply Adjustment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve Dispute Dialog */}
      <Dialog open={resolveOpen} onOpenChange={setResolveOpen}>
        <DialogContent className="bg-[#111] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Resolve Dispute — {resolveDispute?.userName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex gap-2">
              {(["approved", "partial", "rejected"] as const).map(type => (
                <button
                  key={type}
                  onClick={() => {
                    setResolveType(type);
                    if (type === "approved") setResolveAmount(String(resolveDispute?.creditsCharged ?? 0));
                    if (type === "rejected") setResolveAmount("0");
                  }}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold border transition-colors ${resolveType === type ? "border-amber-500 bg-amber-500/15 text-amber-400" : "border-white/10 text-gray-400 hover:bg-white/5"}`}
                >
                  {type === "approved" ? "✅ Full Refund" : type === "partial" ? "⚡ Partial" : "❌ Reject"}
                </button>
              ))}
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">Credits to refund</label>
              <Input
                type="number"
                value={resolveAmount}
                onChange={e => setResolveAmount(e.target.value)}
                min={0}
                max={resolveDispute?.creditsCharged ?? 0}
                className="bg-white/5 border-white/10 text-white"
              />
              <p className="text-xs text-gray-600 mt-1">Credits originally charged: <strong className="text-white">{resolveDispute?.creditsCharged ?? 0}</strong></p>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">Admin note (optional)</label>
              <Textarea
                value={resolveNote}
                onChange={e => setResolveNote(e.target.value)}
                placeholder="Internal note about this decision…"
                className="bg-white/5 border-white/10 text-white resize-none"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!resolveDispute) return;
                const amount = parseInt(resolveAmount);
                if (isNaN(amount) || amount < 0) return toast.error("Enter a valid amount");
                resolveMutation.mutate({
                  disputeId: resolveDispute.id,
                  resolution: resolveType,
                  creditsToRefund: amount,
                  adminNote: resolveNote || undefined,
                });
              }}
              disabled={resolveMutation.isPending}
              style={{ background: GOLD, color: "#000" }}
            >
              {resolveMutation.isPending ? "Saving…" : "Confirm Resolution"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
