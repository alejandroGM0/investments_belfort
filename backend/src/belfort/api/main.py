"""Belfort API entrypoint."""

from __future__ import annotations

from contextlib import asynccontextmanager

import httpx
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from belfort import config
from belfort.api.routes import sentiment


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with httpx.AsyncClient() as client:
        app.state.http_client = client
        yield
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
    ("jobs", "jobs"),
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
