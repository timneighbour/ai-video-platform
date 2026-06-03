import React from "react";

type AspectRatio = "16:9" | "9:16" | "1:1" | "4:3" | "21:9";

interface DeviceMockupPreviewProps {
  aspectRatio: AspectRatio;
  previewImageUrl?: string | null;
  className?: string;
}

// Device config for each ratio
const DEVICE_CONFIG: Record<AspectRatio, {
  device: "phone" | "tv" | "cinema" | "tablet" | "monitor";
  label: string;
  platform: string;
  bestFor: string;
  tip: string;
}> = {
  "9:16": {
    device: "phone",
    label: "Smartphone",
    platform: "TikTok · Reels · Shorts",
    bestFor: "Best for TikTok, Reels & Shorts",
    tip: "Vertical video fills the full phone screen — ideal for social-first releases and viral moments.",
  },
  "16:9": {
    device: "tv",
    label: "Widescreen TV",
    platform: "YouTube · Television",
    bestFor: "Best for YouTube & TV Broadcast",
    tip: "The universal standard for streaming platforms, music video channels, and home screens worldwide.",
  },
  "21:9": {
    device: "cinema",
    label: "Cinema Screen",
    platform: "Cinema · Spotify Canvas",
    bestFor: "Best for Cinema & Spotify Canvas",
    tip: "Ultra-wide letterbox gives your video a cinematic, big-screen feel — perfect for Spotify Canvas loops.",
  },
  "4:3":  {
    device: "tablet",
    label: "Tablet / Broadcast",
    platform: "Broadcast · Classic TV",
    bestFor: "Best for Broadcast & Classic TV",
    tip: "The classic broadcast format — great for retro aesthetics, TV spots, and tablet-first presentations.",
  },
  "1:1":  {
    device: "monitor",
    label: "Square Display",
    platform: "Instagram · Feed",
    bestFor: "Best for Instagram Feed & Stories",
    tip: "Square format dominates Instagram feeds and works equally well on desktop and mobile screens.",
  },
};

// ── Phone mockup (9:16) ──────────────────────────────────────────────────────
function PhoneMockup({ previewImageUrl }: { previewImageUrl?: string | null }) {
  return (
    <div className="relative flex flex-col items-center">
      {/* Phone body */}
      <div
        style={{
          width: 120,
          height: 240,
          borderRadius: 22,
          background: "linear-gradient(145deg, #1a1a2e 0%, #0d0d1a 100%)",
          border: "2.5px solid rgba(212,168,67,0.5)",
          boxShadow: "0 0 0 1px rgba(0,0,0,0.8), 0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Notch */}
        <div style={{
          width: 40, height: 10, background: "#0d0d1a",
          borderRadius: "0 0 8px 8px", marginTop: 6, zIndex: 10,
          border: "1px solid rgba(212,168,67,0.2)", borderTop: "none",
          flexShrink: 0,
        }} />
        {/* Screen area */}
        <div style={{
          flex: 1, width: "100%", overflow: "hidden",
          background: "#000", position: "relative",
        }}>
          {previewImageUrl ? (
            <img src={previewImageUrl} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          ) : (
            <ScreenPlaceholder ratio="9:16" />
          )}
        </div>
        {/* Home bar */}
        <div style={{
          width: 36, height: 4, background: "rgba(212,168,67,0.4)",
          borderRadius: 2, margin: "6px 0", flexShrink: 0,
        }} />
      </div>
      {/* Side buttons */}
      <div style={{
        position: "absolute", left: -4, top: 60, width: 3, height: 20,
        background: "rgba(212,168,67,0.3)", borderRadius: "2px 0 0 2px",
      }} />
      <div style={{
        position: "absolute", left: -4, top: 86, width: 3, height: 20,
        background: "rgba(212,168,67,0.3)", borderRadius: "2px 0 0 2px",
      }} />
      <div style={{
        position: "absolute", right: -4, top: 72, width: 3, height: 28,
        background: "rgba(212,168,67,0.3)", borderRadius: "0 2px 2px 0",
      }} />
    </div>
  );
}

// ── TV mockup (16:9) ─────────────────────────────────────────────────────────
function TVMockup({ previewImageUrl }: { previewImageUrl?: string | null }) {
  return (
    <div className="relative flex flex-col items-center gap-0">
      {/* TV bezel */}
      <div style={{
        width: 220, padding: 6,
        background: "linear-gradient(145deg, #1a1a2e 0%, #0d0d1a 100%)",
        borderRadius: 8,
        border: "2px solid rgba(212,168,67,0.4)",
        boxShadow: "0 0 0 1px rgba(0,0,0,0.8), 0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)",
      }}>
        {/* Screen */}
        <div style={{
          width: "100%", aspectRatio: "16/9",
          background: "#000", borderRadius: 4, overflow: "hidden", position: "relative",
        }}>
          {previewImageUrl ? (
            <img src={previewImageUrl} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          ) : (
            <ScreenPlaceholder ratio="16:9" />
          )}
        </div>
        {/* Bottom bar with logo dot */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", paddingTop: 5 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(212,168,67,0.5)" }} />
        </div>
      </div>
      {/* Stand neck */}
      <div style={{
        width: 12, height: 18,
        background: "linear-gradient(180deg, #1a1a2e, #0d0d1a)",
        borderLeft: "1px solid rgba(212,168,67,0.2)",
        borderRight: "1px solid rgba(212,168,67,0.2)",
      }} />
      {/* Stand base */}
      <div style={{
        width: 60, height: 6, borderRadius: 3,
        background: "linear-gradient(145deg, #1a1a2e, #0d0d1a)",
        border: "1px solid rgba(212,168,67,0.3)",
      }} />
    </div>
  );
}

// ── Cinema mockup (21:9) ─────────────────────────────────────────────────────
function CinemaMockup({ previewImageUrl }: { previewImageUrl?: string | null }) {
  return (
    <div className="relative flex flex-col items-center gap-1">
      {/* Curtain left */}
      <div style={{ position: "absolute", left: -8, top: 0, bottom: 0, width: 14, zIndex: 5 }}>
        <div style={{
          width: "100%", height: "100%",
          background: "linear-gradient(90deg, rgba(139,0,0,0.6) 0%, rgba(139,0,0,0.1) 100%)",
          borderRadius: "0 4px 4px 0",
        }} />
      </div>
      {/* Curtain right */}
      <div style={{ position: "absolute", right: -8, top: 0, bottom: 0, width: 14, zIndex: 5 }}>
        <div style={{
          width: "100%", height: "100%",
          background: "linear-gradient(270deg, rgba(139,0,0,0.6) 0%, rgba(139,0,0,0.1) 100%)",
          borderRadius: "4px 0 0 4px",
        }} />
      </div>
      {/* Screen frame */}
      <div style={{
        width: 220, padding: 5,
        background: "linear-gradient(145deg, #1a1a2e 0%, #0d0d1a 100%)",
        borderRadius: 4,
        border: "2px solid rgba(212,168,67,0.4)",
        boxShadow: "0 0 0 1px rgba(0,0,0,0.8), 0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)",
      }}>
        <div style={{
          width: "100%", aspectRatio: "21/9",
          background: "#000", borderRadius: 2, overflow: "hidden", position: "relative",
        }}>
          {previewImageUrl ? (
            <img src={previewImageUrl} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          ) : (
            <ScreenPlaceholder ratio="21:9" />
          )}
        </div>
      </div>
      {/* Projector beam hint */}
      <div style={{
        width: 4, height: 12,
        background: "rgba(212,168,67,0.2)",
        borderRadius: 2,
      }} />
    </div>
  );
}

// ── Tablet mockup (4:3) ──────────────────────────────────────────────────────
function TabletMockup({ previewImageUrl }: { previewImageUrl?: string | null }) {
  return (
    <div className="relative flex flex-col items-center">
      <div style={{
        width: 180, padding: "10px 8px",
        background: "linear-gradient(145deg, #1a1a2e 0%, #0d0d1a 100%)",
        borderRadius: 14,
        border: "2px solid rgba(212,168,67,0.4)",
        boxShadow: "0 0 0 1px rgba(0,0,0,0.8), 0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
      }}>
        {/* Camera dot */}
        <div style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(212,168,67,0.4)" }} />
        {/* Screen */}
        <div style={{
          width: "100%", aspectRatio: "4/3",
          background: "#000", borderRadius: 4, overflow: "hidden", position: "relative",
        }}>
          {previewImageUrl ? (
            <img src={previewImageUrl} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          ) : (
            <ScreenPlaceholder ratio="4:3" />
          )}
        </div>
        {/* Home button */}
        <div style={{
          width: 18, height: 18, borderRadius: "50%",
          border: "1.5px solid rgba(212,168,67,0.4)",
          background: "rgba(212,168,67,0.08)",
        }} />
      </div>
    </div>
  );
}

// ── Monitor mockup (1:1) ─────────────────────────────────────────────────────
function MonitorMockup({ previewImageUrl }: { previewImageUrl?: string | null }) {
  return (
    <div className="relative flex flex-col items-center gap-0">
      {/* Monitor bezel */}
      <div style={{
        width: 180, padding: "8px 8px 6px",
        background: "linear-gradient(145deg, #1a1a2e 0%, #0d0d1a 100%)",
        borderRadius: "8px 8px 4px 4px",
        border: "2px solid rgba(212,168,67,0.4)",
        boxShadow: "0 0 0 1px rgba(0,0,0,0.8), 0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)",
      }}>
        {/* Screen */}
        <div style={{
          width: "100%", aspectRatio: "1/1",
          background: "#000", borderRadius: 3, overflow: "hidden", position: "relative",
        }}>
          {previewImageUrl ? (
            <img src={previewImageUrl} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          ) : (
            <ScreenPlaceholder ratio="1:1" />
          )}
        </div>
        {/* Bottom bar */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 4 }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(212,168,67,0.4)" }} />
        </div>
      </div>
      {/* Neck */}
      <div style={{
        width: 10, height: 14,
        background: "linear-gradient(180deg, #1a1a2e, #0d0d1a)",
        borderLeft: "1px solid rgba(212,168,67,0.2)",
        borderRight: "1px solid rgba(212,168,67,0.2)",
      }} />
      {/* Base */}
      <div style={{
        width: 50, height: 5, borderRadius: 3,
        background: "linear-gradient(145deg, #1a1a2e, #0d0d1a)",
        border: "1px solid rgba(212,168,67,0.3)",
      }} />
    </div>
  );
}

// ── Screen placeholder (no preview image yet) ────────────────────────────────
function ScreenPlaceholder({ ratio }: { ratio: string }) {
  return (
    <div style={{
      width: "100%", height: "100%",
      background: "linear-gradient(135deg, rgba(212,168,67,0.06) 0%, rgba(0,0,0,0) 60%, rgba(212,168,67,0.04) 100%)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
    }}>
      {/* Scanlines */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)",
        pointerEvents: "none",
      }} />
      <div style={{
        width: 20, height: 20, borderRadius: 2,
        border: "1.5px solid rgba(212,168,67,0.3)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(212,168,67,0.4)" }} />
      </div>
      <span style={{ fontSize: 8, color: "rgba(212,168,67,0.4)", fontFamily: "monospace", letterSpacing: 1 }}>
        {ratio}
      </span>
    </div>
  );
}

// ── Main export ──────────────────────────────────────────────────────────────
export function DeviceMockupPreview({ aspectRatio, previewImageUrl, className }: DeviceMockupPreviewProps) {
  const config = DEVICE_CONFIG[aspectRatio];

  return (
    <div className={`flex flex-col items-center gap-3 ${className ?? ""}`}>
      {/* Device frame */}
      <div className="flex items-center justify-center" style={{ minHeight: 260 }}>
        {config.device === "phone"   && <PhoneMockup   previewImageUrl={previewImageUrl} />}
        {config.device === "tv"      && <TVMockup      previewImageUrl={previewImageUrl} />}
        {config.device === "cinema"  && <CinemaMockup  previewImageUrl={previewImageUrl} />}
        {config.device === "tablet"  && <TabletMockup  previewImageUrl={previewImageUrl} />}
        {config.device === "monitor" && <MonitorMockup previewImageUrl={previewImageUrl} />}
      </div>

      {/* Labels */}
      <div className="text-center max-w-[220px]">
        <div className="text-xs font-semibold text-white/80">{config.label}</div>
        <div className="text-[10px] text-white/40 mt-0.5">{config.platform}</div>
        {/* Best-for badge */}
        <div
          className="inline-block mt-2 px-2.5 py-1 rounded-full text-[10px] font-semibold"
          style={{
            background: "rgba(212,168,67,0.12)",
            border: "1px solid rgba(212,168,67,0.3)",
            color: "oklch(0.72 0.14 70)",
            letterSpacing: "0.02em",
          }}
        >
          {config.bestFor}
        </div>
        {/* Use-case tip */}
        <p className="text-[10px] text-white/35 mt-1.5 leading-relaxed">
          {config.tip}
        </p>
      </div>
    </div>
  );
}
