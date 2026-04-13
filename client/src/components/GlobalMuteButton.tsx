/**
 * Global Mute/Unmute Button
 *
 * Always visible, clearly indicates state, instantly responsive.
 * Uses the global AudioContext to control all audio across the platform.
 */
import { Volume2, VolumeX } from "lucide-react";
import { useGlobalAudio } from "@/contexts/AudioContext";

interface GlobalMuteButtonProps {
  /** Visual variant */
  variant?: "floating" | "inline" | "minimal";
  /** Additional CSS classes */
  className?: string;
  /** Size of the icon */
  size?: number;
}

export default function GlobalMuteButton({
  variant = "inline",
  className = "",
  size = 18,
}: GlobalMuteButtonProps) {
  const { isMuted, toggleMute } = useGlobalAudio();

  if (variant === "floating") {
    return (
      <button
        onClick={toggleMute}
        aria-label={isMuted ? "Unmute audio" : "Mute audio"}
        className={`fixed bottom-6 right-6 z-[9999] flex items-center gap-2 px-4 py-2.5 rounded-full transition-all duration-200 shadow-lg backdrop-blur-md ${
          isMuted
            ? "bg-white/10 border border-white/20 text-white/70 hover:bg-white/15 hover:text-white"
            : "bg-white/15 border border-white/25 text-white hover:bg-white/20"
        } ${className}`}
      >
        {isMuted ? (
          <>
            <VolumeX className="flex-shrink-0" style={{ width: size, height: size }} />
            <span className="text-xs font-medium">Unmute</span>
          </>
        ) : (
          <>
            <Volume2 className="flex-shrink-0" style={{ width: size, height: size }} />
            <span className="text-xs font-medium">Mute</span>
          </>
        )}
      </button>
    );
  }

  if (variant === "minimal") {
    return (
      <button
        onClick={toggleMute}
        aria-label={isMuted ? "Unmute audio" : "Mute audio"}
        className={`p-1.5 rounded-lg transition-colors hover:bg-white/10 ${className}`}
      >
        {isMuted ? (
          <VolumeX style={{ width: size, height: size }} />
        ) : (
          <Volume2 style={{ width: size, height: size }} />
        )}
      </button>
    );
  }

  // Default inline variant
  return (
    <button
      onClick={toggleMute}
      aria-label={isMuted ? "Unmute audio" : "Mute audio"}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
        isMuted
          ? "bg-white/8 border border-white/15 text-white/60 hover:bg-white/12 hover:text-white"
          : "bg-white/12 border border-white/20 text-white hover:bg-white/16"
      } ${className}`}
    >
      {isMuted ? (
        <VolumeX style={{ width: size, height: size }} />
      ) : (
        <Volume2 style={{ width: size, height: size }} />
      )}
      {isMuted ? "Unmute" : "Mute"}
    </button>
  );
}
