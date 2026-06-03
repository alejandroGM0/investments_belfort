"""RSS collector via feedparser."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import feedparser

from belfort import config
from belfort.sentiment.models import Mention
from belfort.sentiment.symbols import SymbolConfig


def _entry_datetime(entry: feedparser.FeedParserDict) -> datetime:
    if hasattr(entry, "published_parsed") and entry.published_parsed:
        return datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
    if hasattr(entry, "updated_parsed") and entry.updated_parsed:
        return datetime(*entry.updated_parsed[:6], tzinfo=timezone.utc)
    return datetime.now(timezone.utc)


def _matches(text: str, keywords: tuple[str, ...]) -> bool:
    lower = text.lower()
    return any(kw in lower for kw in keywords)


def collect_rss(cfg: SymbolConfig, max_age_hours: int = 168) -> list[Mention]:
    cutoff = datetime.now(timezone.utc) - timedelta(hours=max_age_hours)
    mentions: list[Mention] = []
    keywords = cfg.keywords

    for feed_url in config.SENTIMENT_RSS_FEEDS:
        try:
            parsed = feedparser.parse(feed_url)
        except Exception:
            continue

        for entry in parsed.entries[:40]:
            title = getattr(entry, "title", "") or ""
            summary = getattr(entry, "summary", "") or ""
            combined = f"{title}. {summary}"
            if not _matches(combined, keywords):
                continue

            created = _entry_datetime(entry)
            if created < cutoff:
                continue

            mentions.append(
                Mention(text=combined[:2000], created_at=created, source="rss")
            )

    return mentions
