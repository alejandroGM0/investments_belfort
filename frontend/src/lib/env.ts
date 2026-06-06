export const env = {
  apiBase: process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000",
  defaultSymbol: process.env.NEXT_PUBLIC_DEFAULT_SYMBOL ?? "BTC",
  defaultTimeframe: (process.env.NEXT_PUBLIC_DEFAULT_TIMEFRAME ?? "4h") as Timeframe,
} as const;

export type SentimentWindow = "1h" | "4h" | "24h" | "7d";
export const SENTIMENT_WINDOWS: SentimentWindow[] = ["1h", "4h", "24h", "7d"];

export type Timeframe = "1h" | "4h" | "1D" | "1W";
export const TIMEFRAMES: Timeframe[] = ["1h", "4h", "1D", "1W"];

export const WATCHLIST_DEFAULT = ["BTC", "ETH"];
