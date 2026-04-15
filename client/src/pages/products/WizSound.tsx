import { useLocation } from "wouter";

const FEATURES = [
  { icon: "🎵", title: "Stereo Width Enhancement", desc: "Proprietary stereo widening creates an immersive soundstage that wraps around the listener — far beyond standard stereo." },
  { icon: "🔊", title: "Presence Boost", desc: "Targeted EQ enhancement at 3kHz brings vocals and instruments forward, cutting through the mix with clarity and punch." },
  { icon: "✨", title: "Air & Brilliance", desc: "High-frequency enhancement adds sparkle and air to every track, making your audio feel open, alive, and professional." },
  { icon: "💥", title: "Deep Bass Enhancement", desc: "Sub-bass reinforcement adds weight and power to your soundtrack, delivering the physical impact of a cinema sound system." },
  { icon: "🎛️", title: "Dynamic Compression", desc: "Intelligent multi-band compression keeps your audio consistent and punchy across all playback devices and environments." },
  { icon: "🎬", title: "Cinematic Mix", desc: "WizSound Cinematic mode applies the full processing chain — the same pipeline used in professional film post-production." },
];

const TIERS = [
  { name: "Standard Audio", desc: "Clean, unprocessed audio from your source file.", colour: "rgba(255,255,255,0.1)", textColour: "rgba(255,255,255,0.7)" },
  { name: "WizSound Enhance", desc: "Stereo width, presence boost, and light compression for a fuller sound.", colour: "rgba(59,130,246,0.15)", textColour: "#93c5fd" },
  { name: "WizSound Cinematic", desc: "Full processing chain — stereo width, presence, air, bass, and cinematic compression. Recommended.", colour: "rgba(139,92,246,0.15)", textColour: "#c4b5fd", recommended: true },
];

export default function WizSound() {
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
        <div style={{ display: "inline-block", background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: "100px", padding: "6px 18px", fontSize: "13px", color: "#93c5fd", fontWeight: 600, marginBottom: "24px", letterSpacing: "0.05em" }}>
          WIZSOUND™
        </div>
        <h1 style={{ fontSize: "clamp(36px,7vw,72px)", fontWeight: 800, lineHeight: 1.1, margin: "0 0 20px", background: "linear-gradient(135deg,#fff 0%,#bfdbfe 60%,#60a5fa 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
          Cinematic Audio Engine
        </h1>
        <p style={{ fontSize: "clamp(16px,2.5vw,20px)", color: "rgba(255,255,255,0.65)", lineHeight: 1.7, marginBottom: "40px" }}>
          Proprietary audio enhancement that transforms standard sound into studio-grade, immersive cinematic audio — richer bass, clearer highs, fuller presence.
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={() => navigate("/music-video/create")} style={{ background: "linear-gradient(135deg,#3b82f6,#2563eb)", color: "#fff", border: "none", borderRadius: "12px", padding: "16px 32px", fontSize: "16px", fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 24px rgba(59,130,246,0.35)" }}>
            Try WizSound →
          </button>
          <button onClick={() => navigate("/pricing")} style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.85)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "12px", padding: "16px 32px", fontSize: "16px", fontWeight: 600, cursor: "pointer" }}>
            View Pricing
          </button>
        </div>
      </div>

      {/* Audio tiers */}
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "0 24px 64px" }}>
        <h2 style={{ textAlign: "center", fontSize: "clamp(22px,4vw,32px)", fontWeight: 700, marginBottom: "32px", color: "#fff" }}>Powered by WizSound™</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: "20px" }}>
          {TIERS.map((t) => (
            <div key={t.name} style={{ background: t.colour, border: `1px solid ${t.recommended ? "rgba(139,92,246,0.4)" : "rgba(255,255,255,0.08)"}`, borderRadius: "16px", padding: "28px", position: "relative" }}>
              {t.recommended && (
                <div style={{ position: "absolute", top: "-12px", left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg,#8b5cf6,#6366f1)", borderRadius: "100px", padding: "4px 14px", fontSize: "11px", fontWeight: 700, color: "#fff", whiteSpace: "nowrap" }}>
                  RECOMMENDED
                </div>
              )}
              <h3 style={{ fontSize: "17px", fontWeight: 700, color: t.textColour, marginBottom: "8px" }}>{t.name}</h3>
              <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>{t.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 24px 80px" }}>
        <h2 style={{ textAlign: "center", fontSize: "clamp(24px,4vw,36px)", fontWeight: 700, marginBottom: "48px", color: "#fff" }}>The WizSound™ processing chain</h2>
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
        <h2 style={{ fontSize: "clamp(28px,5vw,48px)", fontWeight: 800, color: "#fff", marginBottom: "16px" }}>Hear the difference</h2>
        <p style={{ fontSize: "18px", color: "rgba(255,255,255,0.55)", marginBottom: "40px" }}>WizSound™ is included in every WizVid render. Plans from £9/month.</p>
        <button onClick={() => navigate("/subscribe")} style={{ background: "linear-gradient(135deg,#3b82f6,#2563eb)", color: "#fff", border: "none", borderRadius: "12px", padding: "18px 40px", fontSize: "18px", fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 32px rgba(59,130,246,0.4)" }}>
          Get Started Free →
        </button>
      </div>

      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "32px 24px", display: "flex", justifyContent: "center", gap: "24px", flexWrap: "wrap" }}>
        {[["WizCreate™", "/products/wizcreate"], ["WizPilot™", "/products/wizpilot"], ["WizLumina™", "/products/wizlumina"], ["WizBoost™", "/products/wizboost"], ["Pricing", "/pricing"], ["Help", "/help"]].map(([label, href]) => (
          <button key={href} onClick={() => navigate(href)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.45)", fontSize: "14px", cursor: "pointer", padding: "4px 8px" }}>{label}</button>
        ))}
      </div>
    </div>
  );
}
