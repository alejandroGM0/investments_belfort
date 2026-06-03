"use client";

import { TIMEFRAMES, type Timeframe } from "@/lib/env";
import { useAppStore } from "@/stores/app-store";
import { cn } from "@/lib/utils";

export function TimeframeSelect() {
  const { timeframe, setTimeframe } = useAppStore();
  return (
    <div className="flex items-center rounded-md border bg-muted/40 p-0.5">
      {TIMEFRAMES.map((tf) => (
        <button
          key={tf}
          onClick={() => setTimeframe(tf as Timeframe)}
          className={cn(
            "rounded px-2.5 py-1 text-xs font-medium transition-all",
            timeframe === tf
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {tf}
        </button>
      ))}
    </div>
  );
}
