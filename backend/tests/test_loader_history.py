"""Tests for OHLCV loader history depth extension."""

from __future__ import annotations

from unittest.mock import patch

import pandas as pd

from belfort.data import loader


def _df_from_years_back(years: float, n: int = 100) -> pd.DataFrame:
    now = int(pd.Timestamp.utcnow().timestamp())
    start = now - int(years * 365.25 * 24 * 3600)
    times = [start + i * 3600 for i in range(n)]
    return pd.DataFrame(
        {
            "time": times,
            "open": [100.0] * n,
            "high": [101.0] * n,
            "low": [99.0] * n,
            "close": [100.0] * n,
            "volume": [1.0] * n,
        }
    )


def test_needs_older_when_cache_shorter_than_requested():
    cached = _df_from_years_back(2)
    assert loader._needs_older_history(cached, "5y") is True


def test_does_not_need_older_when_cache_covers_window():
    cached = _df_from_years_back(6)
    assert loader._needs_older_history(cached, "5y") is False


def test_max_requests_extension_for_bounded_cache():
    cached = _df_from_years_back(2)
    assert loader._needs_older_history(cached, "max") is True


def test_load_extends_cache_when_user_asks_for_deeper_history():
    shallow = _df_from_years_back(2)
    deep = _df_from_years_back(6)

    with patch.object(loader.cache, "load", return_value=shallow.copy()):
        with patch.object(loader, "_needs_older_history", return_value=True):
            with patch.object(loader, "_extend_history", return_value=deep) as extend:
                with patch.object(loader.binance, "fetch") as fetch:
                    result = loader.load("BTCUSDT", "4h", since="5y", refresh=False)
                    extend.assert_called_once()
                    fetch.assert_not_called()
                    assert len(result) == len(deep)
