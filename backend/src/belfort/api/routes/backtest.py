from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from belfort.jobs import queue as q
from belfort.storage.db import best_run, has_any_results, top_runs

router = APIRouter()


@router.get("/backtest/{symbol}")
async def get_backtest(
    symbol: str,
    tf: str = Query("4h"),
    strategy: str = Query("v1"),
):
    if not has_any_results(symbol, tf):
        return {
            "symbol": symbol,
            "strategy": strategy,
            "tf": tf,
            "metrics": {
                "total_trades": 0,
                "win_rate": 0.0,
                "profit_factor": 0.0,
                "max_drawdown": 0.0,
                "sharpe": 0.0,
                "avg_return": 0.0,
            },
            "equity_curve": [],
            "updated_at": None,
            "note": "No backtest results yet. Run: belfort backtest all",
        }

    rows = top_runs(symbol, tf, n=1, sort_by="sharpe")
    if not rows:
        raise HTTPException(404, "No backtest results found")

    best = rows[0]
    return {
        "symbol": symbol,
        "strategy": strategy,
        "tf": tf,
        "metrics": {
            "total_trades": best["total_trades"],
            "win_rate": best["win_rate"],
            "profit_factor": best["profit_factor"],
            "max_drawdown": best["max_drawdown"],
            "sharpe": best["sharpe"],
            "avg_return": best["avg_return"],
        },
        "equity_curve": [],
        "updated_at": None,
    }


@router.post("/backtest/{symbol}/refresh")
async def refresh_backtest(
    symbol: str,
    tf: str = Query("4h"),
    workers: int = Query(1),
):
    job_id = q.enqueue("backtest", {"symbol": symbol, "tf": tf, "workers": workers})
    return {"job_id": job_id, "status": "queued"}
