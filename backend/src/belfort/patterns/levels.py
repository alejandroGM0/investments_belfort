"""
Support / Resistance level detection using DBSCAN clustering of pivot prices.

Registers two indicator-style patterns:
  - levels_near_support  (+1 when close is within 0.5 ATR of a support cluster)
  - levels_near_resistance (-1 when close is within 0.5 ATR of a resistance cluster)
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from scipy.signal import argrelextrema

from belfort.patterns.registry import PatternSpec, register


def detect_levels(
    df: pd.DataFrame,
    threshold_pct: float = 0.015,
    window: int = 15,
    min_touches: int = 1,
    return_strengths: bool = False,
) -> dict:
    """
    Return {'support': [price, ...], 'resistance': [price, ...]} clusters.
    If return_strengths is True, lists will contain (price, strength) tuples.
    Uses pivot detection (highest/lowest in 'window') + centroid clustering.
    """
    if len(df) < window * 2 + 1:
        return {"support": [], "resistance": []}

    def _get_levels(is_support: bool) -> list:
        prices = df["low" if is_support else "high"].to_numpy(float)
        
        # 1. Strict pivot detection using scipy's fast C-level argrelextrema
        if is_support:
            idx = argrelextrema(prices, np.less, order=window)[0]
        else:
            idx = argrelextrema(prices, np.greater, order=window)[0]
            
        pivots = prices[idx]
        if len(pivots) == 0:
            return []
            
        pivots_arr = np.sort(np.array(pivots))
        
        # 2. DBSCAN clustering on log prices
        from sklearn.cluster import DBSCAN
        
        log_pivots = np.log(pivots_arr).reshape(-1, 1)
        db = DBSCAN(eps=threshold_pct, min_samples=min_touches)
        labels = db.fit_predict(log_pivots)
        
        clusters = []
        for label in set(labels):
            if label == -1:
                continue
            clusters.append(pivots_arr[labels == label])
        
        # 3. Format output
        results_with_strength = []
        for c in clusters:
            touches = len(c)
            if touches < min_touches:
                continue
                
            c_price = float(np.mean(c))
            # Strength mapping: 1 touch = 0.3, 2 = 0.5, 3 = 0.7, 4+ = 1.0
            if touches == 1:
                strength = 0.3
            elif touches == 2:
                strength = 0.5
            elif touches == 3:
                strength = 0.7
            else:
                strength = 1.0
                
            results_with_strength.append((c_price, float(strength)))
            
        results_with_strength.sort(key=lambda x: x[0])
        
        if return_strengths:
            return results_with_strength
        else:
            return [p for p, _ in results_with_strength]

    return {
        "support": _get_levels(is_support=True),
        "resistance": _get_levels(is_support=False),
    }


def _near_support(df: pd.DataFrame) -> pd.Series:
    if len(df) < 30:
        return pd.Series(0, index=df.index)
        
    levels = detect_levels(df)
    supports = levels["support"]
    if not supports:
        return pd.Series(0, index=df.index)
        
    # ATR approximation
    atr_val = (df["high"] - df["low"]).rolling(14).mean().fillna(0).to_numpy()
    close_val = df["close"].to_numpy()
    threshold = 0.5 * atr_val
    
    mask = np.zeros(len(df), dtype=bool)
    for s in supports:
        mask |= (np.abs(close_val - s) <= threshold)
        
    sig = pd.Series(0, index=df.index)
    sig.iloc[mask] = 1
    return sig


def _near_resistance(df: pd.DataFrame) -> pd.Series:
    if len(df) < 30:
        return pd.Series(0, index=df.index)
        
    levels = detect_levels(df)
    resistances = levels["resistance"]
    if not resistances:
        return pd.Series(0, index=df.index)
        
    atr_val = (df["high"] - df["low"]).rolling(14).mean().fillna(0).to_numpy()
    close_val = df["close"].to_numpy()
    threshold = 0.5 * atr_val
    
    mask = np.zeros(len(df), dtype=bool)
    for r in resistances:
        mask |= (np.abs(close_val - r) <= threshold)
        
    sig = pd.Series(0, index=df.index)
    sig.iloc[mask] = -1
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
