import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Sparkles, Zap, Upload } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function LipSync() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [generating, setGenerating] = useState(false);

  const estimatedCredits = 150;

  const handleGenerate = async () => {
    if (!imageFile || !audioFile) return;
    setGenerating(true);
    // TODO: Implement actual generation
    setTimeout(() => setGenerating(false), 2000);
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
          <h1 className="text-xl font-bold">Lip-Sync & Talking Avatar</h1>
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
                <CardTitle>Upload Image</CardTitle>
                <CardDescription>Upload a portrait image or avatar for lip-syncing</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-border/40 rounded-lg p-8 text-center hover:border-accent/50 transition-colors cursor-pointer">
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="font-medium text-foreground">Drop image here or click to upload</p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 10MB</p>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  />
                </div>
                {imageFile && (
                  <p className="text-sm text-accent mt-3">✓ {imageFile.name}</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/40 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle>Upload Audio</CardTitle>
                <CardDescription>Upload audio or video with audio for lip-syncing</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-border/40 rounded-lg p-8 text-center hover:border-accent/50 transition-colors cursor-pointer">
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="font-medium text-foreground">Drop audio here or click to upload</p>
                  <p className="text-xs text-muted-foreground mt-1">MP3, WAV, M4A up to 50MB</p>
                  <input
                    type="file"
                    accept="audio/*,video/*"
                    className="hidden"
                    onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                  />
                </div>
                {audioFile && (
                  <p className="text-sm text-accent mt-3">✓ {audioFile.name}</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/40 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle>Advanced Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Sync Intensity</label>
                  <Select defaultValue="normal">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="subtle">Subtle</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="intense">Intense</SelectItem>
                    </SelectContent>
                  </Select>
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
                  disabled={!imageFile || !audioFile || generating}
                >
                  <Sparkles className="h-4 w-4" />
                  {generating ? "Processing..." : "Create Avatar"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Available: 2,500 credits
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/40 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-sm">Requirements</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2">
                <p>✓ Clear face visible in image</p>
                <p>✓ Good lighting preferred</p>
                <p>✓ Audio with clear speech</p>
                <p>✓ Minimum 2 seconds audio</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
