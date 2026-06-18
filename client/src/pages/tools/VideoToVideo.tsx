import { useAuth } from "@/_core/hooks/useAuth";
import { Helmet } from "react-helmet-async";

import { LandscapeHint } from "@/components/LandscapeHint";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Sparkles, Zap, Upload } from "@/lib/icons";
import { useState } from "react";
import { useLocation } from "wouter";

export default function VideoToVideo() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [style, setStyle] = useState("oil-painting");

  const estimatedCredits = 200;

  return (
    <div className="min-h-screen bg-background">
  <Helmet>
    <title>AI Video-to-Video — WIZ AI</title>
    <meta name="description" content="Transform existing footage with AI-powered style transfer and scene enhancement. Video-to-Video coming soon to WIZ AI." />
    <meta property="og:title" content="AI Video-to-Video — WIZ AI" />
    <meta property="og:description" content="Transform existing footage with AI-powered style transfer and scene enhancement. Video-to-Video coming soon to WIZ AI." />
    <meta property="og:url" content="https://wiz-ai.io/tools/video-to-video" />
    <link rel="canonical" href="https://wiz-ai.io/tools/video-to-video" />
  </Helmet>
      {/* Header */}
      <div className="border-b border-border/40">
        <div className="container flex h-16 items-center justify-between">
          <a href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back
          </a>
          <h1 className="text-xl font-bold">Video-to-Video Style Transfer</h1>
          <div className="w-20" />
        </div>
      </div>

      {/* Coming Soon Banner */}
      <div className="bg-accent/10 border-b border-accent/20 py-3">
        <div className="container text-center">
          <p className="text-sm font-medium text-accent">
            🎬 Coming Soon — Video-to-Video Style Transfer is in active development and will be available shortly.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Your subscription already includes this feature. No extra charge when it launches.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Input Section */}
          <div className="lg:col-span-2 space-y-6 opacity-50 pointer-events-none select-none">
            <Card className="border-border/40 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle>Upload Video</CardTitle>
                <CardDescription>Upload the video you want to transform</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-border/40 rounded-lg p-8 text-center">
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="font-medium text-foreground">Drop video here or click to upload</p>
                  <p className="text-xs text-muted-foreground mt-1">MP4, WebM up to 500MB</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/40 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle>Select Style</CardTitle>
                <CardDescription>Choose the artistic style to apply</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={style} onValueChange={setStyle} disabled>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="oil-painting">Oil Painting</SelectItem>
                    <SelectItem value="watercolor">Watercolor</SelectItem>
                    <SelectItem value="sketch">Sketch</SelectItem>
                    <SelectItem value="anime">Anime</SelectItem>
                    <SelectItem value="cyberpunk">Cyberpunk</SelectItem>
                    <SelectItem value="vintage">Vintage</SelectItem>
                    <SelectItem value="neon">Neon</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="border-border/40 bg-accent/5 backdrop-blur sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-accent" />
                  Coming Soon
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Video-to-Video Style Transfer is being built. It will apply cinematic artistic styles to any video you upload.
                </p>
                <Button
                  className="w-full gap-2 mt-4"
                  disabled
                >
                  <Sparkles className="h-4 w-4" />
                  Coming Soon
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Included in your current plan — no extra charge at launch.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/40 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-sm">Processing Info</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2">
                <p>• Processing time varies by video length</p>
                <p>• Maximum 10 minutes per video</p>
                <p>• 4K resolution supported</p>
                <p>• Results emailed when ready</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <LandscapeHint />
    </div>
  );
}
