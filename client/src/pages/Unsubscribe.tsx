import { useEffect, useState } from "react";
import { Link, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { CheckCircle, MailX, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * /unsubscribe — one-click marketing opt-out page.
 * Accepts ?token=<hmac> or ?email=<email> query params from email links.
 */
export default function Unsubscribe() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const token = params.get("token") ?? undefined;
  const email = params.get("email") ?? undefined;

  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  const optOut = trpc.unsubscribe.optOut.useMutation({
    onSuccess: () => setStatus("done"),
    onError: () => setStatus("error"),
  });

  // Auto-submit if token or email is present in the URL
  useEffect(() => {
    if ((token || email) && status === "idle") {
      setStatus("loading");
      optOut.mutate({ token, email });
    }
  }, [token, email]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      {/* Gold top bar */}
      <div className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-primary/80 via-primary/80 to-primary/70" />

      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-8">
          <Link href="/">
            <span className="text-2xl font-black tracking-tight text-primary/90 cursor-pointer hover:opacity-80 transition-opacity">
              WIZ AI
            </span>
          </Link>
        </div>

        <div className="bg-background border border-[rgba(196,164,100,0.18)] rounded-2xl overflow-hidden">
          {/* Gold accent bar */}
          <div className="h-[3px] bg-gradient-to-r from-primary/80 via-primary/80 to-primary/70" />

          <div className="p-8 text-center">
            {status === "loading" && (
              <>
                <Loader2 className="w-12 h-12 text-primary/90 mx-auto mb-4 animate-spin" />
                <h1 className="text-xl font-bold text-white mb-2">Processing...</h1>
                <p className="text-sm text-white/50">Updating your email preferences.</p>
              </>
            )}

            {status === "done" && (
              <>
                <div className="w-16 h-16 rounded-full bg-[rgba(196,164,100,0.1)] flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-primary/90" />
                </div>
                <h1 className="text-xl font-bold text-white mb-3">You've been unsubscribed</h1>
                <p className="text-sm text-white/55 leading-relaxed mb-6">
                  You will no longer receive marketing emails from WIZ AI.
                  Transactional emails (render completions, billing receipts) will continue.
                </p>
                <Link href="/">
                  <Button
                    variant="outline"
                    className="border-[rgba(196,164,100,0.3)] text-primary/90 hover:bg-[rgba(196,164,100,0.08)]"
                  >
                    Back to WIZ AI
                  </Button>
                </Link>
              </>
            )}

            {status === "error" && (
              <>
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                  <MailX className="w-8 h-8 text-red-400" />
                </div>
                <h1 className="text-xl font-bold text-white mb-3">Something went wrong</h1>
                <p className="text-sm text-white/55 leading-relaxed mb-6">
                  We couldn't process your unsubscribe request. Please try again or contact{" "}
                  <a href="mailto:support@wiz-ai.io" className="text-primary/90 hover:underline">
                    support@wiz-ai.io
                  </a>
                  .
                </p>
                <Button
                  variant="outline"
                  className="border-[rgba(196,164,100,0.3)] text-primary/90 hover:bg-[rgba(196,164,100,0.08)]"
                  onClick={() => {
                    setStatus("loading");
                    optOut.mutate({ token, email });
                  }}
                >
                  Try again
                </Button>
              </>
            )}

            {status === "idle" && !token && !email && (
              <>
                <div className="w-16 h-16 rounded-full bg-[rgba(196,164,100,0.1)] flex items-center justify-center mx-auto mb-4">
                  <MailX className="w-8 h-8 text-primary/90" />
                </div>
                <h1 className="text-xl font-bold text-white mb-3">Unsubscribe from WIZ AI emails</h1>
                <p className="text-sm text-white/55 leading-relaxed mb-6">
                  This link is usually clicked from an email. If you'd like to manage your email preferences,
                  please contact{" "}
                  <a href="mailto:support@wiz-ai.io" className="text-primary/90 hover:underline">
                    support@wiz-ai.io
                  </a>
                  .
                </p>
                <Link href="/">
                  <Button
                    variant="outline"
                    className="border-[rgba(196,164,100,0.3)] text-primary/90 hover:bg-[rgba(196,164,100,0.08)]"
                  >
                    Back to WIZ AI
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-white/20 mt-6">
          © 2025 WIZ AI · <a href="https://www.wiz-ai.io" className="hover:text-white/40 transition-colors">wiz-ai.io</a>
        </p>
      </div>
    </div>
  );
}
