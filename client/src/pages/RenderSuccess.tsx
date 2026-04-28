/**
 * RenderSuccess — shown after Stripe checkout for a build purchase.
 * URL: /render/success?render_job_id=X&session_id=Y
 *
 * Flow:
 *  1. Confirm payment with the server (verifies Stripe session → marks job as paid → triggers render)
 *  2. Redirect to music video page so user can watch the real-time progress bar
 *  3. Fallback: show download button if render completes before redirect
 */
import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { CheckCircle, Download, Loader2, AlertCircle, ArrowLeft, Film, ExternalLink } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { FuelTheSession } from "@/components/FuelTheSession";

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
  const [sourceJobId, setSourceJobId] = useState<number | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState(5);
  const [, navigate] = useLocation();

  // Step 1: confirm payment (server also triggers render pipeline)
  const confirmMutation = trpc.render.confirmRenderPayment.useMutation({
    onSuccess: (data: { success: boolean; reason?: string; sourceJobId?: number | null }) => {
      if (data.success) {
        setConfirmed(true);
        if (data.sourceJobId) {
          setSourceJobId(data.sourceJobId);
        }
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

  // Countdown redirect to music video page once confirmed
  useEffect(() => {
    if (!confirmed || !sourceJobId) return;
    const interval = setInterval(() => {
      setRedirectCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          navigate(`/music-video/create?job_id=${sourceJobId}&render_started=true`);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [confirmed, sourceJobId, navigate]);

  const isLoading = confirmMutation.isPending || (!confirmed && !confirmError);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4">
      {/* Back link */}
      <div className="absolute top-6 left-6">
        <Link href="/dashboard">
          <a className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm">
            <ArrowLeft className="w-3.5 h-3.5" />
            Dashboard
          </a>
        </Link>
      </div>

      <div className="max-w-md w-full text-center space-y-6">
        {/* Logo */}
        <div className="flex justify-center mb-2">
          <div className="w-12 h-12 rounded-2xl bg-[--color-gold]/15 border border-[--color-gold]/30 flex items-center justify-center">
            <Film className="w-5 h-5 text-[--color-gold]" />
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <>
            <Loader2 className="w-10 h-10 mx-auto text-[--color-gold] animate-spin" />
            <h1 className="text-2xl font-bold">Confirming your payment…</h1>
            <p className="text-white/50 text-sm">Please wait while we verify your purchase with Stripe.</p>
          </>
        )}

        {/* Error state */}
        {confirmError && (
          <>
            <AlertCircle className="w-10 h-10 mx-auto text-red-400" />
            <h1 className="text-2xl font-bold text-red-400">Payment Confirmation Failed</h1>
            <p className="text-white/60 text-sm">{confirmError}</p>
            <p className="text-white/40 text-xs">
              If you were charged, please contact{" "}
              <a href="mailto:support@wiz-ai.io" className="text-[--color-gold] underline">support@wiz-ai.io</a>{" "}
              with your order reference: <span className="font-mono text-white/60">{sessionId}</span>
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          </>
        )}

        {/* Payment confirmed — redirecting to render progress */}
        {confirmed && sourceJobId && (
          <>
            <CheckCircle className="w-12 h-12 text-destructive/50" />
            <h1 className="text-2xl font-bold">Payment Confirmed!</h1>
            <p className="text-white/60 text-sm">
              Your render has started. Redirecting you to the render progress page in{" "}
              <span className="text-[--color-gold] font-semibold">{redirectCountdown}s</span>…
            </p>
            <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#b8892a] to-[#4a3010] rounded-full transition-all duration-1000"
                style={{ width: `${((5 - redirectCountdown) / 5) * 100}%` }}
              />
            </div>
            <p className="text-white/30 text-xs">
              {isUpgrade ? "Your video is being upgraded." : "Scenes are being generated. This usually takes 3–8 minutes."}
            </p>
            <Button
              onClick={() => navigate(`/music-video/create?job_id=${sourceJobId}&render_started=true`)}
              className="bg-[--color-gold] hover:bg-[--color-gold]/20 w-full"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Go to Render Progress Now
            </Button>
          </>
        )}

        {/* Confirmed but no sourceJobId (non-music-video render) */}
        {confirmed && !sourceJobId && (
          <>
            <CheckCircle className="w-12 h-12 text-destructive/50" />
            <h1 className="text-2xl font-bold">
              {isUpgrade ? "Upgrade confirmed!" : "Render started!"}
            </h1>
            <p className="text-white/50 text-sm">
              Your video is being processed. We'll email you when it's ready.
            </p>
            <p className="text-white/30 text-xs">This usually takes 2–5 minutes.</p>
            <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#b8892a] to-[#4a3010] animate-pulse rounded-full" style={{ width: "40%" }} />
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          </>
        )}
      </div>

      {/* Fuel the Session — shown while render processes */}
      <div className="max-w-md w-full mt-6">
        <FuelTheSession compact />
      </div>
    </div>
  );
}
