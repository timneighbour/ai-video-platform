import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, CreditCard, Home, Key, Loader2, LogOut } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Account() {
  const { user, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [cancelLoading, setCancelLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const { data: subData, isLoading: subLoading, refetch: refetchSub } = trpc.billing.getAccountSubscription.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );
  const { data: creditData } = trpc.billing.getCredits.useQuery(undefined, { enabled: isAuthenticated });

  const cancelMutation = trpc.billing.cancelSubscription.useMutation({
    onSuccess: () => {
      toast.success("Subscription cancelled", { description: "Your subscription will remain active until the end of the current billing period." });
      refetchSub();
    },
    onError: (err) => {
      toast.error("Error", { description: err.message });
    },
  });

  const portalMutation = trpc.billing.createBillingPortalSession.useMutation({
    onSuccess: (data) => {
      if (data.url) window.open(data.url, "_blank");
    },
    onError: (err) => {
      toast.error("Error", { description: err.message });
    },
  });

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await logout();
      setLocation("/");
    } catch (err) {
      toast.error("Sign out failed", { description: "Please try again or clear your browser cookies." });
      setLogoutLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel your subscription? You'll keep access until the end of your billing period.")) return;
    setCancelLoading(true);
    try {
      await cancelMutation.mutateAsync();
    } finally {
      setCancelLoading(false);
    }
  };

  const handleUpdatePayment = async () => {
    setPortalLoading(true);
    try {
      await portalMutation.mutateAsync({ origin: window.location.origin });
    } finally {
      setPortalLoading(false);
    }
  };

  const planName = subData?.plan ?? "Free";
  const isActive = subData?.isActive ?? false;
  const pricePerMonth = subData?.pricePerMonth ?? 0;
  const periodEnd = subData?.currentPeriodEnd ? new Date(subData.currentPeriodEnd).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "—";
  const isCanceled = !!subData?.canceledAt;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/40">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-1">
            <a href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </a>
            <a href="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2">
              <Home className="h-4 w-4" />
              Home
            </a>
          </div>
          <h1 className="text-xl font-bold">Account Settings</h1>
          <div className="w-32" />
        </div>
      </div>

      {/* Content */}
      <div className="container py-8">
        <div className="grid gap-8 max-w-2xl">
          {/* Profile Section */}
          <Card className="border-border/40 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Manage your account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input value={user?.name || ""} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input value={user?.email || ""} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Member Since</label>
                <Input
                  value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : ""}
                  disabled
                  className="bg-muted"
                />
              </div>
            </CardContent>
          </Card>

          {/* Subscription Section */}
          <Card className="border-border/40 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle>Subscription</CardTitle>
              <CardDescription>Manage your subscription plan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {subLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Current Plan</p>
                      <p className="text-lg font-semibold text-foreground">{planName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Billing Cycle</p>
                      <p className="text-lg font-semibold text-foreground">
                        {isActive ? `£${pricePerMonth}/month` : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {isCanceled ? "Access Until" : "Next Renewal"}
                      </p>
                      <p className="text-lg font-semibold text-foreground">{isActive ? periodEnd : "—"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Credit Balance</p>
                      <p className="text-lg font-semibold text-foreground">
                        {creditData?.balance?.toLocaleString() ?? "0"}
                      </p>
                    </div>
                  </div>
                  {isCanceled && (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
                      Your subscription has been cancelled and will end on {periodEnd}. You'll keep full access until then.
                    </div>
                  )}
                  <div className="flex gap-2 pt-4">
                    <a href="/subscribe" className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors">
                      {isActive ? "Change Plan" : "Upgrade"}
                    </a>
                    {isActive && !isCanceled && (
                      <Button
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={handleCancel}
                        disabled={cancelLoading}
                      >
                        {cancelLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Cancel Subscription
                      </Button>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Billing Section */}
          <Card className="border-border/40 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle>Billing & Payment</CardTitle>
              <CardDescription>Manage your payment method via Stripe</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                View invoices, update your card, or change billing details through the Stripe customer portal.
              </p>
              <Button
                variant="outline"
                onClick={handleUpdatePayment}
                disabled={portalLoading}
                className="gap-2"
              >
                {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                Manage Billing
              </Button>
            </CardContent>
          </Card>

          {/* API Keys Section (Business Plan Only) */}
          <Card className="border-border/40 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                API Keys
              </CardTitle>
              <CardDescription>Available on Business plan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg border border-border/40 text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  Upgrade to Business plan to access API keys and integrate WizVid into your applications
                </p>
                <a href="/subscribe" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                  Upgrade to Business
                </a>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-border/40 bg-card/50 backdrop-blur border-destructive/20">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                variant="outline"
                className="w-full gap-2 text-destructive hover:text-destructive"
                onClick={handleLogout}
                disabled={logoutLoading}
              >
                {logoutLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                {logoutLoading ? "Signing out..." : "Sign Out"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
