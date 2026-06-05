from __future__ import annotations

import asyncio
from datetime import datetime, timezone
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
    live: bool = Query(True, description="Incremental refresh from Binance before respond"),
):
    df = await asyncio.to_thread(load, symbol, tf, since=history, refresh=live)
    if df is None or df.empty:
        raise HTTPException(404, f"No data for {symbol}/{tf}")
    df_tail = df.tail(limit)
    candles = df_tail[["time", "open", "high", "low", "close", "volume"]].to_dict("records")
    last_ts = int(df_tail["time"].iloc[-1]) if len(df_tail) else None
    return {
        "symbol": symbol,
        "tf": tf,
        "candles": candles,
        "last_candle_at": (
            datetime.fromtimestamp(last_ts, tz=timezone.utc).isoformat() if last_ts else None
        ),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "live": live,
    }

