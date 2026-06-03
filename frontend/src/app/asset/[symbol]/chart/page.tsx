"use client";

import { use, useState } from "react";
import { useAppStore } from "@/stores/app-store";
import { useChartFiltersStore } from "@/stores/chart-filters-store";
import { useOhlcv } from "@/api/hooks/use-ohlcv";
import { useChartOverlays } from "@/api/hooks/use-chart-overlays";
import { useChartMarkers } from "@/api/hooks/use-chart-markers";
import { PriceChart } from "@/components/chart/price-chart";
import { ChartToolbar, type ChartOverlays } from "@/components/chart/chart-toolbar";
import { ChartFiltersPanel } from "@/components/chart/chart-filters-panel";
import { ChartSkeleton } from "@/components/feedback/loading-skeleton";
import { ErrorState } from "@/components/feedback/error-state";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendBadge } from "@/components/common/trend-badge";
import { DEFAULT_CHART_FILTERS } from "@/lib/chart-filters";

export default function ChartPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol: paramSymbol } = use(params);
  const symbol = paramSymbol.toUpperCase();
  const { timeframe, history } = useAppStore();
  const { filters: storedFilters, setFilters, resetFilters, toggleCategory } =
    useChartFiltersStore();
  const filters = { ...DEFAULT_CHART_FILTERS, ...storedFilters };

  const { data, isLoading, isError, refetch } = useOhlcv(symbol, timeframe, 500);
  const { data: overlayData, isLoading: loadOverlays } = useChartOverlays(
    symbol,
    timeframe,
    history,
    filters
  );
  const { data: markers = [] } = useChartMarkers(symbol, timeframe, history, filters);
  const [overlays, setOverlays] = useState<ChartOverlays>({
    patterns: true,
    levels: true,
    ema: false,
    projection: true,
    setup: true,
  });

  function toggleOverlay(key: keyof ChartOverlays) {
    setOverlays((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const chartOverlayData = overlayData
    ? {
        ...overlayData,
        trade_setup:
          overlays.setup && filters.showTradeSetup ? overlayData.trade_setup : undefined,
      }
    : undefined;

  const projection = chartOverlayData?.projection;
  const confluenceBlocked =
    overlayData != null && overlayData.confluence_score < filters.minConfluence;
  const loading = isLoading || loadOverlays;

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold">{symbol} / {timeframe} — Gráfico</h2>
            {overlayData && <TrendBadge direction={overlayData.trend} />}
          </div>
          <p className="text-xs text-muted-foreground">
            {data?.candles.length ?? 0} velas · confluencia {overlayData?.confluence_score ?? "—"}%
            {overlays.patterns && markers.length > 0 && <> · {markers.length} señales</>}
            {overlays.levels && overlayData && (
              <> · {overlayData.levels.length} niveles S/R</>
            )}
          </p>
        </div>
        <ChartToolbar overlays={overlays} onOverlayChange={toggleOverlay} />
      </div>

      <ChartFiltersPanel
        filters={filters}
        onChange={setFilters}
        onReset={resetFilters}
        onToggleCategory={toggleCategory}
      />

      {projection && overlays.projection && (
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="outline" className="font-normal">
            Proyección ({projection.bars} velas) → objetivo{" "}
            <span className="font-mono">{projection.target_price}</span>
          </Badge>
          <Badge variant="secondary" className="font-normal text-muted-foreground">
            Estimación según tendencia, ATR y setup — no es predicción garantizada
          </Badge>
        </div>
      )}

      {confluenceBlocked && overlays.projection && (
        <p className="text-xs text-amber-600 dark:text-amber-500">
          Proyección y setup ocultos: confluencia {overlayData?.confluence_score}% &lt; umbral{" "}
          {filters.minConfluence}% (ajústalo en filtros).
        </p>
      )}

      <Card className="overflow-hidden p-2">
        {loading ? (
          <ChartSkeleton />
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : data ? (
          <PriceChart
            candles={data.candles}
            markers={markers}
            overlays={overlays}
            overlayData={chartOverlayData}
            height={520}
          />
        ) : null}
      </Card>
    </div>
  );
}
