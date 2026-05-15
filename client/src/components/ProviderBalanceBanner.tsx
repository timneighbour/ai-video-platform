/**
 * ProviderBalanceBanner
 *
 * Shown at the top of the admin dashboard when Atlas Cloud or WaveSpeed
 * credits are running low. Polls every 5 minutes.
 *
 * Visibility rules:
 *  - Only shown to admin users (role === "admin")
 *  - Yellow warning when balance < warn threshold
 *  - Red critical when balance < critical threshold OR balance = 0
 *  - Dismissible per-session (localStorage flag per severity level)
 */

import { useEffect, useState } from "react";
import { AlertTriangle, X, ExternalLink, RefreshCw } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "providerBalanceBannerDismissed";
const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

type ProviderEntry = {
  name: string;
  available: boolean;
  balanceUsd: number | null;
  status: "ok" | "warning" | "critical" | "unknown";
  warnThresholdUsd: number;
  critThresholdUsd: number;
  topUpUrl: string;
  costPerScene: number;
  error?: string;
};

function BalanceChip({ provider }: { provider: ProviderEntry }) {
  const isCrit = provider.status === "critical";
  const isWarn = provider.status === "warning";

  const chipClass = isCrit
    ? "bg-red-500/15 border-red-500/40 text-red-300"
    : isWarn
    ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
    : "bg-emerald-500/15 border-emerald-500/40 text-emerald-300";

  const balanceText =
    provider.balanceUsd !== null
      ? `$${provider.balanceUsd.toFixed(2)}`
      : provider.status === "critical"
      ? "Exhausted"
      : provider.status === "ok"
      ? "OK"
      : "Unknown";

  return (
    <a
      href={provider.topUpUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-opacity hover:opacity-80 ${chipClass}`}
    >
      <span>{provider.name}</span>
      <span className="opacity-70">·</span>
      <span>{balanceText}</span>
      {(isCrit || isWarn) && (
        <>
          <span className="opacity-70">·</span>
          <span className="flex items-center gap-0.5">
            Top up <ExternalLink className="h-2.5 w-2.5" />
          </span>
        </>
      )}
    </a>
  );
}

export function ProviderBalanceBanner() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [refetchTick, setRefetchTick] = useState(0);

  // Only admins see this banner
  if (user?.role !== "admin") return null;

  // Auto-poll every 5 minutes
  useEffect(() => {
    const timer = setInterval(() => {
      setRefetchTick((t) => t + 1);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  const { data, isLoading, refetch } = trpc.system.getProviderBalances.useQuery(
    undefined,
    {
      refetchOnWindowFocus: false,
      retry: 1,
    }
  );

  // Re-trigger query when tick changes
  useEffect(() => {
    if (refetchTick > 0) refetch();
  }, [refetchTick, refetch]);

  // Check dismiss state from sessionStorage
  useEffect(() => {
    const key = `${DISMISS_KEY}_${data?.checkedAt?.slice(0, 13) ?? ""}`;
    if (sessionStorage.getItem(key) === "true") setDismissed(true);
    else setDismissed(false);
  }, [data?.checkedAt]);

  if (dismissed || isLoading || !data) return null;

  const providers: ProviderEntry[] = [
    { name: "Atlas Cloud", ...data.atlas },
    { name: "WaveSpeed", ...data.wavespeed },
  ];

  const criticalProviders = providers.filter((p) => p.status === "critical");
  const warningProviders = providers.filter((p) => p.status === "warning");
  const alertProviders = [...criticalProviders, ...warningProviders];

  if (alertProviders.length === 0) return null;

  const isCritical = criticalProviders.length > 0;
  const severity = isCritical ? "critical" : "warning";

  const bannerClass = isCritical
    ? "bg-red-950/60 border-red-500/30 text-red-200"
    : "bg-amber-950/60 border-amber-500/30 text-amber-200";

  const iconClass = isCritical ? "text-red-400" : "text-amber-400";

  const handleDismiss = () => {
    const key = `${DISMISS_KEY}_${data.checkedAt?.slice(0, 13) ?? ""}`;
    sessionStorage.setItem(key, "true");
    setDismissed(true);
  };

  const headline = isCritical
    ? criticalProviders.length === 2
      ? "All video providers are out of credits — renders are paused"
      : `${criticalProviders.map((p) => p.name).join(" & ")} ${criticalProviders.length === 1 ? "is" : "are"} out of credits`
    : `${warningProviders.map((p) => p.name).join(" & ")} ${warningProviders.length === 1 ? "is" : "are"} running low on credits`;

  return (
    <div
      className={`w-full border-b px-4 py-2.5 flex items-center gap-3 ${bannerClass}`}
      role="alert"
      aria-live="polite"
    >
      <AlertTriangle className={`h-4 w-4 shrink-0 ${iconClass}`} />

      <div className="flex-1 flex flex-wrap items-center gap-x-3 gap-y-1.5 min-w-0">
        <span className="text-sm font-medium">{headline}</span>
        <div className="flex flex-wrap gap-1.5">
          {alertProviders.map((p) => (
            <BalanceChip key={p.name} provider={p} />
          ))}
        </div>
        {isCritical && (
          <span className="text-xs opacity-60">
            Scenes will retry automatically once credits are topped up.
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-50 hover:opacity-100"
          onClick={() => refetch()}
          title="Refresh balance"
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-50 hover:opacity-100"
          onClick={handleDismiss}
          title="Dismiss"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
