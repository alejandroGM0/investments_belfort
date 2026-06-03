"""
Multi-timeframe trend analysis.

Returns trend direction (bullish/bearish/neutral) and strength (0–100)
for each requested timeframe, plus a consolidated summary.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

import numpy as np
import pandas as pd

from belfort.indicators import compute as ind

TrendDirection = Literal["bullish", "bearish", "neutral"]


@dataclass
class TrendResult:
    direction: TrendDirection
    strength: int  # 0–100
    sma_20_above: bool
    sma_50_above: bool
    sma_200_above: bool
    adx: float
    rsi: float


def analyze_single(df: pd.DataFrame) -> TrendResult:
    """Determine trend for a single timeframe DataFrame."""
    if len(df) < 20:
        return TrendResult("neutral", 0, False, False, False, 0.0, 50.0)

    c = df["close"]

    # --- Indicator values (last bar) ---
    sma20 = ind.sma(df, 20).iloc[-1]
    sma50 = ind.sma(df, 50).iloc[-1] if len(df) >= 50 else float("nan")
    sma200 = ind.sma(df, 200).iloc[-1] if len(df) >= 200 else float("nan")
    adx_val = float(ind.adx(df).iloc[-1] or 0)
    rsi_val = float(ind.rsi(df).iloc[-1] or 50)
    last_close = float(c.iloc[-1])

    above20 = last_close > sma20 if not np.isnan(sma20) else False
    above50 = last_close > sma50 if not np.isnan(sma50) else False
    above200 = last_close > sma200 if not np.isnan(sma200) else False

    # --- Higher highs / higher lows (last 20 bars) ---
    recent = df.tail(20)
    mid = len(recent) // 2
    first_half_high = float(recent["high"].iloc[:mid].max())
    second_half_high = float(recent["high"].iloc[mid:].max())
    first_half_low = float(recent["low"].iloc[:mid].min())
    second_half_low = float(recent["low"].iloc[mid:].min())

    hh = second_half_high > first_half_high
    hl = second_half_low > first_half_low
    ll = second_half_low < first_half_low
    lh = second_half_high < first_half_high

    bull_score = sum([above20, above50, above200, hh, hl, rsi_val > 50])
    bear_score = sum([not above20, not above50, not above200, ll, lh, rsi_val < 50])

    # ADX ≥ 25 means trending; weight accordingly
    trend_weight = min(adx_val / 25.0, 2.0)

    net = (bull_score - bear_score) * trend_weight
    strength = int(min(abs(net) / (6 * 2) * 100, 100))

    if net > 0.5:
        direction: TrendDirection = "bullish"
    elif net < -0.5:
        direction = "bearish"
    else:
        direction = "neutral"

    return TrendResult(
        direction=direction,
        strength=strength,
        sma_20_above=above20,
        sma_50_above=above50,
        sma_200_above=above200,
        adx=adx_val,
        rsi=rsi_val,
    )


def analyze_multi(
    dfs: dict[str, pd.DataFrame],
) -> dict[str, TrendResult]:
    """
    Analyse multiple timeframes.

    Parameters
    ----------
    dfs: mapping of tf_code -> OHLCV DataFrame
    """
    return {tf: analyze_single(df) for tf, df in dfs.items()}
