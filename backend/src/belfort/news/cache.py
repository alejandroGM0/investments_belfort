"""In-memory TTL cache for news responses."""

from __future__ import annotations

from cachetools import TTLCache

from belfort import config
from belfort.news.models import NewsResponse

_cache: TTLCache[tuple[str, int], NewsResponse] | None = None


def _get_cache() -> TTLCache[tuple[str, int], NewsResponse]:
    global _cache
    if _cache is None:
        _cache = TTLCache(
            maxsize=128,
            ttl=config.NEWS_CACHE_TTL_SECONDS,
        )
    return _cache


def get_cached(symbol: str, limit: int) -> NewsResponse | None:
    key = (symbol.upper(), limit)
    return _get_cache().get(key)


def set_cached(symbol: str, limit: int, response: NewsResponse) -> None:
    key = (symbol.upper(), limit)
    _get_cache()[key] = response


def clear_cache() -> None:
    """For tests."""
    global _cache
    _cache = None
