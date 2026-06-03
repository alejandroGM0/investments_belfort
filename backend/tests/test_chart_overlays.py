"""Tests for chart projection and overlays endpoint."""

from __future__ import annotations

import pandas as pd
import pytest

from belfort.chart_overlays import build_ema_series, build_projection


def _sample_df(n: int = 60) -> pd.DataFrame:
    base = 1_700_000_000
    rows = []
    price = 100.0
    for i in range(n):
        price += 0.2 if i % 3 else -0.1
        rows.append({
            "time": base + i * 14_400,
            "open": price - 0.1,
            "high": price + 0.5,
            "low": price - 0.5,
            "close": price,
            "volume": 1000.0,
        })
    return pd.DataFrame(rows)


def test_build_projection_bullish_has_future_candles():
    df = _sample_df()
    out = build_projection(df, "4h", "bullish", None, bars=8)
    assert out["bars"] == 8
    assert len(out["candles"]) == 8
    assert len(out["path"]) == 8
    last_hist = int(df["time"].iloc[-1])
    assert out["candles"][0]["time"] > last_hist
    assert out["direction"] == "bullish"


def test_build_projection_uses_trade_setup_target():
    from belfort.analysis import TradeSetup

    df = _sample_df()
    setup = TradeSetup(
        entry=100.0,
        stop_loss=95.0,
        take_profit=120.0,
        risk_reward=4.0,
        direction="bullish",
    )
    out = build_projection(df, "4h", "neutral", setup, bars=10)
    assert out["target_price"] == 120.0
    assert out["candles"][-1]["close"] == pytest.approx(120.0, rel=1e-4)


def test_build_ema_series():
    df = _sample_df(40)
    series = build_ema_series(df, (20,))
    assert len(series) == 1
    assert series[0]["period"] == 20
    assert len(series[0]["points"]) == 40


def test_filter_levels_top_per_side():
    from belfort.analysis import Level
    from belfort.chart_filters import filter_levels

    levels = [
        Level(price=90, level_type="support", strength=0.9),
        Level(price=88, level_type="support", strength=0.4),
        Level(price=110, level_type="resistance", strength=0.8),
        Level(price=115, level_type="resistance", strength=0.2),
    ]
    out = filter_levels(levels, min_strength=0.35, max_per_type=1)
    assert len(out) == 2
    assert out[0].price == 90
    assert out[1].price == 110
