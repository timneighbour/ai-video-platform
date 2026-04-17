import { Link } from "wouter";
import { NavLink } from "@/components/NavLink";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, Clock, ArrowRight, Sparkles, Rss } from "lucide-react";
import { Helmet } from "react-helmet-async";

function formatDate(d: Date | string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function readingTime(content: string) {
  const words = content.split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

function parseTags(raw: string | null): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

export default function Blog() {
  const { data: posts, isLoading } = trpc.blog.list.useQuery();

  return (
    <>
      <Helmet>
        <title>Blog — WizVid AI | AI WizVideo Tips & Tutorials</title>
        <meta name="description" content="Learn how to create cinematic AI music videos, storyboards, and animations. Tips, tutorials, and insights from the WizVid team." />
        <meta property="og:title" content="WizVid Blog — AI WizVideo" />
        <meta property="og:description" content="Tips, tutorials, and insights on AI video creation." />
        <link rel="canonical" href="https://www.wizvid.ai/blog" />
      </Helmet>

      {/* ── Header ── */}
      <div className="min-h-screen bg-black text-white">
        {/* Nav */}
        <nav className="sticky top-0 z-40 border-b border-white/5 bg-black/80 backdrop-blur-xl">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-white font-bold text-lg hover:opacity-80 transition-opacity">
              <span className="text-violet-400">Wiz</span><span>Vid</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/pricing" className="text-sm text-white/60 hover:text-white transition-colors">Pricing</Link>
              <Link href="/music-video/create">
                <Button size="sm" className="bg-violet-600 hover:bg-violet-500 text-white text-sm h-8">
                  Create Video
                </Button>
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <div className="relative overflow-hidden border-b border-white/5">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-950/40 via-black to-black pointer-events-none" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-violet-600/10 blur-[120px] rounded-full pointer-events-none" />
          <div className="relative max-w-6xl mx-auto px-4 py-20 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-medium mb-6">
              <Rss className="w-3 h-3" />
              WizVid Blog
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              AI Video Creation{" "}
              <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                Insights
              </span>
            </h1>
            <p className="text-white/60 text-lg max-w-xl mx-auto">
              Tips, tutorials, and creative strategies for making cinematic AI music videos.
            </p>
          </div>
        </div>

        {/* Posts grid */}
        <div className="max-w-6xl mx-auto px-4 py-16">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="rounded-xl border border-white/5 bg-white/3 overflow-hidden animate-pulse">
                  <div className="aspect-video bg-white/5" />
                  <div className="p-5 space-y-3">
                    <div className="h-4 bg-white/5 rounded w-1/3" />
                    <div className="h-5 bg-white/8 rounded w-full" />
                    <div className="h-4 bg-white/5 rounded w-5/6" />
                  </div>
                </div>
              ))}
            </div>
          ) : !posts?.length ? (
            <div className="text-center py-24">
              <Sparkles className="w-10 h-10 text-violet-400 mx-auto mb-4 opacity-50" />
              <p className="text-white/40 text-lg">No posts yet — check back soon.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post, idx) => {
                const tags = parseTags(post.tags);
                const mins = readingTime(post.content);
                return (
                  <Link key={post.id} href={`/blog/${post.slug}`}>
                    <article
                      className={`group rounded-xl border border-white/8 bg-white/[0.03] overflow-hidden hover:border-violet-500/40 hover:bg-white/[0.05] transition-all duration-300 cursor-pointer h-full flex flex-col ${idx === 0 ? "md:col-span-2 lg:col-span-2" : ""}`}
                    >
                      {/* Cover */}
                      {post.coverImage ? (
                        <div className={`overflow-hidden ${idx === 0 ? "aspect-[16/7]" : "aspect-video"}`}>
                          <img
                            src={post.coverImage}
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                      ) : (
                        <div className={`${idx === 0 ? "aspect-[16/7]" : "aspect-video"} bg-gradient-to-br from-violet-900/30 to-fuchsia-900/20 flex items-center justify-center`}>
                          <Sparkles className="w-8 h-8 text-violet-400/40" />
                        </div>
                      )}

                      {/* Content */}
                      <div className="p-5 flex flex-col flex-1">
                        {/* Tags */}
                        {tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {tags.slice(0, 3).map(tag => (
                              <Badge key={tag} variant="secondary" className="text-xs bg-violet-500/10 text-violet-300 border-violet-500/20 hover:bg-violet-500/20">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}

                        <h2 className={`font-bold text-white group-hover:text-violet-200 transition-colors mb-2 ${idx === 0 ? "text-xl md:text-2xl" : "text-base"}`}>
                          {post.title}
                        </h2>

                        {post.excerpt && (
                          <p className="text-white/50 text-sm leading-relaxed mb-4 flex-1 line-clamp-3">
                            {post.excerpt}
                          </p>
                        )}

                        {/* Footer */}
                        <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/5">
                          <div className="flex items-center gap-3 text-white/35 text-xs">
                            <span className="flex items-center gap-1">
                              <CalendarDays className="w-3 h-3" />
                              {formatDate(post.publishedAt)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {mins} min read
                            </span>
                          </div>
                          <ArrowRight className="w-4 h-4 text-violet-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                        </div>
                      </div>
                    </article>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom CTA */}
        <div className="border-t border-white/5 bg-gradient-to-b from-black to-violet-950/20">
          <div className="max-w-2xl mx-auto px-4 py-16 text-center">
            <h2 className="text-2xl font-bold mb-3">Ready to create your first AI video?</h2>
            <p className="text-white/50 mb-6">Free to create. Only pay when you render.</p>
            <Link href="/music-video/create">
              <Button className="bg-violet-600 hover:bg-violet-500 text-white px-8 h-11">
                Create Your First Video <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
