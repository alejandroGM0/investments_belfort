from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from belfort.analysis import run as run_analysis
from belfort.api.mappers import report_to_analysis_response
from belfort.jobs import queue as q

router = APIRouter()


@router.get("/analysis/{symbol}")
async def get_analysis(
    symbol: str,
    tf: str = Query("4h"),
    category: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
):
    try:
        report = run_analysis(symbol, tf)
    except ValueError as e:
        raise HTTPException(404, str(e))
    except Exception as e:
        raise HTTPException(500, f"Analysis failed: {e}")

    return report_to_analysis_response(report, page, page_size, category)


@router.get("/analysis/{symbol}/chart-markers")
async def get_chart_markers(
    symbol: str,
    tf: str = Query("4h"),
    from_ts: int | None = Query(None, alias="from"),
    to_ts: int | None = Query(None, alias="to"),
    min_confidence: float = Query(0.6),
):
    try:
        report = run_analysis(symbol, tf)
    except ValueError as e:
        raise HTTPException(404, str(e))

    markers = []
    for p in report.patterns:
        if p.confidence < min_confidence:
            continue
        if from_ts and p.bar_time < from_ts:
            continue
        if to_ts and p.bar_time > to_ts:
            continue
        direction = "bull" if p.direction == 1 else "bear"
        markers.append({
            "time": p.bar_time,
            "position": "belowBar" if p.direction == 1 else "aboveBar",
            "shape": "arrowUp" if p.direction == 1 else "arrowDown",
            "color": "#26a69a" if p.direction == 1 else "#ef5350",
            "text": p.name[:20],
            "pattern_id": p.pattern_id,
        })
    return markers


@router.post("/analysis/{symbol}/refresh")
async def refresh_analysis(symbol: str, tf: str = Query("4h")):
    job_id = q.enqueue("analyze", {"symbol": symbol, "tf": tf})
    return {"job_id": job_id, "status": "queued"}
