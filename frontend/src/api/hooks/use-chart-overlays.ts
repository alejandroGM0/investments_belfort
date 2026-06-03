"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { Timeframe } from "@/lib/env";
import type { ChartDisplayFilters } from "@/lib/chart-filters";
import type { HistoryDepth } from "@/stores/app-store";
import { toApiSymbol } from "@/lib/symbols";

export function useChartOverlays(
  symbol: string,
  tf: Timeframe,
  history: HistoryDepth,
  filters: ChartDisplayFilters
) {
  const apiSymbol = toApiSymbol(symbol);
  return useQuery({
    queryKey: [
      "chart-overlays",
      apiSymbol,
      tf,
      history,
      filters.minLevelStrength,
      filters.maxLevelsPerSide,
      filters.minConfluence,
      filters.projectionBars,
    ],
    queryFn: async () => {
      const { data, error } = await api.GET("/analysis/{symbol}/chart-overlays", {
        params: {
          path: { symbol: apiSymbol },
          query: {
            tf,
            history,
            projection_bars: filters.projectionBars,
            min_level_strength: filters.minLevelStrength,
            max_levels_per_side: filters.maxLevelsPerSide,
            min_confluence: filters.minConfluence,
          },
        },
      });
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
    enabled: !!symbol,
  });
}
