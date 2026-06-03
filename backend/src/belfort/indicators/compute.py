"""
Indicator computation layer.

TA-Lib is the primary engine. If it is not installed, pandas-ta-classic is
used as a transparent fallback for all common indicators.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

# ---------------------------------------------------------------------------
# Try TA-Lib; fall back to pandas-ta-classic
# ---------------------------------------------------------------------------
try:
    import talib as _talib

    TALIB_AVAILABLE = True
except ImportError:  # pragma: no cover
    _talib = None  # type: ignore[assignment]
    TALIB_AVAILABLE = False

try:
    import pandas_ta as _pta  # pandas-ta-classic

    PTA_AVAILABLE = True
except ImportError:  # pragma: no cover
    _pta = None  # type: ignore[assignment]
    PTA_AVAILABLE = False


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _o(df: pd.DataFrame) -> np.ndarray:
    return df["open"].to_numpy(dtype=float)

def _h(df: pd.DataFrame) -> np.ndarray:
    return df["high"].to_numpy(dtype=float)

def _l(df: pd.DataFrame) -> np.ndarray:
    return df["low"].to_numpy(dtype=float)

def _c(df: pd.DataFrame) -> np.ndarray:
    return df["close"].to_numpy(dtype=float)

def _v(df: pd.DataFrame) -> np.ndarray:
    return df["volume"].to_numpy(dtype=float)


# ---------------------------------------------------------------------------
# Public indicator functions (return pd.Series aligned to df.index)
# ---------------------------------------------------------------------------

def rsi(df: pd.DataFrame, period: int = 14) -> pd.Series:
    if TALIB_AVAILABLE:
        return pd.Series(_talib.RSI(_c(df), timeperiod=period), index=df.index, name="RSI")
    return df.ta.rsi(length=period).rename("RSI")


def macd(df: pd.DataFrame, fast: int = 12, slow: int = 26, signal: int = 9) -> pd.DataFrame:
    """Returns DataFrame with columns: MACD, MACD_signal, MACD_hist."""
    if TALIB_AVAILABLE:
        m, s, h = _talib.MACD(_c(df), fastperiod=fast, slowperiod=slow, signalperiod=signal)
        return pd.DataFrame({"MACD": m, "MACD_signal": s, "MACD_hist": h}, index=df.index)
    result = df.ta.macd(fast=fast, slow=slow, signal=signal)
    result.columns = ["MACD", "MACD_hist", "MACD_signal"]
    return result[["MACD", "MACD_signal", "MACD_hist"]]


def adx(df: pd.DataFrame, period: int = 14) -> pd.Series:
    if TALIB_AVAILABLE:
        return pd.Series(_talib.ADX(_h(df), _l(df), _c(df), timeperiod=period), index=df.index, name="ADX")
    return df.ta.adx(length=period).iloc[:, 0].rename("ADX")


def atr(df: pd.DataFrame, period: int = 14) -> pd.Series:
    if TALIB_AVAILABLE:
        return pd.Series(_talib.ATR(_h(df), _l(df), _c(df), timeperiod=period), index=df.index, name="ATR")
    return df.ta.atr(length=period).rename("ATR")


def bbands(df: pd.DataFrame, period: int = 20, nbdev: float = 2.0) -> pd.DataFrame:
    """Returns DataFrame with columns: BB_upper, BB_mid, BB_lower."""
    if TALIB_AVAILABLE:
        u, m, lo = _talib.BBANDS(_c(df), timeperiod=period, nbdevup=nbdev, nbdevdn=nbdev)
        return pd.DataFrame({"BB_upper": u, "BB_mid": m, "BB_lower": lo}, index=df.index)
    result = df.ta.bbands(length=period, std=nbdev)
    cols = result.columns.tolist()
    return pd.DataFrame(
        {"BB_upper": result[cols[2]], "BB_mid": result[cols[1]], "BB_lower": result[cols[0]]},
        index=df.index,
    )


def obv(df: pd.DataFrame) -> pd.Series:
    if TALIB_AVAILABLE:
        return pd.Series(_talib.OBV(_c(df), _v(df)), index=df.index, name="OBV")
    return df.ta.obv().rename("OBV")


def sar(df: pd.DataFrame, acceleration: float = 0.02, maximum: float = 0.2) -> pd.Series:
    if TALIB_AVAILABLE:
        return pd.Series(
            _talib.SAR(_h(df), _l(df), acceleration=acceleration, maximum=maximum),
            index=df.index,
            name="SAR",
        )
    return df.ta.psar()["PSARl_0.02_0.2"].rename("SAR")


def stoch(df: pd.DataFrame, k: int = 14, d: int = 3, smooth_k: int = 3) -> pd.DataFrame:
    if TALIB_AVAILABLE:
        sk, sd = _talib.STOCH(
            _h(df), _l(df), _c(df),
            fastk_period=k, slowk_period=smooth_k, slowd_period=d,
        )
        return pd.DataFrame({"STOCH_k": sk, "STOCH_d": sd}, index=df.index)
    result = df.ta.stoch(k=k, d=d, smooth_k=smooth_k)
    cols = result.columns.tolist()
    return pd.DataFrame({"STOCH_k": result[cols[0]], "STOCH_d": result[cols[1]]}, index=df.index)


def sma(df: pd.DataFrame, period: int) -> pd.Series:
    if TALIB_AVAILABLE:
        return pd.Series(_talib.SMA(_c(df), timeperiod=period), index=df.index, name=f"SMA_{period}")
    return df.ta.sma(length=period).rename(f"SMA_{period}")


def ema(df: pd.DataFrame, period: int) -> pd.Series:
    if TALIB_AVAILABLE:
        return pd.Series(_talib.EMA(_c(df), timeperiod=period), index=df.index, name=f"EMA_{period}")
    return df.ta.ema(length=period).rename(f"EMA_{period}")


def williams_r(df: pd.DataFrame, period: int = 14) -> pd.Series:
    if TALIB_AVAILABLE:
        return pd.Series(_talib.WILLR(_h(df), _l(df), _c(df), timeperiod=period), index=df.index, name="WILLR")
    return df.ta.willr(length=period).rename("WILLR")


def cci(df: pd.DataFrame, period: int = 14) -> pd.Series:
    if TALIB_AVAILABLE:
        return pd.Series(_talib.CCI(_h(df), _l(df), _c(df), timeperiod=period), index=df.index, name="CCI")
    return df.ta.cci(length=period).rename("CCI")


def compute_all(df: pd.DataFrame) -> pd.DataFrame:
    """
    Add all standard indicators as columns to a copy of *df*.
    Returns enriched DataFrame.
    """
    out = df.copy()
    out["RSI"] = rsi(df)
    _macd = macd(df)
    out["MACD"] = _macd["MACD"]
    out["MACD_signal"] = _macd["MACD_signal"]
    out["MACD_hist"] = _macd["MACD_hist"]
    out["ADX"] = adx(df)
    out["ATR"] = atr(df)
    _bb = bbands(df)
    out["BB_upper"] = _bb["BB_upper"]
    out["BB_mid"] = _bb["BB_mid"]
    out["BB_lower"] = _bb["BB_lower"]
    out["OBV"] = obv(df)
    out["SAR"] = sar(df)
    _st = stoch(df)
    out["STOCH_k"] = _st["STOCH_k"]
    out["STOCH_d"] = _st["STOCH_d"]
    out["SMA_20"] = sma(df, 20)
    out["SMA_50"] = sma(df, 50)
    out["SMA_200"] = sma(df, 200)
    out["EMA_9"] = ema(df, 9)
    out["EMA_21"] = ema(df, 21)
    out["WILLR"] = williams_r(df)
    out["CCI"] = cci(df)
    return out
