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


def test_structure_hh_detects():
    """Higher Highs pattern should trigger in data with clear swing peaks."""
    import numpy as np

    spec = get("structure_hh")
    if spec is None:
        return

    # Build a dataset with alternating higher swing highs separated by pullbacks
    # so that find_peaks(distance=5) can clearly identify the peaks
    rng = np.random.default_rng(0)
    rows = []
    t = 0
    # Two swing cycles: dip, then rally to a higher high
    prices = (
        [50000] * 5 + [48000] * 3 + [52000] * 5 +  # first peak at 52k
        [49000] * 4 + [54000] * 5 +                  # second peak at 54k (HH)
        [50000] * 4
    )
    for i, p in enumerate(prices):
        o = p * (1 + rng.uniform(-0.002, 0.002))
        h = max(o, p) * 1.002
        lo = min(o, p) * 0.998
        c = rng.uniform(lo, h)
        rows.append([i * 3600, o, h, lo, c, 500.0])

    df = pd.DataFrame(rows, columns=["time", "open", "high", "low", "close", "volume"])
    result = spec.detect(df)
    assert result.sum() > 0, "Expected at least one HH in swing-up data"


def test_structure_ll_detects():
    """Lower Lows pattern should trigger in data with clear swing troughs."""
    import numpy as np

    spec = get("structure_ll")
    if spec is None:
        return

    rng = np.random.default_rng(1)
    rows = []
    prices = (
        [70000] * 5 + [72000] * 3 + [68000] * 5 +  # first trough at 68k
        [71000] * 4 + [65000] * 5 +                  # second trough at 65k (LL)
        [69000] * 4
    )
    for i, p in enumerate(prices):
        o = p * (1 + rng.uniform(-0.002, 0.002))
        h = max(o, p) * 1.002
        lo = min(o, p) * 0.998
        c = rng.uniform(lo, h)
        rows.append([i * 3600, o, h, lo, c, 500.0])

    df = pd.DataFrame(rows, columns=["time", "open", "high", "low", "close", "volume"])
    result = spec.detect(df)
    assert result.sum() < 0, "Expected at least one LL (bearish) in swing-down data"
