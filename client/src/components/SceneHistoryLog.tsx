/**
 * SceneHistoryLog — Dashboard widget showing the user's recent scene
 * retry and cancel actions, so they can track what they've done.
 */
import { RefreshCw, XCircle, Clock, ChevronRight } from "@/lib/icons";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

function timeAgo(date: Date | string): string {
  const ms = Date.now() - new Date(date).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function SceneHistoryLog() {
  const [, navigate] = useLocation();
  const { data: history, isLoading } = trpc.musicVideo.getSceneActionHistory.useQuery(undefined, {
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-white/8 bg-white/[0.02] p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-muted-foreground/70" />
          <h2 className="text-sm font-semibold text-muted-foreground tracking-wide uppercase">Scene History</h2>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-11 rounded-lg bg-white/[0.03] animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (!history || history.length === 0) {
    return (
      <section className="rounded-2xl border border-white/8 bg-white/[0.02] p-6">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-muted-foreground/70" />
          <h2 className="text-sm font-semibold text-muted-foreground tracking-wide uppercase">Scene History</h2>
        </div>
        <p className="text-sm text-muted-foreground/50 italic">
          No scene retries or cancellations yet. Actions you take on failed scenes will appear here.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-white/8 bg-white/[0.02] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground/70" />
          <h2 className="text-sm font-semibold text-muted-foreground tracking-wide uppercase">Scene History</h2>
        </div>
        <span className="text-xs text-muted-foreground/50">{history.length} recent action{history.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Log rows */}
      <div className="space-y-1.5">
        {history.map((entry) => {
          const isRetry = entry.action === "retry";
          return (
            <button
              key={entry.id}
              onClick={() => navigate(`/music-video/${entry.jobId}`)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/[0.025] hover:bg-white/[0.05] transition-colors group text-left"
            >
              {/* Action icon */}
              <div
                className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                  isRetry
                    ? "bg-amber-500/15 text-amber-400"
                    : "bg-muted-foreground/20/15 text-muted-foreground"
                }`}
              >
                {isRetry
                  ? <RefreshCw className="w-3.5 h-3.5" />
                  : <XCircle className="w-3.5 h-3.5" />}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-xs font-semibold ${isRetry ? "text-amber-400" : "text-muted-foreground"}`}>
                    {isRetry ? "Retried" : "Cancelled"}
                  </span>
                  <span className="text-xs text-white/70">
                    Scene {(entry.sceneIndex ?? 0) + 1}
                  </span>
                  {entry.jobTitle && (
                    <>
                      <span className="text-xs text-muted-foreground/50">in</span>
                      <span className="text-xs text-white/50 truncate max-w-[140px]">{entry.jobTitle}</span>
                    </>
                  )}
                </div>
                {isRetry && entry.errorMessageBefore && (
                  <p className="text-[11px] text-muted-foreground/50 truncate mt-0.5 max-w-xs">
                    Was: {entry.errorMessageBefore.slice(0, 80)}
                  </p>
                )}
              </div>

              {/* Timestamp + arrow */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[11px] text-muted-foreground/50">{timeAgo(entry.createdAt)}</span>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer hint */}
      <p className="text-[11px] text-muted-foreground/40 mt-3 text-center">
        Showing last {history.length} action{history.length !== 1 ? "s" : ""} · Click any row to open the project
      </p>
    </section>
  );
}
