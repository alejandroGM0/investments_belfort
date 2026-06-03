"""Tests: binance._parse_since supports 'max' and standard durations."""

from __future__ import annotations

import pytest
from datetime import datetime, timezone

from belfort.data.binance import _parse_since


def test_parse_since_2y():
    result = _parse_since("2y")
    assert isinstance(result, int)
    # Should be approximately 2 years ago in milliseconds
    now_ms = int(datetime.now(tz=timezone.utc).timestamp() * 1000)
    two_years_ms = 2 * 365 * 24 * 3600 * 1000
    assert abs(result - (now_ms - two_years_ms)) < 60_000  # within 1 minute


def test_parse_since_5y():
    result = _parse_since("5y")
    assert isinstance(result, int)
    now_ms = int(datetime.now(tz=timezone.utc).timestamp() * 1000)
    five_years_ms = 5 * 365 * 24 * 3600 * 1000
    assert abs(result - (now_ms - five_years_ms)) < 60_000


def test_parse_since_6m():
    result = _parse_since("6m")
    assert isinstance(result, int)
    now_ms = int(datetime.now(tz=timezone.utc).timestamp() * 1000)
    six_months_ms = 6 * 30 * 24 * 3600 * 1000
    assert abs(result - (now_ms - six_months_ms)) < 60_000


def test_parse_since_90d():
    result = _parse_since("90d")
    assert isinstance(result, int)
    now_ms = int(datetime.now(tz=timezone.utc).timestamp() * 1000)
    ninety_days_ms = 90 * 24 * 3600 * 1000
    assert abs(result - (now_ms - ninety_days_ms)) < 60_000


def test_parse_since_max_returns_none():
    result = _parse_since("max")
    assert result is None


def test_parse_since_MAX_case_insensitive():
    assert _parse_since("MAX") is None
    assert _parse_since("Max") is None


def test_parse_since_invalid_unit_raises():
    with pytest.raises(ValueError, match="Unknown duration unit"):
        _parse_since("5x")


def test_parse_since_returns_past_timestamp():
    """All non-max values should return a timestamp in the past."""
    now_ms = int(datetime.now(tz=timezone.utc).timestamp() * 1000)
    for since in ("1y", "2y", "5y", "1m", "6m", "30d", "90d"):
        result = _parse_since(since)
        assert result is not None
        assert result < now_ms, f"{since} should return past timestamp"


def test_parse_since_ordering():
    """Longer durations should produce earlier timestamps."""
    t_1y = _parse_since("1y")
    t_2y = _parse_since("2y")
    t_5y = _parse_since("5y")
    assert t_5y < t_2y < t_1y
