"""
Grid search: Cartesian product of strategy parameters × every backtestable pattern.
"""

from __future__ import annotations

import itertools
import multiprocessing
import os
from typing import Any

import pandas as pd

from belfort import config
from belfort.backtest.engine import run_single
from belfort.patterns import registry as reg
from belfort.storage import db

# Full grid parameters
_SL_ATR = [1.0, 1.5, 2.0]
_TP_RR = [1.5, 2.0, 3.0]
_FILTER_TREND = ["none", "sma200", "adx25"]
_FILTER_RSI = ["none", "oversold", "overbought"]
_HOLDING_BARS = [20, 50, None]

# Quick grid parameters (~12 combos vs 243 for full)
_QUICK_SL_ATR = [1.5]
_QUICK_TP_RR = [2.0, 3.0]
_QUICK_FILTER_TREND = ["none", "sma200"]
_QUICK_FILTER_RSI = ["none"]
_QUICK_HOLDING_BARS = [20, 50, None]


def _all_combos() -> list[dict]:
    combos = []
    for sl, tp, ft, fr, hb in itertools.product(
        _SL_ATR, _TP_RR, _FILTER_TREND, _FILTER_RSI, _HOLDING_BARS
    ):
        combos.append(
            {
                "sl_atr": sl,
                "tp_rr": tp,
                "filter_trend": ft,
                "filter_rsi": fr,
                "holding_bars_max": hb,
            }
        )
    return combos


def quick_combos() -> list[dict]:
    """Reduced parameter grid (~12 combos) for fast cold-start backtesting."""
    combos = []
    for sl, tp, ft, fr, hb in itertools.product(
        _QUICK_SL_ATR, _QUICK_TP_RR, _QUICK_FILTER_TREND, _QUICK_FILTER_RSI, _QUICK_HOLDING_BARS
    ):
        combos.append(
            {
                "sl_atr": sl,
                "tp_rr": tp,
                "filter_trend": ft,
                "filter_rsi": fr,
                "holding_bars_max": hb,
            }
        )
    return combos


def _run_pattern_grid(args: tuple) -> int:
    """Worker function (multiprocessing-safe)."""
    pattern_id, symbol, tf, df_dict, combos = args
    df = pd.DataFrame(df_dict)
    spec = reg.get(pattern_id)
    if spec is None:
        return 0

    try:
        signal = spec.detect(df)
    except Exception:
        return 0

    saved = 0
    for params in combos:
        try:
            metrics = run_single(df, signal, params)
            if metrics["total_trades"] >= config.BT_MIN_TRADES:
                db.upsert_run(pattern_id, symbol, tf, params, metrics, metrics.get("equity_curve"))
                saved += 1
        except Exception:
            continue
    return saved


def run_pattern(
    pattern_id: str,
    symbol: str,
    tf: str,
    df: pd.DataFrame,
    combos: list[dict] | None = None,
) -> int:
    """Run the full grid for a single pattern. Returns number of saved results."""
    if combos is None:
        combos = _all_combos()
    args = (pattern_id, symbol, tf, df.to_dict("list"), combos)
    return _run_pattern_grid(args)


def run_all(
    symbol: str,
    tf: str,
    df: pd.DataFrame,
    workers: int | None = None,
    progress_callback: Any = None,
) -> dict[str, int]:
    """
    Run full grid for all backtestable patterns.

    Returns {pattern_id: runs_saved}.
    """
    if workers is None:
        workers = max(1, os.cpu_count() or 4)

    patterns = reg.all_backtestable()
    combos = _all_combos()
    df_dict = df.to_dict("list")

    args_list = [
        (spec.id, symbol, tf, df_dict, combos)
        for spec in patterns
    ]

    results: dict[str, int] = {}

    if workers == 1:
        for i, args in enumerate(args_list):
            n = _run_pattern_grid(args)
            results[patterns[i].id] = n
            if progress_callback:
                progress_callback(i + 1, len(args_list), patterns[i].id)
    else:
        with multiprocessing.Pool(processes=workers) as pool:
            for i, n in enumerate(pool.imap_unordered(_run_pattern_grid, args_list)):
                results[args_list[i][0]] = n
                if progress_callback:
                    progress_callback(i + 1, len(args_list), args_list[i][0])

    return results


def run_all_quick(
    symbol: str,
    tf: str,
    df: pd.DataFrame,
    progress_callback: Any = None,
) -> dict[str, int]:
    """
    Run quick grid (~12 combos) for all backtestable patterns.
    Single-threaded to keep it simple and avoid multiprocessing overhead.

    Returns {pattern_id: runs_saved}.
    """
    patterns = reg.all_backtestable()
    combos = quick_combos()
    df_dict = df.to_dict("list")

    results: dict[str, int] = {}
    for i, spec in enumerate(patterns):
        args = (spec.id, symbol, tf, df_dict, combos)
        n = _run_pattern_grid(args)
        results[spec.id] = n
        if progress_callback:
            progress_callback(i + 1, len(patterns), spec.id)

    return results


def combo_count() -> int:
    return len(_all_combos())


def quick_combo_count() -> int:
    return len(quick_combos())
