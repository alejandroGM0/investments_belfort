"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { Timeframe } from "@/lib/env";
import type { HistoryDepth } from "@/stores/app-store";
import { toApiSymbol } from "@/lib/symbols";

export function usePatternsAll(symbol: string, tf: Timeframe, history: HistoryDepth = "5y") {
  const apiSymbol = toApiSymbol(symbol);
  return useQuery({
    queryKey: ["patterns-all", apiSymbol, tf, history],
    queryFn: async () => {
      const { data, error } = await api.GET("/analysis/{symbol}/patterns/all", {
        params: { path: { symbol: apiSymbol }, query: { tf, history } },
      });
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60_000,
    enabled: !!symbol,
  });
}
