"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { toDisplaySymbol } from "@/lib/symbols";

type SentimentFilter = "positive" | "negative" | "neutral" | "all";

export function useNews(symbol: string, limit = 20, sentiment: SentimentFilter = "all") {
  const apiSymbol = toDisplaySymbol(symbol);
  return useQuery({
    queryKey: ["news", apiSymbol, limit, sentiment],
    queryFn: async () => {
      const { data, error } = await api.GET("/news/{symbol}", {
        params: { path: { symbol: apiSymbol }, query: { limit, sentiment } },
      });
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60_000,
    enabled: !!symbol,
  });
}
