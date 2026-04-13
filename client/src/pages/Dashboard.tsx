import { useAuth } from "@/_core/hooks/useAuth";
import { mp } from "@/lib/mixpanel";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Zap, Video, Mic, Wand2, Plus, Settings, History, RefreshCw, Film, Clock, ChevronRight, Download } from "lucide-react";
import { useLocation } from "wouter";
import BackButton from "@/components/BackButton";
import UpgradeBanner from "@/components/UpgradeBanner";
import UpgradeModal from "@/components/UpgradeModal";
import BundlePromoBanner from "@/components/BundlePromoBanner";
import HabitLoopPanel from "@/components/HabitLoopPanel";
import SubscriptionUpgradeNudge from "@/components/SubscriptionUpgradeNudge";
import { trpc } from "@/lib/trpc";

const AI_TOOLS = [
  {
    id: "text-to-video",
    name: "Text-to-Video",
    description: "Transform prompts into cinematic videos",
    icon: Video,
    href: "/tools/text-to-video",
    estimatedCredits: "100-500",
  },
  {
    id: "lip-sync",
    name: "Lip-Sync & Avatars",
    description: "Create realistic talking avatars",
    icon: Mic,
    href: "/tools/lip-sync",
    estimatedCredits: "50-200",
  },
  {
    id: "video-to-video",
    name: "Video-to-Video",
    description: "Apply artistic styles to videos",
    icon: Wand2,
    href: "/tools/video-to-video",
    estimatedCredits: "75-300",
  },
  {
    id: "voiceover",
    name: "AI Voiceover",
    description: "Generate natural narration",
    icon: Sparkles,
    href: "/tools/voiceover",
    estimatedCredits: "10-50",
  },
];

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const { data: creditData } = trpc.billing.getCredits.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: subData } = trpc.billing.getSubscription.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: renderStatus } = trpc.render.getRenderStatus.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 60_000,
  });
  const { data: recentJobsData } = trpc.musicVideo.listJobs.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  const creditBalance = creditData?.balance ?? 0;
  const currentPlan = subData?.plan ? subData.plan.charAt(0).toUpperCase() + subData.plan.slice(1) : "Free";
  const renderBalance = renderStatus?.total ?? 0;
  const subscriptionRemaining = renderStatus?.subscriptionRemaining ?? 0;
  const bundleRemaining = renderStatus?.bundleRemaining ?? 0;

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  // Fire Signup Completed when Stripe redirects back with ?success=true
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      const plan = params.get("plan") ?? currentPlan;
      mp.signupCompleted(plan, 0);
      const url = new URL(window.location.href);
      url.searchParams.delete("success");
      url.searchParams.delete("plan");
      window.history.replaceState({}, "", url.toString());
    }
  }, [currentPlan]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/40 bg-card/50 backdrop-blur">
        <div className="container flex flex-col gap-2 py-4">
          <div className="flex items-center justify-between">
            <BackButton fallback="/" label="Home" />
            <Button variant="outline" size="sm" onClick={() => setLocation("/account")} className="gap-2">
              <Settings className="h-4 w-4" />
              Account
            </Button>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Welcome back, {user?.name || "Creator"}</h1>
            <p className="text-sm text-muted-foreground">Your creative workspace</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-8">

        {/* Nudge banners — shown contextually, never both at once */}
        <SubscriptionUpgradeNudge className="mb-4" />
        <BundlePromoBanner threshold={2} className="mb-6" />

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card className="border-border/40 bg-card/50 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Credits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-foreground">{creditBalance.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground">available</span>
              </div>
              {creditBalance < 100 && (
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="text-[11px] text-amber-400 mt-1.5 hover:underline"
                >
                  Low — top up
                </button>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/40 bg-card/50 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-foreground">{currentPlan}</span>
              </div>
              {currentPlan === "Free" && (
                <button
                  onClick={() => setLocation("/pricing")}
                  className="text-[11px] text-violet-400 mt-1.5 hover:underline"
                >
                  Upgrade
                </button>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/40 bg-card/50 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Renders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-foreground">{renderBalance}</span>
                <span className="text-xs text-muted-foreground">remaining</span>
              </div>
              {renderBalance > 0 && (
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  {subscriptionRemaining > 0 && `${subscriptionRemaining} plan · `}
                  {bundleRemaining > 0 && `${bundleRemaining} bundle`}
                </p>
              )}
              {renderBalance === 0 && (
                <button
                  onClick={() => setLocation("/pricing")}
                  className="text-[11px] text-violet-400 mt-1.5 hover:underline"
                >
                  Get renders
                </button>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/40 bg-card/50 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Quick Start</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1.5">
              <Button size="sm" className="gap-2 w-full h-8 text-xs" onClick={() => setLocation("/music-video/create")}>
                <Sparkles className="h-3.5 w-3.5" />
                New Music Video
              </Button>
              <Button size="sm" variant="outline" className="gap-2 w-full h-8 text-xs" onClick={() => setLocation("/render-history")}>
                <Download className="h-3.5 w-3.5" />
                Downloads
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Projects */}
        {recentJobsData && recentJobsData.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                Continue where you left off
              </h2>
              <button
                onClick={() => setLocation("/projects")}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {recentJobsData.slice(0, 3).map((job: { id: number; title?: string | null; status: string; createdAt: Date }) => (
                <button
                  key={job.id}
                  onClick={() => setLocation(`/music-video/create?resume=${job.id}`)}
                  className="text-left rounded-xl border border-border/40 bg-card/50 p-4 hover:border-border hover:bg-card transition-all group"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center flex-shrink-0">
                      <Film className="w-4 h-4 text-violet-400" />
                    </div>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                      job.status === "completed" ? "bg-emerald-500/15 text-emerald-400" :
                      job.status === "failed" ? "bg-red-500/15 text-red-400" :
                      "bg-amber-500/15 text-amber-400"
                    }`}>
                      {job.status}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground truncate group-hover:text-white transition-colors">
                    {job.title || `Project #${job.id}`}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {job.createdAt instanceof Date ? job.createdAt.toLocaleDateString() : new Date(job.createdAt).toLocaleDateString()}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Habit loop — start next video */}
        <HabitLoopPanel className="mb-8" />

        {/* Quick Actions */}
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <Card className="border-border/40 bg-gradient-to-br from-accent/10 to-accent/5 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-accent" />
                Low on Credits?
              </CardTitle>
              <CardDescription>Purchase additional credit packs to keep creating</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="gap-2" onClick={() => setLocation("/credits")}>
                <Plus className="h-4 w-4" />
                Buy Credits
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/40 bg-gradient-to-br from-accent/10 to-accent/5 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-accent" />
                View Your Projects
              </CardTitle>
              <CardDescription>See all your generated videos and their status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" className="gap-2" onClick={() => setLocation("/projects")}>
                  <History className="h-4 w-4" />
                  Projects
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => setLocation("/render-history")}>
                  <History className="h-4 w-4" />
                  Render History
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 border-violet-500/30 text-violet-400 hover:bg-violet-500/10"
                  onClick={() => setLocation("/batch-regeneration")}
                >
                  <RefreshCw className="h-4 w-4" />
                  Re-generate Portraits
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Tools Grid */}
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground">AI Tools</h2>
            <p className="text-muted-foreground">Choose a tool to start creating</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {AI_TOOLS.map((tool) => {
              const Icon = tool.icon;
              return (
                <Card
                  key={tool.id}
                  className="border-border/40 bg-card/50 backdrop-blur hover:ring-1 hover:ring-accent transition-all cursor-pointer"
                  onClick={() => setLocation(tool.href)}
                >
                  <CardHeader>
                    <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                      <Icon className="h-5 w-5 text-accent" />
                    </div>
                    <CardTitle className="text-lg">{tool.name}</CardTitle>
                    <CardDescription className="text-xs">{tool.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">
                      Est. {tool.estimatedCredits} credits
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Upgrade banner for free/low-credit users */}
        {(currentPlan === "Free" || creditBalance < 100) && (
          <UpgradeBanner
            type={creditBalance < 100 ? "limit" : "milestone"}
            className="mt-6"
          />
        )}
      </div>

      {/* Upgrade modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        trigger={creditBalance < 100 ? "limit" : "milestone"}
      />
    </div>
  );
}
