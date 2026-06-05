"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { Timeframe } from "@/lib/env";
import { ohlcvPollMs } from "@/lib/live-polling";
import { toApiSymbol } from "@/lib/symbols";
import { useAppStore } from "@/stores/app-store";

export function useOhlcv(symbol: string, tf: Timeframe, limit = 500, live = true) {
  const apiSymbol = toApiSymbol(symbol);
  const history = useAppStore((s) => s.history);
  const setLastRefreshed = useAppStore((s) => s.setLastRefreshed);

  return useQuery({
    queryKey: ["ohlcv", apiSymbol, tf, limit, history, live],
    queryFn: async () => {
      const { data, error } = await api.GET("/ohlcv/{symbol}", {
        params: {
          path: { symbol: apiSymbol },
          query: { tf, limit, history, live },
        },
      });
      if (error) throw error;
      if (data?.updated_at) {
        setLastRefreshed(data.updated_at);
      }
      return data;
    },
    staleTime: ohlcvPollMs(tf) / 2,
    refetchInterval: live ? ohlcvPollMs(tf) : false,
    refetchIntervalInBackground: false,
    enabled: !!symbol,
  });
}
