import { create } from "zustand";
import { persist } from "zustand/middleware";
import { type Timeframe, WATCHLIST_DEFAULT, env } from "@/lib/env";

export type HistoryDepth = "2y" | "5y" | "max";

interface AppState {
  symbol: string;
  timeframe: Timeframe;
  history: HistoryDepth;
  watchlist: string[];
  lastRefreshed: string | null;
  initJobIds: { dataJobId?: string; backtestJobId?: string } | null;
  setSymbol: (symbol: string) => void;
  setTimeframe: (tf: Timeframe) => void;
  setHistory: (h: HistoryDepth) => void;
  addToWatchlist: (symbol: string) => void;
  removeFromWatchlist: (symbol: string) => void;
  setLastRefreshed: (date: string) => void;
  setInitJobIds: (ids: { dataJobId?: string; backtestJobId?: string } | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      symbol: env.defaultSymbol,
      timeframe: env.defaultTimeframe,
      history: "5y",
      watchlist: WATCHLIST_DEFAULT,
      lastRefreshed: null,
      initJobIds: null,
      setSymbol: (symbol) => set({ symbol }),
      setTimeframe: (timeframe) => set({ timeframe }),
      setHistory: (history) => set({ history }),
      addToWatchlist: (symbol) =>
        set((s) => ({
          watchlist: s.watchlist.includes(symbol)
            ? s.watchlist
            : [...s.watchlist, symbol],
        })),
      removeFromWatchlist: (symbol) =>
        set((s) => ({ watchlist: s.watchlist.filter((w) => w !== symbol) })),
      setLastRefreshed: (date) => set({ lastRefreshed: date }),
      setInitJobIds: (initJobIds) => set({ initJobIds }),
    }),
    { name: "belfort-app-store" }
  )
);
