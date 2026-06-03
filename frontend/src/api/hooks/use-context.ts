"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { Timeframe } from "@/lib/env";
import { toApiSymbol } from "@/lib/symbols";

export function useAssetContext(symbol: string, tf: Timeframe) {
  const apiSymbol = toApiSymbol(symbol);
  return useQuery({
    queryKey: ["context", apiSymbol, tf],
    queryFn: async () => {
      const { data, error } = await api.GET("/context/{symbol}", {
        params: { path: { symbol: apiSymbol }, query: { tf } },
      });
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60_000,
    enabled: !!symbol,
  });
}
