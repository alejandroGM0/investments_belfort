import { create } from "zustand";
import { persist } from "zustand/middleware";
import { type Timeframe, WATCHLIST_DEFAULT, env } from "@/lib/env";

interface AppState {
  symbol: string;
  timeframe: Timeframe;
  watchlist: string[];
  lastRefreshed: string | null;
  setSymbol: (symbol: string) => void;
  setTimeframe: (tf: Timeframe) => void;
  addToWatchlist: (symbol: string) => void;
  removeFromWatchlist: (symbol: string) => void;
  setLastRefreshed: (date: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      symbol: env.defaultSymbol,
      timeframe: env.defaultTimeframe,
      watchlist: WATCHLIST_DEFAULT,
      lastRefreshed: null,
      setSymbol: (symbol) => set({ symbol }),
      setTimeframe: (timeframe) => set({ timeframe }),
      addToWatchlist: (symbol) =>
        set((s) => ({
          watchlist: s.watchlist.includes(symbol)
            ? s.watchlist
            : [...s.watchlist, symbol],
        })),
      removeFromWatchlist: (symbol) =>
        set((s) => ({ watchlist: s.watchlist.filter((w) => w !== symbol) })),
      setLastRefreshed: (date) => set({ lastRefreshed: date }),
    }),
    { name: "belfort-app-store" }
  )
);
