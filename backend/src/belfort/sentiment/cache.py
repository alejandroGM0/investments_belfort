"""diskcache wrapper for sentiment responses."""

from __future__ import annotations

import json
from typing import Any

from diskcache import Cache

from belfort import config
from belfort.sentiment.models import SentimentResponse, SentimentWindow

_cache: Cache | None = None


def _get_cache() -> Cache:
    global _cache
    if _cache is None:
        config.ensure_dirs()
        _cache = Cache(str(config.SENTIMENT_CACHE_DIR))
    return _cache


def cache_key(symbol: str, window: SentimentWindow) -> str:
    return f"sentiment:{symbol.upper()}:{window}"


def get_cached(symbol: str, window: SentimentWindow) -> SentimentResponse | None:
    raw = _get_cache().get(cache_key(symbol, window))
    if raw is None:
        return None
    if isinstance(raw, str):
        data = json.loads(raw)
        return SentimentResponse.model_validate(data)
    if isinstance(raw, dict):
        return SentimentResponse.model_validate(raw)
    return None


def set_cached(symbol: str, window: SentimentWindow, response: SentimentResponse) -> None:
    payload = response.model_dump(mode="json")
    _get_cache().set(
        cache_key(symbol, window),
        json.dumps(payload),
        expire=config.SENTIMENT_CACHE_TTL_SECONDS,
    )
