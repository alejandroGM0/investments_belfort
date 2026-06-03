import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_CHART_FILTERS,
  type ChartDisplayFilters,
  type PatternCategory,
} from "@/lib/chart-filters";

interface ChartFiltersState {
  filters: ChartDisplayFilters;
  panelOpen: boolean;
  setFilters: (f: Partial<ChartDisplayFilters>) => void;
  resetFilters: () => void;
  toggleCategory: (cat: PatternCategory) => void;
  setPanelOpen: (open: boolean) => void;
}

export const useChartFiltersStore = create<ChartFiltersState>()(
  persist(
    (set) => ({
      filters: DEFAULT_CHART_FILTERS,
      panelOpen: true,
      setFilters: (partial) =>
        set((s) => ({ filters: { ...s.filters, ...partial } })),
      resetFilters: () => set({ filters: DEFAULT_CHART_FILTERS }),
      toggleCategory: (cat) =>
        set((s) => {
          const has = s.filters.patternCategories.includes(cat);
          const patternCategories = has
            ? s.filters.patternCategories.filter((c) => c !== cat)
            : [...s.filters.patternCategories, cat];
          return { filters: { ...s.filters, patternCategories } };
        }),
      setPanelOpen: (panelOpen) => set({ panelOpen }),
    }),
    { name: "belfort-chart-filters" }
  )
);
