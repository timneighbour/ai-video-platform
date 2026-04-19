/**
 * Global Mute/Unmute Button
 * No Lucide icons — uses inline SVG waveform / muted-waveform visuals.
 */
import { useGlobalAudio } from "@/contexts/AudioContext";

// Animated waveform bars (sound on)
const WaveformIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 20 14" fill="none" aria-hidden="true">
    <path d="M1 7h2M4 4v6M7 2v10M10 5v4M13 3v8M16 4v6M19 7h-2"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

// Flat line with X (muted)
const MutedIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 20 14" fill="none" aria-hidden="true">
    <path d="M1 7h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeOpacity="0.4" />
    <path d="M7 4l6 6M13 4l-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

interface GlobalMuteButtonProps {
  variant?: "floating" | "inline" | "minimal";
  className?: string;
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
            <MutedIcon size={size} />
            <span className="text-xs font-medium">Unmute</span>
          </>
        ) : (
          <>
            <WaveformIcon size={size} />
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
        {isMuted ? <MutedIcon size={size} /> : <WaveformIcon size={size} />}
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
      {isMuted ? <MutedIcon size={size} /> : <WaveformIcon size={size} />}
      {isMuted ? "Unmute" : "Mute"}
    </button>
  );
}
