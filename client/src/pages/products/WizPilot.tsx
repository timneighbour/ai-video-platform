import { useLocation } from "wouter";

const FEATURES = [
  { icon: "🤖", title: "Fully Automated Workflow", desc: "Describe any idea and WizPilot handles everything — storyboard, scenes, audio, and final render. Zero editing required." },
  { icon: "📝", title: "Text-to-Video", desc: "Turn a single sentence into a complete cinematic video. WizPilot interprets your prompt and builds the full production." },
  { icon: "🎬", title: "Scene Intelligence", desc: "WizPilot selects the best visual style, camera angles, and transitions for each scene automatically." },
  { icon: "🔄", title: "Batch Production", desc: "Generate multiple videos from a single content brief. Perfect for YouTube channels, social media, and content agencies." },
  { icon: "📱", title: "Any Format", desc: "Landscape, portrait, square — WizPilot optimises your video for every platform automatically." },
  { icon: "⚡", title: "Priority Rendering", desc: "WizPilot jobs get priority in the render queue so your content is ready faster." },
];

export default function WizPilot() {
  const [, navigate] = useLocation();

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#fff", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
      <div style={{ display: "flex", gap: "12px", padding: "20px 24px", position: "sticky", top: 0, background: "rgba(10,10,15,0.92)", backdropFilter: "blur(12px)", zIndex: 50, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={() => window.history.back()} style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.8)", borderRadius: "8px", padding: "8px 16px", fontSize: "14px", cursor: "pointer", fontWeight: 500 }}>← Back</button>
        <button onClick={() => navigate("/")} style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.8)", borderRadius: "8px", padding: "8px 16px", fontSize: "14px", cursor: "pointer", fontWeight: 500 }}>🏠 Home</button>
      </div>

      <div style={{ textAlign: "center", padding: "72px 24px 48px", maxWidth: "800px", margin: "0 auto" }}>
        <div style={{ display: "inline-block", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: "100px", padding: "6px 18px", fontSize: "13px", color: "#4ade80", fontWeight: 600, marginBottom: "24px", letterSpacing: "0.05em" }}>
          WIZPILOT™
        </div>
        <h1 style={{ fontSize: "clamp(36px,7vw,72px)", fontWeight: 800, lineHeight: 1.1, margin: "0 0 20px", background: "linear-gradient(135deg,#fff 0%,#86efac 60%,#4ade80 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
          Automated Video Generation
        </h1>
        <p style={{ fontSize: "clamp(16px,2.5vw,20px)", color: "rgba(255,255,255,0.65)", lineHeight: 1.7, marginBottom: "40px" }}>
          Describe any idea and WizPilot™ handles everything — storyboard, scenes, and final video. The fastest way from concept to published content.
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={() => navigate("/wizpilot")} style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)", color: "#fff", border: "none", borderRadius: "12px", padding: "16px 32px", fontSize: "16px", fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 24px rgba(34,197,94,0.35)" }}>
            Launch WizPilot →
          </button>
          <button onClick={() => navigate("/pricing")} style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.85)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "12px", padding: "16px 32px", fontSize: "16px", fontWeight: 600, cursor: "pointer" }}>
            View Pricing
          </button>
        </div>
      </div>

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 24px 80px" }}>
        <h2 style={{ textAlign: "center", fontSize: "clamp(24px,4vw,36px)", fontWeight: 700, marginBottom: "48px", color: "#fff" }}>Built for speed and scale</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: "24px" }}>
          {FEATURES.map((f) => (
            <div key={f.title} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "28px" }}>
              <div style={{ fontSize: "32px", marginBottom: "12px" }}>{f.icon}</div>
              <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#fff", marginBottom: "8px" }}>{f.title}</h3>
              <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ textAlign: "center", padding: "0 24px 80px" }}>
        <h2 style={{ fontSize: "clamp(28px,5vw,48px)", fontWeight: 800, color: "#fff", marginBottom: "16px" }}>Start automating your content</h2>
        <p style={{ fontSize: "18px", color: "rgba(255,255,255,0.55)", marginBottom: "40px" }}>From £2 per render. Plans from £9/month.</p>
        <button onClick={() => navigate("/subscribe")} style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)", color: "#fff", border: "none", borderRadius: "12px", padding: "18px 40px", fontSize: "18px", fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 32px rgba(34,197,94,0.4)" }}>
          Get Started Free →
        </button>
      </div>

      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "32px 24px", display: "flex", justifyContent: "center", gap: "24px", flexWrap: "wrap" }}>
        {[["WizCreate™", "/products/wizcreate"], ["WizSound™", "/products/wizsound"], ["WizLumina™", "/products/wizlumina"], ["WizBoost™", "/products/wizboost"], ["Pricing", "/pricing"], ["Help", "/help"]].map(([label, href]) => (
          <button key={href} onClick={() => navigate(href)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.45)", fontSize: "14px", cursor: "pointer", padding: "4px 8px" }}>{label}</button>
        ))}
      </div>
    </div>
  );
}
