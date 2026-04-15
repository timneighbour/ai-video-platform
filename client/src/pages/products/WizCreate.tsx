import { useLocation } from "wouter";

const FEATURES = [
  {
    icon: "🎬",
    title: "AI Storyboard Engine",
    desc: "Describe your idea in plain language and WizCreate™ instantly generates a full visual storyboard — scenes, characters, and cinematic compositions.",
  },
  {
    icon: "✨",
    title: "Scene Generation",
    desc: "Each scene is rendered with AI-powered visual intelligence, producing cinematic frames that match your creative vision.",
  },
  {
    icon: "🎭",
    title: "Character Consistency",
    desc: "Maintain consistent characters across every scene. WizCreate™ tracks visual identity so your story flows seamlessly.",
  },
  {
    icon: "🖼️",
    title: "Style Control",
    desc: "Choose from cinematic, animated, documentary, and more. Fine-tune the visual style to match your brand or creative direction.",
  },
  {
    icon: "⚡",
    title: "Instant Previews",
    desc: "See your storyboard come to life in seconds. Iterate rapidly without waiting for long render queues.",
  },
  {
    icon: "🔗",
    title: "Seamless Pipeline",
    desc: "WizCreate™ feeds directly into WizPilot™, WizSound™, and WizLumina™ for a complete end-to-end production workflow.",
  },
];

const STEPS = [
  { num: "01", title: "Describe Your Idea", desc: "Type a prompt, paste lyrics, or upload a reference image." },
  { num: "02", title: "AI Builds Your Storyboard", desc: "WizCreate™ generates scenes, characters, and compositions automatically." },
  { num: "03", title: "Review & Refine", desc: "Swap scenes, adjust styles, and tweak details with one click." },
  { num: "04", title: "Render Your Video", desc: "Send to WizPilot™ for full video generation with WizSound™ and WizLumina™." },
];

export default function WizCreate() {
  const [, navigate] = useLocation();

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#fff", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
      {/* Back / Home nav */}
      <div style={{ display: "flex", gap: "12px", padding: "20px 24px", position: "sticky", top: 0, background: "rgba(10,10,15,0.92)", backdropFilter: "blur(12px)", zIndex: 50, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={() => window.history.back()} style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.8)", borderRadius: "8px", padding: "8px 16px", fontSize: "14px", cursor: "pointer", fontWeight: 500 }}>← Back</button>
        <button onClick={() => navigate("/")} style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.8)", borderRadius: "8px", padding: "8px 16px", fontSize: "14px", cursor: "pointer", fontWeight: 500 }}>🏠 Home</button>
      </div>

      {/* Hero */}
      <div style={{ textAlign: "center", padding: "72px 24px 48px", maxWidth: "800px", margin: "0 auto" }}>
        <div style={{ display: "inline-block", background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)", borderRadius: "100px", padding: "6px 18px", fontSize: "13px", color: "#a78bfa", fontWeight: 600, marginBottom: "24px", letterSpacing: "0.05em" }}>
          WIZCREATE™
        </div>
        <h1 style={{ fontSize: "clamp(36px,7vw,72px)", fontWeight: 800, lineHeight: 1.1, margin: "0 0 20px", background: "linear-gradient(135deg,#fff 0%,#c4b5fd 60%,#818cf8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
          AI Storyboard Engine
        </h1>
        <p style={{ fontSize: "clamp(16px,2.5vw,20px)", color: "rgba(255,255,255,0.65)", lineHeight: 1.7, marginBottom: "40px" }}>
          Turn any idea into a full visual storyboard in seconds. WizCreate™ is the creative engine that powers every WizVid production — from concept to cinematic output.
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={() => navigate("/music-video/create")} style={{ background: "linear-gradient(135deg,#8b5cf6,#6366f1)", color: "#fff", border: "none", borderRadius: "12px", padding: "16px 32px", fontSize: "16px", fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 24px rgba(139,92,246,0.4)" }}>
            Start Creating →
          </button>
          <button onClick={() => navigate("/pricing")} style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.85)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "12px", padding: "16px 32px", fontSize: "16px", fontWeight: 600, cursor: "pointer" }}>
            View Pricing
          </button>
        </div>
      </div>

      {/* Features grid */}
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 24px 80px" }}>
        <h2 style={{ textAlign: "center", fontSize: "clamp(24px,4vw,36px)", fontWeight: 700, marginBottom: "48px", color: "#fff" }}>Everything you need to create</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: "24px" }}>
          {FEATURES.map((f) => (
            <div key={f.title} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "28px", transition: "border-color 0.2s" }}>
              <div style={{ fontSize: "32px", marginBottom: "12px" }}>{f.icon}</div>
              <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#fff", marginBottom: "8px" }}>{f.title}</h3>
              <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div style={{ background: "rgba(139,92,246,0.05)", borderTop: "1px solid rgba(139,92,246,0.1)", borderBottom: "1px solid rgba(139,92,246,0.1)", padding: "80px 24px" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <h2 style={{ textAlign: "center", fontSize: "clamp(24px,4vw,36px)", fontWeight: 700, marginBottom: "48px", color: "#fff" }}>How WizCreate™ works</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "32px" }}>
            {STEPS.map((s) => (
              <div key={s.num} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "40px", fontWeight: 800, color: "#8b5cf6", opacity: 0.5, marginBottom: "12px" }}>{s.num}</div>
                <h3 style={{ fontSize: "17px", fontWeight: 700, color: "#fff", marginBottom: "8px" }}>{s.title}</h3>
                <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{ textAlign: "center", padding: "80px 24px" }}>
        <h2 style={{ fontSize: "clamp(28px,5vw,48px)", fontWeight: 800, color: "#fff", marginBottom: "16px" }}>Ready to create your first video?</h2>
        <p style={{ fontSize: "18px", color: "rgba(255,255,255,0.55)", marginBottom: "40px" }}>From £2 per render. Plans from £9/month.</p>
        <button onClick={() => navigate("/subscribe")} style={{ background: "linear-gradient(135deg,#8b5cf6,#6366f1)", color: "#fff", border: "none", borderRadius: "12px", padding: "18px 40px", fontSize: "18px", fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 32px rgba(139,92,246,0.5)" }}>
          Get Started Free →
        </button>
      </div>

      {/* Footer nav */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "32px 24px", display: "flex", justifyContent: "center", gap: "24px", flexWrap: "wrap" }}>
        {[["WizPilot™", "/products/wizpilot"], ["WizSound™", "/products/wizsound"], ["WizLumina™", "/products/wizlumina"], ["WizBoost™", "/products/wizboost"], ["Pricing", "/pricing"], ["Help", "/help"]].map(([label, href]) => (
          <button key={href} onClick={() => navigate(href)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.45)", fontSize: "14px", cursor: "pointer", padding: "4px 8px" }}>{label}</button>
        ))}
      </div>
    </div>
  );
}
