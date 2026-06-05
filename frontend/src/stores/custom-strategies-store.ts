import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  type CustomStrategy,
  strategyFromTradeSetup,
  strategyFromBacktestSelection,
} from "@/lib/custom-strategies";
import type { components } from "@/api/types";

type TradeSetup = components["schemas"]["TradeSetup"];

function newId() {
  return `strat_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

interface CustomStrategiesState {
  strategies: CustomStrategy[];
  activeStrategyId: string | null;
  addStrategy: (draft: Omit<CustomStrategy, "id" | "createdAt">) => string;
  updateStrategy: (id: string, patch: Partial<CustomStrategy>) => void;
  removeStrategy: (id: string) => void;
  setActiveStrategy: (id: string | null) => void;
  addFromRecommendedSetup: (setup: TradeSetup, symbol: string, activate?: boolean) => string;
  addFromBacktest: (
    selection: Parameters<typeof strategyFromBacktestSelection>[0],
    symbol: string,
    activate?: boolean
  ) => string;
  getActiveStrategy: () => CustomStrategy | null;
}

export const useCustomStrategiesStore = create<CustomStrategiesState>()(
  persist(
    (set, get) => ({
      strategies: [],
      activeStrategyId: null,

      addStrategy: (draft) => {
        const id = newId();
        const strategy: CustomStrategy = {
          ...draft,
          id,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ strategies: [strategy, ...s.strategies] }));
        return id;
      },

      updateStrategy: (id, patch) =>
        set((s) => ({
          strategies: s.strategies.map((st) =>
            st.id === id
              ? { ...st, ...patch, id: st.id, createdAt: st.createdAt }
              : st
          ),
        })),

      removeStrategy: (id) =>
        set((s) => ({
          strategies: s.strategies.filter((st) => st.id !== id),
          activeStrategyId: s.activeStrategyId === id ? null : s.activeStrategyId,
        })),

      setActiveStrategy: (id) => set({ activeStrategyId: id }),

      addFromRecommendedSetup: (setup, symbol, activate = true) => {
        const existing = get().strategies.find(
          (s) =>
            s.kind === "setup" &&
            s.symbol === symbol &&
            s.name === "Setup recomendado" &&
            s.entry === setup.entry
        );
        if (existing) {
          if (activate) set({ activeStrategyId: existing.id });
          return existing.id;
        }
        const id = get().addStrategy(strategyFromTradeSetup(setup, symbol));
        if (activate) set({ activeStrategyId: id });
        return id;
      },

      addFromBacktest: (selection, symbol, activate = false) => {
        const id = get().addStrategy(strategyFromBacktestSelection(selection, symbol));
        if (activate) set({ activeStrategyId: id });
        return id;
      },

      getActiveStrategy: () => {
        const { strategies, activeStrategyId } = get();
        if (!activeStrategyId) return null;
        return strategies.find((s) => s.id === activeStrategyId) ?? null;
      },
    }),
    { name: "belfort-custom-strategies" }
  )
);
