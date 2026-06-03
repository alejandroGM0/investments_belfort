"""
Background worker: polls the SQLite job queue and executes jobs.

Supported job kinds:
  - analyze  : run full analysis for a symbol/tf
  - backtest : run full grid backtest for a symbol/tf
  - backtest_quick : run quick grid (~12 combos) for a symbol/tf
  - data_fetch: refresh OHLCV data
"""

from __future__ import annotations

import asyncio
import time
from typing import Any

from belfort import config
from belfort.jobs import queue as q


def _handle(job: dict) -> dict | None:
    kind = job["kind"]
    payload = job["payload"]
    job_id = job["id"]

    if kind == "data_fetch":
        from belfort.data.loader import load
        symbol = payload["symbol"]
        tf = payload.get("tf", "4h")
        history = payload.get("history", "5y")
        q.update_progress(job_id, 0, 1, f"Downloading {symbol}/{tf} ({history})")
        df = load(symbol, tf, since=history, refresh=True)
        q.update_progress(job_id, 1, 1, f"Downloaded {len(df)} candles")
        return {"rows": len(df)}

    if kind == "backtest":
        from belfort.backtest.grid import run_all
        from belfort.data.loader import load
        symbol = payload["symbol"]
        tf = payload.get("tf", "4h")
        workers = payload.get("workers", 1)
        df = load(symbol, tf)
        if df.empty:
            return {"error": "no data"}

        def _progress(i: int, total: int, pattern_id: str) -> None:
            q.update_progress(job_id, i, total, f"Pattern: {pattern_id}")

        results = run_all(symbol, tf, df, workers=workers, progress_callback=_progress)
        return {
            "patterns_run": len(results),
            "combos_saved": sum(results.values()),
            "mode": "full",
        }

    if kind == "backtest_quick":
        from belfort.backtest.grid import run_all_quick
        from belfort.data.loader import load
        symbol = payload["symbol"]
        tf = payload.get("tf", "4h")
        df = load(symbol, tf)
        if df.empty:
            return {"error": "no data"}

        def _progress(i: int, total: int, pattern_id: str) -> None:
            q.update_progress(job_id, i, total, f"Quick backtest: {pattern_id}")

        results = run_all_quick(symbol, tf, df, progress_callback=_progress)
        return {
            "patterns_run": len(results),
            "combos_saved": sum(results.values()),
            "mode": "quick",
        }

    if kind == "analyze":
        # Run actual analysis with refresh to update cached data
        from belfort.analysis import run as run_analysis
        from belfort.data.loader import load
        symbol = payload["symbol"]
        tf = payload.get("tf", "4h")
        history = payload.get("history", "5y")
        q.update_progress(job_id, 0, 2, f"Refreshing OHLCV for {symbol}/{tf}")
        load(symbol, tf, since=history, refresh=True)
        q.update_progress(job_id, 1, 2, "Running analysis")
        report = run_analysis(symbol, tf, since=history, refresh=False)
        q.update_progress(job_id, 2, 2, "Done")
        return {"patterns_detected": len(report.patterns), "trend": report.trend}

    return {"error": f"unknown job kind '{kind}'"}


def run_forever(poll_seconds: float | None = None) -> None:  # pragma: no cover
    if poll_seconds is None:
        poll_seconds = config.WORKER_POLL_SECONDS

    print(f"[worker] started — polling every {poll_seconds}s")
    while True:
        job = q.peek_next()
        if job is None:
            time.sleep(poll_seconds)
            continue

        job_id = job["id"]
        q.claim(job_id)
        print(f"[worker] running job {job_id} ({job['kind']})")
        try:
            result = _handle(job)
            q.complete(job_id, result)
            print(f"[worker] job {job_id} done: {result}")
        except Exception as exc:
            q.fail(job_id, str(exc))
            print(f"[worker] job {job_id} FAILED: {exc}")


async def run_worker_async(poll_seconds: float | None = None) -> None:
    """Async-compatible worker loop for embedding in FastAPI lifespan."""
    if poll_seconds is None:
        poll_seconds = config.WORKER_POLL_SECONDS

    print(f"[worker] async started — polling every {poll_seconds}s")
    while True:
        job = q.peek_next()
        if job is None:
            await asyncio.sleep(poll_seconds)
            continue

        job_id = job["id"]
        q.claim(job_id)
        print(f"[worker] running job {job_id} ({job['kind']})")
        try:
            result = await asyncio.to_thread(_handle, job)
            q.complete(job_id, result)
            print(f"[worker] job {job_id} done: {result}")
        except Exception as exc:
            q.fail(job_id, str(exc))
            print(f"[worker] job {job_id} FAILED: {exc}")
