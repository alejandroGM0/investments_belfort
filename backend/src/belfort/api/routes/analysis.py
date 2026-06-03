from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, HTTPException, Query

from belfort.analysis import run as run_analysis
from belfort.api.mappers import report_to_analysis_response
from belfort.chart_filters import (
    PatternDirectionFilter,
    PatternStatusFilter,
    filter_levels,
    parse_categories,
    pattern_ids_to_scan,
)
from belfort.chart_overlays import build_ema_series, build_projection
from belfort.data.loader import load as load_ohlcv
from belfort.indicators.compute import compute_all
from belfort.jobs import queue as q
from belfort.patterns import registry as reg
from belfort.storage.db import has_any_results

router = APIRouter()

HistoryParam = Literal["2y", "5y", "max"]


@router.get("/analysis/{symbol}")
async def get_analysis(
    symbol: str,
    tf: str = Query("4h"),
    history: HistoryParam = Query("5y"),
    category: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
):
    try:
        report = run_analysis(symbol, tf, since=history)
    except ValueError as e:
        raise HTTPException(404, str(e))
    except Exception as e:
        raise HTTPException(500, f"Analysis failed: {e}")

    response = report_to_analysis_response(report, page, page_size, category)

    # Auto-trigger quick backtest on cold start
    if not has_any_results(symbol, tf):
        bt_job_id = q.enqueue("backtest_quick", {"symbol": symbol, "tf": tf})
        response["backtest_status"] = "pending"
        response["backtest_job_id"] = bt_job_id
    else:
        response["backtest_status"] = "ready"

    return response


def _pattern_marker(pattern_id: str, name: str, direction: int, bar_time: int) -> dict:
    return {
        "time": bar_time,
        "position": "belowBar" if direction == 1 else "aboveBar",
        "shape": "arrowUp" if direction == 1 else "arrowDown",
        "color": "#26a69a" if direction == 1 else "#ef5350",
        "text": name[:20],
        "pattern_id": pattern_id,
    }


@router.get("/analysis/{symbol}/chart-markers")
async def get_chart_markers(
    symbol: str,
    tf: str = Query("4h"),
    from_ts: int | None = Query(None, alias="from"),
    to_ts: int | None = Query(None, alias="to"),
    min_confidence: float = Query(0.35, ge=0, le=1),
    pattern_status: PatternStatusFilter = Query("active_recent"),
    pattern_direction: PatternDirectionFilter = Query("all"),
    categories: str | None = Query(None, description="Comma-separated categories or 'all'"),
    max_markers: int = Query(80, ge=5, le=200),
    history: HistoryParam = Query("5y"),
):
    try:
        report = run_analysis(symbol, tf, since=history)
        df = load_ohlcv(symbol, tf, since=history)
    except ValueError as e:
        raise HTTPException(404, str(e))

    if df.empty:
        return []

    df_enriched = compute_all(df)
    cat_set = parse_categories(categories)
    scan_ids = pattern_ids_to_scan(
        report,
        status_filter=pattern_status,
        min_confidence=min_confidence,
        categories=cat_set,
        direction_filter=pattern_direction,
    )

    markers: list[dict] = []
    seen: set[tuple[str, int]] = set()

    for spec in reg.REGISTRY:
        if spec.id not in scan_ids:
            continue
        if cat_set and spec.category not in cat_set:
            continue
        try:
            series = spec.detect(df_enriched)
        except Exception:
            continue
        fired = series[series != 0]
        if fired.empty:
            continue
        for idx in fired.index[-80:]:
            bar_time = int(df_enriched["time"].iloc[idx])
            if from_ts and bar_time < from_ts:
                continue
            if to_ts and bar_time > to_ts:
                continue
            direction = int(series.iloc[idx])
            if pattern_direction == "bull" and direction != 1:
                continue
            if pattern_direction == "bear" and direction != -1:
                continue
            key = (spec.id, bar_time)
            if key in seen:
                continue
            seen.add(key)
            markers.append(_pattern_marker(spec.id, spec.name, direction, bar_time))
            if len(markers) >= max_markers:
                break
        if len(markers) >= max_markers:
            break

    markers.sort(key=lambda m: m["time"])
    return markers


@router.get("/analysis/{symbol}/chart-overlays")
async def get_chart_overlays(
    symbol: str,
    tf: str = Query("4h"),
    history: HistoryParam = Query("5y"),
    projection_bars: int = Query(16, ge=4, le=48),
    min_level_strength: float = Query(0.0, ge=0, le=1),
    max_levels_per_side: int = Query(5, ge=1, le=20),
    min_confluence: int = Query(0, ge=0, le=100),
):
    try:
        report = run_analysis(symbol, tf, since=history)
        df = load_ohlcv(symbol, tf, since=history)
    except ValueError as e:
        raise HTTPException(404, str(e))
    if df.empty:
        raise HTTPException(404, f"No data for {symbol}/{tf}")

    show_projection = report.confluence_score >= min_confluence
    projection = (
        build_projection(df, tf, report.trend, report.trade_setup, bars=projection_bars)
        if show_projection
        else None
    )
    ema = build_ema_series(df)

    trade_setup = None
    if report.trade_setup and show_projection:
        ts = report.trade_setup
        trade_setup = {
            "entry": ts.entry,
            "stop_loss": ts.stop_loss,
            "take_profit": ts.take_profit,
            "risk_reward": ts.risk_reward,
            "direction": ts.direction,
        }

    filtered_levels = filter_levels(
        report.levels,
        min_strength=min_level_strength,
        max_per_type=max_levels_per_side,
    )

    return {
        "symbol": symbol,
        "tf": tf,
        "trend": report.trend,
        "confluence_score": report.confluence_score,
        "projection": projection,
        "ema": ema,
        "levels": [
            {"price": lv.price, "type": lv.level_type, "strength": lv.strength}
            for lv in filtered_levels
        ],
        "trade_setup": trade_setup,
    }


@router.get("/analysis/{symbol}/patterns/all")
async def get_all_patterns(
    symbol: str,
    tf: str = Query("4h"),
    history: HistoryParam = Query("5y"),
):
    """Return status of all ~80 patterns (active/recent/inactive) — not just last-bar active."""
    from belfort.data.loader import load as load_ohlcv
    from belfort.indicators.compute import compute_all
    from belfort.patterns import registry as reg

    df = load_ohlcv(symbol, tf, since=history)
    if df.empty:
        raise HTTPException(404, f"No data for {symbol}/{tf}")

    df_enriched = compute_all(df)
    last_bar_time = int(df["time"].iloc[-1])

    result = []
    for spec in reg.REGISTRY:
        try:
            series = spec.detect(df_enriched)
        except Exception:
            continue

        # Check last bar
        last_val = int(series.iloc[-1])

        # Count occurrences in last 100 bars
        recent_window = series.tail(100)
        occurrences_100 = int((recent_window != 0).sum())

        # Find most recent activation bar
        active_bars = series[series != 0]
        if not active_bars.empty:
            last_idx = active_bars.index[-1]
            bars_since = len(df) - 1 - last_idx
        else:
            bars_since = -1  # never

        # Determine status
        if last_val != 0:
            status = "active"
        elif bars_since >= 0 and bars_since <= 5:
            status = "recent"
        else:
            status = "inactive"

        result.append({
            "id": spec.id,
            "name": spec.name,
            "category": spec.category,
            "status": status,
            "direction": last_val,
            "last_occurrence_bars_ago": int(bars_since) if bars_since >= 0 else None,
            "occurrences_last_100_bars": occurrences_100,
            "description": spec.description,
        })

    return {
        "symbol": symbol,
        "tf": tf,
        "total_patterns": len(result),
        "active": sum(1 for p in result if p["status"] == "active"),
        "recent": sum(1 for p in result if p["status"] == "recent"),
        "inactive": sum(1 for p in result if p["status"] == "inactive"),
        "patterns": result,
    }


@router.post("/analysis/{symbol}/refresh")
async def refresh_analysis(symbol: str, tf: str = Query("4h")):
    job_id = q.enqueue("analyze", {"symbol": symbol, "tf": tf})
    return {"job_id": job_id, "status": "queued"}
