"""
Market structure patterns: Higher Highs / Higher Lows, BOS, CHoCH
detected using scipy peak-finding on close prices.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from scipy.signal import find_peaks  # type: ignore[import]

from belfort.patterns.registry import PatternSpec, register

_WINDOW = 5  # bars each side for pivot detection


def _pivots(df: pd.DataFrame, distance: int = _WINDOW):
    highs = df["high"].to_numpy(float)
    lows = df["low"].to_numpy(float)
    peak_idx, _ = find_peaks(highs, distance=distance)
    trough_idx, _ = find_peaks(-lows, distance=distance)
    return peak_idx, trough_idx


# --------------------------------------------------------------------------
# Higher High (bullish structure)
# --------------------------------------------------------------------------
def _detect_hh(df: pd.DataFrame) -> pd.Series:
    sig = pd.Series(0, index=df.index)
    peaks, _ = _pivots(df)
    for i in range(1, len(peaks)):
        if df["high"].iloc[peaks[i]] > df["high"].iloc[peaks[i - 1]]:
            sig.iloc[peaks[i]] = 1
    return sig


# --------------------------------------------------------------------------
# Lower Low (bearish structure)
# --------------------------------------------------------------------------
def _detect_ll(df: pd.DataFrame) -> pd.Series:
    sig = pd.Series(0, index=df.index)
    _, troughs = _pivots(df)
    for i in range(1, len(troughs)):
        if df["low"].iloc[troughs[i]] < df["low"].iloc[troughs[i - 1]]:
            sig.iloc[troughs[i]] = -1
    return sig


# --------------------------------------------------------------------------
# Break of Structure (BOS) — close beyond last swing high/low
# --------------------------------------------------------------------------
def _detect_bos(df: pd.DataFrame) -> pd.Series:
    """
    BOS bullish (+1): close crosses above the previous swing high.
    BOS bearish (-1): close crosses below the previous swing low.
    """
    sig = pd.Series(0, index=df.index)
    peaks, troughs = _pivots(df)
    closes = df["close"].to_numpy(float)

    for i, idx in enumerate(peaks):
        if idx + 1 >= len(closes):
            continue
        swing_high = df["high"].iloc[idx]
        for j in range(idx + 1, len(closes)):
            if closes[j] > swing_high:
                sig.iloc[j] = 1
                break

    for i, idx in enumerate(troughs):
        if idx + 1 >= len(closes):
            continue
        swing_low = df["low"].iloc[idx]
        for j in range(idx + 1, len(closes)):
            if closes[j] < swing_low:
                sig.iloc[j] = -1
                break

    return sig


# --------------------------------------------------------------------------
# Change of Character (CHoCH) — BOS that invalidates prior trend direction
# --------------------------------------------------------------------------
def _detect_choch(df: pd.DataFrame) -> pd.Series:
    """
    Simplified: bullish CHoCH when price was making LLs then breaks a swing high.
    """
    sig = pd.Series(0, index=df.index)
    peaks, troughs = _pivots(df)
    closes = df["close"].to_numpy(float)

    for i in range(1, len(troughs)):
        if troughs[i] > troughs[i - 1] and df["low"].iloc[troughs[i]] < df["low"].iloc[troughs[i - 1]]:
            # was bearish (LL); look for break above last swing high
            last_peak = peaks[peaks < troughs[i - 1]]
            if len(last_peak) == 0:
                continue
            swing_high = df["high"].iloc[last_peak[-1]]
            for j in range(troughs[i] + 1, len(closes)):
                if closes[j] > swing_high:
                    sig.iloc[j] = 1
                    break

    return sig


# --------------------------------------------------------------------------
# Register
# --------------------------------------------------------------------------
register(PatternSpec(
    id="structure_hh",
    name="Higher High",
    category="structure",
    detect=_detect_hh,
    backtestable=True,
    description="Price makes a Higher High vs previous swing peak",
    tags=["structure", "bullish"],
))

register(PatternSpec(
    id="structure_ll",
    name="Lower Low",
    category="structure",
    detect=_detect_ll,
    backtestable=True,
    description="Price makes a Lower Low vs previous swing trough",
    tags=["structure", "bearish"],
))

register(PatternSpec(
    id="structure_bos",
    name="Break of Structure (BOS)",
    category="structure",
    detect=_detect_bos,
    backtestable=True,
    description="Close breaks through the most recent swing high/low",
    tags=["structure", "bos"],
))

register(PatternSpec(
    id="structure_choch",
    name="Change of Character (CHoCH)",
    category="structure",
    detect=_detect_choch,
    backtestable=True,
    description="Potential trend reversal: prior bearish structure broken upward",
    tags=["structure", "choch", "reversal"],
))
