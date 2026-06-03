"""Symbol → keywords, subreddits, and external API slugs."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class SymbolConfig:
    symbol: str
    keywords: tuple[str, ...]
    subreddits: tuple[str, ...]
    lunarcrush_topic: str
    santiment_slug: str


_SYMBOLS: dict[str, SymbolConfig] = {
    "BTC": SymbolConfig(
        "BTC",
        ("bitcoin", "btc"),
        ("Bitcoin", "CryptoCurrency"),
        "bitcoin",
        "bitcoin",
    ),
    "ETH": SymbolConfig(
        "ETH",
        ("ethereum", "eth"),
        ("ethereum", "CryptoCurrency"),
        "ethereum",
        "ethereum",
    ),
    "SOL": SymbolConfig(
        "SOL",
        ("solana", "sol"),
        ("solana", "CryptoCurrency"),
        "solana",
        "solana",
    ),
    "BNB": SymbolConfig(
        "BNB",
        ("bnb", "binance coin"),
        ("binance", "CryptoCurrency"),
        "binance-coin",
        "binance-coin",
    ),
    "XRP": SymbolConfig(
        "XRP",
        ("xrp", "ripple"),
        ("Ripple", "CryptoCurrency"),
        "xrp",
        "ripple",
    ),
    "ADA": SymbolConfig(
        "ADA",
        ("cardano", "ada"),
        ("cardano", "CryptoCurrency"),
        "cardano",
        "cardano",
    ),
    "AVAX": SymbolConfig(
        "AVAX",
        ("avalanche", "avax"),
        ("Avax", "CryptoCurrency"),
        "avalanche",
        "avalanche",
    ),
    "DOT": SymbolConfig(
        "DOT",
        ("polkadot", "dot"),
        ("dot", "CryptoCurrency"),
        "polkadot",
        "polkadot-new",
    ),
    "MATIC": SymbolConfig(
        "MATIC",
        ("polygon", "matic"),
        ("maticnetwork", "CryptoCurrency"),
        "polygon",
        "polygon",
    ),
    "LINK": SymbolConfig(
        "LINK",
        ("chainlink", "link"),
        ("Chainlink", "CryptoCurrency"),
        "chainlink",
        "chainlink",
    ),
    "DOGE": SymbolConfig(
        "DOGE",
        ("dogecoin", "doge"),
        ("dogecoin", "CryptoCurrency"),
        "dogecoin",
        "dogecoin",
    ),
}


def get_symbol_config(symbol: str) -> SymbolConfig | None:
    key = symbol.upper().strip()
    if key in _SYMBOLS:
        return _SYMBOLS[key]
    return SymbolConfig(
        key,
        (key.lower(),),
        ("CryptoCurrency",),
        key.lower(),
        key.lower(),
    )


def known_symbols() -> list[str]:
    return list(_SYMBOLS.keys())
