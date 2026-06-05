"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { Timeframe } from "@/lib/env";
import type { HistoryDepth } from "@/stores/app-store";
import { OVERLAYS_POLL_MS } from "@/lib/live-polling";
import { toApiSymbol } from "@/lib/symbols";

export function useOperationalSetup(
  symbol: string,
  tf: Timeframe,
  history: HistoryDepth,
) {
  const apiSymbol = toApiSymbol(symbol);

  return useQuery({
    queryKey: ["operational-setup", apiSymbol, tf, history],
    queryFn: async () => {
      const { data, error } = await api.GET("/analysis/{symbol}/operational-setup", {
        params: {
          path: { symbol: apiSymbol },
          query: { tf, history },
        },
      });
      if (error) throw error;
      return data;
    },
    staleTime: OVERLAYS_POLL_MS / 2,
    refetchInterval: OVERLAYS_POLL_MS,
    refetchIntervalInBackground: false,
    enabled: !!symbol,
  });
}
