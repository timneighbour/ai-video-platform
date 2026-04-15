import { useLocation } from "wouter";

const FEATURES = [
  { icon: "📈", title: "Creator Network", desc: "Connect with a growing community of WizVid creators. Share your work, discover others, and grow your audience organically." },
  { icon: "🚀", title: "Built-in Distribution", desc: "Publish your videos directly to your audience from within WizVid. No extra tools, no extra steps." },
  { icon: "👥", title: "Audience Building", desc: "WizBoost connects your content to real viewers, creators, and fans who are actively looking for content like yours." },
  { icon: "📊", title: "Performance Analytics", desc: "Track views, engagement, and audience growth across all your WizVid content in one dashboard." },
  { icon: "🎯", title: "Targeted Reach", desc: "WizBoost surfaces your content to the right audience based on genre, style, and creator profile." },
  { icon: "🏆", title: "Creator Badges", desc: "Earn recognition badges as you create and publish. Featured creators get additional visibility across the platform." },
];

export default function WizBoost() {
  const [, navigate] = useLocation();

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#fff", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
      <div style={{ display: "flex", gap: "12px", padding: "20px 24px", position: "sticky", top: 0, background: "rgba(10,10,15,0.92)", backdropFilter: "blur(12px)", zIndex: 50, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={() => window.history.back()} style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.8)", borderRadius: "8px", padding: "8px 16px", fontSize: "14px", cursor: "pointer", fontWeight: 500 }}>← Back</button>
        <button onClick={() => navigate("/")} style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.8)", borderRadius: "8px", padding: "8px 16px", fontSize: "14px", cursor: "pointer", fontWeight: 500 }}>🏠 Home</button>
      </div>

      <div style={{ textAlign: "center", padding: "72px 24px 48px", maxWidth: "800px", margin: "0 auto" }}>
        <div style={{ display: "inline-block", background: "rgba(236,72,153,0.12)", border: "1px solid rgba(236,72,153,0.3)", borderRadius: "100px", padding: "6px 18px", fontSize: "13px", color: "#f9a8d4", fontWeight: 600, marginBottom: "24px", letterSpacing: "0.05em" }}>
          WIZBOOST™
        </div>
        <h1 style={{ fontSize: "clamp(36px,7vw,72px)", fontWeight: 800, lineHeight: 1.1, margin: "0 0 20px", background: "linear-gradient(135deg,#fff 0%,#fbcfe8 60%,#ec4899 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
          Creator Growth Network
        </h1>
        <p style={{ fontSize: "clamp(16px,2.5vw,20px)", color: "rgba(255,255,255,0.65)", lineHeight: 1.7, marginBottom: "40px" }}>
          Grow your audience with built-in distribution tools. WizBoost connects your content to real viewers, creators, and fans — helping you grow while you create.
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={() => navigate("/discover")} style={{ background: "linear-gradient(135deg,#ec4899,#be185d)", color: "#fff", border: "none", borderRadius: "12px", padding: "16px 32px", fontSize: "16px", fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 24px rgba(236,72,153,0.35)" }}>
            Explore Creators →
          </button>
          <button onClick={() => navigate("/pricing")} style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.85)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "12px", padding: "16px 32px", fontSize: "16px", fontWeight: 600, cursor: "pointer" }}>
            View Pricing
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ background: "rgba(236,72,153,0.06)", borderTop: "1px solid rgba(236,72,153,0.1)", borderBottom: "1px solid rgba(236,72,153,0.1)", padding: "40px 24px", marginBottom: "64px" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "32px", textAlign: "center" }}>
          {[["10k+", "Active Creators"], ["500k+", "Videos Created"], ["2M+", "Views Generated"], ["4.9★", "Creator Rating"]].map(([num, label]) => (
            <div key={label}>
              <div style={{ fontSize: "clamp(28px,5vw,40px)", fontWeight: 800, color: "#f9a8d4", marginBottom: "4px" }}>{num}</div>
              <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 24px 80px" }}>
        <h2 style={{ textAlign: "center", fontSize: "clamp(24px,4vw,36px)", fontWeight: 700, marginBottom: "48px", color: "#fff" }}>Everything you need to grow</h2>
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
        <h2 style={{ fontSize: "clamp(28px,5vw,48px)", fontWeight: 800, color: "#fff", marginBottom: "16px" }}>Grow your audience today</h2>
        <p style={{ fontSize: "18px", color: "rgba(255,255,255,0.55)", marginBottom: "40px" }}>WizBoost is included with all WizVid plans. From £9/month.</p>
        <button onClick={() => navigate("/subscribe")} style={{ background: "linear-gradient(135deg,#ec4899,#be185d)", color: "#fff", border: "none", borderRadius: "12px", padding: "18px 40px", fontSize: "18px", fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 32px rgba(236,72,153,0.4)" }}>
          Get Started Free →
        </button>
      </div>

      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "32px 24px", display: "flex", justifyContent: "center", gap: "24px", flexWrap: "wrap" }}>
        {[["WizCreate™", "/products/wizcreate"], ["WizPilot™", "/products/wizpilot"], ["WizSound™", "/products/wizsound"], ["WizLumina™", "/products/wizlumina"], ["Pricing", "/pricing"], ["Help", "/help"]].map(([label, href]) => (
          <button key={href} onClick={() => navigate(href)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.45)", fontSize: "14px", cursor: "pointer", padding: "4px 8px" }}>{label}</button>
        ))}
      </div>
    </div>
  );
}
