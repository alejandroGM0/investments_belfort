"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { Timeframe } from "@/lib/env";

export function useRanking(tf: Timeframe, symbols?: string[]) {
  return useQuery({
    queryKey: ["ranking", tf, symbols?.join(",")],
    queryFn: async () => {
      const { data, error } = await api.GET("/ranking", {
        params: { query: { tf, symbols: symbols?.join(",") } },
      });
      if (error) throw error;
      return data;
    },
    staleTime: 2 * 60_000,
  });
}
