"""Symbol → CryptoPanic currency code."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class SymbolConfig:
    symbol: str
    currency: str


_SYMBOLS: dict[str, SymbolConfig] = {
    "BTC": SymbolConfig("BTC", "BTC"),
    "ETH": SymbolConfig("ETH", "ETH"),
    "SOL": SymbolConfig("SOL", "SOL"),
    "BNB": SymbolConfig("BNB", "BNB"),
    "XRP": SymbolConfig("XRP", "XRP"),
    "ADA": SymbolConfig("ADA", "ADA"),
    "AVAX": SymbolConfig("AVAX", "AVAX"),
    "DOT": SymbolConfig("DOT", "DOT"),
    "MATIC": SymbolConfig("MATIC", "MATIC"),
    "LINK": SymbolConfig("LINK", "LINK"),
    "DOGE": SymbolConfig("DOGE", "DOGE"),
    "ATOM": SymbolConfig("ATOM", "ATOM"),
    "ARB": SymbolConfig("ARB", "ARB"),
    "OP": SymbolConfig("OP", "OP"),
    "INJ": SymbolConfig("INJ", "INJ"),
    "TIA": SymbolConfig("TIA", "TIA"),
}


def get_symbol_config(symbol: str) -> SymbolConfig | None:
    key = symbol.upper().strip()
    if key in _SYMBOLS:
        return _SYMBOLS[key]
    if len(key) <= 10 and key.isalnum():
        return SymbolConfig(key, key)
    return None
