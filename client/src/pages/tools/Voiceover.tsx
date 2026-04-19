import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Sparkles, Zap, Play } from "@/lib/icons";
import { useState } from "react";
import { useLocation } from "wouter";

export default function Voiceover() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [text, setText] = useState("");
  const [voice, setVoice] = useState("professional-male");
  const [language, setLanguage] = useState("en");
  const [tone, setTone] = useState("neutral");
  const [generating, setGenerating] = useState(false);

  const estimatedCredits = Math.min(10 + Math.ceil(text.length / 100), 50);

  const handleGenerate = async () => {
    if (!text.trim()) return;
    setGenerating(true);
    // TODO: Implement actual generation
    setTimeout(() => setGenerating(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/40">
        <div className="container flex h-16 items-center justify-between">
          <a href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back
          </a>
          <h1 className="text-xl font-bold">AI Voiceover Generator</h1>
          <div className="w-20" />
        </div>
      </div>

      {/* Content */}
      <div className="container py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Input Section */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-border/40 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle>Enter Your Script</CardTitle>
                <CardDescription>Write the text you want to convert to speech</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Enter your script here. The AI will generate natural-sounding narration..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="min-h-40"
                />
                <p className="text-xs text-muted-foreground">
                  {text.length} characters • Approximately {Math.ceil(text.length / 500)} minutes
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/40 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle>Voice Settings</CardTitle>
                <CardDescription>Customize the voiceover</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Voice</label>
                    <Select value={voice} onValueChange={setVoice}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional-male">Professional Male</SelectItem>
                        <SelectItem value="professional-female">Professional Female</SelectItem>
                        <SelectItem value="casual-male">Casual Male</SelectItem>
                        <SelectItem value="casual-female">Casual Female</SelectItem>
                        <SelectItem value="narrator-male">Narrator Male</SelectItem>
                        <SelectItem value="narrator-female">Narrator Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Language</label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                        <SelectItem value="it">Italian</SelectItem>
                        <SelectItem value="pt">Portuguese</SelectItem>
                        <SelectItem value="ja">Japanese</SelectItem>
                        <SelectItem value="zh">Chinese</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tone</label>
                    <Select value={tone} onValueChange={setTone}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="neutral">Neutral</SelectItem>
                        <SelectItem value="friendly">Friendly</SelectItem>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="energetic">Energetic</SelectItem>
                        <SelectItem value="calm">Calm</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="border-border/40 bg-accent/5 backdrop-blur sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-accent" />
                  Estimated Cost
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-3xl font-bold text-foreground">{estimatedCredits}</p>
                  <p className="text-sm text-muted-foreground">credits</p>
                </div>
                <Button
                  className="w-full gap-2 mt-4"
                  onClick={handleGenerate}
                  disabled={!text.trim() || generating}
                >
                  <Sparkles className="h-4 w-4" />
                  {generating ? "Generating..." : "Generate Voiceover"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Available: 2,500 credits
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/40 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-sm">Features</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2">
                <p>✓ Natural-sounding voices</p>
                <p>✓ Multiple languages</p>
                <p>✓ Emotion control</p>
                <p>✓ Speed adjustment</p>
                <p>✓ MP3 download</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
