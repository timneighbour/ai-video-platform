import { useLocation } from "wouter";

const FEATURES = [
  { icon: "🎨", title: "Cinematic Colour Grading", desc: "AI-powered colour grading that applies film-level LUTs and tone curves to every frame, transforming flat AI video into rich, vivid cinema." },
  { icon: "🌑", title: "Deep Black Levels", desc: "WizLumina crushes blacks to true cinematic depth, eliminating the washed-out look of standard AI video output." },
  { icon: "✨", title: "HDR Tone Mapping", desc: "Intelligent HDR processing preserves highlight detail while lifting shadows — the signature look of premium streaming content." },
  { icon: "🔍", title: "AI Sharpening", desc: "Unsharp masking and edge enhancement bring out fine detail in every frame, making your video look sharper than the source." },
  { icon: "🌈", title: "Saturation Control", desc: "Targeted saturation enhancement makes colours pop without oversaturation — vibrant, natural, and cinematic." },
  { icon: "🎬", title: "Frame-by-Frame Processing", desc: "WizLumina processes every single frame individually, ensuring consistent quality throughout the entire video." },
];

export default function WizLumina() {
  const [, navigate] = useLocation();

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#fff", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 24px", position: "sticky", top: 0, background: "rgba(10,10,15,0.92)", backdropFilter: "blur(12px)", zIndex: 50, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <a href="/" style={{ flexShrink: 0, marginRight: "auto" }}>
          <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizvid-logo-transparent_fcdb69d6.png" alt="WizVid" style={{ height: "48px", width: "auto", objectFit: "contain", filter: "drop-shadow(0 0 10px rgba(139,92,246,0.4))" }} />
        </a>
        <button onClick={() => window.history.back()} style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.8)", borderRadius: "8px", padding: "8px 16px", fontSize: "14px", cursor: "pointer", fontWeight: 500 }}>← Back</button>
        <button onClick={() => navigate("/")} style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.8)", borderRadius: "8px", padding: "8px 16px", fontSize: "14px", cursor: "pointer", fontWeight: 500 }}>🏠 Home</button>
      </div>

      <div style={{ textAlign: "center", padding: "72px 24px 48px", maxWidth: "800px", margin: "0 auto" }}>
        <div style={{ display: "inline-block", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: "100px", padding: "6px 18px", fontSize: "13px", color: "#fbbf24", fontWeight: 600, marginBottom: "24px", letterSpacing: "0.05em" }}>
          WIZLUMINA™
        </div>
        <h1 style={{ fontSize: "clamp(36px,7vw,72px)", fontWeight: 800, lineHeight: 1.1, margin: "0 0 20px", background: "linear-gradient(135deg,#fff 0%,#fde68a 60%,#f59e0b 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
          Visual Enhancement Engine
        </h1>
        <p style={{ fontSize: "clamp(16px,2.5vw,20px)", color: "rgba(255,255,255,0.65)", lineHeight: 1.7, marginBottom: "40px" }}>
          Cinematic colour grading, HDR tone mapping, and film-level sharpening that transforms flat AI video into rich, vivid, cinema-quality visuals.
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={() => navigate("/music-video/create")} style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "#fff", border: "none", borderRadius: "12px", padding: "16px 32px", fontSize: "16px", fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 24px rgba(245,158,11,0.35)" }}>
            Try WizLumina →
          </button>
          <button onClick={() => navigate("/pricing")} style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.85)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "12px", padding: "16px 32px", fontSize: "16px", fontWeight: 600, cursor: "pointer" }}>
            View Pricing
          </button>
        </div>
      </div>

      {/* Before/After visual */}
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "0 24px 64px" }}>
        <div style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: "20px", padding: "40px 32px", textAlign: "center" }}>
          <h2 style={{ fontSize: "24px", fontWeight: 700, color: "#fff", marginBottom: "12px" }}>See the difference</h2>
          <p style={{ fontSize: "16px", color: "rgba(255,255,255,0.55)", marginBottom: "24px" }}>WizLumina™ applies professional colour science to every frame — the same techniques used in Hollywood post-production.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", maxWidth: "600px", margin: "0 auto" }}>
            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "12px", padding: "20px", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", fontWeight: 600, marginBottom: "8px", letterSpacing: "0.05em" }}>WITHOUT</div>
              <div style={{ fontSize: "15px", color: "rgba(255,255,255,0.6)" }}>Flat, washed-out colours. Soft edges. Standard AI output.</div>
            </div>
            <div style={{ background: "rgba(245,158,11,0.08)", borderRadius: "12px", padding: "20px", border: "1px solid rgba(245,158,11,0.2)" }}>
              <div style={{ fontSize: "13px", color: "#fbbf24", fontWeight: 600, marginBottom: "8px", letterSpacing: "0.05em" }}>WITH WIZLUMINA™</div>
              <div style={{ fontSize: "15px", color: "rgba(255,255,255,0.8)" }}>Deep blacks. Vivid colours. Crisp detail. Cinema-quality visuals.</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 24px 80px" }}>
        <h2 style={{ textAlign: "center", fontSize: "clamp(24px,4vw,36px)", fontWeight: 700, marginBottom: "48px", color: "#fff" }}>The WizLumina™ processing pipeline</h2>
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
        <h2 style={{ fontSize: "clamp(28px,5vw,48px)", fontWeight: 800, color: "#fff", marginBottom: "16px" }}>Elevate your visuals</h2>
        <p style={{ fontSize: "18px", color: "rgba(255,255,255,0.55)", marginBottom: "40px" }}>WizLumina™ is included in every WizVid render. Plans from £9/month.</p>
        <button onClick={() => navigate("/subscribe")} style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "#fff", border: "none", borderRadius: "12px", padding: "18px 40px", fontSize: "18px", fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 32px rgba(245,158,11,0.4)" }}>
          Get Started Free →
        </button>
      </div>

      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "32px 24px", display: "flex", justifyContent: "center", gap: "24px", flexWrap: "wrap" }}>
        {[["WizCreate™", "/products/wizcreate"], ["WizPilot™", "/products/wizpilot"], ["WizSound™", "/products/wizsound"], ["WizBoost™", "/products/wizboost"], ["Pricing", "/pricing"], ["Help", "/help"]].map(([label, href]) => (
          <button key={href} onClick={() => navigate(href)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.45)", fontSize: "14px", cursor: "pointer", padding: "4px 8px" }}>{label}</button>
        ))}
      </div>
    </div>
  );
}
