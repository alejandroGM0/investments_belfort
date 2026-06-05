import type { components } from "@/api/types";

export type TradeSetup = components["schemas"]["TradeSetup"];
export type TrendDirection = components["schemas"]["TrendDirection"];

export type CustomStrategyKind = "setup" | "backtest";

export interface BacktestParamsPreset {
  sl_atr?: number;
  tp_rr?: number;
  filter_trend?: string;
  filter_trend_label?: string;
  filter_rsi?: string;
  filter_rsi_label?: string;
  holding_bars_max?: number | null;
}

export interface CustomStrategy {
  id: string;
  name: string;
  kind: CustomStrategyKind;
  createdAt: string;
  symbol?: string;
  direction?: TrendDirection;
  entry?: number;
  stop_loss?: number;
  take_profit?: number;
  risk_reward?: number;
  pattern_id?: string;
  pattern_name?: string;
  pattern_category?: string;
  params?: BacktestParamsPreset;
  notes?: string;
}

export function strategyFromTradeSetup(
  setup: TradeSetup,
  symbol: string,
  name = "Setup recomendado"
): Omit<CustomStrategy, "id" | "createdAt"> {
  return {
    name,
    kind: "setup",
    symbol,
    direction: setup.direction,
    entry: setup.entry,
    stop_loss: setup.stop_loss,
    take_profit: setup.take_profit,
    risk_reward: setup.risk_reward,
    notes: "Generado desde análisis en vivo (ATR + tendencia)",
  };
}

export function strategyFromBacktestSelection(
  selection: {
    pattern_id: string;
    pattern_name?: string;
    pattern_category?: string | null;
    params?: Record<string, unknown>;
  },
  symbol: string,
  name?: string
): Omit<CustomStrategy, "id" | "createdAt"> {
  const params = selection.params as BacktestParamsPreset | undefined;
  return {
    name: name ?? selection.pattern_name ?? selection.pattern_id,
    kind: "backtest",
    symbol,
    pattern_id: selection.pattern_id,
    pattern_name: selection.pattern_name,
    pattern_category: selection.pattern_category ?? undefined,
    params,
    notes: "Basada en mejor combo del grid de backtest",
  };
}

export function customStrategyToTradeSetup(s: CustomStrategy): TradeSetup | null {
  if (s.kind !== "setup" || s.entry == null) return null;
  return {
    entry: s.entry,
    stop_loss: s.stop_loss,
    take_profit: s.take_profit,
    risk_reward: s.risk_reward,
    direction: s.direction,
  };
}
