"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { Timeframe } from "@/lib/env";
import { toApiSymbol } from "@/lib/symbols";

export function useRanking(tf: Timeframe, symbols?: string[]) {
  const apiSymbols = symbols?.map(toApiSymbol).join(",");
  return useQuery({
    queryKey: ["ranking", tf, apiSymbols],
    queryFn: async () => {
      const { data, error } = await api.GET("/ranking", {
        params: { query: { tf, symbols: apiSymbols } },
      });
      if (error) throw error;
      return data;
    },
    staleTime: 2 * 60_000,
  });
}
