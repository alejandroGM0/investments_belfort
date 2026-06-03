"""Tests for chart pattern/level filtering."""

from __future__ import annotations

from belfort.analysis import AnalysisReport, DetectedPattern
from belfort.chart_filters import parse_categories, pattern_ids_to_scan


def _pattern(pid: str, *, status="active", conf=0.8, cat="candles", direction=1):
    return DetectedPattern(
        pattern_id=pid,
        name=pid,
        category=cat,
        direction=direction,
        bar_time=1,
        confidence=conf,
        highlight=False,
        description="",
        status=status,
    )


def _report(patterns: list[DetectedPattern], highlights: list[DetectedPattern] | None = None):
    return AnalysisReport(
        symbol="BTCUSDT",
        tf="4h",
        updated_at="",
        trend="bullish",
        trend_strength=50,
        confluence_score=60,
        patterns=patterns,
        highlights=highlights or [],
        indicators=[],
        levels=[],
        trade_setup=None,
        timeframe_trends={},
    )


def test_parse_categories():
    assert parse_categories(None) is None
    assert parse_categories("candles,trend") == {"candles", "trend"}


def test_pattern_ids_active_only():
    report = _report([
        _pattern("a", status="active", conf=0.9),
        _pattern("b", status="recent", conf=0.9),
        _pattern("c", status="inactive", conf=0.9),
    ])
    ids = pattern_ids_to_scan(report, status_filter="active", min_confidence=0.5)
    assert ids == {"a"}


def test_pattern_ids_highlight_mode():
    hi = _pattern("h", status="inactive", conf=0.1)
    report = _report([_pattern("x")], highlights=[hi])
    ids = pattern_ids_to_scan(report, status_filter="highlight")
    assert ids == {"h"}
