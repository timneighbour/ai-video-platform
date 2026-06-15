import { useRoute, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Play, Eye, Share2, Download, Clock, User } from "lucide-react";
import { toast } from "sonner";

function formatViews(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M views`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K views`;
  return `${n} views`;
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const d = Math.floor(diff / 86400000);
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d} days ago`;
  if (d < 30) return `${Math.floor(d / 7)} weeks ago`;
  return `${Math.floor(d / 30)} months ago`;
}

export default function WizaVisionWatch() {
  const [, params] = useRoute("/wizavision/watch/:slug");
  const slug = params?.slug ?? "";

  const { data: video, isLoading } = trpc.wizavision.getBySlug.useQuery(
    { slug },
    { enabled: !!slug }
  );

  const { data: related } = trpc.wizavision.browse.useQuery(
    { category: (video as any)?.mainCategory, limit: 8 },
    { enabled: !!(video as any)?.mainCategory }
  );

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard!");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-white/40">Loading...</div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/60 mb-4">Video not found</p>
          <Link href="/wizavision">
            <Button variant="outline" className="border-white/20 text-white/70">Back to WizaVision</Button>
          </Link>
        </div>
      </div>
    );
  }

  const v = video as any;

  return (
    <div className="min-h-screen bg-background text-white">
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Back nav */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/wizavision">
            <button className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <span className="text-white/30 text-sm">WizaVision</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main video */}
          <div className="lg:col-span-2">
            {/* Video player */}
            <div className="relative aspect-video bg-black rounded-2xl overflow-hidden mb-5">
              {v.videoUrl ? (
                <video
                  src={v.videoUrl}
                  controls
                  autoPlay
                  className="w-full h-full"
                  poster={v.thumbnailUrl ?? undefined}
                />
              ) : v.thumbnailUrl ? (
                <div className="relative w-full h-full">
                  <img src={v.thumbnailUrl} alt={v.title} className="w-full h-full object-cover opacity-60" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center">
                      <Play className="w-8 h-8 text-white ml-1" />
                    </div>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 text-center text-white/60 text-sm">
                    Video preview — full video available after publishing
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-background to-background">
                  <Play className="w-16 h-16 text-white/20" />
                </div>
              )}
            </div>

            {/* Title and meta */}
            <h1 className="text-2xl font-bold text-white mb-3">{v.title}</h1>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div className="flex items-center gap-4 text-white/40 text-sm">
                {v.viewCount > 0 && (
                  <span className="flex items-center gap-1.5"><Eye className="w-4 h-4" /> {formatViews(v.viewCount)}</span>
                )}
                <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {timeAgo(v.createdAt)}</span>
                {v.mainCategory && (
                  <span className="px-2 py-0.5 rounded-full bg-white/5 text-white/50 text-xs capitalize">
                    {v.mainCategory.replace("_", " ")}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleShare}
                  className="border-white/20 text-white/70 hover:bg-white/5 gap-1.5">
                  <Share2 className="w-4 h-4" /> Share
                </Button>
                {v.videoUrl && (
                  <Button asChild variant="outline" size="sm" className="border-white/20 text-white/70 hover:bg-white/5 gap-1.5">
                    <a href={v.videoUrl} download target="_blank" rel="noopener noreferrer">
                      <Download className="w-4 h-4" /> Download
                    </a>
                  </Button>
                )}
              </div>
            </div>

            {/* Creator */}
            {v.creatorName && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/5 mb-5">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-white/40" />
                </div>
                <div>
                  <div className="font-semibold text-white text-sm">{v.creatorName}</div>
                  <div className="text-white/40 text-xs">Creator</div>
                </div>
              </div>
            )}

            {/* Description */}
            {v.description && (
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
                <p className="text-white/60 text-sm leading-relaxed">{v.description}</p>
              </div>
            )}

            {/* Tags */}
            {v.tags && v.tags.length > 0 && (
              <div className="flex gap-2 flex-wrap mt-4">
                {v.tags.map((tag: string) => (
                  <span key={tag} className="text-xs px-3 py-1 rounded-full bg-white/5 text-white/40 border border-white/5">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Related videos */}
          <div>
            <h3 className="font-bold text-white mb-4">More Like This</h3>
            {!related || (related as any[]).length === 0 ? (
              <div className="text-white/30 text-sm text-center py-8">No related videos yet</div>
            ) : (
              <div className="space-y-4">
                {(related as any[]).filter((r: any) => r.slug !== slug).slice(0, 6).map((r: any) => (
                  <Link key={r.id} href={`/wizavision/watch/${r.slug}`}>
                    <div className="group flex gap-3 cursor-pointer hover:bg-white/5 rounded-xl p-2 -mx-2 transition-colors">
                      <div className="relative w-32 aspect-video rounded-lg overflow-hidden shrink-0 bg-white/5">
                        {r.thumbnailUrl ? (
                          <img src={r.thumbnailUrl} alt={r.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Play className="w-6 h-6 text-white/20" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white text-sm font-medium line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                          {r.title}
                        </h4>
                        {r.creatorName && <p className="text-white/40 text-xs mt-1">{r.creatorName}</p>}
                        {r.viewCount > 0 && (
                          <p className="text-white/30 text-xs mt-0.5">{formatViews(r.viewCount)}</p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
