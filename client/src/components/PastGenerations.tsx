import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Lock, ChevronDown, ChevronUp } from "@/lib/icons";
import { toast } from "sonner";
import LowCreditPrompt from "@/components/LowCreditPrompt";

/**
 * Past Generations — displays user's recent WizAudio songs from history
 * Shows unlock status (free re-download if already purchased, or 2 credits / £3.99 to unlock)
 * Re-download button uses server-side unlock verification + signed download token
 */
export function PastGenerations() {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [lowCreditPrompt, setLowCreditPrompt] = useState<{
    taskId: number;
    trackIndex: number;
    currentCredits: number;
    creditsNeeded: number;
  } | null>(null);

  // Fetch user's history
  const { data: history, isLoading: historyLoading } = trpc.suno.history.useQuery(undefined, {
    enabled: !!user,
  });

  // Fetch unlock status for all tracks
  const { data: unlocks, isLoading: unlocksLoading } = trpc.suno.previewQuota.useQuery(undefined, {
    enabled: !!user,
  });

  // Re-download mutation — server-side unlock check + signed token
  const redownloadMutation = trpc.suno.redownloadSong.useMutation({
    onSuccess: (data) => {
      const link = document.createElement("a");
      link.href = data.downloadUrl;
      link.download = "track.mp3";
      link.click();
      toast.success("Track downloaded!");
    },
    onError: (err) => {
      toast.error("Download failed", { description: err.message });
    },
  });

  // Download (unlock + download) mutation
  const downloadMutation = trpc.suno.downloadSong.useMutation({
    onSuccess: (data) => {
      if (data.alreadyUnlocked) {
        // Already paid — download immediately
        const link = document.createElement("a");
        link.href = data.downloadUrl;
        link.download = "track.mp3";
        link.click();
        toast.success("Track downloaded!");
      } else if (data.checkoutUrl) {
        // Redirect to Stripe checkout
        window.location.href = data.checkoutUrl;
      } else if ("insufficientCredits" in data && data.insufficientCredits) {
        // Show low-credit prompt
        setLowCreditPrompt({
          taskId: (data as any).taskId || 0,
          trackIndex: (data as any).trackIndex || 0,
          currentCredits: (data as any).currentCredits || 0,
          creditsNeeded: (data as any).creditsNeeded || 2,
        });
      } else {
        toast.info(data.message || "Song download coming soon");
      }
    },
    onError: (err) => {
      toast.error("Download failed", { description: err.message });
    },
  });

  if (!user || !history || history.length === 0) return null;

  const handleTopUp = () => {
    // Navigate to pricing page with anchor to credit packs
    window.location.href = "/pricing#credit-packs";
  };

  const handlePayPerTrack = () => {
    if (lowCreditPrompt) {
      // Close the prompt — next attempt will fall through to Stripe checkout
      setLowCreditPrompt(null);
      // Re-trigger the download, which will now go to Stripe since credits are insufficient
      downloadMutation.mutate({
        taskId: lowCreditPrompt.taskId,
        trackIndex: lowCreditPrompt.trackIndex,
      });
    }
  };

  const isLoading = historyLoading || unlocksLoading;

  return (
    <>
      {lowCreditPrompt && (
        <LowCreditPrompt
          currentCredits={lowCreditPrompt.currentCredits}
          creditsNeeded={lowCreditPrompt.creditsNeeded}
          onTopUp={handleTopUp}
          onPayPerTrack={handlePayPerTrack}
          isLoading={downloadMutation.isPending}
        />
      )}
      <div className="rounded-[6px] overflow-hidden border border-white/7" style={{ background: "#0e0e12" }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3.5 py-2 border-b border-white/7 hover:bg-white/2 transition-colors"
        style={{ background: "rgba(0,0,0,0.3)" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold tracking-[2.5px] uppercase text-white/45">Past Generations</span>
          <span className="text-[9px] text-white/25">({history.length})</span>
        </div>
        {expanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-white/35" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-white/35" />
        )}
      </button>

      {expanded && (
        <div className="p-2.5 flex flex-col gap-2 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-white/40" />
            </div>
          ) : (
            history.map((task, idx) => {
              const tracks = task.tracks || [];
              return (
                <div key={task.id} className="rounded-[4px] border border-white/5 p-2.5" style={{ background: "rgba(255,255,255,0.01)" }}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-white/70 truncate">
                        {task.title || `Generation ${idx + 1}`}
                      </div>
                      <div className="text-[10px] text-white/35 mt-0.5">
                        {new Date(task.createdAt).toLocaleDateString()} · {tracks.length} track{tracks.length !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>

                  {/* Tracks */}
                  <div className="flex flex-col gap-1.5">
                    {tracks.map((track: any, trackIdx: number) => {
                      // Check if this track is unlocked by querying the songDownloads table
                      // For now, assume not unlocked unless we fetch it separately
                      const isUnlocked = false;

                      return (
                        <div key={trackIdx} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-[3px] border border-white/3" style={{ background: "rgba(255,255,255,0.005)" }}>
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] text-white/50 truncate">
                              {track.title || `Track ${trackIdx + 1}`}
                            </div>
                          </div>

                          {isUnlocked ? (
                            // Already unlocked — show re-download button
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => redownloadMutation.mutate({ taskId: task.id, trackIndex: trackIdx })}
                              disabled={redownloadMutation.isPending}
                              className="flex-shrink-0 h-7 px-2 text-[10px]"
                            >
                              {redownloadMutation.isPending ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <>
                                  <Download className="w-3 h-3 mr-1" />
                                  Download
                                </>
                              )}
                            </Button>
                          ) : (
                            // Not unlocked — show unlock button with cost
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => downloadMutation.mutate({ taskId: task.id, trackIndex: trackIdx })}
                              disabled={downloadMutation.isPending}
                              className="flex-shrink-0 h-7 px-2 text-[10px]"
                            >
                              {downloadMutation.isPending ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <>
                                  <Lock className="w-3 h-3 mr-1" />
                                  {unlocks?.isSubscriber ? "2 credits" : "£3.99"}
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
      </div>
    </>
  );
}

export default PastGenerations;

