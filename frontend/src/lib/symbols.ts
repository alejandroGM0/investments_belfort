/** Map UI symbol (BTC) to exchange pair (BTCUSDT) for the API. */
export function toApiSymbol(symbol: string): string {
  const s = symbol.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (s.endsWith("USDT") || s.endsWith("USD") || s.endsWith("BUSD")) return s;
  return `${s}USDT`;
}

/** Display label without quote suffix. */
export function toDisplaySymbol(symbol: string): string {
  const s = symbol.trim().toUpperCase();
  return s.replace(/USDT$|USD$|BUSD$/, "") || s;
}
