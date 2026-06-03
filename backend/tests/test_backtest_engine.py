"""Tests: backtest engine produces valid metrics."""

from __future__ import annotations

import pandas as pd
import pytest

from belfort.backtest.engine import run_single
from belfort.indicators.compute import compute_all


def _all_buy_signal(df: pd.DataFrame) -> pd.Series:
    """Always-on entry signal for testing."""
    sig = pd.Series(0, index=df.index)
    sig.iloc[::10] = 1  # entry every 10 bars
    return sig


def test_metrics_keys_present(df_random):
    df_e = compute_all(df_random)
    signal = _all_buy_signal(df_e)
    params = {"sl_atr": 1.5, "tp_rr": 2.0, "filter_trend": "none",
              "filter_rsi": "none", "holding_bars_max": 20}
    result = run_single(df_e, signal, params)
    required = {"win_rate", "profit_factor", "sharpe", "max_drawdown", "total_trades", "avg_return"}
    assert required.issubset(result.keys())


def test_win_rate_in_range(df_random):
    df_e = compute_all(df_random)
    signal = _all_buy_signal(df_e)
    params = {"sl_atr": 1.5, "tp_rr": 2.0, "filter_trend": "none",
              "filter_rsi": "none", "holding_bars_max": 20}
    result = run_single(df_e, signal, params)
    assert 0.0 <= result["win_rate"] <= 1.0


def test_no_signal_returns_zero_trades(df_random):
    df_e = compute_all(df_random)
    signal = pd.Series(0, index=df_e.index)  # no signals
    params = {"sl_atr": 1.5, "tp_rr": 2.0, "filter_trend": "none",
              "filter_rsi": "none", "holding_bars_max": 20}
    result = run_single(df_e, signal, params)
    assert result["total_trades"] == 0


def test_sma200_filter_reduces_trades(df_bullish):
    df_e = compute_all(df_bullish)
    signal = _all_buy_signal(df_e)
    no_filter = {"sl_atr": 1.5, "tp_rr": 2.0, "filter_trend": "none",
                 "filter_rsi": "none", "holding_bars_max": 50}
    with_filter = {**no_filter, "filter_trend": "sma200"}
    r_nofilter = run_single(df_e, signal, no_filter)
    r_filter = run_single(df_e, signal, with_filter)
    # SMA200 filter can only reduce or maintain trades
    assert r_filter["total_trades"] <= r_nofilter["total_trades"]
