"""Symbol → NewsAPI search query and legacy CryptoPanic currency."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class SymbolConfig:
    symbol: str
    currency: str
    search_query: str


_SYMBOLS: dict[str, SymbolConfig] = {
    "BTC": SymbolConfig("BTC", "BTC", "bitcoin OR BTC"),
    "ETH": SymbolConfig("ETH", "ETH", "ethereum OR ETH"),
    "SOL": SymbolConfig("SOL", "SOL", "solana OR SOL"),
    "BNB": SymbolConfig("BNB", "BNB", "binance coin OR BNB"),
    "XRP": SymbolConfig("XRP", "XRP", "ripple OR XRP"),
    "ADA": SymbolConfig("ADA", "ADA", "cardano OR ADA"),
    "AVAX": SymbolConfig("AVAX", "AVAX", "avalanche OR AVAX"),
    "DOT": SymbolConfig("DOT", "DOT", "polkadot OR DOT"),
    "MATIC": SymbolConfig("MATIC", "MATIC", "polygon OR MATIC"),
    "LINK": SymbolConfig("LINK", "LINK", "chainlink OR LINK"),
    "DOGE": SymbolConfig("DOGE", "DOGE", "dogecoin OR DOGE"),
    "ATOM": SymbolConfig("ATOM", "ATOM", "cosmos OR ATOM"),
    "ARB": SymbolConfig("ARB", "ARB", "arbitrum OR ARB"),
    "OP": SymbolConfig("OP", "OP", "optimism OR OP"),
    "INJ": SymbolConfig("INJ", "INJ", "injective OR INJ"),
    "TIA": SymbolConfig("TIA", "TIA", "celestia OR TIA"),
}


def get_symbol_config(symbol: str) -> SymbolConfig | None:
    key = symbol.upper().strip()
    if key in _SYMBOLS:
        return _SYMBOLS[key]
    if len(key) <= 10 and key.isalnum():
        return SymbolConfig(key, key, key)
    return None
