"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { Timeframe } from "@/lib/env";
import { toApiSymbol } from "@/lib/symbols";

export function useBacktestRuns(
  symbol: string,
  tf: Timeframe,
  opts?: {
    patternId?: string;
    sortBy?: string;
    limit?: number;
    enabled?: boolean;
  }
) {
  const apiSymbol = toApiSymbol(symbol);
  const patternId = opts?.patternId;
  const sortBy = opts?.sortBy ?? "sharpe";
  const limit = opts?.limit ?? 200;

  return useQuery({
    queryKey: ["backtest-runs", apiSymbol, tf, patternId, sortBy, limit],
    queryFn: async () => {
      const { data, error } = await api.GET("/backtest/{symbol}/runs", {
        params: {
          path: { symbol: apiSymbol },
          query: {
            tf,
            pattern_id: patternId,
            sort_by: sortBy,
            limit,
            offset: 0,
          },
        },
      });
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
    enabled: !!symbol && (opts?.enabled ?? true),
    retry: 1,
  });
}
