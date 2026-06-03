"""
Support / Resistance level detection using DBSCAN clustering of pivot prices.

Registers two indicator-style patterns:
  - levels_near_support  (+1 when close is within 0.5 ATR of a support cluster)
  - levels_near_resistance (-1 when close is within 0.5 ATR of a resistance cluster)
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from scipy.signal import find_peaks  # type: ignore[import]
from sklearn.cluster import DBSCAN  # type: ignore[import]

from belfort.patterns.registry import PatternSpec, register


def detect_levels(df: pd.DataFrame, eps_pct: float = 0.015, min_samples: int = 2) -> dict:
    """
    Return {'support': [price, ...], 'resistance': [price, ...]} clusters.
    eps_pct: DBSCAN epsilon as fraction of current price.
    """
    if len(df) < 20:
        return {"support": [], "resistance": []}

    highs = df["high"].to_numpy(float)
    lows = df["low"].to_numpy(float)
    price = float(df["close"].iloc[-1])

    peak_idx, _ = find_peaks(highs, distance=5)
    trough_idx, _ = find_peaks(-lows, distance=5)

    resistance_prices = highs[peak_idx]
    support_prices = lows[trough_idx]

    def _cluster(prices: np.ndarray) -> list[float]:
        if len(prices) < min_samples:
            return prices.tolist()
        eps = price * eps_pct
        db = DBSCAN(eps=eps, min_samples=min_samples).fit(prices.reshape(-1, 1))
        labels = db.labels_
        centroids = []
        for label in set(labels):
            if label == -1:
                continue
            centroids.append(float(prices[labels == label].mean()))
        # Include noise points as individual levels
        noise = prices[labels == -1]
        centroids.extend(noise.tolist())
        return sorted(centroids)

    return {
        "support": _cluster(support_prices),
        "resistance": _cluster(resistance_prices),
    }


def _near_support(df: pd.DataFrame) -> pd.Series:
    sig = pd.Series(0, index=df.index)
    if len(df) < 30:
        return sig
    levels = detect_levels(df)
    supports = levels["support"]
    if not supports:
        return sig
    # ATR approximation
    atr_val = (df["high"] - df["low"]).rolling(14).mean().fillna(0)
    for i in df.index:
        c = df.loc[i, "close"]
        a = atr_val.loc[i]
        if any(abs(c - s) <= 0.5 * a for s in supports):
            sig.loc[i] = 1
    return sig


def _near_resistance(df: pd.DataFrame) -> pd.Series:
    sig = pd.Series(0, index=df.index)
    if len(df) < 30:
        return sig
    levels = detect_levels(df)
    resistances = levels["resistance"]
    if not resistances:
        return sig
    atr_val = (df["high"] - df["low"]).rolling(14).mean().fillna(0)
    for i in df.index:
        c = df.loc[i, "close"]
        a = atr_val.loc[i]
        if any(abs(c - r) <= 0.5 * a for r in resistances):
            sig.loc[i] = -1
    return sig


register(PatternSpec(
    id="levels_near_support",
    name="Price Near Support",
    category="levels",
    detect=_near_support,
    backtestable=True,
    description="Close is within 0.5×ATR of a clustered support level",
    tags=["levels", "support"],
))

register(PatternSpec(
    id="levels_near_resistance",
    name="Price Near Resistance",
    category="levels",
    detect=_near_resistance,
    backtestable=True,
    description="Close is within 0.5×ATR of a clustered resistance level",
    tags=["levels", "resistance"],
))
