"""Map NewsAPI articles to OpenAPI NewsItem."""

from __future__ import annotations

import hashlib
from datetime import datetime, timezone

from belfort.news.models import NaArticle, NewsItem
from belfort.news.sentiment import tone_from_text


def _parse_published(article: NaArticle) -> datetime:
    if article.publishedAt is not None:
        dt = article.publishedAt
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    return datetime.now(timezone.utc)


def _source_name(article: NaArticle) -> str:
    if article.source and article.source.name:
        return article.source.name
    return "News"


def _article_id(article: NaArticle) -> str:
    if article.url:
        return hashlib.sha256(article.url.encode()).hexdigest()[:16]
    return hashlib.sha256(article.title.encode()).hexdigest()[:16]


def _truncate(text: str | None, max_len: int = 280) -> str | None:
    if not text:
        return None
    cleaned = " ".join(text.split())
    if len(cleaned) <= max_len:
        return cleaned
    return cleaned[: max_len - 3] + "..."


def map_article(article: NaArticle) -> NewsItem | None:
    title = (article.title or "").strip()
    if not title or title == "[Removed]":
        return None
    tone, score = tone_from_text(title, article.description)
    return NewsItem(
        id=_article_id(article),
        title=title,
        source=_source_name(article),
        published_at=_parse_published(article),
        tone=tone,
        sentiment_score=round(score, 2),
        summary=_truncate(article.description),
        url=article.url or "",
    )
