import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { PenLine, Trash2, Eye, EyeOff, Plus, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function BlogAdmin() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    coverImage: "",
    tags: "",
  });

  const posts = trpc.blog.adminList.useQuery(undefined, { enabled: user?.role === "admin" });

  const createPost = trpc.blog.create.useMutation({
    onSuccess: () => {
      toast.success("Post created — blog post has been saved.");
      utils.blog.adminList.invalidate();
      setCreating(false);
      setForm({ title: "", slug: "", excerpt: "", content: "", coverImage: "", tags: "" });
    },
    onError: (e) => toast.error(e.message || "Something went wrong"),
  });

  const updatePost = trpc.blog.update.useMutation({
    onSuccess: () => utils.blog.adminList.invalidate(),
    onError: (e) => toast.error(e.message || "Something went wrong"),
  });

  const deletePost = trpc.blog.delete.useMutation({
    onSuccess: () => {
      toast.success("Post deleted");
      utils.blog.adminList.invalidate();
    },
    onError: (e) => toast.error(e.message || "Something went wrong"),
  });

  // Auto-generate slug from title
  const handleTitleChange = (v: string) => {
    setForm((f) => ({
      ...f,
      title: v,
      slug: f.slug || v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    }));
  };

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <p className="text-white/50">Admin access required.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <Link href="/blog">
              <a className="text-white/40 hover:text-white transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </a>
            </Link>
            <div>
              <h1 className="text-2xl font-extrabold text-white">Blog Admin</h1>
              <p className="text-white/40 text-sm mt-0.5">Manage WIZ AI blog posts</p>
            </div>
          </div>
          <Button
            onClick={() => setCreating(true)}
            className="bg-[--color-gold] hover:bg-[--color-gold]/20 text-white gap-2"
          >
            <Plus className="w-4 h-4" />
            New Post
          </Button>
        </div>

        {/* Create form */}
        {creating && (
          <div className="mb-10 rounded-2xl border border-white/10 bg-white/3 p-6">
            <h2 className="text-lg font-bold mb-5">New Blog Post</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-white/50 uppercase tracking-wider mb-1 block">Title *</label>
                <Input
                  value={form.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="How to Create a Cinematic Music Video with AI"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/25"
                />
              </div>
              <div>
                <label className="text-xs text-white/50 uppercase tracking-wider mb-1 block">Slug (URL) *</label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  placeholder="how-to-create-cinematic-music-video-ai"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/25 font-mono text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-white/50 uppercase tracking-wider mb-1 block">Excerpt</label>
                <Textarea
                  value={form.excerpt}
                  onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
                  placeholder="A short summary shown on the blog listing page..."
                  rows={2}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/25"
                />
              </div>
              <div>
                <label className="text-xs text-white/50 uppercase tracking-wider mb-1 block">Content (Markdown) *</label>
                <Textarea
                  value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  placeholder="Write your article in Markdown..."
                  rows={12}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/25 font-mono text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-white/50 uppercase tracking-wider mb-1 block">Cover Image URL</label>
                <Input
                  value={form.coverImage}
                  onChange={(e) => setForm((f) => ({ ...f, coverImage: e.target.value }))}
                  placeholder="https://cdn.example.com/cover.jpg"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/25"
                />
              </div>
              <div>
                <label className="text-xs text-white/50 uppercase tracking-wider mb-1 block">Tags (comma-separated)</label>
                <Input
                  value={form.tags}
                  onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                  placeholder="AI video, music video, tutorial"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/25"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={() =>
                    createPost.mutate({
                      title: form.title,
                      slug: form.slug || undefined,
                      excerpt: form.excerpt || undefined,
                      content: form.content,
                      coverImage: form.coverImage || undefined,
                      tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
                      status: "draft",
                    })
                  }
                  disabled={!form.title || !form.content || createPost.isPending}
                  className="bg-[--color-gold] hover:bg-[--color-gold]/20 text-white"
                >
                  {createPost.isPending ? "Saving…" : "Save Draft"}
                </Button>
                <Button
                  onClick={() =>
                    createPost.mutate({
                      title: form.title,
                      slug: form.slug || undefined,
                      excerpt: form.excerpt || undefined,
                      content: form.content,
                      coverImage: form.coverImage || undefined,
                      tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
                      status: "published",
                    })
                  }
                  disabled={!form.title || !form.content || createPost.isPending}
                  className="bg-[--color-silver] hover:bg-[--color-silver]/15 text-white"
                >
                  Publish Now
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setCreating(false)}
                  className="text-white/40 hover:text-white"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Post list */}
        <div className="space-y-3">
          {posts.isLoading && (
            <div className="text-white/40 text-sm">Loading posts…</div>
          )}
          {posts.data && posts.data.length === 0 && !creating && (
            <div className="text-center py-16 text-white/30">
              <PenLine className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No posts yet. Create your first one above.</p>
            </div>
          )}
          {posts.data?.map((post) => {
            const isPublished = post.status === "published";
            const tags: string[] = (() => {
              try { return post.tags ? JSON.parse(post.tags) : []; } catch { return []; }
            })();
            return (
              <div
                key={post.id}
                className="flex items-center gap-4 p-4 rounded-xl border border-white/8 bg-white/3 hover:bg-white/5 transition-colors"
              >
                {post.coverImage && (
                  <img
                    src={post.coverImage}
                    alt=""
                    className="w-16 h-12 rounded-lg object-cover flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isPublished ? "bg-[--color-silver]" : "bg-[--color-gold]"}`} />
                    <p className="text-white font-semibold text-sm truncate">{post.title}</p>
                  </div>
                  <p className="text-white/35 text-xs font-mono">/blog/{post.slug}</p>
                  {tags.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="px-1.5 py-0.5 rounded bg-[--color-gold]/15 text-[--color-gold] text-[10px]">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => updatePost.mutate({ id: post.id, status: isPublished ? "draft" : "published" })}
                    className={`p-2 rounded-lg transition-colors ${
                      isPublished
                        ? "text-[--color-silver] hover:bg-[--color-silver]/10"
                        : "text-white/30 hover:bg-white/8"
                    }`}
                    title={isPublished ? "Unpublish" : "Publish"}
                  >
                    {isPublished ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <Link href={`/blog/${post.slug}`}>
                    <a className="p-2 rounded-lg text-white/30 hover:text-white hover:bg-white/8 transition-colors" title="View post">
                      <ArrowLeft className="w-4 h-4 rotate-180" />
                    </a>
                  </Link>
                  <button
                    onClick={() => {
                      if (confirm("Delete this post?")) deletePost.mutate({ id: post.id });
                    }}
                    className="p-2 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
