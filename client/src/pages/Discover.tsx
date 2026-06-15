import { WIZVIDEO_STUDIO_PAGE } from "@/lib/routes";
import { useState } from "react";
import { useSEO } from "@/hooks/useSEO";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Youtube, Instagram, Globe, ExternalLink, Play, Sparkles, TrendingUp, Star, Users } from "@/lib/icons";

// TikTok icon (not in lucide)
const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z"/>
  </svg>
);

const CREATOR_TYPE_LABELS: Record<string, string> = {
  music_artist: "Music Artist",
  youtuber: "YouTuber",
  animator: "Animator",
  kids_creator: "Kids Creator",
  content_creator: "Content Creator",
};

const CREATOR_TYPE_COLORS: Record<string, string> = {
  music_artist: "bg-[--color-gold]/15 text-[--color-gold] border-[--color-gold]/30",
  youtuber: "bg-red-500/20 text-red-300 border-red-500/30",
  animator: "bg-[--color-gold]/15 text-[--color-gold] border-[--color-gold]/30",
  kids_creator: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  content_creator: "bg-[--color-silver]/10 text-[--color-silver] border-[--color-silver]/20",
};

type CreatorType = "music_artist" | "youtuber" | "animator" | "kids_creator" | "content_creator";

interface Creator {
  id: number;
  name: string;
  creatorType: CreatorType;
  bio?: string | null;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  youtubeUrl?: string | null;
  instagramUrl?: string | null;
  tiktokUrl?: string | null;
  websiteUrl?: string | null;
  isFeatured: boolean;
  isTrending: boolean;
  viewCount: number;
}

function CreatorCard({ creator }: { creator: Creator }) {
  const [isHovered, setIsHovered] = useState(false);
  const typeLabel = CREATOR_TYPE_LABELS[creator.creatorType] ?? "Creator";
  const typeColor = CREATOR_TYPE_COLORS[creator.creatorType] ?? "bg-gray-500/20 text-foreground/80";

  return (
    <div
      className="group relative bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-[--color-gold]/30 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Video / Thumbnail */}
      <div className="relative aspect-video bg-black/40 overflow-hidden">
        {creator.videoUrl ? (
          <video
            src={creator.videoUrl}
            className="w-full h-full object-cover"
            autoPlay={isHovered}
            muted
            loop
            playsInline
            poster={creator.thumbnailUrl ?? undefined}
          />
        ) : creator.thumbnailUrl ? (
          <img
            src={creator.thumbnailUrl}
            alt={creator.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/40 to-black">
            <Play className="w-12 h-12 text-white/20" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          {creator.isFeatured && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[--color-gold]/15 text-[--color-gold] text-xs font-bold">
              <Star className="w-3 h-3" /> Featured
            </span>
          )}
          {creator.isTrending && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[--color-silver]/10 text-white text-xs font-bold">
              <TrendingUp className="w-3 h-3" /> Trending
            </span>
          )}
        </div>

        {/* Play overlay on hover */}
        {!creator.videoUrl && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
            <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Play className="w-6 h-6 text-white fill-white ml-1" />
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-white text-base leading-tight">{creator.name}</h3>
          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 ${typeColor}`}>
            {typeLabel}
          </span>
        </div>

        {creator.bio && (
          <p className="text-sm text-white/50 mb-3 line-clamp-2">{creator.bio}</p>
        )}

        {/* Social links */}
        <div className="flex items-center gap-2 flex-wrap">
          {creator.youtubeUrl && (
            <a
              href={creator.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium transition-colors"
              onClick={e => e.stopPropagation()}
            >
              <Youtube className="w-3.5 h-3.5" /> YouTube
            </a>
          )}
          {creator.instagramUrl && (
            <a
              href={creator.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[--color-silver]/10 hover:bg-[--color-silver]/10 text-[--color-silver] text-xs font-medium transition-colors"
              onClick={e => e.stopPropagation()}
            >
              <Instagram className="w-3.5 h-3.5" /> Instagram
            </a>
          )}
          {creator.tiktokUrl && (
            <a
              href={creator.tiktokUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 text-xs font-medium transition-colors"
              onClick={e => e.stopPropagation()}
            >
              <TikTokIcon /> TikTok
            </a>
          )}
          {creator.websiteUrl && (
            <a
              href={creator.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[--color-gold]/10 hover:bg-[--color-gold]/15 text-[--color-gold] text-xs font-medium transition-colors"
              onClick={e => e.stopPropagation()}
            >
              <Globe className="w-3.5 h-3.5" /> Website
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ category }: { category: string }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[--color-gold]/15 flex items-center justify-center mb-4">
        <Users className="w-8 h-8 text-[--color-gold]" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">No creators yet</h3>
      <p className="text-white/50 text-sm max-w-xs">
        {category === "all"
          ? "Be the first to get featured on WIZ AI."
          : `No ${CREATOR_TYPE_LABELS[category] ?? category} creators featured yet.`}
      </p>
      <Link href={WIZVIDEO_STUDIO_PAGE}>
        <Button className="mt-6 bg-[--color-gold] hover:bg-[--color-gold]/80 text-white">
          Create a video &amp; get featured
        </Button>
      </Link>
    </div>
  );
}

export default function Discover() {
  useSEO({ title: "Discover Creators — WIZ AI", path: "/discover", description: "Explore videos and creators on WIZ AI. See what musicians and artists are making with AI-generated music videos." });
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const { data: allCreators = [], isLoading } = trpc.creator.list.useQuery({
    limit: 60,
  });

  const { data: featuredCreators = [] } = trpc.creator.list.useQuery({
    featured: true,
    limit: 6,
  });

  const { data: trendingCreators = [] } = trpc.creator.list.useQuery({
    trending: true,
    limit: 6,
  });

  const filteredCreators =
    activeCategory === "all"
      ? allCreators
      : allCreators.filter((c: Creator) => c.creatorType === activeCategory);

  const newCreators = [...allCreators]
    .sort((a: Creator, b: Creator) => b.id - a.id)
    .slice(0, 6);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero */}
      <section className="relative pt-24 pb-16 px-4 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/20 via-transparent to-transparent pointer-events-none" />
        <div className="relative max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[--color-gold]/15 border border-[--color-gold]/30 text-[--color-gold] text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            WIZ AI Creator Network
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-white via-purple-200 to-primary/40 bg-clip-text text-transparent">
            Discover Creators
          </h1>
          <p className="text-xl text-white/60 mb-4">
            Create videos. Get discovered. Grow your audience.
          </p>
          <p className="text-white/40 max-w-xl mx-auto mb-8">
            A space for creators using WIZ AI to share music videos, animations, kids content, and more. Get featured by creating your first video.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href={WIZVIDEO_STUDIO_PAGE}>
              <Button className="bg-[--color-gold] hover:bg-[--color-gold]/80 text-white px-6">
                Start Creating
              </Button>
            </Link>
            <a href="#featured">
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/5 px-6">
                Browse Creators
              </Button>
            </a>
          </div>
          {/* Badge showcase */}
          <div className="mt-8 flex flex-col items-center gap-3">
            <p className="text-white/30 text-xs uppercase tracking-widest">Get your creator badge</p>
            <a
              href="/manus-storage/wizai-logo-v3_e7823047_6b9d9155.png"
              download="wiz-ai-logo.png"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 px-4 py-2 rounded-xl border border-[--color-gold]/30 bg-[--color-gold]/15 hover:bg-[--color-gold]/15 hover:border-[--color-gold]/30 transition-all"
            >
              <img
                src="/manus-storage/wizai-logo-v3_e7823047_6b9d9155.png"
                alt="Featured on WIZ AI badge"
                className="w-12 h-12 object-contain"
              />
              <div className="text-left">
                <p className="text-white text-sm font-semibold">Featured on WIZ AI</p>
                <p className="text-[--color-gold]/70 text-xs">Download your badge &rarr;</p>
              </div>
            </a>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 pb-24 space-y-16">
        {/* Featured Creators */}
        {featuredCreators.length > 0 && (
          <section id="featured">
            <div className="flex items-center gap-3 mb-6">
              <Star className="w-5 h-5 text-[--color-gold]" />
              <h2 className="text-2xl font-bold text-white">Featured Creators</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredCreators.map((c: Creator) => (
                <CreatorCard key={c.id} creator={c} />
              ))}
            </div>
          </section>
        )}

        {/* Trending Creators */}
        {trendingCreators.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="w-5 h-5 text-[--color-silver]" />
              <h2 className="text-2xl font-bold text-white">Trending Now</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {trendingCreators.map((c: Creator) => (
                <CreatorCard key={c.id} creator={c} />
              ))}
            </div>
          </section>
        )}

        {/* New Creators */}
        {newCreators.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <Sparkles className="w-5 h-5 text-[--color-gold]" />
              <h2 className="text-2xl font-bold text-white">New Creators</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {newCreators.map((c: Creator) => (
                <CreatorCard key={c.id} creator={c} />
              ))}
            </div>
          </section>
        )}

        {/* All Creators with Category Filter */}
        <section>
          <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-white/60" />
              <h2 className="text-2xl font-bold text-white">All Creators</h2>
            </div>
          </div>

          {/* Category filter tabs */}
          <Tabs value={activeCategory} onValueChange={setActiveCategory} className="mb-8">
            <TabsList className="bg-white/5 border border-white/10 flex-wrap h-auto gap-1 p-1">
              <TabsTrigger value="all" className="data-[state=active]:bg-[--color-gold] data-[state=active]:text-white text-white/60">
                All
              </TabsTrigger>
              <TabsTrigger value="music_artist" className="data-[state=active]:bg-[--color-gold] data-[state=active]:text-white text-white/60">
                Music Artists
              </TabsTrigger>
              <TabsTrigger value="youtuber" className="data-[state=active]:bg-[--color-gold] data-[state=active]:text-white text-white/60">
                YouTubers
              </TabsTrigger>
              <TabsTrigger value="animator" className="data-[state=active]:bg-[--color-gold] data-[state=active]:text-white text-white/60">
                Animators
              </TabsTrigger>
              <TabsTrigger value="kids_creator" className="data-[state=active]:bg-[--color-gold] data-[state=active]:text-white text-white/60">
                Kids Creators
              </TabsTrigger>
              <TabsTrigger value="content_creator" className="data-[state=active]:bg-[--color-gold] data-[state=active]:text-white text-white/60">
                Content Creators
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden animate-pulse">
                  <div className="aspect-video bg-white/10" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-white/10 rounded w-2/3" />
                    <div className="h-3 bg-white/10 rounded w-full" />
                    <div className="h-3 bg-white/10 rounded w-4/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredCreators.length === 0 ? (
            <div className="grid grid-cols-1">
              <EmptyState category={activeCategory} />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCreators.map((c: Creator) => (
                <CreatorCard key={c.id} creator={c} />
              ))}
            </div>
          )}
        </section>

        {/* CTA Banner */}
        <section className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-primary/60 to-secondary/40 border border-[--color-gold]/30 p-10 text-center">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
          <div className="relative">
            <h2 className="text-3xl font-bold text-white mb-3">Want to get featured?</h2>
            <p className="text-white/60 mb-6 max-w-lg mx-auto">
              Create a video with WIZ AI, then submit your creator profile. We feature the best creators every week.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link href={WIZVIDEO_STUDIO_PAGE}>
                <Button className="bg-[--color-gold] hover:bg-[--color-gold]/80 text-white px-8 py-3 text-base">
                  Create Your Video
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline" className="border-white/20 text-white hover:bg-white/5">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
