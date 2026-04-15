import { useLocation } from "wouter";
import { useState } from "react";

const CATEGORIES = ["All", "Music Video", "Cinematic", "Animation", "Social"];

const ITEMS = [
  {
    id: 1,
    category: "Music Video",
    title: "Neon Stage",
    desc: "Cinematic concert performance with AI-generated crowd and volumetric lighting.",
    tool: "WizCreate™",
    posterUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/showcase-music-neon-stage-L43AthLEfiF5bt3wJUcHWB.webp",
  },
  {
    id: 2,
    category: "Music Video",
    title: "Desert Sunset",
    desc: "Silhouette guitarist at golden hour — epic desert landscape and cinematic lens flares.",
    tool: "WizPilot™",
    posterUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/showcase-music-desert-sunset-gGWfEUTSjXNgKVCvSv5y85.webp",
  },
  {
    id: 3,
    category: "Cinematic",
    title: "Fantasy Warrior",
    desc: "A lone golden warrior surveys a ruined fantasy kingdom — dramatic storm and lightning.",
    tool: "WizPilot™",
    posterUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/showcase-cinematic-warrior-KwKZH22SRsKfJSGoJaL3Nu.webp",
  },
  {
    id: 4,
    category: "Cinematic",
    title: "City Rain",
    desc: "Neon-lit city streets in the rain — moody, atmospheric, cinematic grade.",
    tool: "WizLumina™",
    posterUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/showcase-cinematic-city-rain-GXmCLFvJHDHqJPeqmFHBWP.webp",
  },
  {
    id: 5,
    category: "Animation",
    title: "Pixar Style",
    desc: "Animated character in a lush forest — vibrant colours and expressive motion.",
    tool: "WizCreate™",
    posterUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/showcase-animation-pixar-style-fDHJtVbEHVFJAhKqBPRMJa.webp",
  },
  {
    id: 6,
    category: "Social",
    title: "Product Reveal",
    desc: "Sleek product showcase video — perfect for Instagram and TikTok.",
    tool: "WizPilot™",
    posterUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/showcase-social-product-reveal-fDHJtVbEHVFJAhKqBPRMJa.webp",
  },
];

const TOOL_COLOURS: Record<string, string> = {
  "WizCreate™": "#8b5cf6",
  "WizPilot™": "#22c55e",
  "WizLumina™": "#f59e0b",
  "WizSound™": "#3b82f6",
};

export default function Showcase() {
  const [, navigate] = useLocation();
  const [activeCategory, setActiveCategory] = useState("All");

  const filtered = activeCategory === "All" ? ITEMS : ITEMS.filter((i) => i.category === activeCategory);

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#fff", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
      {/* Back / Home nav with brand logo */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 24px", position: "sticky", top: 0, background: "rgba(10,10,15,0.92)", backdropFilter: "blur(12px)", zIndex: 50, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <a href="/" style={{ flexShrink: 0, marginRight: "auto" }}>
          <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizvid-logo-transparent_fcdb69d6.png" alt="WizVid" style={{ height: "48px", width: "auto", objectFit: "contain", filter: "drop-shadow(0 0 10px rgba(139,92,246,0.4))" }} />
        </a>
        <button onClick={() => window.history.back()} style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.8)", borderRadius: "8px", padding: "8px 16px", fontSize: "14px", cursor: "pointer", fontWeight: 500 }}>← Back</button>
        <button onClick={() => navigate("/")} style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.8)", borderRadius: "8px", padding: "8px 16px", fontSize: "14px", cursor: "pointer", fontWeight: 500 }}>🏠 Home</button>
      </div>

      {/* Hero */}
      <div style={{ textAlign: "center", padding: "64px 24px 48px", maxWidth: "700px", margin: "0 auto" }}>
        <div style={{ display: "inline-block", background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)", borderRadius: "100px", padding: "6px 18px", fontSize: "13px", color: "#a78bfa", fontWeight: 600, marginBottom: "20px", letterSpacing: "0.05em" }}>
          SHOWCASE
        </div>
        <h1 style={{ fontSize: "clamp(32px,6vw,60px)", fontWeight: 800, lineHeight: 1.1, margin: "0 0 16px", background: "linear-gradient(135deg,#fff 0%,#c4b5fd 60%,#818cf8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
          Made with WizVid
        </h1>
        <p style={{ fontSize: "clamp(15px,2.5vw,18px)", color: "rgba(255,255,255,0.6)", lineHeight: 1.7 }}>
          Real videos created by real creators using WizVid AI tools. From music videos to cinematic shorts — see what's possible.
        </p>
      </div>

      {/* Category filter */}
      <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap", padding: "0 24px 48px" }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            style={{
              background: activeCategory === cat ? "linear-gradient(135deg,#8b5cf6,#6366f1)" : "rgba(255,255,255,0.06)",
              border: activeCategory === cat ? "none" : "1px solid rgba(255,255,255,0.1)",
              color: activeCategory === cat ? "#fff" : "rgba(255,255,255,0.65)",
              borderRadius: "100px",
              padding: "8px 20px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px 80px", display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: "24px" }}>
        {filtered.map((item) => (
          <div
            key={item.id}
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", overflow: "hidden", cursor: "pointer", transition: "transform 0.2s, border-color 0.2s" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)"; (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(139,92,246,0.3)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.08)"; }}
          >
            <div style={{ position: "relative", aspectRatio: "16/9", background: "#111", overflow: "hidden" }}>
              <img
                src={item.posterUrl}
                alt={item.title}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
              <div style={{ position: "absolute", top: "12px", left: "12px", background: "rgba(0,0,0,0.7)", borderRadius: "6px", padding: "4px 10px", fontSize: "12px", fontWeight: 600, color: TOOL_COLOURS[item.tool] || "#a78bfa", backdropFilter: "blur(8px)" }}>
                {item.tool}
              </div>
              <div style={{ position: "absolute", top: "12px", right: "12px", background: "rgba(0,0,0,0.7)", borderRadius: "6px", padding: "4px 10px", fontSize: "11px", color: "rgba(255,255,255,0.6)", backdropFilter: "blur(8px)" }}>
                {item.category}
              </div>
            </div>
            <div style={{ padding: "20px" }}>
              <h3 style={{ fontSize: "17px", fontWeight: 700, color: "#fff", marginBottom: "6px" }}>{item.title}</h3>
              <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{ textAlign: "center", padding: "0 24px 80px" }}>
        <div style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: "20px", padding: "48px 32px", maxWidth: "600px", margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(24px,4vw,36px)", fontWeight: 800, color: "#fff", marginBottom: "12px" }}>Create your own</h2>
          <p style={{ fontSize: "16px", color: "rgba(255,255,255,0.55)", marginBottom: "32px" }}>Join thousands of creators making cinematic videos with WizVid AI.</p>
          <button onClick={() => navigate("/subscribe")} style={{ background: "linear-gradient(135deg,#8b5cf6,#6366f1)", color: "#fff", border: "none", borderRadius: "12px", padding: "16px 36px", fontSize: "16px", fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 24px rgba(139,92,246,0.4)" }}>
            Get Started Free →
          </button>
        </div>
      </div>
    </div>
  );
}
