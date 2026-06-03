"""Chart overlay builders: projection path, EMA series."""

from __future__ import annotations

import math
from typing import Literal

import pandas as pd

from belfort.analysis import TradeSetup

TrendDir = Literal["bullish", "bearish", "neutral"]

TF_SECONDS: dict[str, int] = {
    "1h": 3600,
    "4h": 14_400,
    "1D": 86_400,
    "1W": 604_800,
}


def _atr(df: pd.DataFrame, period: int = 14) -> float:
    val = float(((df["high"] - df["low"]).rolling(period).mean()).iloc[-1] or 0)
    if val <= 0:
        val = float(df["close"].iloc[-1]) * 0.01
    return val


def build_projection(
    df: pd.DataFrame,
    tf: str,
    trend: TrendDir,
    trade_setup: TradeSetup | None,
    bars: int = 16,
) -> dict:
    """
    Project forward candles/path from trend + optional trade setup (TP target).
    """
    last_time = int(df["time"].iloc[-1])
    last_close = float(df["close"].iloc[-1])
    atr = _atr(df)
    interval = TF_SECONDS.get(tf, 14_400)

    if trade_setup:
        target = trade_setup.take_profit
        direction: TrendDir = trade_setup.direction
    elif trend == "bullish":
        target = last_close + 3.0 * atr
        direction = "bullish"
    elif trend == "bearish":
        target = last_close - 3.0 * atr
        direction = "bearish"
    else:
        target = last_close
        direction = "neutral"

    path: list[dict] = []
    candles: list[dict] = []
    prev_close = last_close

    for i in range(1, bars + 1):
        t = last_time + i * interval
        progress = i / bars
        if direction == "neutral":
            close = last_close + atr * 0.35 * math.sin(progress * math.pi * 1.5)
        else:
            close = last_close + (target - last_close) * progress

        open_ = prev_close
        high = max(open_, close) + atr * 0.22
        low = min(open_, close) - atr * 0.22
        prev_close = close

        path.append({"time": t, "value": round(close, 6)})
        candles.append({
            "time": t,
            "open": round(open_, 6),
            "high": round(high, 6),
            "low": round(low, 6),
            "close": round(close, 6),
        })

    return {
        "direction": direction,
        "target_price": round(target, 6),
        "bars": bars,
        "path": path,
        "candles": candles,
    }


def build_ema_series(df: pd.DataFrame, periods: tuple[int, ...] = (20, 50)) -> list[dict]:
    """EMA line points aligned to candle times."""
    out: list[dict] = []
    close = df["close"]
    times = df["time"].astype(int)
    for period in periods:
        ema = close.ewm(span=period, adjust=False).mean()
        points = [
            {"time": int(times.iloc[i]), "value": round(float(ema.iloc[i]), 6)}
            for i in range(len(df))
            if not pd.isna(ema.iloc[i])
        ]
        out.append({"period": period, "points": points})
    return out
