"use client";

import { AlertTriangle, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { components } from "@/api/types";

type ChartProjection = components["schemas"]["ChartProjection"];

interface ChartStatusBarProps {
  candleCount: number;
  confluenceScore?: number;
  markerCount: number;
  levelCount: number;
  showPatterns: boolean;
  showLevels: boolean;
  projection?: ChartProjection | null;
  showProjection: boolean;
  confluenceBlocked: boolean;
  minConfluence: number;
  currentConfluence?: number;
}

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0 px-3 py-2">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={cn("text-sm font-medium", mono && "font-mono tabular-nums")}>{value}</span>
    </div>
  );
}

export function ChartStatusBar({
  candleCount,
  confluenceScore,
  markerCount,
  levelCount,
  showPatterns,
  showLevels,
  projection,
  showProjection,
  confluenceBlocked,
  minConfluence,
  currentConfluence,
}: ChartStatusBarProps) {
  return (
    <div className="flex flex-col gap-0 border-t border-border bg-muted/20 sm:flex-row sm:items-stretch sm:justify-between">
      <div className="flex flex-wrap divide-x divide-border">
        <Stat label="Velas" value={String(candleCount)} mono />
        <Stat
          label="Confluencia"
          value={confluenceScore != null ? `${confluenceScore}%` : "—"}
          mono
        />
        {showPatterns && (
          <Stat label="Señales" value={String(markerCount)} mono />
        )}
        {showLevels && (
          <Stat label="Niveles S/R" value={String(levelCount)} mono />
        )}
      </div>

      <div className="flex min-h-10 flex-1 items-center gap-2 border-t border-border px-3 py-2 sm:border-t-0 sm:justify-end">
        {confluenceBlocked && showProjection && (
          <span className="inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-500">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Proyección oculta ({currentConfluence}% &lt; {minConfluence}%)
          </span>
        )}
        {projection && showProjection && !confluenceBlocked && (
          <span className="inline-flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400">
            <TrendingUp className="h-3.5 w-3.5 shrink-0" />
            <span>
              Proyección <span className="font-mono">{projection.bars}</span> velas →{" "}
              <span className="font-mono font-medium">{projection.target_price}</span>
            </span>
          </span>
        )}
        {!confluenceBlocked && !projection && showProjection && (
          <span className="text-xs text-muted-foreground">Sin proyección (confluencia baja)</span>
        )}
      </div>
    </div>
  );
}
