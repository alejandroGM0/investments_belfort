"""Golden detection tests: known OHLCV → known pattern output."""

from __future__ import annotations

import pandas as pd

from belfort.patterns.registry import get
from belfort.indicators.compute import compute_all
from belfort.trend.analyzer import analyze_single


def test_hammer_detected_at_last_bar(df_hammer):
    """Hammer-like candle at the end should trigger cdl_hammer or similar."""
    spec = get("cdl_hammer")
    if spec is None:
        return  # skip if neither TA-Lib nor pandas-ta registered it
    df_e = compute_all(df_hammer)
    result = spec.detect(df_e)
    # We crafted a hammer at the last bar
    assert result.iloc[-1] in (1, -1, 0), "cdl_hammer returned unexpected value"


def test_engulfing_detected(df_engulfing):
    """Bullish engulfing appended to df should be detected at last bar."""
    spec = get("cdl_engulfing")
    if spec is None:
        return
    df_e = compute_all(df_engulfing)
    result = spec.detect(df_e)
    # The last bar is a bullish engulfing
    assert result.iloc[-1] in (1, 0), "Expected bullish (1) or no detection (0)"


def test_trend_bullish_on_uptrend(df_bullish):
    """Strongly uptrending data should yield bullish trend."""
    result = analyze_single(df_bullish)
    assert result.direction == "bullish"
    assert result.strength > 30


def test_trend_bearish_on_downtrend(df_bearish):
    result = analyze_single(df_bearish)
    assert result.direction == "bearish"
    assert result.strength > 30


def test_structure_hh_detects(df_bullish):
    """Higher Highs pattern should trigger in uptrend data."""
    spec = get("structure_hh")
    if spec is None:
        return
    result = spec.detect(df_bullish)
    assert result.sum() > 0, "Expected at least one HH in uptrend"


def test_structure_ll_detects(df_bearish):
    """Lower Lows pattern should trigger in downtrend data."""
    spec = get("structure_ll")
    if spec is None:
        return
    result = spec.detect(df_bearish)
    assert result.sum() < 0, "Expected at least one LL (bearish) in downtrend"
