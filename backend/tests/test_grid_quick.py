"""Tests: quick grid produces fewer combos and runs correctly."""

from __future__ import annotations

import pandas as pd
import pytest

from belfort.backtest.grid import (
    _all_combos,
    combo_count,
    quick_combo_count,
    quick_combos,
    run_pattern,
    run_all_quick,
)
from belfort.indicators.compute import compute_all


def test_quick_combos_fewer_than_full():
    """Quick combos should be significantly smaller than the full grid."""
    full = _all_combos()
    quick = quick_combos()
    assert len(quick) < len(full)
    assert len(quick) <= 20  # should be ~12
    assert len(full) >= 100  # should be 243


def test_quick_combo_count_matches():
    assert quick_combo_count() == len(quick_combos())
    assert combo_count() == len(_all_combos())


def test_quick_combos_have_required_keys():
    """Every combo must have the same keys as full combos."""
    full_keys = set(_all_combos()[0].keys())
    for combo in quick_combos():
        assert set(combo.keys()) == full_keys


def test_quick_combos_subset_of_full():
    """Quick combos should be a subset of the full grid parameter space."""
    full = _all_combos()
    quick = quick_combos()
    # Every quick combo should be in the full set (as dicts)
    import json
    full_set = {json.dumps(c, sort_keys=True) for c in full}
    for c in quick:
        assert json.dumps(c, sort_keys=True) in full_set, f"Quick combo not in full grid: {c}"


def test_run_pattern_with_quick_combos(df_random):
    """run_pattern with quick combos should not crash."""
    from belfort.patterns.registry import all_backtestable
    df_e = compute_all(df_random)
    patterns = all_backtestable()
    if not patterns:
        pytest.skip("No backtestable patterns")
    # Run with quick combos (shouldn't crash, may return 0)
    result = run_pattern(patterns[0].id, "BTCUSDT", "4h", df_e, combos=quick_combos())
    assert isinstance(result, int)
    assert result >= 0


def test_run_all_quick_returns_dict(df_random):
    """run_all_quick should return a dict of {pattern_id: saved_count}."""
    df_e = compute_all(df_random)
    results = run_all_quick("BTCUSDT", "4h", df_e)
    assert isinstance(results, dict)
    for key, value in results.items():
        assert isinstance(key, str)
        assert isinstance(value, int)


def test_run_all_quick_progress_callback(df_random):
    """Progress callback should be called for each pattern."""
    df_e = compute_all(df_random)
    calls = []

    def _cb(i, total, pattern_id):
        calls.append((i, total, pattern_id))

    results = run_all_quick("BTCUSDT", "4h", df_e, progress_callback=_cb)
    assert len(calls) == len(results)
    # i should be 1-indexed and increasing
    for idx, (i, total, pid) in enumerate(calls):
        assert i == idx + 1
        assert total == len(results)
        assert isinstance(pid, str)
