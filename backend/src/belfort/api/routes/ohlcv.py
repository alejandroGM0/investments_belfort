from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, HTTPException, Query

from belfort.data.loader import load

router = APIRouter()

HistoryParam = Literal["2y", "5y", "max"]


@router.get("/ohlcv/{symbol}")
async def get_ohlcv(
    symbol: str,
    tf: str = Query("4h"),
    limit: int = Query(500),
    history: HistoryParam = Query("5y"),
):
    df = load(symbol, tf, since=history)
    if df is None or df.empty:
        raise HTTPException(404, f"No data for {symbol}/{tf}")
    df_tail = df.tail(limit)
    candles = df_tail[["time", "open", "high", "low", "close", "volume"]].to_dict("records")
    return {"symbol": symbol, "tf": tf, "candles": candles}
