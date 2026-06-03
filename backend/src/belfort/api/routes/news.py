from __future__ import annotations

from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request

from belfort.news.models import SentimentFilter
from belfort.news.service import (
    NoTokenError,
    SymbolNotFoundError,
    UpstreamError,
    get_news,
)

router = APIRouter()

_VALID_SENTIMENT: set[str] = {"positive", "negative", "neutral", "all"}


def get_http_client(request: Request) -> httpx.AsyncClient:
    client = getattr(request.app.state, "http_client", None)
    if client is None:
        raise HTTPException(500, "HTTP client not initialized")
    return client


@router.get("/news/{symbol}")
async def get_news_route(
    symbol: str,
    client: Annotated[httpx.AsyncClient, Depends(get_http_client)],
    limit: int = Query(20, ge=1, le=100),
    sentiment: str = Query("all"),
):
    if sentiment not in _VALID_SENTIMENT:
        raise HTTPException(
            400,
            f"Invalid sentiment. Use one of: {sorted(_VALID_SENTIMENT)}",
        )

    try:
        result = await get_news(
            client,
            symbol,
            limit=limit,
            sentiment=sentiment,  # type: ignore[arg-type]
        )
    except NoTokenError as e:
        raise HTTPException(503, str(e)) from e
    except SymbolNotFoundError as e:
        raise HTTPException(404, str(e)) from e
    except UpstreamError as e:
        raise HTTPException(502, str(e)) from e

    return result.model_dump(mode="json")
