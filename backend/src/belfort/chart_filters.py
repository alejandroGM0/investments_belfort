"""Filtering helpers for chart markers and overlays."""

from __future__ import annotations

from typing import Literal

from belfort.analysis import AnalysisReport, Level

PatternStatusFilter = Literal["highlight", "active", "recent", "active_recent", "all"]
PatternDirectionFilter = Literal["all", "bull", "bear"]

PATTERN_CATEGORIES = frozenset({
    "candles",
    "chart_patterns",
    "trend",
    "structure",
    "indicators",
    "levels",
})


def parse_categories(raw: str | None) -> set[str] | None:
    if not raw or raw.strip().lower() == "all":
        return None
    parts = {p.strip() for p in raw.split(",") if p.strip()}
    valid = parts & PATTERN_CATEGORIES
    return valid or None


def _direction_matches(pattern_direction: int, direction_filter: PatternDirectionFilter) -> bool:
    if direction_filter == "all":
        return True
    if direction_filter == "bull":
        return pattern_direction == 1
    return pattern_direction == -1


def _status_matches(status: str, status_filter: PatternStatusFilter) -> bool:
    if status_filter == "all":
        return True
    if status_filter == "highlight":
        return False
    if status_filter == "active":
        return status == "active"
    if status_filter == "recent":
        return status == "recent"
    return status in ("active", "recent")


def pattern_ids_to_scan(
    report: AnalysisReport,
    *,
    status_filter: PatternStatusFilter = "active_recent",
    min_confidence: float = 0.35,
    categories: set[str] | None = None,
    direction_filter: PatternDirectionFilter = "all",
) -> set[str]:
    if status_filter == "highlight":
        return {p.pattern_id for p in report.highlights}

    ids: set[str] = set()
    for p in report.patterns:
        if p.confidence < min_confidence:
            continue
        if categories and p.category not in categories:
            continue
        if not _direction_matches(p.direction, direction_filter):
            continue
        if not _status_matches(p.status, status_filter):
            continue
        ids.add(p.pattern_id)
    return ids


def filter_levels(
    levels: list[Level],
    *,
    min_strength: float = 0.0,
    max_per_type: int = 5,
) -> list[Level]:
    supports = [
        lv for lv in levels
        if lv.level_type == "support" and lv.strength >= min_strength
    ]
    resistances = [
        lv for lv in levels
        if lv.level_type == "resistance" and lv.strength >= min_strength
    ]
    supports.sort(key=lambda lv: -lv.strength)
    resistances.sort(key=lambda lv: -lv.strength)
    cap = max(1, min(max_per_type, 20))
    return supports[:cap] + resistances[:cap]
