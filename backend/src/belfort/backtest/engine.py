"""
VectorBT-powered backtest engine.

Runs a single (pattern, params) combination on OHLCV data and returns metrics.
"""

from __future__ import annotations

import math
import warnings
from typing import Any

import numpy as np
import pandas as pd

from belfort.backtest.dataframe import prepare_backtest_df
from belfort.backtest.strategies import build_entries_exits

warnings.filterwarnings("ignore")

try:
    import vectorbt as vbt  # type: ignore[import]
    VBT_AVAILABLE = True
except Exception:
    VBT_AVAILABLE = False

_MAX_EQUITY_POINTS = 120


def _format_index_date(idx: Any, df: pd.DataFrame | None = None, iloc: int | None = None) -> str:
    if df is not None and iloc is not None and "time" in df.columns and 0 <= iloc < len(df):
        try:
            ts = int(df["time"].iloc[iloc])
            return pd.to_datetime(ts, unit="s", utc=True).isoformat()
        except (TypeError, ValueError, OverflowError):
            pass
    if hasattr(idx, "isoformat"):
        return idx.isoformat()
    if hasattr(idx, "date"):
        return str(idx.date())
    return str(idx)


def _bar_dates(df: pd.DataFrame, iloc: int) -> str:
    return _format_index_date(df.index[iloc] if iloc < len(df.index) else iloc, df=df, iloc=iloc)


def _infer_total_return(metrics: dict | None) -> float:
    if not metrics:
        return 0.0
    tr = float(metrics.get("total_return") or 0)
    if tr != 0:
        return tr
    exp = float(metrics.get("expectancy") or 0)
    n = int(metrics.get("total_trades") or 0)
    if exp and n:
        return exp * n
    avg = float(metrics.get("avg_return") or 0)
    if avg and n:
        return avg * n
    pf = float(metrics.get("profit_factor") or 0)
    if pf > 1:
        return (pf - 1) * 0.25
    if 0 < pf < 1:
        return -((1 / pf) - 1) * 0.25
    return 0.0


def ensure_equity_curve(
    curve: list[dict] | None,
    metrics: dict | None = None,
) -> list[dict]:
    """
    Guarantee at least 2 points for charting.
    Legacy DB rows often stored a single [{date: '0', value: 1.0}].
    """
    points: list[dict] = []
    for p in curve or []:
        try:
            v = float(p.get("value", 0))
        except (TypeError, ValueError):
            continue
        if math.isfinite(v):
            points.append({"date": str(p.get("date", "")), "value": v})

    if len(points) >= 2:
        return _normalize_equity_curve(points)

    total_return = _infer_total_return(metrics)
    if not total_return and len(points) == 1:
        total_return = points[0]["value"] - 1.0

    start_date = points[0]["date"] if points else "inicio"
    if not start_date or start_date.isdigit():
        start_date = "inicio"
    end_val = 1.0 + total_return
    return [
        {"date": start_date, "value": 1.0},
        {"date": "actual", "value": end_val},
    ]


def _downsample_curve(points: list[dict], max_points: int = _MAX_EQUITY_POINTS) -> list[dict]:
    if len(points) <= max_points:
        return points
    step = max(1, len(points) // max_points)
    sampled = points[::step]
    if sampled[-1] is not points[-1]:
        sampled.append(points[-1])
    return sampled


def _normalize_equity_curve(points: list[dict]) -> list[dict]:
    """Filter invalid values, normalize to 1.0 at start, downsample for API."""
    clean: list[dict] = []
    for p in points:
        v = p.get("value")
        if v is None:
            continue
        try:
            fv = float(v)
        except (TypeError, ValueError):
            continue
        if not math.isfinite(fv):
            continue
        clean.append({"date": str(p.get("date", "")), "value": fv})
    if not clean:
        return []
    base = clean[0]["value"]
    if base and base != 0:
        clean = [{"date": p["date"], "value": p["value"] / base} for p in clean]
    return _downsample_curve(clean)


def _curve_from_returns(returns: list[float], dates: list[str]) -> list[dict]:
    if not returns:
        return []
    equity = [1.0]
    eq_dates = [dates[0] if dates else ""]
    for ret, d in zip(returns, dates[1:], strict=False):
        equity.append(equity[-1] * (1.0 + ret))
        eq_dates.append(d)
    if len(equity) > len(eq_dates):
        eq_dates.extend([eq_dates[-1]] * (len(equity) - len(eq_dates)))
    return _normalize_equity_curve(
        [{"date": d, "value": v} for d, v in zip(eq_dates, equity, strict=False)]
    )


def _extended_metrics(
    returns: list[float],
    wins: int,
    losses: int,
    equity_curve: list[dict],
) -> dict[str, float]:
    total = wins + losses
    win_rate = wins / total if total else 0.0
    wins_ret = [r for r in returns if r > 0]
    loss_ret = [r for r in returns if r < 0]
    avg_win = float(np.mean(wins_ret)) if wins_ret else 0.0
    avg_loss = float(np.mean(loss_ret)) if loss_ret else 0.0
    expectancy = win_rate * avg_win + (1.0 - win_rate) * avg_loss if total else 0.0
    total_return = 0.0
    if equity_curve:
        total_return = float(equity_curve[-1]["value"]) - 1.0
    elif returns:
        total_return = float(np.prod([1.0 + r for r in returns]) - 1.0)
    return {
        "avg_win": round(avg_win, 6),
        "avg_loss": round(avg_loss, 6),
        "expectancy": round(expectancy, 6),
        "total_return": round(total_return, 6),
        "loss_rate": round(1.0 - win_rate, 6) if total else 0.0,
    }


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
    trade_dates: list[str] = []
    eq_value = 1.0
    eq_points: list[dict] = [{"date": _bar_dates(df, 0), "value": 1.0}]
    pos = None

    for i, (idx, is_entry) in enumerate(entries.items()):
        if pos is not None:
            c = closes[i]
            if c >= pos["tp"] or c <= pos["sl"]:
                ret = (c - pos["entry"]) / pos["entry"]
                returns.append(ret)
                trade_dates.append(_bar_dates(df, i))
                eq_value *= 1.0 + ret
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
        # Mark-to-market each bar for a visible equity path
        if pos is not None:
            unrealized = (closes[i] - pos["entry"]) / pos["entry"]
            mtm = eq_value * (1.0 + unrealized)
        else:
            mtm = eq_value
        eq_points.append({"date": _bar_dates(df, i), "value": mtm})

    total = wins + losses
    if total < 1:
        return {
            "win_rate": 0.0,
            "profit_factor": 0.0,
            "sharpe": 0.0,
            "max_drawdown": 0.0,
            "total_trades": 0,
            "avg_return": 0.0,
            "equity_curve": [],
            "avg_win": 0.0,
            "avg_loss": 0.0,
            "expectancy": 0.0,
            "total_return": 0.0,
            "loss_rate": 0.0,
        }

    win_rate = wins / total
    avg_ret = float(np.mean(returns))
    std_ret = float(np.std(returns)) or 1e-9
    sharpe = avg_ret / std_ret * np.sqrt(365)
    eq_arr = np.array([p["value"] for p in eq_points])
    peak = np.maximum.accumulate(eq_arr)
    drawdown = (eq_arr - peak) / np.maximum(peak, 1e-12)
    max_dd = float(drawdown.min())

    profit_factor = (
        sum(r for r in returns if r > 0) / max(abs(sum(r for r in returns if r < 0)), 1e-9)
    )

    equity_curve = _normalize_equity_curve(eq_points)
    extra = _extended_metrics(returns, wins, losses, equity_curve)
    out = {
        "win_rate": win_rate,
        "profit_factor": profit_factor,
        "sharpe": sharpe,
        "max_drawdown": max_dd,
        "total_trades": total,
        "avg_return": avg_ret,
        "equity_curve": equity_curve,
        **extra,
    }
    out["equity_curve"] = ensure_equity_curve(out["equity_curve"], out)
    return out


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
    df = prepare_backtest_df(df)
    if len(signal) == len(df):
        signal = pd.Series(signal.values, index=df.index)

    entries, exits, sl_prices, tp_prices = build_entries_exits(
        df, signal,
        sl_atr=params.get("sl_atr", 1.5),
        tp_rr=params.get("tp_rr", 2.0),
        filter_trend=params.get("filter_trend", "none"),
        filter_rsi=params.get("filter_rsi", "none"),
        holding_bars_max=params.get("holding_bars_max", 50),
    )

    _empty = {
        "win_rate": 0.0,
        "profit_factor": 0.0,
        "sharpe": 0.0,
        "max_drawdown": 0.0,
        "total_trades": 0,
        "avg_return": 0.0,
        "equity_curve": [],
        "avg_win": 0.0,
        "avg_loss": 0.0,
        "expectancy": 0.0,
        "total_return": 0.0,
        "loss_rate": 0.0,
    }
    if entries.sum() == 0:
        return dict(_empty)

    if not VBT_AVAILABLE:
        result = _fallback_metrics(entries, df, params)
        result["equity_curve"] = ensure_equity_curve(result.get("equity_curve"), result)
        return result

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
            return dict(_empty)

        win_rate = float(stats.get("Win Rate [%]", 0)) / 100
        profit_factor = float(stats.get("Profit Factor", 0) or 0)
        sharpe = float(stats.get("Sharpe Ratio", 0) or 0)
        max_drawdown = float(stats.get("Max Drawdown [%]", 0)) / -100
        avg_return = float(stats.get("Avg Winning Trade [%]", 0)) / 100

        eq = pf.value().astype(float)
        eq = eq.replace([np.inf, -np.inf], np.nan).ffill().bfill()
        if eq.empty or not math.isfinite(float(eq.iloc[0])) or float(eq.iloc[0]) == 0:
            trades = pf.trades.records_readable
            rets = []
            dates = [_format_index_date(df.index[0])]
            if trades is not None and len(trades) > 0:
                for _, tr in trades.iterrows():
                    pnl = tr.get("Return", tr.get("PnL", 0))
                    try:
                        rets.append(float(pnl))
                    except (TypeError, ValueError):
                        continue
                    exit_idx = tr.get("Exit Index", tr.get("Exit Idx"))
                    if exit_idx is not None and int(exit_idx) < len(df.index):
                        dates.append(_format_index_date(df.index[int(exit_idx)]))
            equity_curve = _curve_from_returns(rets, dates) if rets else []
        else:
            raw_curve = [
                {"date": _format_index_date(t), "value": float(v)}
                for t, v in eq.items()
                if math.isfinite(float(v))
            ]
            equity_curve = _normalize_equity_curve(raw_curve)
            if len(equity_curve) < 2:
                try:
                    trade_rets = [
                        float(r)
                        for r in pf.trades.returns.values
                        if math.isfinite(float(r))
                    ]
                    if trade_rets:
                        dates = [_bar_dates(df, 0)]
                        for j in range(len(trade_rets)):
                            dates.append(_bar_dates(df, min(j + 1, len(df) - 1)))
                        equity_curve = _curve_from_returns(trade_rets, dates)
                except Exception:
                    pass

        wins_n = int(round(win_rate * total_trades))
        losses_n = total_trades - wins_n
        extra = _extended_metrics([], wins_n, losses_n, equity_curve)
        try:
            trades = pf.trades.returns.values
            trade_rets = [float(r) for r in trades if math.isfinite(float(r))]
            if trade_rets:
                extra = _extended_metrics(
                    trade_rets,
                    sum(1 for r in trade_rets if r > 0),
                    sum(1 for r in trade_rets if r <= 0),
                    equity_curve,
                )
        except Exception:
            pass

        out = {
            "win_rate": win_rate,
            "profit_factor": profit_factor,
            "sharpe": sharpe,
            "max_drawdown": max_drawdown,
            "total_trades": total_trades,
            "avg_return": avg_return,
            "equity_curve": equity_curve,
            **extra,
        }
        out["equity_curve"] = ensure_equity_curve(out["equity_curve"], out)
        return out

    except Exception:
        result = _fallback_metrics(entries, df, params)
        result["equity_curve"] = ensure_equity_curve(result.get("equity_curve"), result)
        return result
