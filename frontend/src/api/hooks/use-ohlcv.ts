"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { Timeframe } from "@/lib/env";

export function useOhlcv(symbol: string, tf: Timeframe, limit = 500) {
  return useQuery({
    queryKey: ["ohlcv", symbol, tf, limit],
    queryFn: async () => {
      const { data, error } = await api.GET("/ohlcv/{symbol}", {
        params: { path: { symbol }, query: { tf, limit } },
      });
      if (error) throw error;
      return data;
    },
    staleTime: 30_000,
    enabled: !!symbol,
  });
}
