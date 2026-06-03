"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { Timeframe } from "@/lib/env";

export function useAnalysis(symbol: string, tf: Timeframe, page = 1) {
  return useQuery({
    queryKey: ["analysis", symbol, tf, page],
    queryFn: async () => {
      const { data, error } = await api.GET("/analysis/{symbol}", {
        params: { path: { symbol }, query: { tf, page } },
      });
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
    enabled: !!symbol,
  });
}
