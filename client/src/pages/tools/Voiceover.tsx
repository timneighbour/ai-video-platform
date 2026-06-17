/**
 * Voiceover — Coming Soon page
 *
 * The AI voiceover generation backend is not yet implemented.
 * This page shows a "coming soon" state so users are not misled.
 * When the ElevenLabs integration is ready, replace this page
 * with the full implementation.
 */
import { LandscapeHint } from "@/components/LandscapeHint";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Mic, Clock } from "@/lib/icons";
import { Link } from "wouter";
import { useSEO } from "@/hooks/useSEO";

export default function Voiceover() {
  useSEO({
    title: "AI Voiceover — Coming Soon | WIZ AI",
    path: "/tools/voiceover",
    description: "AI-powered voiceover generation is in active development. Generate natural-sounding narration from your scripts — coming soon to WIZ AI.",
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/40">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/dashboard">
            <a className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Back
            </a>
          </Link>
          <h1 className="text-xl font-bold">AI Voiceover</h1>
          <div className="w-20" />
        </div>
      </div>

      {/* Coming Soon Content */}
      <div className="container py-20 flex flex-col items-center justify-center text-center" style={{ maxWidth: "42rem", marginLeft: "auto", marginRight: "auto" }}>
        <div className="mb-8 flex items-center justify-center w-24 h-24 rounded-full bg-accent/10 border border-accent/20">
          <Mic className="h-10 w-10 text-accent" />
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium mb-6">
          <Clock className="h-3 w-3" />
          In Active Development
        </div>

        <h2 className="text-3xl font-bold text-foreground mb-4">
          AI Voiceover is Coming Soon
        </h2>

        <p className="text-muted-foreground text-lg leading-relaxed mb-4">
          Generate natural-sounding narration from any script — multiple voices, languages, and tones — all powered by AI.
        </p>

        <p className="text-muted-foreground leading-relaxed mb-10">
          Our team is integrating professional-grade voice synthesis to bring you studio-quality voiceovers without the studio cost. Voiceover generation will be included as part of your existing credit allowance when it launches.
        </p>

        <Card className="w-full border-border/40 bg-card/50 backdrop-blur mb-8">
          <CardContent className="pt-6 pb-6">
            <p className="text-sm font-medium text-foreground mb-4">What to expect</p>
            <div className="grid gap-3 text-sm text-muted-foreground text-left">
              <div className="flex items-start gap-3">
                <span className="text-accent mt-0.5">✓</span>
                <span>Natural-sounding voices in multiple languages and accents</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-accent mt-0.5">✓</span>
                <span>Emotion and tone control — professional, friendly, energetic, calm</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-accent mt-0.5">✓</span>
                <span>Speed and pitch adjustment</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-accent mt-0.5">✓</span>
                <span>MP3 download included in your plan credits</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-accent mt-0.5">✓</span>
                <span>Direct integration with WizVideo for automatic narration</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/music-creator">
            <Button variant="outline" className="gap-2">
              Try WizAudio Instead
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button className="gap-2">
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>

      <LandscapeHint />
    </div>
  );
}
