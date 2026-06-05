"""Prepare OHLCV DataFrames for backtesting (datetime index from `time`)."""

from __future__ import annotations

import pandas as pd


def prepare_backtest_df(df: pd.DataFrame) -> pd.DataFrame:
    """
    Belfort OHLCV uses a RangeIndex with a `time` unix column.
    Backtests need a stable datetime index for equity curve labels.
    """
    if df.empty:
        return df
    out = df.copy()
    if "time" in out.columns:
        try:
            ts = pd.to_datetime(out["time"].astype("int64"), unit="s", utc=True)
            out = out.set_index(ts)
        except (TypeError, ValueError, OverflowError):
            pass
    return out
