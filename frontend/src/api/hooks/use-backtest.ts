"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { Timeframe } from "@/lib/env";

export function useBacktest(symbol: string, tf: Timeframe, strategy = "v1") {
  return useQuery({
    queryKey: ["backtest", symbol, tf, strategy],
    queryFn: async () => {
      const { data, error } = await api.GET("/backtest/{symbol}", {
        params: { path: { symbol }, query: { tf, strategy } },
      });
      if (error) throw error;
      return data;
    },
    staleTime: 10 * 60_000,
    enabled: !!symbol,
  });
}
