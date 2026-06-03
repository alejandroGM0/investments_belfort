"""
Smart Money Concepts (SMC): Fair Value Gaps and Order Blocks.

Implements BOS/CHoCH are in structure.py; this module adds FVG and OB.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from belfort.patterns.registry import PatternSpec, register


# ---------------------------------------------------------------------------
# Fair Value Gap (FVG) — 3-bar imbalance
# ---------------------------------------------------------------------------
def _detect_fvg_bull(df: pd.DataFrame) -> pd.Series:
    """
    Bullish FVG: gap between bar[i-2].high and bar[i].low (price left unfilled above).
    Signals at bar i (the third bar of the trio).
    """
    sig = pd.Series(0, index=df.index)
    idx = df.index.tolist()
    for i in range(2, len(idx)):
        high_2 = df.loc[idx[i - 2], "high"]
        low_0 = df.loc[idx[i], "low"]
        if low_0 > high_2:  # gap exists (price jumped up)
            sig.loc[idx[i]] = 1
    return sig


def _detect_fvg_bear(df: pd.DataFrame) -> pd.Series:
    """
    Bearish FVG: gap between bar[i-2].low and bar[i].high (price left unfilled below).
    """
    sig = pd.Series(0, index=df.index)
    idx = df.index.tolist()
    for i in range(2, len(idx)):
        low_2 = df.loc[idx[i - 2], "low"]
        high_0 = df.loc[idx[i], "high"]
        if high_0 < low_2:
            sig.loc[idx[i]] = -1
    return sig


# ---------------------------------------------------------------------------
# Order Block (OB) — last bearish candle before bullish impulse (bullish OB)
# ---------------------------------------------------------------------------
def _detect_ob_bull(df: pd.DataFrame) -> pd.Series:
    """
    Bullish Order Block: last bearish candle before a strong up-move of ≥ 3 bars.
    """
    sig = pd.Series(0, index=df.index)
    closes = df["close"].to_numpy(float)
    opens = df["open"].to_numpy(float)
    idx = df.index.tolist()
    min_impulse = 3  # minimum consecutive higher closes

    for i in range(len(closes) - min_impulse - 1):
        # Check for impulse after bar i+1
        impulse = all(closes[i + j + 1] > closes[i + j] for j in range(1, min_impulse + 1))
        # Bar i is bearish (candle body goes down)
        if impulse and closes[i] < opens[i]:
            sig.loc[idx[i]] = 1
    return sig


def _detect_ob_bear(df: pd.DataFrame) -> pd.Series:
    """
    Bearish Order Block: last bullish candle before a strong down-move of ≥ 3 bars.
    """
    sig = pd.Series(0, index=df.index)
    closes = df["close"].to_numpy(float)
    opens = df["open"].to_numpy(float)
    idx = df.index.tolist()
    min_impulse = 3

    for i in range(len(closes) - min_impulse - 1):
        impulse = all(closes[i + j + 1] < closes[i + j] for j in range(1, min_impulse + 1))
        if impulse and closes[i] > opens[i]:
            sig.loc[idx[i]] = -1
    return sig


# ---------------------------------------------------------------------------
# Register
# ---------------------------------------------------------------------------
register(PatternSpec(
    id="smc_fvg_bull",
    name="Bullish Fair Value Gap",
    category="structure",
    detect=_detect_fvg_bull,
    backtestable=True,
    description="Three-candle upward imbalance leaving an unfilled gap above",
    tags=["smc", "fvg", "bullish"],
))

register(PatternSpec(
    id="smc_fvg_bear",
    name="Bearish Fair Value Gap",
    category="structure",
    detect=_detect_fvg_bear,
    backtestable=True,
    description="Three-candle downward imbalance leaving an unfilled gap below",
    tags=["smc", "fvg", "bearish"],
))

register(PatternSpec(
    id="smc_ob_bull",
    name="Bullish Order Block",
    category="structure",
    detect=_detect_ob_bull,
    backtestable=True,
    description="Last bearish candle before a bullish impulse — potential support zone",
    tags=["smc", "order_block", "bullish"],
))

register(PatternSpec(
    id="smc_ob_bear",
    name="Bearish Order Block",
    category="structure",
    detect=_detect_ob_bear,
    backtestable=True,
    description="Last bullish candle before a bearish impulse — potential resistance zone",
    tags=["smc", "order_block", "bearish"],
))
