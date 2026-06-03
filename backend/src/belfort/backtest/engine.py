"""
VectorBT-powered backtest engine.

Runs a single (pattern, params) combination on OHLCV data and returns metrics.
"""

from __future__ import annotations

import warnings
from typing import Any

import numpy as np
import pandas as pd

from belfort.backtest.strategies import build_entries_exits

warnings.filterwarnings("ignore")

try:
    import vectorbt as vbt  # type: ignore[import]
    VBT_AVAILABLE = True
except Exception:
    VBT_AVAILABLE = False


def _fallback_metrics(entries: pd.Series, df: pd.DataFrame, params: dict) -> dict[str, Any]:
    """
    Lightweight manual backtest used when VectorBT is not available.
    Simulates fixed SL/TP on the close of the next bar after signal.
    """
    sl_atr = params.get("sl_atr", 1.5)
    tp_rr = params.get("tp_rr", 2.0)
    atr_s = (df["high"] - df["low"]).rolling(14).mean().fillna(0)
    closes = df["close"].to_numpy(float)
    wins, losses, returns = 0, 0, []
    equity = [1.0]
    pos = None

    for i, (idx, is_entry) in enumerate(entries.items()):
        if pos is not None:
            # Check exit
            c = closes[i]
            if c >= pos["tp"] or c <= pos["sl"]:
                ret = (c - pos["entry"]) / pos["entry"]
                returns.append(ret)
                equity.append(equity[-1] * (1 + ret))
                if c >= pos["tp"]:
                    wins += 1
                else:
                    losses += 1
                pos = None
        if is_entry and pos is None:
            e_price = closes[i]
            a = float(atr_s.iloc[i])
            pos = {
                "entry": e_price,
                "sl": e_price - sl_atr * a,
                "tp": e_price + sl_atr * tp_rr * a,
            }

    total = wins + losses
    if total < 1:
        return {"win_rate": 0.0, "profit_factor": 0.0, "sharpe": 0.0,
                "max_drawdown": 0.0, "total_trades": 0, "avg_return": 0.0,
                "equity_curve": []}

    win_rate = wins / total
    avg_ret = float(np.mean(returns))
    std_ret = float(np.std(returns)) or 1e-9
    sharpe = avg_ret / std_ret * np.sqrt(365)
    eq_arr = np.array(equity)
    peak = np.maximum.accumulate(eq_arr)
    drawdown = (eq_arr - peak) / peak
    max_dd = float(drawdown.min())

    profit_factor = (
        sum(r for r in returns if r > 0) / max(abs(sum(r for r in returns if r < 0)), 1e-9)
    )

    eq_points = [{"date": str(df.index[0]), "value": 1.0}]
    return {
        "win_rate": win_rate,
        "profit_factor": profit_factor,
        "sharpe": sharpe,
        "max_drawdown": max_dd,
        "total_trades": total,
        "avg_return": avg_ret,
        "equity_curve": eq_points,
    }


def run_single(
    df: pd.DataFrame,
    signal: pd.Series,
    params: dict,
    fees: float = 0.001,
) -> dict[str, Any]:
    """
    Run one backtest combination.

    Returns metrics dict:
      win_rate, profit_factor, sharpe, max_drawdown, total_trades,
      avg_return, equity_curve (list of {date, value})
    """
    entries, exits, sl_prices, tp_prices = build_entries_exits(
        df, signal,
        sl_atr=params.get("sl_atr", 1.5),
        tp_rr=params.get("tp_rr", 2.0),
        filter_trend=params.get("filter_trend", "none"),
        filter_rsi=params.get("filter_rsi", "none"),
        holding_bars_max=params.get("holding_bars_max", 50),
    )

    if entries.sum() == 0:
        return {"win_rate": 0.0, "profit_factor": 0.0, "sharpe": 0.0,
                "max_drawdown": 0.0, "total_trades": 0, "avg_return": 0.0,
                "equity_curve": []}

    if not VBT_AVAILABLE:
        return _fallback_metrics(entries, df, params)

    close = df["close"]

    try:
        pf = vbt.Portfolio.from_signals(
            close,
            entries,
            exits,
            sl_stop=sl_prices,
            tp_stop=tp_prices,
            fees=fees,
            freq="infer",
        )
        stats = pf.stats()
        total_trades = int(stats.get("Total Trades", 0))
        if total_trades == 0:
            return {"win_rate": 0.0, "profit_factor": 0.0, "sharpe": 0.0,
                    "max_drawdown": 0.0, "total_trades": 0, "avg_return": 0.0,
                    "equity_curve": []}

        win_rate = float(stats.get("Win Rate [%]", 0)) / 100
        profit_factor = float(stats.get("Profit Factor", 0) or 0)
        sharpe = float(stats.get("Sharpe Ratio", 0) or 0)
        max_drawdown = float(stats.get("Max Drawdown [%]", 0)) / -100
        avg_return = float(stats.get("Avg Winning Trade [%]", 0)) / 100

        # Equity curve (sampled)
        eq = pf.value()
        eq_sampled = eq.iloc[::max(1, len(eq) // 100)]
        equity_curve = [
            {"date": str(t.date() if hasattr(t, "date") else t), "value": float(v)}
            for t, v in eq_sampled.items()
        ]

        return {
            "win_rate": win_rate,
            "profit_factor": profit_factor,
            "sharpe": sharpe,
            "max_drawdown": max_drawdown,
            "total_trades": total_trades,
            "avg_return": avg_return,
            "equity_curve": equity_curve,
        }

    except Exception:
        return _fallback_metrics(entries, df, params)
