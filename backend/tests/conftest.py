"""Shared fixtures for all tests."""

from __future__ import annotations

import os
import tempfile

import numpy as np
import pandas as pd
import pytest


def pytest_configure(config):
    """Point belfort at temporary directories so tests don't conflict with a running server."""
    tmp = tempfile.mkdtemp(prefix="belfort_test_")
    os.environ.setdefault("BELFORT_DATA_DIR", tmp)
    os.environ.setdefault("BELFORT_DB_PATH", os.path.join(tmp, "results.duckdb"))


def _ohlcv(n: int = 100, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    price = 60_000.0
    rows = []
    for i in range(n):
        o = price * (1 + rng.uniform(-0.005, 0.005))
        h = o * (1 + rng.uniform(0, 0.01))
        lo = o * (1 - rng.uniform(0, 0.01))
        c = rng.uniform(lo, h)
        v = rng.uniform(100, 1000)
        rows.append([i * 3600, o, h, lo, c, v])
        price = c
    df = pd.DataFrame(rows, columns=["time", "open", "high", "low", "close", "volume"])
    return df


def _bullish_ohlcv(n: int = 100) -> pd.DataFrame:
    """Strongly uptrending OHLCV."""
    rows = []
    price = 50_000.0
    for i in range(n):
        o = price
        h = o * 1.01
        lo = o * 0.995
        c = o * 1.005
        rows.append([i * 3600, o, h, lo, c, 500.0])
        price = c
    return pd.DataFrame(rows, columns=["time", "open", "high", "low", "close", "volume"])


def _bearish_ohlcv(n: int = 100) -> pd.DataFrame:
    """Strongly downtrending OHLCV."""
    rows = []
    price = 70_000.0
    for i in range(n):
        o = price
        h = o * 1.005
        lo = o * 0.99
        c = o * 0.995
        rows.append([i * 3600, o, h, lo, c, 500.0])
        price = c
    return pd.DataFrame(rows, columns=["time", "open", "high", "low", "close", "volume"])


@pytest.fixture
def df_random() -> pd.DataFrame:
    return _ohlcv()


@pytest.fixture
def df_bullish() -> pd.DataFrame:
    return _bullish_ohlcv()


@pytest.fixture
def df_bearish() -> pd.DataFrame:
    return _bearish_ohlcv()


@pytest.fixture
def df_hammer() -> pd.DataFrame:
    """DataFrame with a clear hammer candle at the end."""
    df = _ohlcv(50)
    # Append a synthetic hammer: small body at top, long lower wick
    last_close = float(df["close"].iloc[-1])
    hammer_open = last_close * 1.002
    hammer_close = last_close * 1.001
    hammer_low = last_close * 0.97   # long lower shadow
    hammer_high = last_close * 1.003
    row = pd.DataFrame([[df["time"].iloc[-1] + 3600, hammer_open, hammer_high,
                         hammer_low, hammer_close, 300.0]],
                       columns=df.columns)
    return pd.concat([df, row], ignore_index=True)


@pytest.fixture
def df_engulfing() -> pd.DataFrame:
    """DataFrame with a clear bullish engulfing at the end."""
    df = _ohlcv(50)
    t = int(df["time"].iloc[-1])
    # Bearish candle
    b_open = 60_100.0
    b_close = 59_800.0
    b_high = 60_150.0
    b_low = 59_750.0
    # Bullish engulfing (open below prev close, close above prev open)
    e_open = 59_700.0
    e_close = 60_200.0
    e_high = 60_250.0
    e_low = 59_650.0
    rows = pd.DataFrame(
        [[t + 3600, b_open, b_high, b_low, b_close, 300.0],
         [t + 7200, e_open, e_high, e_low, e_close, 500.0]],
        columns=df.columns,
    )
    return pd.concat([df, rows], ignore_index=True)
