"""
Background worker: polls the SQLite job queue and executes jobs.

Supported job kinds:
  - analyze  : run full analysis for a symbol/tf
  - backtest : run full grid backtest for a symbol/tf
  - data_fetch: refresh OHLCV data
"""

from __future__ import annotations

import time

from belfort import config
from belfort.jobs import queue as q


def _handle(job: dict) -> dict | None:
    kind = job["kind"]
    payload = job["payload"]

    if kind == "data_fetch":
        from belfort.data.loader import load
        symbol = payload["symbol"]
        tf = payload.get("tf", "4h")
        df = load(symbol, tf, refresh=True)
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
        results = run_all(symbol, tf, df, workers=workers)
        return {"patterns_run": len(results)}

    if kind == "analyze":
        # Analysis is lightweight (seconds); normally done in-request,
        # but available as job for explicit refresh triggers.
        from belfort.data.loader import load
        symbol = payload["symbol"]
        tf = payload.get("tf", "4h")
        df = load(symbol, tf)
        return {"rows": len(df)}

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
