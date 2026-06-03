from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, HTTPException, Query

from belfort.jobs import queue as q
from belfort.patterns.registry import get as get_pattern
from belfort.storage.db import has_any_results, run_stats, top_runs

router = APIRouter()

_EMPTY_METRICS = {
    "total_trades": 0,
    "win_rate": 0.0,
    "profit_factor": 0.0,
    "max_drawdown": 0.0,
    "sharpe": 0.0,
    "avg_return": 0.0,
}


def _format_params(params: dict) -> dict:
    """Human-readable strategy params for the UI."""
    trend_labels = {
        "none": "Sin filtro de tendencia",
        "sma200": "Precio > SMA 200",
        "adx25": "ADX ≥ 25",
    }
    rsi_labels = {
        "none": "Sin filtro RSI",
        "oversold": "RSI < 40 (sobreventa)",
        "overbought": "RSI > 60 (sobrecompra)",
    }
    return {
        "sl_atr": params.get("sl_atr"),
        "tp_rr": params.get("tp_rr"),
        "filter_trend": params.get("filter_trend", "none"),
        "filter_trend_label": trend_labels.get(params.get("filter_trend", "none"), params.get("filter_trend")),
        "filter_rsi": params.get("filter_rsi", "none"),
        "filter_rsi_label": rsi_labels.get(params.get("filter_rsi", "none"), params.get("filter_rsi")),
        "holding_bars_max": params.get("holding_bars_max"),
    }


def _infer_grid_mode(last_job: dict | None, active_job: dict | None) -> str | None:
    for job in (active_job, last_job):
        if job and job.get("mode"):
            return job["mode"]
    result = (last_job or {}).get("result") or {}
    if isinstance(result, dict) and result.get("mode"):
        return result["mode"]
    return None


def _build_response(symbol: str, tf: str, strategy: str) -> dict:
    stats = run_stats(symbol, tf)
    active_job = q.job_to_summary(q.find_backtest_job(symbol, tf, active=True))
    last_job = q.job_to_summary(q.find_backtest_job(symbol, tf, active=False))

    base = {
        "symbol": symbol,
        "strategy": strategy,
        "tf": tf,
        "metrics": dict(_EMPTY_METRICS),
        "equity_curve": [],
        "updated_at": stats.get("last_run_at"),
        "run_summary": {
            "last_run_at": stats.get("last_run_at"),
            "patterns_with_results": stats["patterns_with_results"],
            "total_combos_saved": stats["total_combos_saved"],
            "grid_mode": _infer_grid_mode(last_job, active_job),
            "selection_metric": "sharpe",
        },
        "selection": None,
        "active_job": active_job,
        "last_job": last_job,
        "status": "running" if active_job else ("ready" if has_any_results(symbol, tf) else "empty"),
    }

    if active_job and not has_any_results(symbol, tf):
        mode = active_job.get("mode", "quick")
        base["note"] = f"Backtest {mode} en ejecución. Los resultados aparecerán al terminar."
        return base

    if not has_any_results(symbol, tf):
        base["note"] = "Sin resultados todavía. Se lanzará un backtest rápido automáticamente al analizar."
        return base

    rows = top_runs(symbol, tf, n=1, sort_by="sharpe")
    if not rows:
        base["note"] = "Hay datos en caché pero no se pudo leer la mejor estrategia."
        return base

    best = rows[0]
    spec = get_pattern(best["pattern_id"])

    base["metrics"] = {
        "total_trades": best["total_trades"],
        "win_rate": best["win_rate"],
        "profit_factor": best["profit_factor"],
        "max_drawdown": best["max_drawdown"],
        "sharpe": best["sharpe"],
        "avg_return": best["avg_return"],
    }
    base["equity_curve"] = best.get("equity_curve") or []
    base["updated_at"] = best.get("run_at") or stats.get("last_run_at")
    base["selection"] = {
        "pattern_id": best["pattern_id"],
        "pattern_name": spec.name if spec else best["pattern_id"],
        "pattern_category": spec.category if spec else None,
        "params": _format_params(best["params"]),
        "sort_metric": "sharpe",
        "run_at": best.get("run_at"),
    }
    base["status"] = "running" if active_job else "ready"
    return base


@router.get("/backtest/{symbol}")
async def get_backtest(
    symbol: str,
    tf: str = Query("4h"),
    strategy: str = Query("v1"),
):
    return _build_response(symbol, tf, strategy)


@router.post("/backtest/{symbol}/refresh")
async def refresh_backtest(
    symbol: str,
    tf: str = Query("4h"),
    mode: Literal["quick", "full"] = Query("quick"),
    workers: int = Query(1),
):
    if mode == "full":
        job_id = q.enqueue("backtest", {"symbol": symbol, "tf": tf, "workers": workers})
    else:
        job_id = q.enqueue("backtest_quick", {"symbol": symbol, "tf": tf})
    return {"job_id": job_id, "status": "queued", "mode": mode}
