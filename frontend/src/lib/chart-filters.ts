import type { components } from "@/api/types";

export type ChartPatternStatusFilter = components["schemas"]["ChartPatternStatusFilter"];
export type ChartPatternDirectionFilter = components["schemas"]["ChartPatternDirectionFilter"];

export type PatternCategory =
  | "candles"
  | "chart_patterns"
  | "trend"
  | "structure"
  | "indicators"
  | "levels";

export interface ChartDisplayFilters {
  minPatternConfidence: number;
  patternStatus: ChartPatternStatusFilter;
  patternDirection: ChartPatternDirectionFilter;
  patternCategories: PatternCategory[];
  maxMarkers: number;
  minLevelStrength: number;
  maxLevelsPerSide: number;
  minConfluence: number;
  projectionBars: number;
  showTradeSetup: boolean;
}

export const DEFAULT_CHART_FILTERS: ChartDisplayFilters = {
  minPatternConfidence: 0.35,
  patternStatus: "active_recent",
  patternDirection: "all",
  patternCategories: [],
  maxMarkers: 80,
  minLevelStrength: 0.25,
  maxLevelsPerSide: 5,
  minConfluence: 0,
  projectionBars: 16,
  showTradeSetup: true,
};

export const PATTERN_CATEGORY_OPTIONS: { value: PatternCategory; label: string }[] = [
  { value: "candles", label: "Velas" },
  { value: "chart_patterns", label: "Figuras" },
  { value: "trend", label: "Tendencia" },
  { value: "structure", label: "Estructura" },
  { value: "indicators", label: "Indicadores" },
  { value: "levels", label: "Niveles" },
];

export const PATTERN_STATUS_OPTIONS: { value: ChartPatternStatusFilter; label: string }[] = [
  { value: "highlight", label: "Solo destacados" },
  { value: "active", label: "Solo activos" },
  { value: "recent", label: "Solo recientes" },
  { value: "active_recent", label: "Activos + recientes" },
  { value: "all", label: "Todos (con confianza)" },
];

export function categoriesQuery(categories: PatternCategory[]): string | undefined {
  if (!categories.length) return undefined;
  return categories.join(",");
}
