import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Copy, Home, Key, LogOut } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function Account() {
  const { user, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [copied, setCopied] = useState(false);

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  const handleCopyApiKey = () => {
    navigator.clipboard.writeText("sk_test_123456789abcdef");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Current Plan</p>
                  <p className="text-lg font-semibold text-foreground">Pro</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Billing Cycle</p>
                  <p className="text-lg font-semibold text-foreground">£49/month</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Next Renewal</p>
                  <p className="text-lg font-semibold text-foreground">May 8, 2026</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Monthly Credits</p>
                  <p className="text-lg font-semibold text-foreground">3,000</p>
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <a href="/subscribe" className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors">
                  Change Plan
                </a>
                <Button variant="outline" className="text-destructive hover:text-destructive">
                  Cancel Subscription
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Billing Section */}
          <Card className="border-border/40 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle>Billing & Payment</CardTitle>
              <CardDescription>Manage your payment method</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Payment Method</label>
                <div className="flex items-center justify-between p-3 border border-border/40 rounded-lg bg-muted/50">
                  <span className="text-sm">Visa ending in 4242</span>
                  <span className="text-xs text-muted-foreground">Expires 12/26</span>
                </div>
              </div>
              <Button variant="outline">Update Payment Method</Button>
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
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
