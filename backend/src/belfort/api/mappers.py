"""
Convert internal dataclasses to the dicts matching contracts/openapi.yaml schemas.
"""

from __future__ import annotations

from belfort.analysis import AnalysisReport, DetectedPattern, Level


def pattern_to_dict(p: DetectedPattern, tf: str) -> dict:
    direction = "bull" if p.direction == 1 else ("bear" if p.direction == -1 else "neutral")
    return {
        "id": p.pattern_id,
        "name": p.name,
        "category": p.category,
        "direction": direction,
        "bar_time": p.bar_time,
        "confidence": round(p.confidence, 3),
        "active": True,
        "description": p.description,
        "tf": tf,
        "highlight": p.highlight,
    }


def level_to_dict(lv: Level) -> dict:
    return {
        "price": lv.price,
        "type": lv.level_type,
        "strength": round(lv.strength, 3),
    }


def report_to_analysis_response(report: AnalysisReport, page: int, page_size: int, category: str | None) -> dict:
    # Flatten and optionally filter patterns
    all_patterns = report.patterns
    if category:
        all_patterns = [p for p in all_patterns if p.category == category]

    total = len(all_patterns)
    start = (page - 1) * page_size
    paged = all_patterns[start: start + page_size]

    # Group patterns by category for the groups[] field
    cat_order = ["candles", "chart_patterns", "structure", "indicators", "levels"]
    groups_dict: dict[str, list] = {c: [] for c in cat_order}
    for p in report.patterns:
        if p.category in groups_dict:
            groups_dict[p.category].append(p)

    groups = [
        {
            "category": cat,
            "count": len(items),
            "items": [pattern_to_dict(p, report.tf) for p in items[:10]],  # max 10 preview
        }
        for cat, items in groups_dict.items()
        if items
    ]

    highlights = [pattern_to_dict(p, report.tf) for p in report.highlights]

    summary = {
        "trend": report.trend,
        "trend_strength": report.trend_strength,
        "confluence_score": report.confluence_score,
        "highlights": highlights,
        "timeframe_analysis": {
            tf: {"trend": v["trend"], "strength": v["strength"]}
            for tf, v in report.timeframe_trends.items()
        },
    }

    if report.trade_setup:
        summary["trade_setup"] = {
            "entry": report.trade_setup.entry,
            "stop_loss": report.trade_setup.stop_loss,
            "take_profit": report.trade_setup.take_profit,
            "risk_reward": report.trade_setup.risk_reward,
            "direction": report.trade_setup.direction,
        }

    indicators = [
        {
            "name": ind.name,
            "value": ind.value,
            "signal": ind.signal,
            "zone": ind.zone,
            "description": ind.description,
        }
        for ind in report.indicators
    ]

    return {
        "symbol": report.symbol,
        "tf": report.tf,
        "updated_at": report.updated_at,
        "summary": summary,
        "groups": groups,
        "indicators": indicators,
        "levels": [level_to_dict(lv) for lv in report.levels],
        "pagination": {
            "total": total,
            "page": page,
            "page_size": page_size,
        },
    }
