import type { Timeframe } from "@/lib/env";

/** Spot price from Binance (~15s). */
export const PRICE_POLL_MS = 15_000;

/** OHLCV incremental refresh while viewing charts. */
export function ohlcvPollMs(tf: Timeframe): number {
  switch (tf) {
    case "1h":
      return 30_000;
    case "4h":
      return 60_000;
    case "1D":
      return 120_000;
    case "1W":
      return 180_000;
    default:
      return 60_000;
  }
}

export const ANALYSIS_POLL_MS = 90_000;
export const RANKING_POLL_MS = 90_000;
export const OVERLAYS_POLL_MS = 90_000;
export const NEWS_POLL_MS = 5 * 60_000;

