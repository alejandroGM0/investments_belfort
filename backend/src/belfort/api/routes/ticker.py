from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query

from belfort.data.ticker import fetch_ticker, fetch_tickers

router = APIRouter()


@router.get("/ticker/{symbol}")
async def get_ticker(symbol: str):
    try:
        return fetch_ticker(symbol)
    except Exception as e:
        raise HTTPException(502, f"Could not fetch live price: {e}") from e


@router.get("/tickers")
async def get_tickers(symbols: str = Query(..., description="Comma-separated, e.g. BTCUSDT,ETHUSDT")):
    syms = [s.strip() for s in symbols.split(",") if s.strip()]
    if not syms:
        raise HTTPException(400, "symbols query required")
    try:
        tickers = fetch_tickers(syms)
    except Exception as e:
        raise HTTPException(502, f"Could not fetch live prices: {e}") from e
    return {
        "tickers": tickers,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
