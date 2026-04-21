import { useEffect, useRef } from "react";
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Music, Clock, ArrowLeft, Sparkles } from "@/lib/icons";
import { useSEO } from "@/hooks/useSEO";

export default function WatchPage() {

  useSEO({ title: "Watch — WIZ AI", path: "/watch", description: "Watch AI-generated videos created with WIZ AI. Cinematic music videos, animations, and visual content powered by WizGenesis™ and WizLumina™." });
  const { slug } = useParams<{ slug: string }>();
  const videoRef = useRef<HTMLVideoElement>(null);

  const { data: video, isLoading, error } = trpc.musicVideo.getPublicVideo.useQuery(
    { slug: slug ?? "" },
    { enabled: !!slug }
  );

  // Inject VideoObject structured data for Google indexing
  useEffect(() => {
    if (!video) return;
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "video-schema";
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "VideoObject",
      name: video.title,
      description: `AI-generated music video${video.genre ? ` — ${video.genre}` : ""}${video.mood ? `, ${video.mood} mood` : ""}. Created with WIZ AI.`,
      thumbnailUrl: video.thumbnailUrl ?? "https://wiz-ai.io/studio-mic_3d8c675d.jpg",
      uploadDate: video.createdAt ? new Date(video.createdAt).toISOString() : new Date().toISOString(),
      duration: video.audioDuration ? `PT${Math.floor(video.audioDuration / 60)}M${video.audioDuration % 60}S` : undefined,
      contentUrl: video.finalVideoUrl ?? undefined,
      embedUrl: `https://wiz-ai.io/watch/${video.shareSlug}`,
      publisher: {
        "@type": "Organization",
        name: "WIZ AI",
        logo: {
          "@type": "ImageObject",
          url: "https://wiz-ai.io/og-image.jpg",
        },
      },
    });
    document.head.appendChild(script);

    // Update page title and meta for SEO
    document.title = `${video.title} — WIZ AI`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", `Watch "${video.title}" — an AI-generated music video created with WIZ AI.`);
    }

    return () => {
      const existing = document.getElementById("video-schema");
      if (existing) existing.remove();
    };
  }, [video]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-[--color-gold] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-white/60 text-sm">Loading video...</p>
        </div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md px-6">
          <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto">
            <Play className="w-8 h-8 text-white/30" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Video Not Found</h1>
            <p className="text-white/50 text-sm">This video is either private or no longer available.</p>
          </div>
          <Link href="/">
            <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to WIZ AI
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer group">
              <Sparkles className="w-5 h-5 text-[--color-gold] group-hover:text-[--color-gold] transition-colors" />
              <span className="text-white font-bold text-lg">WIZ AI</span>
            </div>
          </Link>
          <Link href="/create">
            <Button size="sm" className="bg-[--color-gold] hover:bg-[--color-gold]/20 text-white">
              Create Your Own
            </Button>
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Video player */}
          <div className="lg:col-span-2 space-y-4">
            <div className="relative aspect-video bg-black rounded-xl overflow-hidden ring-1 ring-white/10">
              {video.finalVideoUrl ? (
                <video
                  ref={videoRef}
                  src={video.finalVideoUrl}
                  poster={video.thumbnailUrl ?? undefined}
                  controls
                  className="w-full h-full object-contain"
                  preload="metadata"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  {video.thumbnailUrl ? (
                    <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover opacity-60" />
                  ) : (
                    <div className="text-white/30 text-center">
                      <Music className="w-16 h-16 mx-auto mb-2" />
                      <p className="text-sm">Video processing...</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Title and metadata */}
            <div className="space-y-3">
              <h1 className="text-2xl font-bold text-white leading-tight">{video.title}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-white/50">
                {video.audioDuration && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDuration(video.audioDuration)}
                  </span>
                )}
                {video.createdAt && (
                  <span>
                    {new Date(video.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {video.genre && <Badge variant="secondary" className="bg-[--color-gold]/15 text-[--color-gold] border-[--color-gold]/30">{video.genre}</Badge>}
                {video.mood && <Badge variant="secondary" className="bg-blue-900/40 text-blue-300 border-blue-700/50">{video.mood}</Badge>}
                <Badge variant="secondary" className="bg-white/5 text-white/50 border-white/10">AI Generated</Badge>
              </div>
            </div>
          </div>

          {/* Sidebar CTA */}
          <div className="space-y-4">
            <div className="rounded-xl bg-gradient-to-br from-[#b8892a]/40 to-blue-900/40 border border-[--color-gold]/30 p-6 space-y-4">
              <div className="text-center space-y-2">
                <Sparkles className="w-8 h-8 text-[--color-gold] mx-auto" />
                <h2 className="text-white font-bold text-lg">Create Your Own AI Music Video</h2>
                <p className="text-white/60 text-sm">Upload any song and WIZ AI generates a full cinematic music video in minutes.</p>
              </div>
              <Link href="/">
                <Button className="w-full bg-[--color-gold] hover:bg-[--color-gold]/20 text-white font-semibold">
                  Try WIZ AI Free
                </Button>
              </Link>
              <p className="text-center text-white/40 text-xs">2 free renders — no credit card required</p>
            </div>

            {/* Features list */}
            <div className="rounded-xl bg-white/5 border border-white/10 p-5 space-y-3">
              <h3 className="text-white/80 font-semibold text-sm">What WIZ AI Creates</h3>
              {[
                "Cinematic AI-generated scenes",
                "Lip-synced character videos",
                "Kids & animated content",
                "Custom music & soundtracks",
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-2 text-sm text-white/60">
                  <div className="w-1.5 h-1.5 rounded-full bg-[--color-gold] flex-shrink-0" />
                  {feature}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-12 py-6 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-white/40">
          <span>© 2026 WIZ AI — AI-Powered WizVideo</span>
          <div className="flex gap-4">
            <Link href="/privacy"><span className="hover:text-white/70 cursor-pointer transition-colors">Privacy</span></Link>
            <Link href="/terms"><span className="hover:text-white/70 cursor-pointer transition-colors">Terms</span></Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
