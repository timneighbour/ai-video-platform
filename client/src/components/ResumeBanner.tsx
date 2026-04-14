/**
 * ResumeBanner — shown when an auto-save exists for the current tool.
 * "Continue your last video" with resume/dismiss actions.
 */
import { Play, X } from "lucide-react";

interface ResumeBannerProps {
  onResume: () => void;
  onDismiss: () => void;
  updatedAt?: Date | null;
}

export function ResumeBanner({ onResume, onDismiss, updatedAt }: ResumeBannerProps) {
  const timeAgo = updatedAt ? getTimeAgo(updatedAt) : "";

  return (
    <div className="mx-auto max-w-3xl mb-6 animate-in fade-in slide-in-from-top-2 duration-500">
      <div
        className="relative flex items-center gap-4 px-5 py-4 rounded-xl border border-violet-500/30 bg-violet-950/30 backdrop-blur-sm"
        style={{ boxShadow: "0 0 20px rgba(139,92,246,0.1)" }}
      >
        {/* Pulse indicator */}
        <div className="relative flex-shrink-0">
          <span className="absolute inset-0 rounded-full bg-violet-500/40 animate-ping" />
          <span className="relative block w-3 h-3 rounded-full bg-violet-400" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">
            Continue your last video
          </p>
          {timeAgo && (
            <p className="text-xs text-white/50 mt-0.5">
              Last saved {timeAgo}
            </p>
          )}
        </div>

        <button
          onClick={onResume}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all cursor-pointer hover:scale-105"
          style={{
            background: "linear-gradient(135deg, #7c3aed, #a855f7)",
            boxShadow: "0 0 12px rgba(139,92,246,0.4)",
          }}
        >
          <Play size={14} />
          Resume
        </button>

        <button
          onClick={onDismiss}
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-white/40 hover:text-white/80 hover:bg-white/10 transition-all cursor-pointer"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
