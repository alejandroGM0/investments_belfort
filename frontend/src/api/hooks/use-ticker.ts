"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { api } from "@/api/client";
import { PRICE_POLL_MS } from "@/lib/live-polling";
import { toApiSymbol } from "@/lib/symbols";
import { useAppStore } from "@/stores/app-store";

export function useTicker(symbol: string, enabled = true) {
  const apiSymbol = toApiSymbol(symbol);
  const setLastRefreshed = useAppStore((s) => s.setLastRefreshed);

  const query = useQuery({
    queryKey: ["ticker", apiSymbol],
    queryFn: async () => {
      const { data, error } = await api.GET("/ticker/{symbol}", {
        params: { path: { symbol: apiSymbol } },
      });
      if (error) throw error;
      return data;
    },
    staleTime: PRICE_POLL_MS / 2,
    refetchInterval: PRICE_POLL_MS,
    refetchIntervalInBackground: false,
    enabled: !!symbol && enabled,
  });

  useEffect(() => {
    if (query.data?.updated_at) {
      setLastRefreshed(query.data.updated_at);
    }
  }, [query.data?.updated_at, setLastRefreshed]);

  return query;
}

export function useTickers(symbols: string[], enabled = true) {
  const apiSymbols = symbols.map(toApiSymbol);
  const key = apiSymbols.join(",");

  return useQuery({
    queryKey: ["tickers", key],
    queryFn: async () => {
      const { data, error } = await api.GET("/tickers", {
        params: { query: { symbols: key } },
      });
      if (error) throw error;
      return data;
    },
    staleTime: PRICE_POLL_MS / 2,
    refetchInterval: PRICE_POLL_MS,
    refetchIntervalInBackground: false,
    enabled: apiSymbols.length > 0 && enabled,
  });
}
