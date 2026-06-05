"use client";

import { useAppStore } from "@/stores/app-store";
import { timeAgo } from "@/lib/utils";
import { Clock } from "lucide-react";

export function LastUpdatedLabel() {
  const { lastRefreshed } = useAppStore();
  if (!lastRefreshed) return null;
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground" title={lastRefreshed}>
      <Clock className="h-3 w-3" />
      <span className="hidden md:inline">Actualizado</span> {timeAgo(lastRefreshed)}
    </span>
  );
}
