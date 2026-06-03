"""Map CryptoPanic posts to OpenAPI NewsItem."""

from __future__ import annotations

from datetime import datetime, timezone

from belfort.news.models import CpPost, NewsItem
from belfort.news.sentiment import classify_post


def _parse_published(post: CpPost) -> datetime:
    if post.published_at is not None:
        dt = post.published_at
    elif post.created_at is not None:
        dt = post.created_at
    else:
        dt = datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def _source_name(post: CpPost) -> str:
    if post.source and post.source.title:
        return post.source.title
    if post.source and post.source.domain:
        return post.source.domain
    return "Unknown"


def _truncate(text: str | None, max_len: int = 280) -> str | None:
    if not text:
        return None
    cleaned = " ".join(text.split())
    if len(cleaned) <= max_len:
        return cleaned
    return cleaned[: max_len - 3] + "..."


def map_post(post: CpPost) -> NewsItem:
    tone, score = classify_post(post)
    return NewsItem(
        id=str(post.id),
        title=post.title.strip(),
        source=_source_name(post),
        published_at=_parse_published(post),
        tone=tone,
        sentiment_score=round(score, 2),
        summary=_truncate(post.description),
        url=post.url or "",
    )
