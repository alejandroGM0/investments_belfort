"""Symbol normalization for API and CLI."""

from __future__ import annotations


def normalize_symbol(symbol: str) -> str:
    s = symbol.strip().upper().replace("/", "").replace("-", "")
    if s.endswith(("USDT", "USD", "BUSD")):
        return s
    return f"{s}USDT"


def display_symbol(symbol: str) -> str:
    s = symbol.strip().upper()
    for suffix in ("USDT", "BUSD", "USD"):
        if s.endswith(suffix) and len(s) > len(suffix):
            return s[: -len(suffix)]
    return s
