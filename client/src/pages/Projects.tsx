import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download, Trash2, Eye, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";

const SAMPLE_PROJECTS = [
  {
    id: 1,
    name: "Mountain Sunset",
    tool: "Text-to-Video",
    status: "completed",
    creditsUsed: 250,
    createdAt: "2026-04-08",
    duration: "10s",
  },
  {
    id: 2,
    name: "Avatar Introduction",
    tool: "Lip-Sync",
    status: "completed",
    creditsUsed: 150,
    createdAt: "2026-04-07",
    duration: "15s",
  },
  {
    id: 3,
    name: "Podcast Intro",
    tool: "Voiceover",
    status: "completed",
    creditsUsed: 25,
    createdAt: "2026-04-06",
    duration: "30s",
  },
  {
    id: 4,
    name: "Style Transfer Test",
    tool: "Video-to-Video",
    status: "processing",
    creditsUsed: 200,
    createdAt: "2026-04-08",
    duration: "8s",
  },
  {
    id: 5,
    name: "Product Demo",
    tool: "Text-to-Video",
    status: "completed",
    creditsUsed: 350,
    createdAt: "2026-04-05",
    duration: "20s",
  },
];

export default function Projects() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "processing":
        return <Clock className="h-4 w-4 text-yellow-500 animate-spin" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed":
        return "Completed";
      case "processing":
        return "Processing";
      case "failed":
        return "Failed";
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/40">
        <div className="container flex h-16 items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/dashboard")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h1 className="text-xl font-bold">Your Projects</h1>
          <div className="w-20" />
        </div>
      </div>

      {/* Content */}
      <div className="container py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground">Generated Videos</h2>
          <p className="text-muted-foreground">View and manage all your created content</p>
        </div>

        <div className="space-y-4">
          {SAMPLE_PROJECTS.map((project) => (
            <Card key={project.id} className="border-border/40 bg-card/50 backdrop-blur">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-foreground">{project.name}</h3>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(project.status)}
                        <span className="text-xs font-medium text-muted-foreground">
                          {getStatusLabel(project.status)}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span>{project.tool}</span>
                      <span>•</span>
                      <span>{project.duration}</span>
                      <span>•</span>
                      <span>{project.creditsUsed} credits</span>
                      <span>•</span>
                      <span>{project.createdAt}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {project.status === "completed" && (
                      <>
                        <Button size="sm" variant="outline" className="gap-2">
                          <Eye className="h-4 w-4" />
                          Preview
                        </Button>
                        <Button size="sm" variant="outline" className="gap-2">
                          <Download className="h-4 w-4" />
                          Download
                        </Button>
                      </>
                    )}
                    <Button size="sm" variant="ghost" className="gap-2 text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {SAMPLE_PROJECTS.length === 0 && (
          <Card className="border-border/40 bg-card/50 backdrop-blur">
            <CardContent className="pt-12 pb-12 text-center">
              <p className="text-muted-foreground mb-4">No projects yet</p>
              <Button onClick={() => setLocation("/dashboard")}>
                Start Creating
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
