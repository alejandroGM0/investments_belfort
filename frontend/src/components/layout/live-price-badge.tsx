"use client";

import { useTicker } from "@/api/hooks/use-ticker";
import { useAppStore } from "@/stores/app-store";
import { fmtPrice, fmtPct } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function LivePriceBadge() {
  const symbol = useAppStore((s) => s.symbol);
  const { data, isLoading, isError, isFetching } = useTicker(symbol);

  if (isLoading && !data) {
    return (
      <span className="hidden h-8 min-w-[100px] animate-pulse rounded-md bg-muted sm:inline-block" />
    );
  }

  if (isError || !data?.price) {
    return null;
  }

  const ch = data.change_24h_pct;
  const up = ch != null && ch >= 0;

  return (
    <div
      className={cn(
        "hidden items-center gap-2 rounded-lg border px-2.5 py-1 sm:flex",
        "bg-muted/30"
      )}
      title="Precio en vivo (Binance)"
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          isFetching ? "animate-pulse bg-emerald-500" : "bg-emerald-500"
        )}
        aria-hidden
      />
      <span className="font-mono text-sm font-semibold tabular-nums">
        {fmtPrice(data.price)}
      </span>
      {ch != null && (
        <span
          className={cn(
            "text-xs font-medium tabular-nums",
            up ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
          )}
        >
          {fmtPct(ch)}
        </span>
      )}
    </div>
  );
}
