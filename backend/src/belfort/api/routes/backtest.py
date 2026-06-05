from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, HTTPException, Query

from belfort.backtest.engine import _infer_total_return, ensure_equity_curve
from belfort.jobs import queue as q
from belfort.patterns.registry import get as get_pattern
from belfort.storage.db import has_any_results, list_runs, run_stats, top_runs

router = APIRouter()

_EMPTY_METRICS = {
    "total_trades": 0,
    "win_rate": 0.0,
    "profit_factor": 0.0,
    "max_drawdown": 0.0,
    "sharpe": 0.0,
    "avg_return": 0.0,
    "avg_win": 0.0,
    "avg_loss": 0.0,
    "expectancy": 0.0,
    "total_return": 0.0,
    "loss_rate": 0.0,
}


def _metrics_from_row(row: dict) -> dict:
    curve = row.get("equity_curve") or []
    metrics = {
        "total_trades": row.get("total_trades", 0),
        "win_rate": row.get("win_rate", 0.0),
        "profit_factor": row.get("profit_factor", 0.0),
        "max_drawdown": row.get("max_drawdown", 0.0),
        "sharpe": row.get("sharpe", 0.0),
        "avg_return": row.get("avg_return", 0.0),
        "avg_win": row.get("avg_win", 0.0),
        "avg_loss": row.get("avg_loss", 0.0),
        "expectancy": row.get("expectancy", 0.0),
        "total_return": 0.0,
        "loss_rate": row.get("loss_rate", 0.0),
    }
    metrics["total_return"] = _infer_total_return({**metrics, "total_return": row.get("total_return")})
    if not metrics["total_return"] and curve:
        try:
            metrics["total_return"] = float(curve[-1]["value"]) - 1.0
        except (KeyError, TypeError, ValueError, IndexError):
            pass
    return metrics


def _equity_for_response(row: dict, metrics: dict) -> list:
    return ensure_equity_curve(row.get("equity_curve"), metrics)


def _run_item(row: dict) -> dict:
    spec = get_pattern(row["pattern_id"])
    metrics = _metrics_from_row(row)
    curve = _equity_for_response(row, metrics)
    estimated = len(row.get("equity_curve") or []) < 2
    return {
        "run_key": f"{row['pattern_id']}:{row.get('params_hash', '')}",
        "pattern_id": row["pattern_id"],
        "pattern_name": spec.name if spec else row["pattern_id"],
        "pattern_category": spec.category if spec else None,
        "params": _format_params(row["params"]),
        "params_raw": row["params"],
        "metrics": metrics,
        "equity_curve": curve,
        "equity_curve_estimated": estimated,
        "run_at": row.get("run_at"),
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
        "top_patterns": [],
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

    rows = top_runs(symbol, tf, n=50, sort_by="sharpe")
    if not rows:
        base["note"] = "Hay datos en caché pero no se pudo leer la mejor estrategia."
        return base

    top_patterns = []
    for row in rows:
        spec = get_pattern(row["pattern_id"])
        metrics = _metrics_from_row(row)
        curve = _equity_for_response(row, metrics)
        estimated = len(row.get("equity_curve") or []) < 2
        top_patterns.append({
            "metrics": metrics,
            "equity_curve": curve,
            "equity_curve_estimated": estimated,
            "updated_at": row.get("run_at") or stats.get("last_run_at"),
            "selection": {
                "pattern_id": row["pattern_id"],
                "pattern_name": spec.name if spec else row["pattern_id"],
                "pattern_category": spec.category if spec else None,
                "params": _format_params(row["params"]),
                "params_hash": row.get("params_hash"),
                "sort_metric": "sharpe",
                "run_at": row.get("run_at"),
            },
        })
    
    base["top_patterns"] = top_patterns

    # Default best selection (backward compatibility mostly)
    best = top_patterns[0]
    base["metrics"] = best["metrics"]
    base["equity_curve"] = best["equity_curve"]
    base["updated_at"] = best["updated_at"]
    base["selection"] = best["selection"]
    base["status"] = "running" if active_job else "ready"
    return base


@router.get("/backtest/{symbol}")
async def get_backtest(
    symbol: str,
    tf: str = Query("4h"),
    strategy: str = Query("v1"),
):
    return _build_response(symbol, tf, strategy)


@router.get("/backtest/{symbol}/runs")
async def get_backtest_runs(
    symbol: str,
    tf: str = Query("4h"),
    pattern_id: str | None = Query(None),
    sort_by: str = Query("sharpe"),
    limit: int = Query(200, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """Paginated history of all saved backtest combos (grid results)."""
    rows, total = list_runs(
        symbol, tf, pattern_id=pattern_id, sort_by=sort_by, limit=limit, offset=offset
    )
    return {
        "symbol": symbol,
        "tf": tf,
        "total": total,
        "limit": limit,
        "offset": offset,
        "sort_by": sort_by,
        "pattern_id": pattern_id,
        "runs": [_run_item(r) for r in rows],
    }


@router.post("/backtest/{symbol}/refresh")
async def refresh_backtest(
    symbol: str,
    tf: str = Query("4h"),
    mode: Literal["quick", "full"] = Query("quick"),
    workers: int = Query(1),
):
    if mode == "full":
        job_id = q.enqueue("backtest", {"symbol": symbol, "tf": tf, "workers": workers})
        kind = "backtest"
    else:
        job_id = q.enqueue("backtest_quick", {"symbol": symbol, "tf": tf})
        kind = "backtest_quick"
    job = q.get(job_id)
    if job:
        return job
    return {
        "id": job_id,
        "kind": kind,
        "status": "pending",
        "created_at": None,
        "payload": {"symbol": symbol, "tf": tf, "mode": mode},
    }
