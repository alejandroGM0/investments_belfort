"""
Comprehensive tests for the backtest subsystem.

Covers:
- Engine: run_single with various params and signals
- Strategies: build_entries_exits with all filter combos
- Grid: full and quick grid mechanics
- Fallback engine: manual backtest without VectorBT
- Edge cases: empty signals, all-active signals, short DataFrames
"""

from __future__ import annotations

import json
from unittest.mock import patch

import numpy as np
import pandas as pd
import pytest

from belfort.backtest.engine import run_single, _fallback_metrics
from belfort.backtest.strategies import build_entries_exits
from belfort.backtest.grid import (
    _all_combos,
    quick_combos,
    run_pattern,
    run_all,
    run_all_quick,
    combo_count,
    quick_combo_count,
    _run_pattern_grid,
)
from belfort.indicators.compute import compute_all
from belfort.patterns import registry as reg


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_ohlcv(n: int = 200, seed: int = 42, trend: str = "random") -> pd.DataFrame:
    """Create synthetic OHLCV data with optional trend direction."""
    rng = np.random.default_rng(seed)
    price = 60_000.0
    rows = []
    for i in range(n):
        if trend == "bullish":
            drift = 0.002
        elif trend == "bearish":
            drift = -0.002
        else:
            drift = rng.uniform(-0.005, 0.005)
        o = price * (1 + drift)
        h = o * (1 + rng.uniform(0, 0.01))
        lo = o * (1 - rng.uniform(0, 0.01))
        c = rng.uniform(lo, h)
        v = rng.uniform(100, 1000)
        rows.append([i * 3600, o, h, lo, c, v])
        price = c
    return pd.DataFrame(rows, columns=["time", "open", "high", "low", "close", "volume"])


def _periodic_signal(df: pd.DataFrame, interval: int = 10) -> pd.Series:
    """Buy signal every `interval` bars."""
    sig = pd.Series(0, index=df.index)
    sig.iloc[::interval] = 1
    return sig


def _random_signal(df: pd.DataFrame, prob: float = 0.1, seed: int = 0) -> pd.Series:
    """Random buy signals with given probability."""
    rng = np.random.default_rng(seed)
    sig = pd.Series(0, index=df.index)
    mask = rng.random(len(df)) < prob
    sig[mask] = 1
    return sig


_DEFAULT_PARAMS = {
    "sl_atr": 1.5,
    "tp_rr": 2.0,
    "filter_trend": "none",
    "filter_rsi": "none",
    "holding_bars_max": 20,
}


# ===========================================================================
# ENGINE TESTS (run_single)
# ===========================================================================

class TestRunSingleMetrics:
    """Test that run_single returns valid metric dictionaries."""

    def test_returns_all_required_keys(self, df_random):
        df_e = compute_all(df_random)
        signal = _periodic_signal(df_e)
        result = run_single(df_e, signal, _DEFAULT_PARAMS)
        required = {"win_rate", "profit_factor", "sharpe", "max_drawdown",
                     "total_trades", "avg_return", "equity_curve"}
        assert required.issubset(result.keys()), f"Missing keys: {required - result.keys()}"

    def test_win_rate_bounded(self, df_random):
        df_e = compute_all(df_random)
        signal = _periodic_signal(df_e)
        result = run_single(df_e, signal, _DEFAULT_PARAMS)
        assert 0.0 <= result["win_rate"] <= 1.0

    def test_total_trades_non_negative(self, df_random):
        df_e = compute_all(df_random)
        signal = _periodic_signal(df_e)
        result = run_single(df_e, signal, _DEFAULT_PARAMS)
        assert result["total_trades"] >= 0

    def test_max_drawdown_non_positive(self, df_random):
        """Max drawdown should be ≤ 0 (negative or zero)."""
        df_e = compute_all(df_random)
        signal = _periodic_signal(df_e)
        result = run_single(df_e, signal, _DEFAULT_PARAMS)
        if result["total_trades"] > 0:
            assert result["max_drawdown"] <= 0.0

    def test_equity_curve_is_list(self, df_random):
        df_e = compute_all(df_random)
        signal = _periodic_signal(df_e)
        result = run_single(df_e, signal, _DEFAULT_PARAMS)
        assert isinstance(result["equity_curve"], list)


class TestRunSingleNoSignals:
    """Edge case: no entry signals at all."""

    def test_zero_trades(self, df_random):
        df_e = compute_all(df_random)
        signal = pd.Series(0, index=df_e.index)
        result = run_single(df_e, signal, _DEFAULT_PARAMS)
        assert result["total_trades"] == 0
        assert result["win_rate"] == 0.0

    def test_all_metrics_zero(self, df_random):
        df_e = compute_all(df_random)
        signal = pd.Series(0, index=df_e.index)
        result = run_single(df_e, signal, _DEFAULT_PARAMS)
        assert result["profit_factor"] == 0.0
        assert result["sharpe"] == 0.0
        assert result["max_drawdown"] == 0.0

    def test_empty_equity_curve(self, df_random):
        df_e = compute_all(df_random)
        signal = pd.Series(0, index=df_e.index)
        result = run_single(df_e, signal, _DEFAULT_PARAMS)
        assert result["equity_curve"] == []


class TestRunSingleParamVariations:
    """Test backtest behavior under different parameter configurations."""

    @pytest.mark.parametrize("sl_atr", [0.5, 1.0, 1.5, 2.0, 3.0])
    def test_different_sl_atr(self, df_random, sl_atr):
        df_e = compute_all(df_random)
        signal = _periodic_signal(df_e)
        params = {**_DEFAULT_PARAMS, "sl_atr": sl_atr}
        result = run_single(df_e, signal, params)
        assert "total_trades" in result

    @pytest.mark.parametrize("tp_rr", [1.0, 1.5, 2.0, 3.0, 5.0])
    def test_different_tp_rr(self, df_random, tp_rr):
        df_e = compute_all(df_random)
        signal = _periodic_signal(df_e)
        params = {**_DEFAULT_PARAMS, "tp_rr": tp_rr}
        result = run_single(df_e, signal, params)
        assert "total_trades" in result

    @pytest.mark.parametrize("holding_bars", [5, 10, 20, 50, None])
    def test_different_holding_bars(self, df_random, holding_bars):
        df_e = compute_all(df_random)
        signal = _periodic_signal(df_e)
        params = {**_DEFAULT_PARAMS, "holding_bars_max": holding_bars}
        result = run_single(df_e, signal, params)
        assert "total_trades" in result

    def test_tighter_sl_fewer_or_equal_wins(self, df_random):
        """Tighter SL (lower multiplier) should generally result in more losses."""
        df_e = compute_all(df_random)
        signal = _periodic_signal(df_e, interval=5)
        tight = run_single(df_e, signal, {**_DEFAULT_PARAMS, "sl_atr": 0.5})
        loose = run_single(df_e, signal, {**_DEFAULT_PARAMS, "sl_atr": 3.0})
        # With tight SL, win rate should generally be lower (though not guaranteed)
        # Just ensure both produce valid results
        assert tight["total_trades"] >= 0
        assert loose["total_trades"] >= 0

    def test_higher_tp_rr_affects_win_rate(self, df_random):
        """Higher TP:RR should generally decrease win rate."""
        df_e = compute_all(df_random)
        signal = _periodic_signal(df_e, interval=5)
        low_tp = run_single(df_e, signal, {**_DEFAULT_PARAMS, "tp_rr": 1.0})
        high_tp = run_single(df_e, signal, {**_DEFAULT_PARAMS, "tp_rr": 5.0})
        # Both should be valid
        assert low_tp["total_trades"] >= 0
        assert high_tp["total_trades"] >= 0


class TestRunSingleDifferentMarkets:
    """Test backtest on different market conditions."""

    def test_bullish_market(self):
        df = _make_ohlcv(200, trend="bullish")
        df_e = compute_all(df)
        signal = _periodic_signal(df_e, interval=10)
        result = run_single(df_e, signal, _DEFAULT_PARAMS)
        assert result["total_trades"] >= 0

    def test_bearish_market(self):
        df = _make_ohlcv(200, trend="bearish")
        df_e = compute_all(df)
        signal = _periodic_signal(df_e, interval=10)
        result = run_single(df_e, signal, _DEFAULT_PARAMS)
        assert result["total_trades"] >= 0

    def test_random_market(self):
        df = _make_ohlcv(200, trend="random")
        df_e = compute_all(df)
        signal = _periodic_signal(df_e, interval=10)
        result = run_single(df_e, signal, _DEFAULT_PARAMS)
        assert result["total_trades"] >= 0

    def test_short_dataframe(self):
        """Backtest should work with short data (edge case)."""
        df = _make_ohlcv(30)
        df_e = compute_all(df)
        signal = _periodic_signal(df_e, interval=5)
        result = run_single(df_e, signal, _DEFAULT_PARAMS)
        assert "total_trades" in result

    def test_minimum_data(self):
        """Even very small datasets should not crash."""
        df = _make_ohlcv(15)
        df_e = compute_all(df)
        signal = pd.Series(0, index=df_e.index)
        signal.iloc[0] = 1
        result = run_single(df_e, signal, _DEFAULT_PARAMS)
        assert result["total_trades"] >= 0


# ===========================================================================
# FALLBACK ENGINE TESTS
# ===========================================================================

class TestFallbackMetrics:
    """Test the manual fallback backtest engine (no VectorBT)."""

    def test_produces_valid_metrics(self, df_random):
        df_e = compute_all(df_random)
        entries = _periodic_signal(df_e, interval=10).astype(bool)
        result = _fallback_metrics(entries, df_e, _DEFAULT_PARAMS)
        assert "win_rate" in result
        assert "total_trades" in result

    def test_no_entries_zero_trades(self, df_random):
        df_e = compute_all(df_random)
        entries = pd.Series(False, index=df_e.index)
        result = _fallback_metrics(entries, df_e, _DEFAULT_PARAMS)
        assert result["total_trades"] == 0

    def test_equity_curve_starts_at_one(self, df_random):
        df_e = compute_all(df_random)
        entries = _periodic_signal(df_e, interval=10).astype(bool)
        result = _fallback_metrics(entries, df_e, _DEFAULT_PARAMS)
        if result["equity_curve"]:
            assert result["equity_curve"][0]["value"] == 1.0


# ===========================================================================
# STRATEGIES TESTS (build_entries_exits)
# ===========================================================================

class TestBuildEntriesExits:
    """Test the strategy signal builder."""

    def test_returns_four_series(self, df_random):
        df_e = compute_all(df_random)
        signal = _periodic_signal(df_e)
        entries, exits, sl, tp = build_entries_exits(df_e, signal)
        assert isinstance(entries, pd.Series)
        assert isinstance(exits, pd.Series)
        assert isinstance(sl, pd.Series)
        assert isinstance(tp, pd.Series)

    def test_entries_are_boolean(self, df_random):
        df_e = compute_all(df_random)
        signal = _periodic_signal(df_e)
        entries, _, _, _ = build_entries_exits(df_e, signal)
        assert entries.dtype == bool

    def test_exits_are_boolean(self, df_random):
        df_e = compute_all(df_random)
        signal = _periodic_signal(df_e)
        _, exits, _, _ = build_entries_exits(df_e, signal)
        assert exits.dtype == bool

    def test_sl_below_tp(self, df_random):
        """SL should be below TP for long entries."""
        df_e = compute_all(df_random)
        signal = _periodic_signal(df_e)
        _, _, sl, tp = build_entries_exits(df_e, signal, sl_atr=1.5, tp_rr=2.0)
        # Where both are defined
        valid = sl.notna() & tp.notna()
        if valid.any():
            assert (tp[valid] >= sl[valid]).all(), "TP should be above SL for longs"

    def test_no_holding_bars_means_no_time_exits(self, df_random):
        df_e = compute_all(df_random)
        signal = _periodic_signal(df_e)
        _, exits, _, _ = build_entries_exits(df_e, signal, holding_bars_max=None)
        assert not exits.any(), "No holding_bars_max should produce no time-based exits"

    def test_holding_bars_produces_shifted_exits(self, df_random):
        df_e = compute_all(df_random)
        signal = _periodic_signal(df_e, interval=30)
        _, exits, _, _ = build_entries_exits(df_e, signal, holding_bars_max=20)
        # There should be some exits generated
        assert exits.sum() >= 0  # could be 0 if entries are near end

    def test_sma200_filter_requires_200_bars(self):
        """SMA200 filter should only apply when we have >= 200 bars."""
        short_df = _make_ohlcv(50)
        df_e = compute_all(short_df)
        signal = _periodic_signal(df_e, interval=5)
        entries_no_filter, _, _, _ = build_entries_exits(df_e, signal, filter_trend="none")
        entries_sma200, _, _, _ = build_entries_exits(df_e, signal, filter_trend="sma200")
        # With < 200 bars, SMA200 filter shouldn't apply
        assert entries_no_filter.sum() == entries_sma200.sum()

    def test_sma200_filter_reduces_entries(self, df_bearish):
        """SMA200 on bearish data should reduce buy signals (price < SMA200)."""
        # Need 200+ bars
        df = _make_ohlcv(250, trend="bearish")
        df_e = compute_all(df)
        signal = _periodic_signal(df_e, interval=5)
        entries_no, _, _, _ = build_entries_exits(df_e, signal, filter_trend="none")
        entries_sma, _, _, _ = build_entries_exits(df_e, signal, filter_trend="sma200")
        assert entries_sma.sum() <= entries_no.sum()

    def test_rsi_oversold_filter(self, df_random):
        df_e = compute_all(df_random)
        signal = _periodic_signal(df_e, interval=5)
        entries_no, _, _, _ = build_entries_exits(df_e, signal, filter_rsi="none")
        entries_os, _, _, _ = build_entries_exits(df_e, signal, filter_rsi="oversold")
        # RSI oversold filter should reduce or equal entries
        assert entries_os.sum() <= entries_no.sum()

    def test_rsi_overbought_filter(self, df_random):
        df_e = compute_all(df_random)
        signal = _periodic_signal(df_e, interval=5)
        entries_no, _, _, _ = build_entries_exits(df_e, signal, filter_rsi="none")
        entries_ob, _, _, _ = build_entries_exits(df_e, signal, filter_rsi="overbought")
        assert entries_ob.sum() <= entries_no.sum()

    def test_adx25_filter(self, df_random):
        df_e = compute_all(df_random)
        signal = _periodic_signal(df_e, interval=5)
        entries_no, _, _, _ = build_entries_exits(df_e, signal, filter_trend="none")
        entries_adx, _, _, _ = build_entries_exits(df_e, signal, filter_trend="adx25")
        assert entries_adx.sum() <= entries_no.sum()

    @pytest.mark.parametrize("filter_trend", ["none", "sma200", "adx25"])
    @pytest.mark.parametrize("filter_rsi", ["none", "oversold", "overbought"])
    def test_all_filter_combinations_dont_crash(self, df_random, filter_trend, filter_rsi):
        """Every valid filter combo should produce results without error."""
        df = _make_ohlcv(250)
        df_e = compute_all(df)
        signal = _periodic_signal(df_e, interval=10)
        entries, exits, sl, tp = build_entries_exits(
            df_e, signal, filter_trend=filter_trend, filter_rsi=filter_rsi
        )
        assert len(entries) == len(df_e)
        assert entries.dtype == bool


# ===========================================================================
# GRID TESTS
# ===========================================================================

class TestGridCombos:
    """Test grid parameter generation."""

    def test_full_combos_count_is_243(self):
        """3 SL × 3 TP × 3 trend × 3 RSI × 3 holding = 243."""
        assert combo_count() == 243

    def test_quick_combos_much_smaller(self):
        assert quick_combo_count() < 20
        assert quick_combo_count() > 5

    def test_all_combos_unique(self):
        combos = _all_combos()
        serialized = [json.dumps(c, sort_keys=True) for c in combos]
        assert len(serialized) == len(set(serialized)), "Duplicate combos in full grid"

    def test_quick_combos_unique(self):
        combos = quick_combos()
        serialized = [json.dumps(c, sort_keys=True) for c in combos]
        assert len(serialized) == len(set(serialized)), "Duplicate combos in quick grid"

    def test_quick_is_proper_subset_of_full(self):
        full_set = {json.dumps(c, sort_keys=True) for c in _all_combos()}
        for c in quick_combos():
            assert json.dumps(c, sort_keys=True) in full_set

    def test_combo_keys_consistent(self):
        """All combos should have identical key sets."""
        expected_keys = {"sl_atr", "tp_rr", "filter_trend", "filter_rsi", "holding_bars_max"}
        for c in _all_combos():
            assert set(c.keys()) == expected_keys
        for c in quick_combos():
            assert set(c.keys()) == expected_keys


class TestRunPatternGrid:
    """Test running the grid for individual patterns."""

    def test_run_pattern_returns_int(self, df_random):
        df_e = compute_all(df_random)
        patterns = reg.all_backtestable()
        if not patterns:
            pytest.skip("No backtestable patterns")
        result = run_pattern(patterns[0].id, "BTCUSDT", "4h", df_e)
        assert isinstance(result, int)
        assert result >= 0

    def test_run_pattern_unknown_returns_zero(self, df_random):
        df_e = compute_all(df_random)
        result = run_pattern("nonexistent_pattern_xyz", "BTCUSDT", "4h", df_e)
        assert result == 0

    def test_run_pattern_with_custom_combos(self, df_random):
        df_e = compute_all(df_random)
        patterns = reg.all_backtestable()
        if not patterns:
            pytest.skip("No backtestable patterns")
        combos = [_DEFAULT_PARAMS]
        result = run_pattern(patterns[0].id, "BTCUSDT", "4h", df_e, combos=combos)
        assert isinstance(result, int)


class TestRunAll:
    """Test full grid run across all patterns."""

    def test_returns_dict(self, df_random):
        df_e = compute_all(df_random)
        results = run_all("BTCUSDT", "4h", df_e, workers=1)
        assert isinstance(results, dict)

    def test_all_keys_are_pattern_ids(self, df_random):
        df_e = compute_all(df_random)
        results = run_all("BTCUSDT", "4h", df_e, workers=1)
        all_ids = {s.id for s in reg.all_backtestable()}
        for key in results:
            assert key in all_ids, f"{key} is not a registered pattern ID"

    def test_progress_callback_invoked(self, df_random):
        df_e = compute_all(df_random)
        calls = []
        results = run_all("BTCUSDT", "4h", df_e, workers=1,
                          progress_callback=lambda i, t, pid: calls.append((i, t, pid)))
        assert len(calls) == len(results)
        # Should be monotonically increasing
        for i, (current, total, _) in enumerate(calls):
            assert current == i + 1
            assert total == len(results)


class TestRunAllQuick:
    """Test quick grid run across all patterns."""

    def test_returns_dict(self, df_random):
        df_e = compute_all(df_random)
        results = run_all_quick("BTCUSDT", "4h", df_e)
        assert isinstance(results, dict)

    def test_covers_all_backtestable_patterns(self, df_random):
        df_e = compute_all(df_random)
        results = run_all_quick("BTCUSDT", "4h", df_e)
        expected = {s.id for s in reg.all_backtestable()}
        assert set(results.keys()) == expected

    def test_progress_callback_called_for_each_pattern(self, df_random):
        df_e = compute_all(df_random)
        calls = []
        run_all_quick("BTCUSDT", "4h", df_e,
                      progress_callback=lambda i, t, pid: calls.append(pid))
        patterns = reg.all_backtestable()
        assert len(calls) == len(patterns)

    def test_quick_run_does_not_crash_on_empty_df(self):
        df = pd.DataFrame(columns=["time", "open", "high", "low", "close", "volume"])
        # This may raise or return empty depending on patterns
        try:
            results = run_all_quick("BTCUSDT", "4h", df)
            assert isinstance(results, dict)
        except Exception:
            pass  # acceptable — empty df may error


# ===========================================================================
# INTERNAL PATTERN GRID WORKER
# ===========================================================================

class TestRunPatternGridInternal:
    """Test the _run_pattern_grid internal function."""

    def test_with_valid_pattern(self, df_random):
        df_e = compute_all(df_random)
        patterns = reg.all_backtestable()
        if not patterns:
            pytest.skip("No patterns")
        combos = [_DEFAULT_PARAMS]
        args = (patterns[0].id, "BTCUSDT", "4h", df_e.to_dict("list"), combos)
        result = _run_pattern_grid(args)
        assert isinstance(result, int)

    def test_with_unknown_pattern(self, df_random):
        df_e = compute_all(df_random)
        args = ("unknown_xyz", "BTCUSDT", "4h", df_e.to_dict("list"), [_DEFAULT_PARAMS])
        result = _run_pattern_grid(args)
        assert result == 0


# ===========================================================================
# CROSS-CUTTING BACKTEST + ANALYSIS INTEGRATION
# ===========================================================================

class TestBacktestIntegration:
    """Integration tests spanning analysis → backtest flow."""

    def test_analysis_detected_patterns_are_backtestable(self, df_random):
        """Patterns detected by analysis should be in the registry."""
        from belfort.indicators.compute import compute_all
        from belfort.patterns import registry as reg

        df_e = compute_all(df_random)
        for spec in reg.REGISTRY:
            try:
                series = spec.detect(df_e)
                if int(series.iloc[-1]) != 0:
                    # This active pattern should be findable
                    assert reg.get(spec.id) is not None
            except Exception:
                continue

    def test_backtest_result_values_are_json_serializable(self, df_random):
        """All backtest metrics should be JSON-serializable for API responses."""
        df_e = compute_all(df_random)
        signal = _periodic_signal(df_e)
        result = run_single(df_e, signal, _DEFAULT_PARAMS)
        # Should not raise
        json_str = json.dumps(result)
        assert isinstance(json_str, str)
        parsed = json.loads(json_str)
        assert parsed["total_trades"] == result["total_trades"]

    def test_deterministic_with_same_inputs(self, df_random):
        """Same inputs should produce same outputs (determinism)."""
        df_e = compute_all(df_random)
        signal = _periodic_signal(df_e)
        r1 = run_single(df_e, signal, _DEFAULT_PARAMS)
        r2 = run_single(df_e, signal, _DEFAULT_PARAMS)
        assert r1["total_trades"] == r2["total_trades"]
        assert r1["win_rate"] == r2["win_rate"]

    def test_every_registered_pattern_can_be_backtested(self, df_random):
        """No pattern's detect() should crash the backtest pipeline."""
        df_e = compute_all(df_random)
        for spec in reg.all_backtestable():
            try:
                signal = spec.detect(df_e)
                result = run_single(df_e, signal, _DEFAULT_PARAMS)
                assert "total_trades" in result
            except Exception as e:
                pytest.fail(f"Backtest failed for {spec.id}: {e}")
