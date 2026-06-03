"use client";

import { use, useState } from "react";
import { useAppStore } from "@/stores/app-store";
import { useOhlcv } from "@/api/hooks/use-ohlcv";
import { PriceChart } from "@/components/chart/price-chart";
import { ChartToolbar, type ChartOverlays } from "@/components/chart/chart-toolbar";
import { ChartSkeleton } from "@/components/feedback/loading-skeleton";
import { ErrorState } from "@/components/feedback/error-state";
import { Card } from "@/components/ui/card";

export default function ChartPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol: paramSymbol } = use(params);
  const symbol = paramSymbol.toUpperCase();
  const { timeframe } = useAppStore();
  const { data, isLoading, isError, refetch } = useOhlcv(symbol, timeframe, 500);
  const [overlays, setOverlays] = useState<ChartOverlays>({ patterns: true, levels: true, ema: false });

  function toggleOverlay(key: keyof ChartOverlays) {
    setOverlays((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">{symbol} / {timeframe} — Gráfico</h2>
          <p className="text-xs text-muted-foreground">{data?.candles.length ?? 0} velas cargadas</p>
        </div>
        <ChartToolbar overlays={overlays} onOverlayChange={toggleOverlay} />
      </div>

      <Card className="overflow-hidden p-2">
        {isLoading ? (
          <ChartSkeleton />
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : data ? (
          <PriceChart candles={data.candles} height={520} />
        ) : null}
      </Card>
    </div>
  );
}
