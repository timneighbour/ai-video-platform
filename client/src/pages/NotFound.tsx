import { useLocation } from "wouter";

export default function NotFound() {
  const [, navigate] = useLocation();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0f",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
        color: "#ffffff",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Glow orb */}
      <div
        style={{
          position: "absolute",
          top: "30%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "500px",
          height: "500px",
          background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* 404 number */}
      <div
        style={{
          fontSize: "clamp(80px, 20vw, 160px)",
          fontWeight: 800,
          lineHeight: 1,
          background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #3b82f6 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          marginBottom: "16px",
          position: "relative",
        }}
      >
        404
      </div>

      {/* Title */}
      <h1
        style={{
          fontSize: "clamp(20px, 5vw, 32px)",
          fontWeight: 700,
          color: "#ffffff",
          margin: "0 0 12px 0",
        }}
      >
        Page Not Found
      </h1>

      {/* Description */}
      <p
        style={{
          fontSize: "clamp(14px, 3vw, 18px)",
          color: "rgba(255,255,255,0.6)",
          maxWidth: "420px",
          lineHeight: 1.6,
          margin: "0 0 40px 0",
        }}
      >
        Sorry, the page you are looking for doesn't exist.
        <br />
        It may have been moved or deleted.
      </p>

      {/* Buttons */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <button
          onClick={() => navigate("/")}
          onMouseDown={() => navigate("/")}
          style={{
            background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
            color: "#ffffff",
            border: "none",
            borderRadius: "12px",
            padding: "14px 28px",
            fontSize: "16px",
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 4px 24px rgba(139,92,246,0.4)",
          }}
        >
          ← Go Home
        </button>

        <button
          onClick={() => window.history.back()}
          onMouseDown={() => window.history.back()}
          style={{
            background: "rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.85)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: "12px",
            padding: "14px 28px",
            fontSize: "16px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Go Back
        </button>
      </div>

      {/* Footer */}
      <p
        style={{
          marginTop: "48px",
          fontSize: "13px",
          color: "rgba(255,255,255,0.3)",
        }}
      >
        WizVid AI · Create cinematic videos with AI
      </p>
    </div>
  );
}
