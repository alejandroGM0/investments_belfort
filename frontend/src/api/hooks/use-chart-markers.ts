"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { Timeframe } from "@/lib/env";
import { categoriesQuery, type ChartDisplayFilters } from "@/lib/chart-filters";
import type { HistoryDepth } from "@/stores/app-store";
import { OVERLAYS_POLL_MS } from "@/lib/live-polling";
import { toApiSymbol } from "@/lib/symbols";

export function useChartMarkers(
  symbol: string,
  tf: Timeframe,
  history: HistoryDepth,
  filters: ChartDisplayFilters,
  fromTs?: number,
  toTs?: number
) {
  const apiSymbol = toApiSymbol(symbol);
  const cats = categoriesQuery(filters.patternCategories);

  return useQuery({
    queryKey: [
      "chart-markers",
      apiSymbol,
      tf,
      history,
      filters.minPatternConfidence,
      filters.patternStatus,
      filters.patternDirection,
      cats,
      filters.maxMarkers,
      fromTs,
      toTs,
    ],
    queryFn: async () => {
      const { data, error } = await api.GET("/analysis/{symbol}/chart-markers", {
        params: {
          path: { symbol: apiSymbol },
          query: {
            tf,
            history,
            min_confidence: filters.minPatternConfidence,
            pattern_status: filters.patternStatus,
            pattern_direction: filters.patternDirection,
            max_markers: filters.maxMarkers,
            ...(cats ? { categories: cats } : {}),
            ...(fromTs != null ? { from: fromTs } : {}),
            ...(toTs != null ? { to: toTs } : {}),
          },
        },
      });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: OVERLAYS_POLL_MS / 2,
    refetchInterval: OVERLAYS_POLL_MS,
    refetchIntervalInBackground: false,
    enabled: !!symbol,
  });
}
