/**
 * RenderStatusOverlay — shows render progress with polling.
 * States: pending → processing → complete / failed
 * On complete: shows "View Video" CTA
 * On fail: shows error + retry button
 */
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2, CheckCircle2, AlertTriangle, Download, RotateCcw, Film } from "lucide-react";
import { toast } from "sonner";

interface RenderStatusOverlayProps {
  renderJobId: number | null;
  onComplete?: (downloadUrl: string) => void;
  onRetry?: () => void;
  onClose?: () => void;
}

type RenderStatus = "queued" | "processing" | "completed" | "failed";

export function RenderStatusOverlay({
  renderJobId,
  onComplete,
  onRetry,
  onClose,
}: RenderStatusOverlayProps) {
  const [status, setStatus] = useState<RenderStatus>("queued");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dots, setDots] = useState("");

  // Poll render status every 4 seconds
  const { data: jobData } = trpc.engine.pollRenderStatus.useQuery(
    { renderJobId: renderJobId! },
    {
      enabled: !!renderJobId && (status === "queued" || status === "processing"),
      refetchInterval: 4000,
      refetchOnWindowFocus: false,
    }
  );

  // Update local state from polling data
  useEffect(() => {
    if (!jobData) return;
    const newStatus = jobData.renderStatus as RenderStatus;
    setStatus(newStatus);

    if (newStatus === "completed" && jobData.downloadUrl) {
      setDownloadUrl(jobData.downloadUrl);
      toast.success("Your video is ready!");
      onComplete?.(jobData.downloadUrl);
    }

    if (newStatus === "failed") {
      setErrorMessage(jobData.errorMessage || "Render failed. Please try again.");
      toast.error("Render failed");
    }
  }, [jobData, onComplete]);

  // Animated dots
  useEffect(() => {
    if (status !== "queued" && status !== "processing") return;
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 500);
    return () => clearInterval(interval);
  }, [status]);

  if (!renderJobId) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 rounded-2xl border border-white/10 bg-zinc-900/95 p-8 text-center">
        {/* Status icon */}
        <div className="flex justify-center mb-6">
          {(status === "queued" || status === "processing") && (
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-2 border-violet-500/30 flex items-center justify-center">
                <Loader2 size={36} className="text-violet-400 animate-spin" />
              </div>
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-violet-500 animate-pulse" />
            </div>
          )}
          {status === "completed" && (
            <div className="w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-500/40 flex items-center justify-center">
              <CheckCircle2 size={36} className="text-green-400" />
            </div>
          )}
          {status === "failed" && (
            <div className="w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-500/40 flex items-center justify-center">
              <AlertTriangle size={36} className="text-red-400" />
            </div>
          )}
        </div>

        {/* Status text */}
        {(status === "queued" || status === "processing") && (
          <>
            <h3 className="text-lg font-bold text-white mb-2">
              Rendering your video{dots}
            </h3>
            <p className="text-sm text-white/50 mb-4">
              {status === "queued"
                ? "Your video is queued and will start processing shortly."
                : "AI is generating your video. This may take a few minutes."}
            </p>
            {/* Progress indicator */}
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: status === "queued" ? "15%" : "65%",
                  background: "linear-gradient(90deg, #7c3aed, #a855f7, #e879f9)",
                  animation: "pulse 2s ease-in-out infinite",
                }}
              />
            </div>
            <p className="text-xs text-white/30 mt-3">
              Do not close this page — we'll notify you when it's ready
            </p>
          </>
        )}

        {status === "completed" && (
          <>
            <h3 className="text-lg font-bold text-white mb-2">
              Video Ready!
            </h3>
            <p className="text-sm text-white/50 mb-6">
              Your video has been rendered successfully.
            </p>
            <div className="flex flex-col gap-3">
              {downloadUrl && (
                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-105"
                  style={{
                    background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                    boxShadow: "0 0 20px rgba(139,92,246,0.4)",
                  }}
                >
                  <Film size={16} />
                  View Video
                </a>
              )}
              {downloadUrl && (
                <a
                  href={downloadUrl}
                  download
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white/70 border border-white/10 hover:bg-white/5 transition-all"
                >
                  <Download size={14} />
                  Download
                </a>
              )}
              {onClose && (
                <button
                  onClick={onClose}
                  className="text-xs text-white/40 hover:text-white/70 transition-colors cursor-pointer mt-2"
                >
                  Close
                </button>
              )}
            </div>
          </>
        )}

        {status === "failed" && (
          <>
            <h3 className="text-lg font-bold text-white mb-2">
              Render Failed
            </h3>
            <p className="text-sm text-red-300/70 mb-6">
              {errorMessage || "Something went wrong during rendering."}
            </p>
            <div className="flex flex-col gap-3">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 cursor-pointer"
                  style={{
                    background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                    boxShadow: "0 0 20px rgba(139,92,246,0.4)",
                  }}
                >
                  <RotateCcw size={16} />
                  Retry Render
                </button>
              )}
              {onClose && (
                <button
                  onClick={onClose}
                  className="text-xs text-white/40 hover:text-white/70 transition-colors cursor-pointer mt-2"
                >
                  Close
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
