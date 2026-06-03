"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { Timeframe } from "@/lib/env";
import { toApiSymbol } from "@/lib/symbols";

export function useOhlcv(symbol: string, tf: Timeframe, limit = 500) {
  const apiSymbol = toApiSymbol(symbol);
  return useQuery({
    queryKey: ["ohlcv", apiSymbol, tf, limit],
    queryFn: async () => {
      const { data, error } = await api.GET("/ohlcv/{symbol}", {
        params: { path: { symbol: apiSymbol }, query: { tf, limit } },
      });
      if (error) throw error;
      return data;
    },
    staleTime: 30_000,
    enabled: !!symbol,
  });
}
