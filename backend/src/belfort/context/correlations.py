"""Price return correlations from cached OHLCV."""

from __future__ import annotations

import os

import pandas as pd

from belfort.data.loader import load
from belfort.symbols import display_symbol, normalize_symbol

_DEFAULT_PEERS = "ETHUSDT,BNBUSDT,SOLUSDT,XRPUSDT,ADAUSDT"


def _peer_symbols() -> list[str]:
    raw = os.getenv("BELFORT_CORRELATION_PEERS", _DEFAULT_PEERS)
    return [normalize_symbol(s) for s in raw.split(",") if s.strip()]


def compute_correlations(symbol: str, tf: str, limit: int = 120) -> list[dict]:
    """
    Pearson correlation of close-to-close returns vs peer symbols.
    Returns list sorted by |correlation| descending.
    """
    base = normalize_symbol(symbol)
    df_base = load(base, tf)
    if df_base is None or df_base.empty or len(df_base) < 20:
        return []

    base_tail = df_base.tail(limit).copy()
    ret_base = base_tail.set_index("time")["close"].astype(float).pct_change().dropna()

    results: list[dict] = []
    for peer in _peer_symbols():
        if peer == base:
            continue
        df_peer = load(peer, tf)
        if df_peer is None or df_peer.empty:
            continue
        peer_tail = df_peer.tail(limit).set_index("time")["close"].astype(float).pct_change().dropna()
        aligned = pd.concat([ret_base, peer_tail], axis=1, join="inner").dropna()
        if len(aligned) < 10:
            continue
        corr = float(aligned.iloc[:, 0].corr(aligned.iloc[:, 1]))
        if pd.isna(corr):
            continue
        results.append(
            {
                "asset": display_symbol(peer),
                "correlation": round(corr, 3),
            }
        )

    results.sort(key=lambda x: abs(x["correlation"]), reverse=True)
    return results
