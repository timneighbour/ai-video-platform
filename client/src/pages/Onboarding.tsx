import React from "react";

export default function Onboarding() {
  return (
    <div style={{ minHeight: "100vh", background: "#0f0f0f", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px", fontFamily: "sans-serif" }}>
      
      <h1 style={{ color: "white", marginBottom: "10px", fontSize: "32px" }}>What do you want to create?</h1>
      <p style={{ color: "#a1a1aa", marginBottom: "40px", fontSize: "16px" }}>Select an option below to get started.</p>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "400px", width: "100%" }}>
        
        {/* Music Video */}
        <a href="/music-video/create" style={{ display: "block", padding: "16px", background: "#7c3aed", color: "white", textDecoration: "none", borderRadius: "8px", fontSize: "16px", fontWeight: "bold", textAlign: "center", border: "none", cursor: "pointer", transition: "background 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "#6d28d9"} onMouseLeave={(e) => e.currentTarget.style.background = "#7c3aed"}>
          Music Video
        </a>

        {/* YouTube Video */}
        <a href="/wizpilot" style={{ display: "block", padding: "16px", background: "#dc2626", color: "white", textDecoration: "none", borderRadius: "8px", fontSize: "16px", fontWeight: "bold", textAlign: "center", border: "none", cursor: "pointer", transition: "background 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "#b91c1c"} onMouseLeave={(e) => e.currentTarget.style.background = "#dc2626"}>
          YouTube Video
        </a>

        {/* Kids Video */}
        <a href="/kids-video" style={{ display: "block", padding: "16px", background: "#ec4899", color: "white", textDecoration: "none", borderRadius: "8px", fontSize: "16px", fontWeight: "bold", textAlign: "center", border: "none", cursor: "pointer", transition: "background 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "#be185d"} onMouseLeave={(e) => e.currentTarget.style.background = "#ec4899"}>
          Kids Video
        </a>

        {/* Text to Video */}
        <a href="/text-to-video" style={{ display: "block", padding: "16px", background: "#2563eb", color: "white", textDecoration: "none", borderRadius: "8px", fontSize: "16px", fontWeight: "bold", textAlign: "center", border: "none", cursor: "pointer", transition: "background 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "#1d4ed8"} onMouseLeave={(e) => e.currentTarget.style.background = "#2563eb"}>
          Text to Video
        </a>

        {/* AI Music Generator */}
        <a href="/music-creator" style={{ display: "block", padding: "16px", background: "#059669", color: "white", textDecoration: "none", borderRadius: "8px", fontSize: "16px", fontWeight: "bold", textAlign: "center", border: "none", cursor: "pointer", transition: "background 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "#047857"} onMouseLeave={(e) => e.currentTarget.style.background = "#059669"}>
          AI Music Generator
        </a>

      </div>

      <p style={{ color: "#a1a1aa", marginTop: "40px", fontSize: "12px", textAlign: "center", maxWidth: "400px" }}>
        By continuing, you agree to WizVid's Terms of Service and Privacy Policy.
      </p>
    </div>
  );
}
