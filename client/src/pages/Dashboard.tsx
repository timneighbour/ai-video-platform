import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Zap, Video, Mic, Wand2, Plus, Settings, History } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";

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

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/40 bg-card/50 backdrop-blur">
        <div className="container flex h-20 items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Welcome back, {user?.name || "Creator"}</h1>
            <p className="text-sm text-muted-foreground">Start creating amazing videos with AI</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setLocation("/account")} className="gap-2">
            <Settings className="h-4 w-4" />
            Account
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-8">
        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card className="border-border/40 bg-card/50 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Available Credits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-foreground">2,500</span>
                <span className="text-sm text-muted-foreground">credits</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Pro Plan • Resets on May 8, 2026</p>
            </CardContent>
          </Card>

          <Card className="border-border/40 bg-card/50 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Current Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-foreground">Pro</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">£49/month • 3,000 credits</p>
            </CardContent>
          </Card>

          <Card className="border-border/40 bg-card/50 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Videos Created</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-foreground">12</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">This month</p>
            </CardContent>
          </Card>
        </div>

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
              <Button variant="outline" className="gap-2" onClick={() => setLocation("/projects")}>
                <History className="h-4 w-4" />
                Projects
              </Button>
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
      </div>
    </div>
  );
}
