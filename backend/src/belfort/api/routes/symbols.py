"""Routes for symbol initialization (cold-start orchestration)."""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Query

from belfort.jobs import queue as q

router = APIRouter()

HistoryParam = Literal["2y", "5y", "max"]


@router.post("/symbols/{symbol}/init")
async def init_symbol(
    symbol: str,
    tf: str = Query("4h"),
    history: HistoryParam = Query("5y"),
):
    """
    Cold-start orchestrator: enqueues data_fetch + backtest_quick for a symbol.

    Returns job IDs so the frontend can poll progress.
    """
    data_job_id = q.enqueue("data_fetch", {
        "symbol": symbol,
        "tf": tf,
        "history": history,
    })
    backtest_job_id = q.enqueue("backtest_quick", {
        "symbol": symbol,
        "tf": tf,
    })
    return {
        "symbol": symbol,
        "tf": tf,
        "history": history,
        "data_job_id": data_job_id,
        "backtest_job_id": backtest_job_id,
        "status": "queued",
    }
