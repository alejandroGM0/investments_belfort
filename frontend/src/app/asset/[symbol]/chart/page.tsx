"use client";

import { use, useState } from "react";
import { useAppStore } from "@/stores/app-store";
import { useChartFiltersStore } from "@/stores/chart-filters-store";
import { useOhlcv } from "@/api/hooks/use-ohlcv";
import { useChartOverlays } from "@/api/hooks/use-chart-overlays";
import { useChartMarkers } from "@/api/hooks/use-chart-markers";
import { useOperationalSetup } from "@/api/hooks/use-operational-setup";
import { PriceChart } from "@/components/chart/price-chart";
import {
  ChartToolbar,
  type ChartOverlays,
} from "@/components/chart/chart-toolbar";
import { ChartFiltersPanel } from "@/components/chart/chart-filters-panel";
import { ChartStatusBar } from "@/components/chart/chart-status-bar";
import { OperationalSetupPanel } from "@/components/chart/operational-setup-panel";
import { ChartSkeleton } from "@/components/feedback/loading-skeleton";
import { ErrorState } from "@/components/feedback/error-state";
import { Card } from "@/components/ui/card";
import { TrendBadge } from "@/components/common/trend-badge";
import {
  DEFAULT_CHART_FILTERS,
  countFilterDeviations,
} from "@/lib/chart-filters";
import { useCustomStrategiesStore } from "@/stores/custom-strategies-store";
import { customStrategyToTradeSetup } from "@/lib/custom-strategies";

/** Altura del área de dibujo (resta header app, tabs, toolbar de página y barra de estado). */
const CHART_PLOT_HEIGHT = "clamp(360px, calc(100dvh - 15.5rem), 820px)";

export default function ChartPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol: paramSymbol } = use(params);
  const symbol = paramSymbol.toUpperCase();
  const { timeframe, history } = useAppStore();
  const {
    filters: storedFilters,
    setFilters,
    resetFilters,
    toggleCategory,
  } = useChartFiltersStore();
  const filters = { ...DEFAULT_CHART_FILTERS, ...storedFilters };
  const activeStrategy = useCustomStrategiesStore((s) =>
    s.activeStrategyId
      ? (s.strategies.find((st) => st.id === s.activeStrategyId) ?? null)
      : null,
  );

  const { data, isLoading, isError, refetch } = useOhlcv(
    symbol,
    timeframe,
    500,
  );
  const { data: overlayData, isLoading: loadOverlays } = useChartOverlays(
    symbol,
    timeframe,
    history,
    filters,
  );
  const { data: markers = [] } = useChartMarkers(
    symbol,
    timeframe,
    history,
    filters,
  );
  const {
    data: operationalSetup,
    isLoading: loadingOperationalSetup,
    isError: operationalSetupError,
  } = useOperationalSetup(symbol, timeframe, history);
  const [overlays, setOverlays] = useState<ChartOverlays>({
    patterns: true,
    levels: true,
    ema: false,
    projection: true,
    setup: true,
  });
  const [filtersOpen, setFiltersOpen] = useState(false);

  function toggleOverlay(key: keyof ChartOverlays) {
    setOverlays((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const activeSetup =
    activeStrategy &&
    (!activeStrategy.symbol || activeStrategy.symbol === symbol)
      ? customStrategyToTradeSetup(activeStrategy)
      : null;

  const chartOverlayData = overlayData
    ? {
        ...overlayData,
        trade_setup:
          overlays.setup && filters.showTradeSetup
            ? (activeSetup ?? overlayData.trade_setup)
            : undefined,
      }
    : undefined;

  const projection = chartOverlayData?.projection;
  const confluenceBlocked =
    overlayData != null && overlayData.confluence_score < filters.minConfluence;
  const loading = isLoading || loadOverlays;
  const filterBadgeCount = countFilterDeviations(filters);

  return (
    <div className="space-y-3 px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold tracking-tight">
            {symbol}
            <span className="ml-1.5 font-normal text-muted-foreground">
              / {timeframe}
            </span>
          </h1>
          {overlayData && (
            <TrendBadge direction={overlayData.trend} size="sm" />
          )}
        </div>
        <ChartToolbar
          overlays={overlays}
          onOverlayChange={toggleOverlay}
          onOpenFilters={() => setFiltersOpen(true)}
          activeFilterCount={filterBadgeCount}
        />
      </div>

      <ChartFiltersPanel
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        filters={filters}
        onChange={setFilters}
        onReset={resetFilters}
        onToggleCategory={toggleCategory}
      />

      <div className="grid gap-3">
        <Card className="overflow-hidden">
          <div className="w-full" style={{ height: CHART_PLOT_HEIGHT }}>
            {loading ? (
              <div className="flex h-full items-center justify-center p-4">
                <ChartSkeleton className="h-full w-full border-0 p-0" />
              </div>
            ) : isError ? (
              <div className="flex h-full items-center justify-center p-6">
                <ErrorState onRetry={refetch} />
              </div>
            ) : data ? (
              <PriceChart
                candles={data.candles}
                markers={markers}
                overlays={overlays}
                overlayData={chartOverlayData}
                className="h-full w-full"
              />
            ) : null}
          </div>
          {!loading && !isError && data && (
            <ChartStatusBar
              candleCount={data.candles.length}
              confluenceScore={overlayData?.confluence_score}
              markerCount={markers.length}
              levelCount={overlayData?.levels.length ?? 0}
              showPatterns={overlays.patterns}
              showLevels={overlays.levels}
              projection={projection}
              showProjection={overlays.projection}
              confluenceBlocked={confluenceBlocked}
              minConfluence={filters.minConfluence}
              currentConfluence={overlayData?.confluence_score}
            />
          )}
        </Card>
      </div>

      <OperationalSetupPanel
        setup={operationalSetup}
        isLoading={loadingOperationalSetup}
        isError={operationalSetupError}
      />
    </div>
  );
}
