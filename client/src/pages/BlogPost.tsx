import { Link, useParams } from "wouter";
import { NavLink } from "@/components/NavLink";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, Clock, ArrowLeft, ArrowRight, User, Sparkles } from "@/lib/icons";
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

/** Very simple Markdown-to-HTML renderer for blog content */
function renderMarkdown(md: string): string {
  return md
    // Headings
    .replace(/^### (.+)$/gm, '<h3 class="text-xl font-bold text-white mt-8 mb-3">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-2xl font-bold text-white mt-10 mb-4">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-3xl font-bold text-white mt-10 mb-5">$1</h1>')
    // Bold / italic
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="text-white/80 italic">$1</em>')
    // Inline code
    .replace(/`(.+?)`/g, '<code class="bg-white/8 text-[--color-gold] px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')
    // Blockquote
    .replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-[--color-gold] pl-4 my-4 text-white/60 italic">$1</blockquote>')
    // Unordered list
    .replace(/^\* (.+)$/gm, '<li class="text-white/70 ml-4 mb-1 list-disc">$1</li>')
    .replace(/^- (.+)$/gm, '<li class="text-white/70 ml-4 mb-1 list-disc">$1</li>')
    // Ordered list
    .replace(/^\d+\. (.+)$/gm, '<li class="text-white/70 ml-4 mb-1 list-decimal">$1</li>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr class="border-white/10 my-8" />')
    // Links
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-[--color-gold] hover:text-[--color-gold] underline underline-offset-2" target="_blank" rel="noopener">$1</a>')
    // Paragraphs (double newline)
    .replace(/\n\n/g, '</p><p class="text-white/65 leading-relaxed mb-4">')
    // Wrap in paragraph
    .replace(/^/, '<p class="text-white/65 leading-relaxed mb-4">')
    .replace(/$/, '</p>');
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const { data: post, isLoading, error } = trpc.blog.getBySlug.useQuery({ slug: slug ?? "" }, { enabled: !!slug });
  const { data: allPosts } = trpc.blog.list.useQuery();

  const tags = parseTags(post?.tags ?? null);
  const mins = post ? readingTime(post.content) : 0;

  // Related posts (same tags, exclude current)
  const related = allPosts?.filter(p => p.slug !== slug).slice(0, 2) ?? [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 rounded-full border-2 border-[--color-gold] border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-white/40 text-sm">Loading article…</p>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-center px-4">
        <div>
          <Sparkles className="w-10 h-10 text-[--color-gold] mx-auto mb-4 opacity-40" />
          <h1 className="text-2xl font-bold text-white mb-2">Article not found</h1>
          <p className="text-white/40 mb-6">This post may have been moved or deleted.</p>
          <Link href="/blog">
            <Button variant="outline" className="border-white/10 text-white hover:bg-white/5">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Blog
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const canonicalUrl = `https://wiz-ai.io/blog/${post.slug}`;
  const metaTitle = post.metaTitle ?? `${post.title} — WIZ AI Blog`;
  const metaDesc = post.metaDescription ?? post.excerpt ?? "Read this article on the WIZ AI blog.";

  return (
    <>
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDesc} />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDesc} />
        {post.coverImage && <meta property="og:image" content={post.coverImage} />}
        <meta property="og:type" content="article" />
        <meta property="og:url" content={canonicalUrl} />
        <link rel="canonical" href={canonicalUrl} />
        {/* Structured data */}
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": post.title,
          "description": metaDesc,
          "author": { "@type": "Person", "name": post.author },
          "datePublished": post.publishedAt,
          "image": post.coverImage,
          "publisher": { "@type": "Organization", "name": "WIZ AI", "url": "https://wiz-ai.io" },
        })}</script>
      </Helmet>

      <div className="min-h-screen bg-black text-white">
        {/* Nav */}
        <nav className="sticky top-0 z-40 border-b border-white/5 bg-black/80 backdrop-blur-xl">
          <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-white font-bold text-lg hover:opacity-80 transition-opacity">
              <span className="text-[--color-gold]">Wiz</span><span>Vid</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/blog" className="text-sm text-white/60 hover:text-white transition-colors flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Blog
              </Link>
              <Link href="/music-video/create">
                <Button size="sm" className="bg-[--color-gold] hover:bg-[--color-gold]/20 text-white text-sm h-8">
                  Create Video
                </Button>
              </Link>
            </div>
          </div>
        </nav>

        {/* Article */}
        <article className="max-w-3xl mx-auto px-4 py-12">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-white/30 mb-8" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-white/60 transition-colors">Home</Link>
            <span>/</span>
            <Link href="/blog" className="hover:text-white/60 transition-colors">Blog</Link>
            <span>/</span>
            <span className="text-white/50 truncate max-w-[200px]">{post.title}</span>
          </nav>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-5">
              {tags.map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs bg-[--color-gold]/15 text-[--color-gold] border-[--color-gold]/30">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-5">
            {post.title}
          </h1>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-4 text-white/40 text-sm mb-8 pb-6 border-b border-white/8">
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              {post.author}
            </span>
            <span className="flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5" />
              {formatDate(post.publishedAt)}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {mins} min read
            </span>
          </div>

          {/* Cover image */}
          {post.coverImage && (
            <div className="rounded-xl overflow-hidden mb-10 border border-white/8">
              <img src={post.coverImage} alt={post.title} className="w-full object-cover max-h-[420px]" />
            </div>
          )}

          {/* Content */}
          <div
            className="prose prose-invert max-w-none text-white/65 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}
          />

          {/* Bottom CTA */}
          <div className="mt-14 p-6 rounded-xl border border-[--color-gold]/30 bg-[--color-gold]/15 text-center">
            <h3 className="text-lg font-bold text-white mb-2">Ready to create your first AI video?</h3>
            <p className="text-white/50 text-sm mb-4">Free to create. Only pay when you render.</p>
            <Link href="/music-video/create">
              <Button className="bg-[--color-gold] hover:bg-[--color-gold]/20 text-white">
                Create Your First Video <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </article>

        {/* Related posts */}
        {related.length > 0 && (
          <div className="max-w-3xl mx-auto px-4 pb-16">
            <h2 className="text-lg font-bold text-white mb-6 border-t border-white/8 pt-10">More from the blog</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {related.map(p => (
                <Link key={p.id} href={`/blog/${p.slug}`}>
                  <div className="group rounded-xl border border-white/8 bg-white/[0.03] overflow-hidden hover:border-[--color-gold]/30 transition-all p-4 cursor-pointer">
                    <h3 className="font-semibold text-white group-hover:text-[--color-gold] transition-colors text-sm mb-1 line-clamp-2">
                      {p.title}
                    </h3>
                    <p className="text-white/40 text-xs">{formatDate(p.publishedAt)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
