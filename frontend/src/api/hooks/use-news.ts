"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";

type SentimentFilter = "positive" | "negative" | "neutral" | "all";

export function useNews(symbol: string, limit = 20, sentiment: SentimentFilter = "all") {
  return useQuery({
    queryKey: ["news", symbol, limit, sentiment],
    queryFn: async () => {
      const { data, error } = await api.GET("/news/{symbol}", {
        params: { path: { symbol }, query: { limit, sentiment } },
      });
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60_000,
    enabled: !!symbol,
  });
}
