import { useEffect, useCallback } from "react";
import { useRoute, Link } from "wouter";
import { SEO_PAGES } from "@/data/seoPages";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  Play,
  ArrowRight,
  Sparkles,
  Zap,
  Clock,
  TrendingUp,
  Shield,
  Star,
  ChevronRight,
} from "lucide-react";

// ── Meta helpers ──────────────────────────────────────────────────────────────
function setMeta(name: string, content: string, property = false) {
  const attr = property ? "property" : "name";
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.content = content;
}

function setLink(rel: string, href: string) {
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

function injectJsonLd(id: string, data: object) {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement("script");
    el.id = id;
    el.setAttribute("type", "application/ld+json");
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

// ── Demo video embed ──────────────────────────────────────────────────────────
function DemoVideoEmbed({ keyword }: { keyword: string }) {
  return (
    <div className="my-8 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
      <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 px-4 py-3 flex items-center gap-2">
        <Play className="w-4 h-4 text-pink-400" />
        <span className="text-sm text-white/70 font-medium">Demo: {keyword}</span>
        <Badge className="ml-auto bg-pink-500/20 text-pink-300 border-pink-500/30 text-xs">AI Generated</Badge>
      </div>
      <div className="aspect-video bg-black/60 flex items-center justify-center relative">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 to-black/60 pointer-events-none" />
        <div className="relative z-10 text-center">
          <div className="w-20 h-20 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-4 cursor-pointer hover:bg-white/20 transition-colors">
            <Play className="w-8 h-8 text-white ml-1" />
          </div>
          <p className="text-white/60 text-sm">Click to watch AI-generated demo</p>
          <p className="text-white/40 text-xs mt-1">Real output from WIZ AI</p>
        </div>
      </div>
    </div>
  );
}

// ── Trust signals bar ─────────────────────────────────────────────────────────
function TrustBar() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 py-4 px-6 rounded-xl bg-white/5 border border-white/10 my-6 text-sm text-white/60">
      <span className="flex items-center gap-1.5">
        <Shield className="w-4 h-4 text-green-400" />
        No credit card required
      </span>
      <span className="text-white/20 hidden sm:inline">|</span>
      <span className="flex items-center gap-1.5">
        <TrendingUp className="w-4 h-4 text-violet-400" />
        10,000+ videos generated
      </span>
      <span className="text-white/20 hidden sm:inline">|</span>
      <span className="flex items-center gap-1.5">
        <Star className="w-4 h-4 text-amber-400" />
        Trusted by creators worldwide
      </span>
      <span className="text-white/20 hidden sm:inline">|</span>
      <span className="flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-pink-400" />
          Free to create
      </span>
    </div>
  );
}

// ── CTA button ────────────────────────────────────────────────────────────────
function CTAButton({
  text = "Create Your First AI Video Now",
  className = "",
  keyword = "",
}: {
  text?: string;
  className?: string;
  keyword?: string;
}) {
  const label = keyword
    ? `Try ${keyword.replace(/^AI /i, "AI ")} Free`
    : text;
  return (
    <div className={`flex flex-col sm:flex-row gap-3 ${className}`}>
      <Link href="/music-video">
        <Button
          size="lg"
          className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold px-8 py-4 rounded-xl text-lg shadow-lg shadow-pink-500/25 w-full sm:w-auto"
        >
          <Sparkles className="w-5 h-5 mr-2" />
          {label}
        </Button>
      </Link>
      <Link href="/">
        <Button
          size="lg"
          variant="outline"
          className="border-white/20 text-white hover:bg-white/10 px-8 py-4 rounded-xl text-lg w-full sm:w-auto"
        >
          <ArrowRight className="w-5 h-5 mr-2" />
          Learn More
        </Button>
      </Link>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SeoLandingPage() {
  const [, params] = useRoute("/seo/:slug");
  const slug = params?.slug;
  const page = SEO_PAGES.find((p) => p.slug === slug);

  const canonicalUrl = `https://www.wizvid.ai/seo/${slug}`;
  const ogImage =
    "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizvid-og-image_placeholder.png";

  const injectSchemas = useCallback(() => {
    if (!page) return;

    // BreadcrumbList
    injectJsonLd("schema-breadcrumb", {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://www.wizvid.ai/" },
        { "@type": "ListItem", position: 2, name: page.keyword, item: canonicalUrl },
      ],
    });

    // HowTo
    injectJsonLd("schema-howto", {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: `How to use ${page.keyword}`,
      description: page.metaDescription,
      step: page.howToSteps.map((text, i) => ({
        "@type": "HowToStep",
        position: i + 1,
        name: `Step ${i + 1}`,
        text,
      })),
    });

    // FAQPage — generate from whyBullets + useCases
    const faqItems = [
      {
        q: `What is a ${page.keyword}?`,
        a: page.intro.split(".")[0] + ".",
      },
      {
        q: `How long does it take to create a video with ${page.keyword}?`,
        a: "WIZ AI generates a full storyboard in under 30 seconds and renders a complete video in under 5 minutes — no editing required.",
      },
      {
        q: `Do I need any video editing skills to use ${page.keyword}?`,
        a: "No. WIZ AI is fully automated. You upload your audio or describe your idea, and the AI handles everything from storyboard to final render.",
      },
      {
        q: `Is ${page.keyword} free to try?`,
        a: "Yes. WIZ AI is free to use — no credit card required. Storyboard generation is always free. You only pay when you're ready to render and download your finished video.",
      },
    ];

    injectJsonLd("schema-faq", {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqItems.map(({ q, a }) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      })),
    });

    // VideoObject (demo placeholder)
    injectJsonLd("schema-video", {
      "@context": "https://schema.org",
      "@type": "VideoObject",
      name: `${page.keyword} Demo — WIZ AI`,
      description: `Watch a demo of WIZ AI's ${page.keyword} in action. See how AI generates a complete music video from audio in minutes.`,
      thumbnailUrl: ogImage,
      uploadDate: "2026-04-09",
      publisher: {
        "@type": "Organization",
        name: "WIZ AI",
        logo: {
          "@type": "ImageObject",
          url: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizai-logo-v3_bd51f720.png",
        },
      },
    });
  }, [page, canonicalUrl, ogImage]);

  useEffect(() => {
    if (!page) return;

    // Title & description
    document.title = page.metaTitle;
    setMeta("description", page.metaDescription);

    // Canonical
    setLink("canonical", canonicalUrl);

    // Open Graph
    setMeta("og:type", "website", true);
    setMeta("og:title", page.metaTitle, true);
    setMeta("og:description", page.metaDescription, true);
    setMeta("og:url", canonicalUrl, true);
    setMeta("og:image", ogImage, true);
    setMeta("og:site_name", "WIZ AI", true);

    // Twitter Card
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", page.metaTitle);
    setMeta("twitter:description", page.metaDescription);
    setMeta("twitter:image", ogImage);

    // Schema markup
    injectSchemas();
  }, [page, canonicalUrl, ogImage, injectSchemas]);

  if (!page) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Page Not Found</h1>
          <Link href="/">
            <Button className="bg-pink-500 hover:bg-pink-600">Back to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const relatedPages = SEO_PAGES.filter((p) => page.relatedSlugs.includes(p.slug));

  // Generate inline FAQ items
  const faqItems = [
    {
      q: `What is a ${page.keyword}?`,
      a: page.intro.split(".")[0] + ".",
    },
    {
      q: `How long does it take to create a video with ${page.keyword}?`,
      a: "WIZ AI generates a full storyboard in under 30 seconds and renders a complete video in under 5 minutes — no editing required.",
    },
    {
      q: `Do I need any video editing skills to use ${page.keyword}?`,
      a: "No. WIZ AI is fully automated. You upload your audio or describe your idea, and the AI handles everything from storyboard to final render.",
    },
    {
      q: `Is ${page.keyword} free to try?`,
      a: "Yes. WIZ AI is free to use — no credit card required. Storyboard generation is always free. You only pay when you're ready to render and download your finished video.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#080810] text-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center cursor-pointer">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizai-logo-v3_bd51f720.png"
                alt="WIZ AI"
                className="h-[6.5rem] w-auto object-contain transition-all duration-300 hover:scale-105 hover:brightness-110"
              />
            </div>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm text-white/60">
            <Link href="/music-video" className="hover:text-white transition-all duration-200 hover:scale-105 hover:-translate-y-0.5">WIZ AIeo</Link>
            <Link href="/autopilot" className="hover:text-white transition-all duration-200 hover:scale-105 hover:-translate-y-0.5">WizScript</Link>
            <Link href="/pricing" className="hover:text-white transition-all duration-200 hover:scale-105 hover:-translate-y-0.5">Pricing</Link>
          </div>
          <Link href="/music-video">
            <Button className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-sm px-4 py-2 rounded-lg">
              Start Free
            </Button>
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-white/40 mb-8">
          <Link href="/" className="hover:text-white/70 transition-colors">Home</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-white/60">{page.keyword}</span>
        </nav>

        {/* H1 + Top CTA */}
        <div className="mb-10">
          <Badge className="mb-4 bg-pink-500/20 text-pink-300 border-pink-500/30">
            <Zap className="w-3 h-3 mr-1" />
            AI-Powered • No Editing Required
          </Badge>
          <h1 className="text-4xl md:text-5xl font-black mb-6 leading-tight">
            {page.h1.split("(")[0]}
            <span className="block text-2xl md:text-3xl font-semibold text-white/60 mt-2">
              {page.h1.includes("(") ? `(${page.h1.split("(")[1]}` : ""}
            </span>
          </h1>
          <p className="text-lg text-white/70 leading-relaxed mb-8 max-w-2xl">{page.intro}</p>
          <CTAButton text="Create Your First AI Video Now" keyword={page.keyword} />
        </div>

        {/* Trust bar */}
        <TrustBar />

        {/* Demo Video */}
        <DemoVideoEmbed keyword={page.keyword} />

        {/* How To Section */}
        <section className="my-16">
          <h2 className="text-3xl font-bold mb-8">
            How to {page.keyword.replace(/^AI /i, "Use AI for ")}
          </h2>
          <div className="grid gap-6">
            {page.howToSteps.map((step, i) => (
              <div
                key={i}
                className="flex gap-4 p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {i + 1}
                </div>
                <div>
                  <p className="text-white font-medium text-lg">{step}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Mid CTA */}
        <div className="my-12 p-8 rounded-2xl bg-gradient-to-r from-pink-900/30 to-purple-900/30 border border-pink-500/20 text-center">
          <h3 className="text-2xl font-bold mb-3">Ready to get started?</h3>
          <p className="text-white/60 mb-2">Join thousands of creators already using WIZ AI</p>
          <p className="text-white/40 text-sm mb-6">No credit card required · Free to create · Only pay to render</p>
          <CTAButton text="Create Your First AI Video — Free" keyword={page.keyword} className="justify-center" />
        </div>

        {/* Why Use AI */}
        <section className="my-16">
          <h2 className="text-3xl font-bold mb-8">
            Why Use AI for {page.keyword.replace(/^AI /i, "")}
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {page.whyBullets.map((bullet, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10"
              >
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <p className="text-white/80">{bullet}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Best Tool */}
        <section className="my-16">
          <h2 className="text-3xl font-bold mb-6">
            Best AI Tool for {page.keyword.replace(/^AI /i, "")}
          </h2>
          <div className="p-8 rounded-2xl bg-gradient-to-br from-purple-900/40 to-pink-900/20 border border-purple-500/20">
            <div className="flex items-center gap-3 mb-4">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizai-logo-v3_bd51f720.png"
                alt="WIZ AI"
                className="w-10 h-10 rounded-xl object-cover"
              />
              <span className="text-xl font-bold">WIZ AI</span>
              <Badge className="bg-green-500/20 text-green-300 border-green-500/30">Recommended</Badge>
            </div>
            <p className="text-white/80 leading-relaxed text-lg">{page.bestToolParagraph}</p>
          </div>
        </section>

        {/* Use Cases */}
        <section className="my-16">
          <h2 className="text-3xl font-bold mb-8">
            Who Uses WIZ AI for {page.keyword.replace(/^AI /i, "")}
          </h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {page.useCases.map((uc, i) => (
              <div
                key={i}
                className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/30 transition-colors"
              >
                <h3 className="font-bold text-lg mb-2 text-purple-300">{uc.title}</h3>
                <p className="text-white/70">{uc.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Stats */}
        <section className="my-16 grid grid-cols-3 gap-6 text-center">
          {[
            { icon: <TrendingUp className="w-6 h-6" />, value: "10,000+", label: "Videos Generated" },
            { icon: <Clock className="w-6 h-6" />, value: "< 5 min", label: "Average Creation Time" },
            { icon: <Zap className="w-6 h-6" />, value: "6", label: "AI Video Styles" },
          ].map((stat, i) => (
            <div key={i} className="p-6 rounded-2xl bg-white/5 border border-white/10">
              <div className="text-pink-400 flex justify-center mb-2">{stat.icon}</div>
              <div className="text-3xl font-black text-white mb-1">{stat.value}</div>
              <div className="text-white/50 text-sm">{stat.label}</div>
            </div>
          ))}
        </section>

        {/* FAQ Section */}
        <section className="my-16">
          <h2 className="text-3xl font-bold mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {faqItems.map(({ q, a }, i) => (
              <div key={i} className="p-6 rounded-2xl bg-white/5 border border-white/10">
                <h3 className="font-bold text-white mb-2">{q}</h3>
                <p className="text-white/70 text-sm leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Related Pages */}
        {relatedPages.length > 0 && (
          <section className="my-16">
            <h2 className="text-2xl font-bold mb-6">Related AI Video Tools</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {relatedPages.map((rp) => (
                <Link key={rp.slug} href={`/seo/${rp.slug}`}>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-purple-500/40 hover:bg-white/10 transition-all cursor-pointer">
                    <ArrowRight className="w-4 h-4 text-purple-400 mb-2" />
                    <p className="text-white/80 text-sm font-medium">{rp.keyword}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Bottom CTA */}
        <div className="my-16 p-10 rounded-3xl bg-gradient-to-br from-pink-900/40 via-purple-900/40 to-blue-900/40 border border-white/10 text-center">
          <Sparkles className="w-12 h-12 text-pink-400 mx-auto mb-4" />
          <h2 className="text-4xl font-black mb-4">Ready to Create Your First AI Video?</h2>
          <p className="text-white/60 text-lg mb-8 max-w-xl mx-auto">
            No editing. No experience needed. Just upload your audio or idea and let WIZ AI do the rest.
          </p>
          <CTAButton text="Create Your First AI Video Now — Free" keyword={page.keyword} className="justify-center" />
          <p className="text-white/30 text-sm mt-4">No credit card required • Free to create • Only pay to render</p>
        </div>

        {/* SEO paragraph */}
        <div className="my-12 p-6 rounded-2xl bg-white/3 border border-white/5">
          <p className="text-white/40 text-sm leading-relaxed">
            WIZ AI is an advanced AI video platform designed for musicians, YouTubers, kids content creators, and social
            media creators. Our {page.keyword.toLowerCase()} technology allows anyone to create professional-quality
            videos without editing skills. Whether you need an {page.keyword.toLowerCase()} for YouTube, TikTok, or any
            platform, WIZ AI delivers stunning results in minutes.{" "}
            <Link href="/" className="text-purple-400 hover:text-purple-300 ml-1">
              Learn more about WIZ AI →
            </Link>
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 mt-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <Link href="/">
            <span className="font-bold text-xl bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent cursor-pointer">
              WIZ AI
            </span>
          </Link>
          <p className="text-white/40 text-sm mt-2">AI Music Video Generator • Create Videos in Minutes</p>
          <div className="flex flex-wrap justify-center gap-4 mt-6 text-sm text-white/40">
            <Link href="/" className="hover:text-white/70 transition-colors">Home</Link>
            <Link href="/music-video" className="hover:text-white/70 transition-colors">WIZ AIeo</Link>
            <Link href="/autopilot" className="hover:text-white/70 transition-colors">WizScript</Link>
            <Link href="/pricing" className="hover:text-white/70 transition-colors">Pricing</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
