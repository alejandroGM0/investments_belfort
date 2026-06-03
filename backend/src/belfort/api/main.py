"""Belfort API entrypoint."""

from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager

import httpx
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from belfort import config
from belfort.api.routes import sentiment


@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- Shared HTTP client ---
    async with httpx.AsyncClient() as client:
        app.state.http_client = client

        # --- Embedded background worker ---
        from belfort.jobs.worker import run_worker_async
        worker_task = asyncio.create_task(run_worker_async())

        # --- Scheduled jobs (APScheduler) ---
        scheduler = None
        try:
            from apscheduler.schedulers.asyncio import AsyncIOScheduler
            scheduler = AsyncIOScheduler()

            async def _refresh_all_symbols():
                """Enqueue data refresh for all configured symbols."""
                from belfort.jobs import queue as q
                for sym in config.DEFAULT_SYMBOLS:
                    q.enqueue("analyze", {"symbol": sym, "tf": "4h"})
                print("[scheduler] enqueued analysis refresh for all symbols")

            async def _rerun_quick_backtests():
                """Enqueue quick backtests for all configured symbols."""
                from belfort.jobs import queue as q
                for sym in config.DEFAULT_SYMBOLS:
                    q.enqueue("backtest_quick", {"symbol": sym, "tf": "4h"})
                print("[scheduler] enqueued quick backtests for all symbols")

            scheduler.add_job(_refresh_all_symbols, "interval", minutes=15, id="refresh_all")
            scheduler.add_job(_rerun_quick_backtests, "interval", hours=6, id="rerun_backtests")
            scheduler.start()
            print("[scheduler] started — refresh every 15m, backtest every 6h")
        except ImportError:
            print("[scheduler] apscheduler not installed, periodic jobs disabled")

        yield

        # --- Cleanup ---
        if scheduler is not None:
            scheduler.shutdown(wait=False)
        worker_task.cancel()
        try:
            await worker_task
        except asyncio.CancelledError:
            pass

    app.state.http_client = None


app = FastAPI(
    title="Belfort API",
    version="0.1.0",
    description="Crypto investment analysis platform API",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sentiment.router, tags=["sentiment"])

for _mod, _tag in (
    ("ohlcv", "ohlcv"),
    ("analysis", "analysis"),
    ("news", "news"),
    ("backtest", "backtest"),
    ("ranking", "ranking"),
    ("context", "context"),
    ("jobs", "jobs"),
    ("symbols", "symbols"),
):
    try:
        import importlib

        router = importlib.import_module(f"belfort.api.routes.{_mod}").router
        app.include_router(router, tags=[_tag])
    except ImportError:
        pass


@app.get("/health")
async def health():
    return {"status": "ok"}


def run() -> None:
    """CLI entry: uvicorn belfort.api.main:app"""
    uvicorn.run(
        "belfort.api.main:app",
        host=config.API_HOST,
        port=config.API_PORT,
        reload=True,
    )


if __name__ == "__main__":
    run()
