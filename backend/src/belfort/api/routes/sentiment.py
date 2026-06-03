from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from belfort.sentiment.models import SentimentWindow
from belfort.sentiment.service import (
    NoDataSourcesError,
    get_sentiment,
)

router = APIRouter()

_VALID_WINDOWS: set[str] = {"1h", "4h", "24h", "7d"}


@router.get("/sentiment/{symbol}")
async def get_sentiment_route(
    symbol: str,
    window: str = Query("24h"),
):
    if window not in _VALID_WINDOWS:
        raise HTTPException(400, f"Invalid window. Use one of: {sorted(_VALID_WINDOWS)}")

    try:
        result = get_sentiment(symbol, window=window)  # type: ignore[arg-type]
    except NoDataSourcesError as e:
        raise HTTPException(503, str(e)) from e

    return result.model_dump(mode="json")
