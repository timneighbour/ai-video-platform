import { useRoute, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Play, Eye, User } from "lucide-react";

function formatViews(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

export default function WizaVisionCreator() {
  const [, params] = useRoute("/wizavision/creator/:username");
  const username = params?.username ?? "";

  const { data, isLoading } = trpc.wizavision.getChannel.useQuery(
    { username },
    { enabled: !!username }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070710] flex items-center justify-center">
        <div className="text-white/40">Loading creator...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#070710] flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/60 mb-4">Creator not found</p>
          <Link href="/wizavision">
            <Button variant="outline" className="border-white/20 text-white/70">Back to WizaVision</Button>
          </Link>
        </div>
      </div>
    );
  }

  const { channel: creator, videos } = data as any;

  return (
    <div className="min-h-screen bg-[#070710] text-white">
      {/* Banner */}
      <div className="relative h-48 bg-gradient-to-br from-[#1a0a3e] to-[#0a1a2e] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-[#070710]/80 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-6">
        {/* Back */}
        <div className="flex items-center gap-3 mb-6 -mt-2">
          <Link href="/wizavision">
            <button className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
        </div>

        {/* Creator profile */}
        <div className="flex items-end gap-5 mb-8 -mt-16">
          <div className="w-24 h-24 rounded-2xl bg-white/10 border-4 border-[#070710] overflow-hidden flex items-center justify-center text-4xl shrink-0">
            {creator.avatarUrl ? (
              <img src={creator.avatarUrl} alt={creator.displayName} className="w-full h-full object-cover" />
            ) : (
              <User className="w-10 h-10 text-white/30" />
            )}
          </div>
          <div className="pb-2">
            <h1 className="text-2xl font-bold text-white">{creator.displayName}</h1>
            <p className="text-white/40 text-sm">@{creator.username}</p>
            {creator.bio && <p className="text-white/60 text-sm mt-1 max-w-lg">{creator.bio}</p>}
            <div className="flex items-center gap-4 mt-2 text-white/30 text-sm">
              <span>{videos.length} video{videos.length !== 1 ? "s" : ""}</span>
            </div>
          </div>
        </div>

        {/* Videos grid */}
        {videos.length === 0 ? (
          <div className="text-center py-20 text-white/30">No videos published yet</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 pb-16">
            {videos.map((v: any) => (
              <Link key={v.id} href={`/wizavision/watch/${v.slug}`}>
                <div className="group cursor-pointer">
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-white/5">
                    {v.thumbnailUrl ? (
                      <img src={v.thumbnailUrl} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Play className="w-8 h-8 text-white/20" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                      <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <Play className="w-5 h-5 text-white ml-0.5" />
                      </div>
                    </div>
                  </div>
                  <div className="mt-2">
                    <h3 className="text-white text-sm font-medium line-clamp-2 group-hover:text-[#b8892a] transition-colors">{v.title}</h3>
                    {v.viewCount > 0 && (
                      <p className="text-white/30 text-xs mt-1 flex items-center gap-1">
                        <Eye className="w-3 h-3" /> {formatViews(v.viewCount)} views
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
