/**
 * Batch InstantID Regeneration Page
 *
 * Allows the user to re-run the InstantID engine across all photo-mode
 * characters in their account in one go.
 *
 * Route: /dashboard/batch-regeneration
 */
import { useEffect, useCallback } from "react";
import { LandscapeHint } from "@/components/LandscapeHint";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import BackButton from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ArrowLeft,
  Zap,
  RotateCcw,
  StopCircle,
  ImageIcon,
} from "@/lib/icons";
import { useState } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────────

type BatchItemStatus = "pending" | "processing" | "done" | "failed" | "cancelled";

interface BatchItem {
  characterId: number;
  characterName: string;
  characterRole: string | null;
  jobId: number;
  jobTitle: string;
  currentPreviewUrl: string | null;
  newPreviewUrl: string | null;
  status: BatchItemStatus;
  error: string | null;
}

// ─── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: BatchItemStatus }) {
  switch (status) {
    case "pending":
      return (
        <Badge variant="outline" className="text-muted-foreground border-muted-foreground/40 gap-1">
          <Clock className="w-3 h-3" /> Pending
        </Badge>
      );
    case "processing":
      return (
        <Badge className="bg-[--color-gold]/15 text-[--color-gold] border-[--color-gold]/30 gap-1">
          <Loader2 className="w-3 h-3 animate-spin" /> Processing
        </Badge>
      );
    case "done":
      return (
        <Badge className="bg-[--color-silver]/10 text-[--color-silver] border-[--color-silver]/20 gap-1">
          <CheckCircle2 className="w-3 h-3" /> Done
        </Badge>
      );
    case "failed":
      return (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30 gap-1">
          <XCircle className="w-3 h-3" /> Failed
        </Badge>
      );
    case "cancelled":
      return (
        <Badge variant="outline" className="text-muted-foreground/60 gap-1">
          <StopCircle className="w-3 h-3" /> Cancelled
        </Badge>
      );
  }
}

// ─── Character row ─────────────────────────────────────────────────────────────

function CharacterRow({ item }: { item: BatchItem }) {
  const [showNew, setShowNew] = useState(false);
  const previewSrc = showNew && item.newPreviewUrl ? item.newPreviewUrl : item.currentPreviewUrl;

  return (
    <div className="flex items-center gap-4 py-3 px-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
      {/* Thumbnail */}
      <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0 border border-border">
        {previewSrc ? (
          <img
            src={previewSrc}
            alt={item.characterName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
        {/* Toggle overlay when both previews available */}
        {item.newPreviewUrl && item.currentPreviewUrl && (
          <button
            onClick={() => setShowNew((v) => !v)}
            className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center text-[9px] text-white font-medium"
            title={showNew ? "Showing new — click for old" : "Showing old — click for new"}
          >
            {showNew ? "NEW" : "OLD"}
          </button>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{item.characterName}</p>
        <p className="text-xs text-muted-foreground truncate">
          {item.characterRole ? `${item.characterRole} · ` : ""}
          {item.jobTitle}
        </p>
        {item.error && (
          <p className="text-xs text-red-400 mt-0.5 truncate" title={item.error}>
            {item.error}
          </p>
        )}
      </div>

      {/* Status */}
      <div className="flex-shrink-0">
        <StatusBadge status={item.status} />
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function BatchRegeneration() {
  const utils = trpc.useUtils();

  // Mutations
  const startBatch = trpc.musicVideo.startBatchRegeneration.useMutation({
    onSuccess: (data) => {
      if (data.total === 0) {
        toast.info("No photo-mode characters found in your account.");
      } else {
        toast.success(`Started regenerating ${data.total} character(s) with InstantID.`);
      }
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message ?? "Failed to start batch regeneration.");
    },
  });

  const cancelBatch = trpc.musicVideo.cancelBatchRegeneration.useMutation({
    onSuccess: () => {
      toast.info("Batch cancelled.");
      void utils.musicVideo.getBatchRegenerationStatus.invalidate();
    },
    onError: (err: { message?: string }) => toast.error(err.message),
  });

  const retryFailed = trpc.musicVideo.retryFailedBatchItems.useMutation({
    onSuccess: (data) => {
      toast.success(`Retrying ${data.retried} failed character(s).`);
    },
    onError: (err: { message?: string }) => toast.error(err.message),
  });

  // Status polling — active every 3 s while running
  const { data: batchStatus, refetch } = trpc.musicVideo.getBatchRegenerationStatus.useQuery(
    undefined,
    {
      refetchInterval: (query: { state: { data?: { status?: string } | null } }) => {
        const d = query.state.data;
        if (d && d.status === "running") return 3000;
        return false;
      },
    }
  );

  const isRunning = batchStatus?.status === "running";
  const isCompleted = batchStatus?.status === "completed";
  const hasFailed = (batchStatus?.failed ?? 0) > 0;
  const progressPct = batchStatus
    ? Math.round(
        ((batchStatus.completed + batchStatus.failed) / Math.max(batchStatus.total, 1)) * 100
      )
    : 0;

  const handleStart = useCallback(() => {
    startBatch.mutate({});
  }, [startBatch]);

  const handleCancel = useCallback(() => {
    cancelBatch.mutate();
  }, [cancelBatch]);

  const handleRetry = useCallback(() => {
    retryFailed.mutate();
  }, [retryFailed]);

  // Kick off first poll shortly after starting
  useEffect(() => {
    if (startBatch.isSuccess) {
      const t = setTimeout(() => void refetch(), 1000);
      return () => clearTimeout(t);
    }
  }, [startBatch.isSuccess, refetch]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex flex-col gap-2">
          <BackButton fallback="/dashboard" label="Back to Dashboard" />
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-[--color-gold]" />
            <h1 className="text-lg font-semibold">Batch InstantID Re-generation</h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Info card */}
        <Card className="border-[--color-gold]/20 bg-[--color-gold]/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-[--color-gold]" />
              What this does
            </CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              Re-generates the preview portrait for every photo-mode character in your account using
              the new <strong className="text-[--color-gold]/80">InstantID</strong> engine — which achieves
              near-exact face matching from your uploaded reference photos. Previously generated
              previews used Flux PuLID, which produced lower likeness. Characters are processed one
              at a time; the page updates automatically as each one completes. Hover a thumbnail to
              toggle between the old and new preview.
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {!isRunning ? (
            <Button
              onClick={handleStart}
              disabled={startBatch.isPending}
              className="btn-primary btn-sheen btn-sheen gap-2"
            >
              {startBatch.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              {batchStatus ? "Re-run All" : "Start Batch Re-generation"}
            </Button>
          ) : (
            <Button
              onClick={handleCancel}
              variant="destructive"
              disabled={cancelBatch.isPending}
              className="gap-2"
            >
              {cancelBatch.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <StopCircle className="w-4 h-4" />
              )}
              Cancel Batch
            </Button>
          )}

          {isCompleted && hasFailed && (
            <Button
              onClick={handleRetry}
              variant="outline"
              disabled={retryFailed.isPending}
              className="gap-2"
            >
              {retryFailed.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4" />
              )}
              Retry Failed ({batchStatus?.failed})
            </Button>
          )}
        </div>

        {/* Progress section */}
        {batchStatus && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {isRunning
                    ? `Processing… ${batchStatus.completed + batchStatus.failed} / ${batchStatus.total}`
                    : batchStatus.status === "cancelled"
                    ? "Batch cancelled"
                    : `Completed — ${batchStatus.completed} succeeded, ${batchStatus.failed} failed`}
                </CardTitle>
                <span className="text-sm text-muted-foreground">{progressPct}%</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={progressPct} className="h-2" />

              {/* Summary pills */}
              <div className="flex gap-4 flex-wrap text-sm">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  Pending: <strong>{batchStatus.pending}</strong>
                </span>
                <span className="flex items-center gap-1 text-[--color-gold]">
                  <Loader2 className="w-3.5 h-3.5" />
                  Processing: <strong>{batchStatus.inProgress}</strong>
                </span>
                <span className="flex items-center gap-1 text-[--color-silver]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Done: <strong>{batchStatus.completed}</strong>
                </span>
                {batchStatus.failed > 0 && (
                  <span className="flex items-center gap-1 text-red-400">
                    <XCircle className="w-3.5 h-3.5" />
                    Failed: <strong>{batchStatus.failed}</strong>
                  </span>
                )}
              </div>

              <Separator />

              {/* Character list */}
              <div className="space-y-2">
                {(batchStatus.items as BatchItem[]).map((item: BatchItem) => (
                  <CharacterRow key={item.characterId} item={item} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {!batchStatus && !startBatch.isPending && (
          <div className="text-center py-16 text-muted-foreground">
            <RefreshCw className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">
              No batch running yet. Click{" "}
              <strong className="text-foreground">Start Batch Re-generation</strong> above to begin.
            </p>
          </div>
        )}
      </div>
      <LandscapeHint />
    </div>
  );
}
