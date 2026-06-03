"""Orchestrate CryptoPanic fetch, cache, mapping, and summary."""

from __future__ import annotations

from datetime import datetime, timezone

import httpx

from belfort import config
from belfort.news.cache import get_cached, set_cached
from belfort.news.client import CryptoPanicClient
from belfort.news.mapper import map_post
from belfort.news.models import NewsItem, NewsResponse, NewsSummary, SentimentFilter, SentimentTone
from belfort.news.symbols import get_symbol_config


class NewsServiceError(Exception):
    pass


class NoTokenError(NewsServiceError):
    pass


class SymbolNotFoundError(NewsServiceError):
    pass


class UpstreamError(NewsServiceError):
    pass


def _build_summary(items: list[NewsItem]) -> NewsSummary:
    pos = sum(1 for i in items if i.tone == "positive")
    neg = sum(1 for i in items if i.tone == "negative")
    neu = sum(1 for i in items if i.tone in ("neutral", "mixed"))
    if pos > neg and pos > neu:
        overall: SentimentTone = "positive"
    elif neg > pos and neg > neu:
        overall = "negative"
    elif pos > 0 and neg > 0:
        overall = "mixed"
    else:
        overall = "neutral"
    return NewsSummary(positive=pos, negative=neg, neutral=neu, overall_tone=overall)


def _filter_items(items: list[NewsItem], sentiment: SentimentFilter) -> list[NewsItem]:
    if sentiment == "all":
        return items
    return [i for i in items if i.tone == sentiment]


async def get_news(
    client: httpx.AsyncClient,
    symbol: str,
    *,
    limit: int = 20,
    sentiment: SentimentFilter = "all",
    use_cache: bool = True,
) -> NewsResponse:
    sym = symbol.upper().strip()
    cfg = get_symbol_config(sym)
    if cfg is None:
        raise SymbolNotFoundError(f"Unknown symbol: {symbol}")

    if not config.CRYPTOPANIC_API_TOKEN:
        raise NoTokenError(
            "CRYPTOPANIC_API_TOKEN is not set. Add it to backend/.env (see .env.example)."
        )

    fetch_limit = max(limit, 20) if sentiment != "all" else limit
    if use_cache and sentiment == "all":
        cached = get_cached(sym, limit)
        if cached is not None:
            return cached

    cp = CryptoPanicClient(client)
    try:
        raw = await cp.fetch_posts(cfg.currency, limit=fetch_limit)
    except httpx.HTTPStatusError as e:
        raise UpstreamError(f"CryptoPanic API error: {e.response.status_code}") from e
    except httpx.RequestError as e:
        raise UpstreamError(f"CryptoPanic request failed: {e}") from e

    items = [map_post(p) for p in raw.results if p.title]
    items = _filter_items(items, sentiment)[:limit]

    response = NewsResponse(
        symbol=sym,
        items=items,
        summary=_build_summary(items),
        updated_at=datetime.now(timezone.utc),
    )

    if use_cache and sentiment == "all":
        set_cached(sym, limit, response)

    return response
