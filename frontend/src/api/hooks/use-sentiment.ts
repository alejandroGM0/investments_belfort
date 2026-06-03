"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";

type Window = "1h" | "4h" | "24h" | "7d";

export function useSentiment(symbol: string, window: Window = "24h") {
  return useQuery({
    queryKey: ["sentiment", symbol, window],
    queryFn: async () => {
      const { data, error } = await api.GET("/sentiment/{symbol}", {
        params: { path: { symbol }, query: { window } },
      });
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60_000,
    enabled: !!symbol,
  });
}
