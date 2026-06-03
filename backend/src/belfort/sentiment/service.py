"""Orchestrate collectors, optional APIs, cache, and aggregation."""

from __future__ import annotations

from belfort import config
from belfort.sentiment.aggregate import WINDOW_HOURS, build_response
from belfort.sentiment.cache import get_cached, set_cached
from belfort.sentiment.collectors.lunarcrush import fetch_lunarcrush_network
from belfort.sentiment.collectors.reddit import collect_reddit, _reddit_available
from belfort.sentiment.collectors.rss import collect_rss
from belfort.sentiment.collectors.santiment import fetch_santiment_network
from belfort.sentiment.models import SentimentResponse, SentimentWindow
from belfort.sentiment.symbols import get_symbol_config


class SentimentServiceError(Exception):
    pass


class SymbolNotFoundError(SentimentServiceError):
    pass


class NoDataSourcesError(SentimentServiceError):
    pass


def get_sentiment(symbol: str, window: SentimentWindow = "24h", use_cache: bool = True) -> SentimentResponse:
    sym = symbol.upper().strip()
    cfg = get_symbol_config(sym)
    if cfg is None:
        raise SymbolNotFoundError(f"Unknown symbol: {symbol}")

    if use_cache:
        cached = get_cached(sym, window)
        if cached is not None:
            return cached

    has_rss = bool(config.SENTIMENT_RSS_FEEDS)
    has_reddit = _reddit_available()
    if not has_rss and not has_reddit and not config.LUNARCRUSH_API_KEY:
        raise NoDataSourcesError(
            "No sentiment sources configured. Set REDDIT_* and/or SENTIMENT_RSS_FEEDS."
        )

    max_hours = WINDOW_HOURS.get(window, 24)
    max_hours = max(max_hours, 168)

    mentions = []
    if has_rss:
        mentions.extend(collect_rss(cfg, max_age_hours=max_hours))
    if has_reddit:
        mentions.extend(collect_reddit(cfg, max_age_hours=max_hours))

    api_networks = []
    lc = fetch_lunarcrush_network(cfg)
    if lc:
        api_networks.append(lc)
    san = fetch_santiment_network(cfg)
    if san:
        api_networks.append(san)

    response = build_response(sym, mentions, window, api_networks=api_networks or None)
    set_cached(sym, window, response)
    return response
