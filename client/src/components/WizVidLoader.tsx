import { useEffect, useState } from "react";

const WIZVID_ICON =
  "/manus-storage/wizai-logo-v3_e7823047.png";

interface WizVidLoaderProps {
  /** When true the loader fades out and unmounts */
  done?: boolean;
  /** Minimum time (ms) to show the loader even if done=true early */
  minDuration?: number;
}

/**
 * Full-screen branded preloader.
 *
 * Usage:
 *   <WizVidLoader done={!isLoading} />
 *
 * The loader fades in immediately, then fades out once `done` is true
 * (but never before `minDuration` ms have elapsed).
 */
export function WizVidLoader({ done = false, minDuration = 600 }: WizVidLoaderProps) {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  const [minElapsed, setMinElapsed] = useState(false);

  // Start minimum duration timer
  useEffect(() => {
    const t = setTimeout(() => setMinElapsed(true), minDuration);
    return () => clearTimeout(t);
  }, [minDuration]);

  // Trigger fade-out when both done and minDuration have elapsed
  useEffect(() => {
    if (done && minElapsed) {
      setFading(true);
      const t = setTimeout(() => setVisible(false), 500); // match CSS transition
      return () => clearTimeout(t);
    }
  }, [done, minElapsed]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0f0f0f]"
      style={{
        opacity: fading ? 0 : 1,
        transition: "opacity 500ms ease-out",
        pointerEvents: fading ? "none" : "auto",
      }}
      aria-label="Loading WIZ AI"
      role="status"
    >
      {/* Ambient glow behind icon */}
      <div
        className="absolute w-64 h-64 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(139,92,246,0.18) 0%, rgba(59,130,246,0.10) 50%, transparent 70%)",
          animation: "wizvid-pulse-glow 2s ease-in-out infinite",
        }}
        aria-hidden="true"
      />

      {/* W icon */}
      <div
        style={{
          animation: "wizvid-icon-breathe 2s ease-in-out infinite",
          position: "relative",
          zIndex: 1,
        }}
      >
        <img
          src={WIZVID_ICON}
          alt="WIZ AI"
          className="w-[6.5rem] h-[6.5rem] object-contain select-none"
          draggable={false}
        />
      </div>

      {/* Animated dots */}
      <div className="flex gap-1.5 mt-8" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-white/30"
            style={{
              animation: `wizvid-dot-bounce 1.2s ease-in-out infinite`,
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>

      {/* Keyframe styles */}
      <style>{`
        @keyframes wizvid-pulse-glow {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50%       { transform: scale(1.15); opacity: 1; }
        }
        @keyframes wizvid-icon-breathe {
          0%, 100% { transform: scale(1);    filter: drop-shadow(0 0 12px rgba(139,92,246,0.5)); }
          50%       { transform: scale(1.06); filter: drop-shadow(0 0 28px rgba(139,92,246,0.85)); }
        }
        @keyframes wizvid-dot-bounce {
          0%, 80%, 100% { transform: translateY(0);    opacity: 0.35; }
          40%            { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
