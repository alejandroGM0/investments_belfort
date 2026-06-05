"use client";

import { TIMEFRAMES, type Timeframe } from "@/lib/env";
import { useAppStore } from "@/stores/app-store";
import { cn } from "@/lib/utils";

export function TimeframeSelect() {
  const { timeframe, setTimeframe } = useAppStore();
  return (
    <div className="flex items-center rounded-xl border border-border/50 bg-muted/30 p-1 backdrop-blur-sm shadow-inner">
      {TIMEFRAMES.map((tf) => (
        <button
          key={tf}
          onClick={() => setTimeframe(tf as Timeframe)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all duration-200",
            timeframe === tf
              ? "bg-card text-foreground shadow-sm ring-1 ring-border/50"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          {tf}
        </button>
      ))}
    </div>
  );
}
