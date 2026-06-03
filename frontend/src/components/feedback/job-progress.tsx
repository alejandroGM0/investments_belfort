"use client";

import { useEffect, useState } from "react";
import { useJob } from "@/api/hooks/use-job";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

interface JobProgressBannerProps {
  jobId: string | null | undefined;
  label?: string;
  onComplete?: () => void;
  className?: string;
}

export function JobProgressBanner({ jobId, label, onComplete, className = "" }: JobProgressBannerProps) {
  const { data: job } = useJob(jobId);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (job?.status === "done" && onComplete) {
      onComplete();
    }
  }, [job?.status, onComplete]);

  // Auto-dismiss after completion
  useEffect(() => {
    if (job?.status === "done" || job?.status === "failed") {
      const timer = setTimeout(() => setDismissed(true), 5000);
      return () => clearTimeout(timer);
    }
  }, [job?.status]);

  if (!jobId || !job || dismissed) return null;

  const progress = job.progress_total
    ? Math.round((job.progress_current! / job.progress_total) * 100)
    : 0;

  const isDone = job.status === "done";
  const isFailed = job.status === "failed";
  const isRunning = job.status === "running" || job.status === "pending";

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-all ${
        isDone
          ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400"
          : isFailed
            ? "border-red-500/30 bg-red-500/5 text-red-600 dark:text-red-400"
            : "border-primary/20 bg-primary/5 text-foreground"
      } ${className}`}
    >
      {isRunning && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />}
      {isDone && <CheckCircle2 className="h-4 w-4 shrink-0" />}
      {isFailed && <XCircle className="h-4 w-4 shrink-0" />}

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="truncate font-medium">
            {label ?? job.kind}
          </span>
          {isRunning && job.progress_total! > 0 && (
            <span className="ml-2 shrink-0 text-xs text-muted-foreground tabular-nums">
              {job.progress_current}/{job.progress_total} ({progress}%)
            </span>
          )}
        </div>

        {isRunning && job.progress_total! > 0 && (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {job.progress_message && (
          <span className="truncate text-xs text-muted-foreground">
            {job.progress_message}
          </span>
        )}
      </div>
    </div>
  );
}
