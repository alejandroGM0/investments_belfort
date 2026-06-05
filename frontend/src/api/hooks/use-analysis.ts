"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { Timeframe } from "@/lib/env";
import { ANALYSIS_POLL_MS } from "@/lib/live-polling";
import { toApiSymbol } from "@/lib/symbols";

export function useAnalysis(symbol: string, tf: Timeframe, page = 1, live = true) {
  const apiSymbol = toApiSymbol(symbol);
  return useQuery({
    queryKey: ["analysis", apiSymbol, tf, page],
    queryFn: async () => {
      const { data, error } = await api.GET("/analysis/{symbol}", {
        params: { path: { symbol: apiSymbol }, query: { tf, page } },
      });
      if (error) throw error;
      return data;
    },
    staleTime: ANALYSIS_POLL_MS / 2,
    refetchInterval: live ? ANALYSIS_POLL_MS : false,
    refetchIntervalInBackground: false,
    enabled: !!symbol,
  });
}
