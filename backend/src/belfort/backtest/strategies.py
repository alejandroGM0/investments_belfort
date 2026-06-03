"""
Strategy definition for backtesting.

A strategy takes:
  - entry signals (Series of +1/-1)
  - OHLCV DataFrame (with ATR already computed)
  - params dict
And returns entry/exit boolean Series for VectorBT.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from belfort.indicators import compute as ind


def build_entries_exits(
    df: pd.DataFrame,
    signal: pd.Series,
    sl_atr: float = 1.5,
    tp_rr: float = 2.0,
    filter_trend: str = "none",  # none | sma200 | adx25
    filter_rsi: str = "none",    # none | oversold | overbought
    holding_bars_max: int | None = 50,
    direction: int = 1,          # +1 long, -1 short (not yet used in MVP)
) -> tuple[pd.Series, pd.Series, pd.Series, pd.Series]:
    """
    Returns (long_entries, long_exits, sl_stop, tp_stop) boolean/price Series.

    sl_stop and tp_stop are prices computed bar-by-bar for VectorBT stop signals.
    """
    entries = (signal == 1) if direction == 1 else (signal == -1)

    # --- Trend filter ---
    if filter_trend == "sma200" and len(df) >= 200:
        sma200 = ind.sma(df, 200)
        entries = entries & (df["close"] > sma200)
    elif filter_trend == "adx25":
        adx_s = ind.adx(df)
        entries = entries & (adx_s >= 25)

    # --- RSI filter ---
    if filter_rsi != "none":
        rsi_s = ind.rsi(df)
        if filter_rsi == "oversold":
            entries = entries & (rsi_s < 40)
        elif filter_rsi == "overbought":
            entries = entries & (rsi_s > 60)

    # Force boolean
    entries = entries.fillna(False).astype(bool)

    # Simple time-based exit (holding_bars_max)
    if holding_bars_max is not None:
        exits = entries.shift(holding_bars_max).fillna(False).astype(bool)
    else:
        exits = pd.Series(False, index=df.index)

    # ATR-based SL/TP prices (per bar; VectorBT uses SLTP order)
    atr_s = ind.atr(df).fillna(0)
    sl_prices = (df["close"] - sl_atr * atr_s).where(entries, np.nan)
    tp_prices = (df["close"] + sl_atr * tp_rr * atr_s).where(entries, np.nan)

    return entries, exits, sl_prices, tp_prices
