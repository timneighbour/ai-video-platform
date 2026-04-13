/**
 * RenderSuccess — shown after Stripe checkout for a render purchase.
 * URL: /render/success?render_job_id=X&session_id=Y
 *
 * Flow:
 *  1. Confirm payment with the server (verifies Stripe session → marks job as paid)
 *  2. Poll render job status until completed or failed
 *  3. Show download button when ready
 */
import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { CheckCircle, Download, Loader2, AlertCircle, ArrowLeft, Film } from "lucide-react";
import { Button } from "@/components/ui/button";

function useSearchParams() {
  const [location] = useLocation();
  const search = typeof window !== "undefined" ? window.location.search : "";
  return new URLSearchParams(search);
}

export default function RenderSuccess() {
  const params = useSearchParams();
  const renderJobId = parseInt(params.get("render_job_id") || "0", 10);
  const sessionId = params.get("session_id") || "";
  const isUpgrade = params.get("upgrade") === "true";

  const [confirmed, setConfirmed] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  // Step 1: confirm payment
  const confirmMutation = trpc.render.confirmRenderPayment.useMutation({
    onSuccess: (data: { success: boolean; reason?: string }) => {
      if (data.success) {
        setConfirmed(true);
      } else {
        setConfirmError(data.reason ?? "Payment could not be confirmed. Please contact support.");
      }
    },
    onError: (err: { message?: string }) => {
      setConfirmError(err.message || "Failed to confirm payment. Please contact support.");
    },
  });

  useEffect(() => {
    if (!renderJobId || !sessionId) return;
    confirmMutation.mutate({ renderJobId, sessionId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderJobId, sessionId]);

  // Step 2: poll render job status
  const { data: job } = trpc.render.getRenderJobById.useQuery(
    { renderJobId },
    {
      enabled: confirmed && !!renderJobId,
      refetchInterval: (query) => {
        const d = query.state.data;
        if (!d) return 3000;
        if (d.renderStatus === "completed" || d.renderStatus === "failed") return false;
        return 3000;
      },
    }
  );

  const isLoading = confirmMutation.isPending || (!confirmed && !confirmError);
  const isRendering = confirmed && job && (job.renderStatus === "queued" || job.renderStatus === "processing");
  const isComplete = confirmed && job?.renderStatus === "completed";
  const isFailed = confirmed && job?.renderStatus === "failed";

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4">
      {/* Back link */}
      <div className="absolute top-6 left-6">
        <Link href="/dashboard">
          <a className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm">
            <ArrowLeft size={14} />
            Dashboard
          </a>
        </Link>
      </div>

      <div className="max-w-md w-full text-center space-y-6">
        {/* Logo */}
        <div className="flex justify-center mb-2">
          <div className="w-12 h-12 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
            <Film size={22} className="text-violet-400" />
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <>
            <Loader2 size={40} className="mx-auto text-violet-400 animate-spin" />
            <h1 className="text-2xl font-bold">Confirming your payment…</h1>
            <p className="text-white/50 text-sm">Please wait while we verify your purchase with Stripe.</p>
          </>
        )}

        {/* Error state */}
        {confirmError && (
          <>
            <AlertCircle size={40} className="mx-auto text-red-400" />
            <h1 className="text-2xl font-bold text-red-400">Payment Confirmation Failed</h1>
            <p className="text-white/60 text-sm">{confirmError}</p>
            <p className="text-white/40 text-xs">
              If you were charged, please contact{" "}
              <a href="mailto:support@wizvid.ai" className="text-violet-400 underline">support@wizvid.ai</a>{" "}
              with your order reference: <span className="font-mono text-white/60">{sessionId}</span>
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          </>
        )}

        {/* Rendering in progress */}
        {isRendering && (
          <>
            <div className="relative mx-auto w-16 h-16">
              <Loader2 size={64} className="text-violet-400 animate-spin" />
            </div>
            <h1 className="text-2xl font-bold">
              {isUpgrade ? "Upgrading your video…" : "Rendering your video…"}
            </h1>
            <p className="text-white/50 text-sm">
              Payment confirmed! Your video is now being rendered at{" "}
              <span className="text-violet-300 font-medium">{job?.quality?.toUpperCase() ?? "HD"}</span> quality
              {job?.audioTier && job.audioTier !== "standard" && (
                <> with <span className="text-fuchsia-300 font-medium">WizSound™ {job.audioTier}</span></>
              )}.
            </p>
            <p className="text-white/30 text-xs">This usually takes 2–5 minutes. You can safely close this tab — we'll email you when it's ready.</p>
            <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 animate-pulse rounded-full" style={{ width: "60%" }} />
            </div>
          </>
        )}

        {/* Complete */}
        {isComplete && (
          <>
            <CheckCircle size={48} className="mx-auto text-green-400" />
            <h1 className="text-2xl font-bold">Your video is ready!</h1>
            <p className="text-white/50 text-sm">
              Rendered at <span className="text-violet-300 font-medium">{job?.quality?.toUpperCase()}</span>
              {job?.audioTier && job.audioTier !== "standard" && (
                <> with <span className="text-fuchsia-300 font-medium">WizSound™ {job.audioTier}</span></>
              )}.
            </p>
            {job?.downloadUrl ? (
              <a
                href={job.downloadUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold hover:opacity-90 transition-opacity"
              >
                <Download size={18} />
                Download Video
              </a>
            ) : (
              <p className="text-white/40 text-sm">Download link is being generated…</p>
            )}
            <div className="pt-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
            </div>
          </>
        )}

        {/* Failed */}
        {isFailed && (
          <>
            <AlertCircle size={40} className="mx-auto text-red-400" />
            <h1 className="text-2xl font-bold text-red-400">Render Failed</h1>
            <p className="text-white/60 text-sm">
              {job?.errorMessage || "Your render encountered an error. You have not been charged for a failed render."}
            </p>
            <p className="text-white/40 text-xs">
              Please contact <a href="mailto:support@wizvid.ai" className="text-violet-400 underline">support@wizvid.ai</a> and quote job ID: <span className="font-mono text-white/60">#{renderJobId}</span>
            </p>
            <div className="flex gap-3 justify-center">
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              <Button asChild size="sm" className="bg-violet-600 hover:bg-violet-700">
                <Link href="/music-video/create">Try Again</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
