import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Play, Search, TrendingUp, Star, Users, Film, Sparkles, ChevronRight, Eye, Clock, Upload } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  music_video: { label: "Music Videos", color: "#b8892a" },
  short_film: { label: "Short Films", color: "#7c3aed" },
  animation: { label: "Animation", color: "#0ea5e9" },
  documentary: { label: "Documentary", color: "#10b981" },
  series: { label: "Series", color: "#f59e0b" },
  experimental: { label: "Experimental", color: "#ec4899" },
  kids: { label: "Kids", color: "#f97316" },
  education: { label: "Education", color: "#6366f1" },
  trailer: { label: "Trailers", color: "#14b8a6" },
  cinematic: { label: "Cinematic", color: "#ef4444" },
};

function formatViews(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

function formatDuration(secs?: number | null) {
  if (!secs) return null;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function VideoCard({ video }: { video: any }) {
  return (
    <Link href={`/wizavision/watch/${video.slug}`}>
      <div className="group cursor-pointer">
        <div className="relative overflow-hidden rounded-xl bg-white/5 aspect-video">
          {video.thumbnailUrl ? (
            <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1a1a3e] to-[#0a0a14]">
              <Play className="w-10 h-10 text-white/20" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center">
              <Play className="w-6 h-6 text-white ml-1" />
            </div>
          </div>
          {video.duration && (
            <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded font-mono">
              {formatDuration(video.duration)}
            </div>
          )}
          <div className="absolute top-2 left-2">
            <span className="text-xs px-2 py-0.5 rounded-full bg-black/60 text-white/70 backdrop-blur-sm">
              {CATEGORY_META[video.mainCategory]?.label ?? video.mainCategory}
            </span>
          </div>
        </div>
        <div className="mt-2">
          <h3 className="font-semibold text-white text-sm line-clamp-2 leading-tight group-hover:text-[#b8892a] transition-colors">{video.title}</h3>
          <div className="flex items-center gap-2 mt-1">
            {video.creatorName && <span className="text-white/40 text-xs truncate">{video.creatorName}</span>}
            {video.viewCount > 0 && (
              <span className="text-white/30 text-xs flex items-center gap-0.5">
                <Eye className="w-3 h-3" /> {formatViews(video.viewCount)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

function SectionHeader({ title, icon, href }: { title: string; icon: React.ReactNode; href?: string }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-2.5">
        <div className="text-[#b8892a]">{icon}</div>
        <h2 className="text-xl font-bold text-white">{title}</h2>
      </div>
      {href && (
        <Link href={href}>
          <button className="text-white/40 hover:text-[#b8892a] text-sm flex items-center gap-1 transition-colors">
            See all <ChevronRight className="w-4 h-4" />
          </button>
        </Link>
      )}
    </div>
  );
}

export default function WizaVision() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const { data: homepage, isLoading } = trpc.wizavision.homepage.useQuery();
  const { data: searchResults } = trpc.wizavision.browse.useQuery(
    { search: searchQuery, limit: 24 },
    { enabled: !!searchQuery }
  );
  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setSearchQuery(search.trim()); };
  const featured = (homepage as any)?.featured ?? [];
  const trending = (homepage as any)?.trending ?? [];
  const recent = (homepage as any)?.recent ?? [];
  const staffPicks = (homepage as any)?.staffPicks ?? [];
  const kidsContent = (homepage as any)?.kidsContent ?? [];
  const creators = (homepage as any)?.creators ?? [];
  const heroVideo = featured[0] ?? trending[0] ?? recent[0];

  return (
    <div className="min-h-screen bg-[#070710] text-white">
      {/* Minimal sticky nav — escape route back to WIZ AI */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 py-3" style={{ background: "rgba(7,7,16,0.88)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-3">
          <a href="/" className="flex items-center gap-1.5 text-white/50 hover:text-white transition-colors text-sm font-medium">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M10 3L5 8l5 5" /></svg>
            WIZ AI
          </a>
          <span className="text-white/20 text-sm">/</span>
          <span className="text-[#b8892a] font-bold text-sm tracking-wide">WizaVision</span>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <a href="/dashboard" className="text-sm font-semibold text-white/50 hover:text-white transition-colors">Dashboard</a>
          ) : (
            <a href={getLoginUrl()} className="text-sm font-semibold text-white/50 hover:text-white transition-colors">Sign In</a>
          )}
          <Button size="sm" className="bg-[#b8892a] hover:bg-[#a07820] text-black font-bold text-xs px-4 h-8"
            onClick={() => { window.location.href = user ? "/wizavision/publish" : getLoginUrl(); }}>
            Publish
          </Button>
        </div>
      </nav>
      <div className="relative min-h-[65vh] flex items-end overflow-hidden">
        <div className="absolute inset-0">
          {heroVideo?.thumbnailUrl ? (
            <img src={heroVideo.thumbnailUrl} alt="" className="w-full h-full object-cover opacity-40" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#1a0a3e] via-[#0a0a20] to-[#0a1a2e]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#070710] via-[#070710]/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#070710]/80 to-transparent" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 pb-16 pt-32">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#b8892a] flex items-center justify-center">
                <Play className="w-5 h-5 text-black ml-0.5" />
              </div>
              <div>
                <span className="text-2xl font-black tracking-tight">
                  <span className="text-[#b8892a]">Wiza</span><span className="text-white">Vision</span>
                </span>
                <div className="text-white/40 text-xs">AI-Powered Entertainment Platform</div>
              </div>
            </div>
            {heroVideo ? (
              <>
                <h1 className="text-4xl md:text-5xl font-black leading-tight mb-4">{heroVideo.title}</h1>
                {heroVideo.description && <p className="text-white/60 text-lg mb-6 line-clamp-3">{heroVideo.description}</p>}
                <div className="flex items-center gap-4 flex-wrap">
                  <Link href={`/wizavision/watch/${heroVideo.slug}`}>
                    <Button className="bg-white hover:bg-white/90 text-black font-bold gap-2 px-8 py-3 text-base">
                      <Play className="w-5 h-5 fill-black" /> Watch Now
                    </Button>
                  </Link>
                  <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 gap-2 px-6 py-3"
                    onClick={() => window.location.href = user ? "/wizavision/publish" : getLoginUrl()}>
                    <Upload className="w-4 h-4" /> Publish Your Work
                  </Button>
                </div>
              </>
            ) : (
              <>
                <h1 className="text-4xl md:text-5xl font-black leading-tight mb-4">
                  The Home of<br /><span className="text-[#b8892a]">AI-Generated</span> Entertainment
                </h1>
                <p className="text-white/60 text-lg mb-6">Discover stunning music videos, animations, short films and more.</p>
                <Button className="bg-[#b8892a] hover:bg-[#a07820] text-black font-bold gap-2 px-8 py-3 text-base"
                  onClick={() => window.location.href = user ? "/wizavision/publish" : getLoginUrl()}>
                  <Play className="w-5 h-5" /> {user ? "Publish Your First Video" : "Get Started Free"}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* What is WizaVision? — description section for new visitors */}
      <div className="max-w-7xl mx-auto px-6 pt-10 pb-4">
        <div className="rounded-2xl border border-[#b8892a]/15 bg-gradient-to-r from-[#b8892a]/[0.06] to-[#7c3aed]/[0.04] p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="w-12 h-12 rounded-xl bg-[#b8892a]/15 border border-[#b8892a]/25 flex items-center justify-center shrink-0">
            <Play className="w-6 h-6 text-[#b8892a] ml-0.5" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-black text-white mb-1.5">
              What is <span className="text-[#b8892a]">WizaVision</span>?
            </h2>
            <p className="text-white/55 text-sm leading-relaxed max-w-2xl">
              WizaVision is WIZ AI&rsquo;s video streaming and discovery platform — a curated home for AI-generated entertainment. Watch music videos, short films, animations, documentaries, and more, all created by the WIZ AI community. Browse by category, discover trending creators, and publish your own AI-generated videos to the world.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <a href="/wizavision/browse" className="text-xs font-bold tracking-wide text-[#b8892a] hover:text-[#d4a843] transition-colors border border-[#b8892a]/30 hover:border-[#b8892a]/60 px-4 py-2 rounded-lg">
              Browse All
            </a>
            <a href="/create" className="text-xs font-bold tracking-wide bg-[#b8892a] hover:bg-[#a07820] text-black px-4 py-2 rounded-lg transition-colors">
              Create a Video
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <form onSubmit={handleSearch} className="relative max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search videos, creators, genres..."
            className="pl-12 pr-4 py-3 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl text-base" />
        </form>
      </div>

      {searchQuery && (
        <div className="max-w-7xl mx-auto px-6 pb-12">
          <SectionHeader title={`Results for "${searchQuery}"`} icon={<Search className="w-5 h-5" />} />
          {!searchResults || (searchResults as any[]).length === 0 ? (
            <div className="text-center py-12 text-white/40">No videos found for "{searchQuery}"</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {(searchResults as any[]).map((v: any) => <VideoCard key={v.id} video={v} />)}
            </div>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="max-w-7xl mx-auto px-6 pb-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="aspect-video rounded-xl bg-white/5 animate-pulse" />)}
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-6 pb-16 space-y-14">
          <div>
            <SectionHeader title="Browse by Category" icon={<Film className="w-5 h-5" />} />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {Object.entries(CATEGORY_META).map(([key, meta]) => (
                <Link key={key} href={`/wizavision/browse/${key}`}>
                  <div className="group p-4 rounded-xl border border-white/5 bg-white/[0.03] hover:bg-white/5 transition-all cursor-pointer flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: meta.color }} />
                    <span className="text-white/70 group-hover:text-white text-sm font-medium transition-colors">{meta.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
          {featured.length > 0 && (
            <div>
              <SectionHeader title="Featured" icon={<Star className="w-5 h-5" />} />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {featured.map((v: any) => <VideoCard key={v.id} video={v} />)}
              </div>
            </div>
          )}
          {trending.length > 0 && (
            <div>
              <SectionHeader title="Trending Now" icon={<TrendingUp className="w-5 h-5" />} />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {trending.slice(0, 8).map((v: any) => <VideoCard key={v.id} video={v} />)}
              </div>
            </div>
          )}
          {staffPicks.length > 0 && (
            <div>
              <SectionHeader title="Staff Picks" icon={<Sparkles className="w-5 h-5" />} />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {staffPicks.map((v: any) => <VideoCard key={v.id} video={v} />)}
              </div>
            </div>
          )}
          {recent.length > 0 && (
            <div>
              <SectionHeader title="Recently Added" icon={<Clock className="w-5 h-5" />} href="/wizavision/browse" />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {recent.slice(0, 10).map((v: any) => <VideoCard key={v.id} video={v} />)}
              </div>
            </div>
          )}
          {kidsContent.length > 0 && (
            <div className="rounded-2xl bg-gradient-to-r from-[#f97316]/10 to-[#f59e0b]/10 border border-[#f97316]/20 p-6">
              <SectionHeader title="Kids Zone" icon={<Star className="w-5 h-5 text-[#f97316]" />} />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {kidsContent.map((v: any) => <VideoCard key={v.id} video={v} />)}
              </div>
            </div>
          )}
          {creators.length > 0 && (
            <div>
              <SectionHeader title="Featured Creators" icon={<Users className="w-5 h-5" />} />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {creators.map((c: any) => (
                  <Link key={c.id} href={`/wizavision/creator/${c.username}`}>
                    <div className="group text-center p-4 rounded-xl border border-white/5 bg-white/[0.03] hover:bg-white/5 transition-all cursor-pointer">
                      <div className="w-16 h-16 rounded-full bg-white/10 mx-auto mb-3 overflow-hidden flex items-center justify-center text-2xl">
                        {c.avatarUrl ? <img src={c.avatarUrl} alt={c.displayName} className="w-full h-full object-cover" /> : c.displayName[0]}
                      </div>
                      <div className="font-semibold text-white text-sm group-hover:text-[#b8892a] transition-colors">{c.displayName}</div>
                      <div className="text-white/40 text-xs mt-0.5">{c.videoCount} videos</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {recent.length === 0 && trending.length === 0 && featured.length === 0 && (
            <div className="text-center py-20">
              <div className="w-24 h-24 rounded-3xl bg-[#b8892a]/10 flex items-center justify-center mx-auto mb-6">
                <Play className="w-12 h-12 text-[#b8892a]/60" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">WizaVision is Coming to Life</h3>
              <p className="text-white/50 max-w-md mx-auto mb-8">Be the first to publish your AI-generated video to WizaVision.</p>
              <Button className="bg-[#b8892a] hover:bg-[#a07820] text-black font-bold gap-2 px-8 py-3"
                onClick={() => window.location.href = user ? "/wizavision/publish" : getLoginUrl()}>
                <Upload className="w-5 h-5" /> {user ? "Publish Your First Video" : "Join WizaVision"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
