import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
      // Auto-refresh analysis/ohlcv every 15 minutes when tab is active
      refetchInterval: 15 * 60_000,
      refetchIntervalInBackground: false,
    },
  },
});
