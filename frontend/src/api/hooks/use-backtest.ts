"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { Timeframe } from "@/lib/env";
import { toApiSymbol } from "@/lib/symbols";

export function useBacktest(symbol: string, tf: Timeframe, strategy = "v1") {
  const apiSymbol = toApiSymbol(symbol);
  return useQuery({
    queryKey: ["backtest", apiSymbol, tf, strategy],
    queryFn: async () => {
      const { data, error } = await api.GET("/backtest/{symbol}", {
        params: { path: { symbol: apiSymbol }, query: { tf, strategy } },
      });
      if (error) throw error;
      return data;
    },
    staleTime: 10 * 60_000,
    enabled: !!symbol,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      const activeJob = query.state.data?.active_job?.status;
      if (status === "running" || activeJob === "running" || activeJob === "pending") {
        return 3000;
      }
      return false;
    },
  });
}
